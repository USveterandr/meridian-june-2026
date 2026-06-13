# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Meridian is a full-stack real estate platform deployed as:

- **API**: Cloudflare Worker (Hono framework) with D1 database + R2 object storage
- **Frontend**: React 18 + Vite SPA (deploys to Vercel/Cloudflare Pages)
- **Mobile**: PWA-wrapped Trusted Web Activity for Google Play

Key architectural patterns:
- JWT auth with 24h expiry, stored in localStorage
- Role-based access control (buyer, renter, investor, seller, landlord, broker, lawyer, notary, admin)
- All DB queries use prepared statements (no raw SQL injection risk)
- Image uploads use magic-byte verification; SVG/HTML uploads rejected
- Rate limiting at both middleware and WAF levels

## Common Development Commands

```bash
# Terminal 1 — API (localhost:8787)
cd api
npm install
npx wrangler d1 execute meridian-db --local --file=./schema.sql
echo "dev-secret-at-least-32-characters-long!!" | npx wrangler secret put JWT_SECRET  # or use .dev.vars
npx wrangler dev

# Terminal 2 — Frontend (localhost:5173)
cd web
npm install
npm run dev  # proxies /api to localhost:8787 automatically
```

### Testing

```bash
# Run API integration tests
npm run test:api

# TypeScript check
npm run typecheck:api
npm run typecheck:web

# Production build check
npm run build:api
npm run build:web
```

### Deployment

```bash
# Deploy API (requires Cloudflare login)
cd api && npx wrangler deploy

# Deploy Frontend (Vercel dashboard or CLI)
cd web && npm run build && vercel --prod
```

## Project Structure

```
api/
  src/
    index.ts           # Entry point, route mounting
    middleware/
      auth.ts          # requireAuth, requireRole guards
      rateLimit.ts     # In-worker rate limiting
    lib/
      validate.ts      # Zod schemas for all endpoints
      scraper.ts       # Property import logic (CRAWLED_DR_PROPERTIES)
      jwt.ts, password.ts
    routes/
      auth.ts, properties.ts, favorites.ts, requirements.ts, messages.ts, scrape.ts, assets.ts
  schema.sql           # D1 schema (users, properties, subscriptions, etc.)
  wrangler.toml        # Bindings: DB → meridian-db, ASSETS → meridian-assets

web/
  src/
    main.tsx           # Router setup
    api.ts             # Fetch wrapper, type definitions
    auth.tsx           # AuthProvider, useAuth hook
    i18n.tsx           # Bilingual EN/ES system
    pages/            # Home, Search, PropertyDetail, NewListing, Login, Signup, Dashboard, Messages
    components/       # Layout, PropertyCard, RequireAuth
```

## Key Patterns to Follow

1. **Database**: All operations use prepared statements (`?`) – never concatenate user input into SQL.
2. **Auth**: Use `requireAuth` and `requireRole` middleware on protected routes.
3. **Errors**: Return structured JSON with `error` and optional `fields` for validation errors. Never leak stack traces.
4. **Images**: Validate magic bytes before R2 upload; reject SVG/HTML. Max 8 MB, 20 per listing.
5. **Subscriptions**: The `plans` table already exists with tiers (free, pro, brokerage, enterprise, investor). Seed via `seed-plans.sql`.
6. **Currency**: Stored as integer cents (`price_cents`) to avoid floating-point issues.

## Files That Need Special Attention

- `api/src/routes/scrape.ts` – Admin-only scraping endpoint; also used by automated jobs.
- `api/lib/scraper.ts` – Add real-data fetch logic here if moving beyond the mock `CRAWLED_DR_PROPERTIES`.
- `api/middleware/errorHandler.ts` (if created) – All routes should bubble errors up for consistent JSON formatting.
- `api/schema.sql` – Migration file; keep idempotent (`IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).

## Security Posture

- PBKDF2-SHA256 password hashing (100k iterations) via WebCrypto
- Prepared statements everywhere
- Magic-byte verified uploads
- IDOR checks on all mutations via `loadOwned` helper
- Rate limiting (configurable per endpoint)
- JWT secrets stored in Wrangler secrets (never in source)
- Security headers injected automatically by Hono/Workers

## Operations Notes

- D1 has 30-day point-in-time recovery
- JWT secret rotation: re-run `wrangler secret put JWT_SECRET`
- Logs viewable via `npx wrangler tail`
- Recommended WAF rule: `POST /api/auth/*` rate limit 10/5min per IP