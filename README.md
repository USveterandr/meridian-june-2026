# Meridian

Premium real estate & investment platform — Dominican Republic first, then the USA and beyond. Gold-on-ink luxury branding, fully bilingual (English/Spanish with browser auto-detect), light and dark themes, and the globe mark with the Dominican Republic popping out in gold.

## What's inside

```
meridian/
├── api/        Cloudflare Worker — Hono + D1 + R2, JWT auth, REST API
│   ├── schema.sql           D1 schema (users, properties, images, requirements, messages, favorites)
│   ├── wrangler.toml        Bindings: DB → meridian-db, ASSETS → meridian-assets
│   └── src/                 Routes, Zod validation, auth/rate-limit middleware
├── web/        React + Vite SPA — deploys to Vercel (or Cloudflare Pages)
│   ├── public/              PWA manifest + icons (Google Play TWA-ready)
│   └── src/                 Pages, i18n, design system, API client
├── SECURITY_AND_QUALITY_REVIEW.md   22 issues found & fixed — why each matters
└── DEPLOYMENT.md                    Cloudflare + Vercel + Google Play, step by step
```

## Features

Role-aware accounts (buyer, renter, investor, seller, landlord, broker, lawyer, notary) · multi-step listing creation with photo upload to R2 · search with filters (price, type, buy/rent, beds, keywords) and shareable URLs · favorites · buyer "requirements" with automatic matching against active listings · private messaging with unread badges · per-role dashboard with publish/sold/rented/delete management · mobile-responsive, accessible (WCAG-conscious), SEO-friendly.

## Quick start (local)

```bash
# Terminal 1 — API on :8787
cd api && npm install
npx wrangler d1 execute meridian-db --local --file=./schema.sql
echo "dev-secret-at-least-32-characters-long!!" | npx wrangler secret put JWT_SECRET   # or use .dev.vars
npx wrangler dev

# Terminal 2 — web on :5173 (proxies /api to :8787)
cd web && npm install && npm run dev
```

For local dev you can instead create `api/.dev.vars` containing `JWT_SECRET=dev-secret-at-least-32-characters-long!!`.

## Production

See **DEPLOYMENT.md**. Short version: `wrangler deploy` the API with your D1/R2 (already configured), set `JWT_SECRET` and `ALLOWED_ORIGINS`, deploy `web/` to Vercel with `VITE_API_URL`, then wrap the PWA for Google Play with Bubblewrap (TWA).

## Security posture

PBKDF2 password hashing (WebCrypto), prepared statements everywhere, magic-byte-verified image uploads (no SVG), ownership checks on every mutation, role-based access control, rate limiting, CORS allowlist, strict security headers, no stack-trace leakage, 24 h JWT expiry. Full details and rationale in **SECURITY_AND_QUALITY_REVIEW.md**.
