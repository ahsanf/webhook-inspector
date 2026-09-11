// GET /api/requests?id=X&page=1&pageSize=20&q=text -> paginated, newest-first
// DELETE /api/requests?id=X                         -> clear captured requests for id
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/upstash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || '';
  if (!id) {
    res.status(400).send('missing id');
    return;
  }
  const key = `req:${id}`;

  if (req.method === 'DELETE') {
    await redis('DEL', key);
    res.status(204).end();
    return;
  }

  const items: string[] = (await redis('LRANGE', key, '0', '-1')) || [];
  let all = items.slice().reverse().map((s) => JSON.parse(s));

  const q = ((req.query.q as string) || '').trim().toLowerCase();
  if (q) {
    all = all.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(q)
    );
  }

  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string, 10) || 20, 1), 200);
  const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
  const total = all.length;
  const start = (page - 1) * pageSize;
  const out = all.slice(start, start + pageSize);

  res.status(200).json({ total, page, pageSize, items: out });
}
