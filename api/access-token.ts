// <url>/:id/access-token -> OAuth-style token response.
// id "simulator" always returns a fresh random token (not configurable).
// Any other id returns the token configured for it via /api/config (empty if unset).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import { redis } from '../lib/upstash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || '';
  if (!id) {
    res.status(400).send('missing id');
    return;
  }

  let accessToken = '';
  if (id === 'simulator') {
    accessToken = randomBytes(64).toString('base64');
  } else {
    const raw = await redis('GET', `cfg:${id}`);
    if (typeof raw === 'string' && raw) {
      try {
        accessToken = JSON.parse(raw).accessToken || '';
      } catch {
        // ignore malformed stored config
      }
    }
  }

  res.status(200).json({
    responseCode: '2007300',
    responseMessage: 'Successful',
    accessToken,
    tokenType: 'Bearer',
    expiresIn: '900',
  });
}
