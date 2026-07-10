# Webhook Inspector

Self-hosted webhook.site alternative. TypeScript serverless functions on
Vercel + a plain HTML/JS dashboard, backed by free-tier Upstash Redis for
storage.

- Send anything to `https://<your-app>.vercel.app/<any-id>` — captures method,
  headers, query, body, timestamp.
- Open the same URL in a browser to watch requests arrive live (polls every 2s).
- Configure the HTTP status, headers, content-type and body returned to callers,
  per id.
- Save any config as a reusable named template and load it into another id later.
- Captured requests auto-expire at the next 00:00 UTC (Redis TTL, refreshed on
  every new request — no cron job needed). Configs and templates never expire.
- `https://<your-app>.vercel.app/<id>/access-token` returns an OAuth-style
  token response using the access token configured for that id. The id
  `simulator` is special-cased: it always returns a fresh random token and
  ignores any stored config.

## Setup

1. Create a free Redis database at [upstash.com](https://upstash.com) (REST API,
   no persistent connection needed — works well from serverless).
2. Copy the **REST URL** and **REST Token** from the Upstash console.
3. In your Vercel project settings, add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy:
   ```
   vercel deploy
   ```
   (or connect this repo in the Vercel dashboard — no framework preset needed,
   Vercel auto-detects the Node/TypeScript functions in `api/` and serves
   `public/` as static files.)

## Local development

Requires the [Vercel CLI](https://vercel.com/docs/cli):
```
npm install
vercel dev
```
Set the two env vars in a `.env` file or via `vercel env pull` first.

## Layout

```
api/                Node/TypeScript serverless functions
  hook.ts           <url>/:id capture endpoint — stores + replies
  access-token.ts   <url>/:id/access-token — configurable per id, random for "simulator"
  requests.ts       list/clear captured requests for an id
  config.ts         get/set the per-id response config
  templates.ts      get/save/delete reusable response templates
lib/upstash.ts      Minimal Upstash Redis REST client
public/             Static dashboard (single HTML file, no build step)
vercel.json         Rewrites "/:id/access-token" and "/:id" to their handlers
```
