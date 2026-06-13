# Meridian — Deployment Guide

You have Cloudflare, Vercel, and Google Play accounts. Here's exactly how each piece deploys.

## 1. API → Cloudflare Workers (+ D1 + R2)

The bindings in `api/wrangler.toml` already match your resources: D1 `meridian-db` (id `c1657807-0c44-49d1-9ae7-e62792af5b7c`) and R2 bucket `meridian-assets`.

```bash
cd api
npm install
npx wrangler login

# 1) Create the schema in your real D1 database (one time)
npx wrangler d1 execute meridian-db --remote --file=./schema.sql

# 2) Set the JWT secret (NEVER commit this)
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET

# 3) Deploy
npx wrangler deploy
```

Note the deployed URL, e.g. `https://meridian-api.<your-subdomain>.workers.dev`.

Then set the CORS allowlist to your real frontend domains in `wrangler.toml` and redeploy:

```toml
[vars]
ALLOWED_ORIGINS = "https://meridian.vercel.app,https://www.yourdomain.com"
```

**Recommended (free):** in the Cloudflare dashboard, add a WAF rate-limiting rule for `POST /api/auth/*` (e.g. 10 requests/min per IP) as a hard backstop to the in-Worker limiter.

Local development: `npx wrangler d1 execute meridian-db --local --file=./schema.sql`, then `npx wrangler dev` (serves on :8787; the web app's dev proxy points there).

## 2. Web app → Vercel

```bash
cd web
npm install
npm run build   # verify locally first
```

In Vercel: import the repo, set **Root Directory** to `web`, framework "Vite". Add one environment variable:

```
VITE_API_URL = https://meridian-api.<your-subdomain>.workers.dev
```

Because this is a single-page app, add `web/vercel.json` rewrites (already included) so deep links like `/property/42` serve `index.html`.

(Alternative: Cloudflare Pages works identically — build command `npm run build`, output `dist`, same env var.)

## 3. Google Play → Trusted Web Activity (TWA)

The web app is already a PWA (manifest + icons + standalone display). TWA wraps it in an Android app with no second codebase:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR-DOMAIN/manifest.webmanifest
bubblewrap build
```

Requirements checklist:
1. **HTTPS domain** (Vercel gives you this automatically).
2. **Digital Asset Links**: Bubblewrap prints a JSON block — host it at `https://YOUR-DOMAIN/.well-known/assetlinks.json` (on Vercel, put it in `web/public/.well-known/assetlinks.json` and redeploy). This removes the browser URL bar in the app.
3. Upload the generated `.aab` to the Play Console, fill in the store listing (use `icon-512.png` as the app icon source), and submit for review.

## 4. Post-deploy smoke test

```bash
API=https://meridian-api.<you>.workers.dev
curl $API/api/health
curl -X POST $API/api/auth/register -H 'content-type: application/json' \
  -d '{"firstName":"Test","lastName":"Owner","email":"owner@example.com","password":"meridian123","role":"seller","locale":"en"}'
# → returns a token; use it to create a listing, upload a photo, search, favorite, message.
```

## 5. Operations notes

D1 has point-in-time recovery (Time Travel, 30 days) — that covers the spec's backup requirement; you can also schedule `wrangler d1 export` for cold copies. Logs: `npx wrangler tail` shows the server-side error details that are deliberately hidden from API clients. To rotate the JWT secret, just run `secret put` again — users re-log-in within 24 h as tokens expire.
