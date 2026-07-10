// GET /api/templates          -> all saved templates, keyed by name
// POST /api/templates         -> save/update a template {name,status,contentType,headers,body}
// DELETE /api/templates?name= -> remove a template
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../lib/upstash';

interface Template {
  name: string;
  status: number;
  contentType?: string;
  headers?: Record<string, string>;
  body?: string;
  accessToken?: string;
}

const TEMPLATES_KEY = 'templates';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET': {
      const flat: string[] = (await redis('HGETALL', TEMPLATES_KEY)) || [];
      const out: Record<string, unknown> = {};
      for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1]);
      res.status(200).json(out);
      return;
    }
    case 'POST': {
      const t = req.body as Template;
      if (!t || !t.name || typeof t.status !== 'number' || t.status < 100 || t.status > 599) {
        res.status(400).send('invalid template');
        return;
      }
      await redis('HSET', TEMPLATES_KEY, t.name, JSON.stringify(t));
      res.status(204).end();
      return;
    }
    case 'DELETE': {
      const name = (req.query.name as string) || '';
      if (!name) {
        res.status(400).send('missing name');
        return;
      }
      await redis('HDEL', TEMPLATES_KEY, name);
      res.status(204).end();
      return;
    }
    default:
      res.status(405).send('method not allowed');
  }
}
