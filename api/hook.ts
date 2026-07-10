// The actual webhook endpoint: <url>/:id (rewritten from "/:id" by vercel.json)
// Captures every incoming request (any method) and replies with whatever
// response config is stored for that id, defaulting to a plain 200 OK.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, secondsUntilMidnightUTC } from '../lib/upstash';

// Read the raw body ourselves so non-JSON payloads (XML, form data, plain
// text) are captured byte-for-byte instead of being mangled by auto-parsing.
export const config = { api: { bodyParser: false } };

function readBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

interface ResponseConfig {
  status: number;
  contentType?: string;
  headers?: Record<string, string>;
  body?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || '';
  if (!id) {
    res.status(400).send('missing id');
    return;
  }

  const body = await readBody(req);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    headers[k] = Array.isArray(v) ? v.join(', ') : v ?? '';
  }

  const captured = {
    method: req.method,
    query: req.url?.split('?')[1] ?? '',
    headers,
    body,
    remoteIp: headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    timestamp: new Date().toISOString(),
  };

  const key = `req:${id}`;
  await redis('RPUSH', key, JSON.stringify(captured));
  await redis('LTRIM', key, '-100', '-1');
  await redis('EXPIRE', key, secondsUntilMidnightUTC());

  let cfg: ResponseConfig = { status: 200, contentType: 'application/json', body: '{"status":"ok"}' };
  const raw = await redis('GET', `cfg:${id}`);
  if (typeof raw === 'string' && raw) {
    try {
      cfg = { ...cfg, ...JSON.parse(raw) };
    } catch {
      // ignore malformed stored config, fall back to default
    }
  }

  for (const [k, v] of Object.entries(cfg.headers || {})) res.setHeader(k, v);
  res.setHeader('Content-Type', cfg.contentType || 'application/json');
  const status = cfg.status >= 100 && cfg.status <= 599 ? cfg.status : 200;
  res.status(status).send(cfg.body ?? '');
}
