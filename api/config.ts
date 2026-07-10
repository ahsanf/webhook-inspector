// GET /api/config?id=X  -> current response config for id (defaults if unset)
// POST /api/config?id=X -> set response config for id (status/contentType/headers/body)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/upstash';

interface ResponseConfig {
  status: number;
  contentType?: string;
  headers?: Record<string, string>;
  body?: string;
  // Returned instead of the fields above when the request body is JSON
  // {"grantType":"client_credentials"} (see api/hook.ts).
  accessToken?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || '';
  if (!id) {
    res.status(400).send('missing id');
    return;
  }
  const key = `cfg:${id}`;

  if (req.method === 'POST') {
    const cfg = req.body as ResponseConfig;
    if (!cfg || typeof cfg.status !== 'number' || cfg.status < 100 || cfg.status > 599) {
      res.status(400).send('status must be 100-599');
      return;
    }
    await redis('SET', key, JSON.stringify(cfg));
    res.status(204).end();
    return;
  }

  const raw = await redis('GET', key);
  res.setHeader('Content-Type', 'application/json');
  if (typeof raw === 'string' && raw) {
    res.status(200).send(raw);
    return;
  }
  res.status(200).json({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
}
