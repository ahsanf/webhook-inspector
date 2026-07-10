// Minimal client for the Upstash Redis REST API. Serverless functions are
// short-lived, so a REST call per command is simpler than a pooled TCP
// connection.

export async function redis(...args: (string | number)[]): Promise<any> {
  const baseURL = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseURL || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set');
  }

  const res = await fetch(baseURL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(`upstash: ${data.error}`);
  return data.result;
}

// Seconds remaining until the next 00:00 UTC. Captured requests get this as
// their TTL (refreshed on every new request), so the log flushes itself at
// midnight with no separate cron job.
export function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.round((next - now.getTime()) / 1000);
}
