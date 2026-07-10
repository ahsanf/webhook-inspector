// GET /api/requests?id=X    -> captured requests for id, newest first
// DELETE /api/requests?id=X -> clear captured requests for id
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
  const out = items
    .slice()
    .reverse()
    .map((s) => JSON.parse(s));
  res.status(200).json(out);
}
