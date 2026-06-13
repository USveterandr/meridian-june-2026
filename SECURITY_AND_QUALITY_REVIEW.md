# Meridian — Security & Quality Review

This is the issue-by-issue review you asked for. Every item below was identified in the spec (or in the naive implementation it implies) and **the fix is already applied in the shipped code** — file references point to where.

---

## A. Security vulnerabilities

### 1. Password hashing: bcrypt doesn't run on Cloudflare Workers
**Issue.** The spec calls for bcrypt, but bcrypt's native bindings don't run on the Workers runtime, and the common fallback — storing SHA-256 or plaintext — is catastrophic: one database leak exposes every user's password (which most people reuse across sites).

**Fix (applied).** `api/src/lib/password.ts` uses **PBKDF2-SHA256 via WebCrypto** (built into Workers): 100,000 iterations, a random 16-byte salt per user, and a versioned storage format `pbkdf2$<iter>$<salt>$<hash>` so iterations can be raised later without breaking old hashes.

### 2. Login timing & user-enumeration attacks
**Issue.** A naive login returns "email not found" instantly but takes ~50 ms to check a password for a real account. Attackers use both the message and the timing difference to harvest your user list, then credential-stuff it.

**Fix (applied).** Login always verifies against a `DUMMY_HASH` when the email doesn't exist (constant work), uses a constant-time comparison, and returns the same generic message ("Invalid email or password") for both cases. Registration returns 409 only after a real conflict, and registration is rate-limited (issue 7).

### 3. SQL injection
**Issue.** The search endpoint builds a `WHERE` clause from a dozen user-controlled filters. String-concatenating any of them lets an attacker read or destroy the whole database (`'; DROP TABLE users;--`).

**Fix (applied).** Every query in the API uses **prepared statements with bound parameters**. Dynamic `WHERE`/`SET` clauses are assembled only from fixed, hardcoded strings; user values travel exclusively through `.bind()`. `LIKE` inputs are additionally escaped (`%`, `_`, `\`) with `ESCAPE '\'` so a user typing `%` can't turn a city filter into "match everything". See `api/src/routes/properties.ts`.

### 4. Unrestricted file upload (stored XSS / R2 abuse)
**Issue.** "Upload property photos" is the classic stored-XSS vector: an SVG is an XML document that can carry `<script>`, and a renamed `.html` file served from your domain runs with your origin's cookies. Unbounded sizes also let one user fill your R2 bucket.

**Fix (applied).** `POST /api/properties/:id/images` (a) allows only JPEG/PNG/WebP — **SVG is deliberately excluded**, (b) verifies **magic bytes**, not just the filename/Content-Type, (c) caps files at 8 MB and 20 images per listing, (d) generates **server-side UUID keys** so users never choose object paths, and (e) the asset route serves with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'`, so even a hostile file can't execute.

### 5. IDOR — editing/deleting other people's data
**Issue.** `PATCH /api/properties/17` with only "is logged in" as the check lets any user edit or delete any listing by guessing IDs. Same for requirements, favorites, and reading message threads.

**Fix (applied).** Every mutating route loads the row **scoped to the authenticated user** (`WHERE id = ? AND owner_id = ?` pattern, helper `loadOwned()`); message threads are only readable by their two participants; favorites and requirements are always filtered by `user_id`. Role-based access control on top: only `seller/landlord/broker/admin` can create listings (`requireRole`).

### 6. JWT secret in source / non-expiring tokens
**Issue.** Spec-style examples often hardcode the JWT secret in `wrangler.toml` (which gets committed). Anyone with repo access can mint admin tokens forever; tokens without `exp` never die.

**Fix (applied).** The secret is read from the `JWT_SECRET` **Wrangler secret** (never in the repo); `api/src/index.ts` fails fast at startup if it's missing or shorter than 32 chars. Tokens are HS256 with a **24-hour expiry**. Set it with:
```bash
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET
```

### 7. No rate limiting (brute force, spam, scraping)
**Issue.** Without limits, attackers brute-force login, mass-register accounts, spam your messaging system, and scrape your whole inventory.

**Fix (applied).** `api/src/middleware/rateLimit.ts` enforces per-IP limits: register 10/10 min, login 8/5 min, create-listing 30/h, upload 60/h, send-message 60/h. Note: this limiter is per Worker isolate (best effort) — pair it with **Cloudflare WAF rate-limiting rules** on `/api/auth/*` for a hard guarantee (free tier includes this).

### 8. CORS wildcard
**Issue.** `Access-Control-Allow-Origin: *` (the lazy default) lets any website call your API with users' tokens via XHR from malicious pages.

**Fix (applied).** CORS origins come from the `ALLOWED_ORIGINS` env var (comma-separated allowlist); unknown origins receive no CORS headers at all.

### 9. Leaking stack traces
**Issue.** Default error handlers return raw exception messages — table names, file paths, library versions — a roadmap for attackers.

**Fix (applied).** A central `onError` logs full details server-side (visible in `wrangler tail`) and returns only `{"error":"Something went wrong."}` with status 500 to the client. Validation errors return structured, intentional `fields` objects instead.

### 10. Missing security headers
**Fix (applied).** Middleware adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (clickjacking), `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy` on every response.

### 11. XSS in the frontend
**Issue.** Listing titles/descriptions are user-supplied; rendering them with `innerHTML` would execute injected scripts in every visitor's browser.

**Fix (applied).** The React app renders all user content through JSX text nodes (auto-escaped) and **never uses `dangerouslySetInnerHTML`**. Virtual-tour URLs are validated server-side to be `https://` URLs (blocking `javascript:` links) and rendered with `rel="noopener noreferrer"`.

### 12. Non-active listings leaking
**Issue.** Drafts and sold/inactive listings often remain fetchable by direct ID.

**Fix (applied).** `GET /api/properties/:id` returns 404 for non-active listings unless the requester is the owner or an admin.

---

## B. Bugs the spec's design would have caused

### 13. Money as floating point
**Why it matters.** `0.1 + 0.2 !== 0.3` in JS; float prices drift by cents and break filters and totals.
**Fix (applied).** Prices are stored as **integer cents** (`price_cents`), validated as integers, and formatted with `Intl.NumberFormat` only at display time. The UI accepts USD and converts (`Math.round(usd * 100)`).

### 14. Spec contradictions (would have shipped a broken stack)
The spec simultaneously asks for Flutter *and* React Native *and* React; PostgreSQL *and* D1; Supabase auth *and* a custom users table. These can't all be true.
**Resolution (applied).** One coherent stack matching your actual accounts: **Cloudflare Worker (Hono) + D1 + R2** with self-contained JWT auth (no Supabase dependency — your spec's own users/roles schema is the source of truth), a **React + Vite** web app deployable to Vercel or Cloudflare Pages, and **Google Play via TWA** wrapping the PWA (see DEPLOYMENT.md) instead of maintaining a third codebase.

### 15. Unvalidated input / type coercion bugs
**Why it matters.** `?page=99999999`, `bedrooms=-3`, or a 10 MB description either crash queries or poison data.
**Fix (applied).** Every request body and query string passes through **Zod schemas** (`api/src/lib/validate.ts`) with bounds: page ≤ 1000, perPage ≤ 50, prices bounded, enums for roles/types/statuses, password ≥ 10 chars with a letter and a number. Field-level errors flow back to the UI (`ApiError.fields`) and light up the exact form input.

### 16. Race/double-submit bugs in the UI
**Fix (applied).** All submit buttons disable while in flight (`busy`/`sending` state); effects use cancellation flags so a response arriving after navigation can't set state on an unmounted page; the favorites insert is `INSERT OR IGNORE` on a composite primary key, so double-clicking "Save" can't create duplicates.

### 17. Expired-session limbo
**Issue.** When a JWT expires mid-session, naive apps keep showing a logged-in UI while every call fails.
**Fix (applied).** The API client clears the stored token on any 401 and the auth provider drops the user, so the UI cleanly returns to logged-out state.

---

## C. Performance issues

### 18. Missing indexes → full table scans
**Why it matters.** D1 (SQLite) without indexes scans every row per search; fine at 100 listings, unusable at 100k.
**Fix (applied).** `schema.sql` creates a composite search index `(status, listing_type, property_type, city, price_cents)` plus indexes on owner, created_at, images(property_id), messages(recipient/sender), requirements(user_id).

### 19. N+1 queries
**Why it matters.** Fetching 24 search results and then 24 separate image queries multiplies latency.
**Fix (applied).** Cover images come back in the **same query** via a correlated subselect; the conversations inbox is a single CTE that also computes unread counts.

### 20. Unbounded result sets
**Fix (applied).** Hard caps everywhere: search `perPage ≤ 50`, threads limited to the latest 100 messages, "my listings"/favorites ≤ 200 rows.

### 21. Asset caching
**Fix (applied).** Images are immutable (UUID keys never change content), so they're served with `Cache-Control: public, max-age=31536000, immutable` — Cloudflare's edge cache absorbs nearly all image traffic, keeping R2 reads (and your bill) near zero.

### 22. Frontend weight
**Fix (applied).** No UI framework dependency — hand-rolled CSS design system; the whole app is ~69 kB gzipped JS. Images lazy-load (`loading="lazy"`); fonts load with `display=swap`.

---

## D. Code-quality decisions worth knowing about

**TypeScript strict mode everywhere** — both packages compile with `strict: true` and zero errors; the API excludes DOM types so Workers-only APIs are checked honestly.

**i18n is exhaustive by type** — the translation key type is derived from the English dictionary, so a missing Spanish key or a typo'd key is a *compile error*, not a silent English fallback in production.

**JWT in localStorage (trade-off, documented).** Tokens live in localStorage because the API and site are on different origins (Worker + Vercel), where cookies get fiddly. The XSS surface that makes localStorage risky is mitigated (no `dangerouslySetInnerHTML`, CSP on assets, escaped rendering) and tokens expire in 24 h. If you later serve API and site from one domain, switching to `HttpOnly; Secure; SameSite=Lax` cookies is a ~30-line change and strictly better.

**Features stored as JSON text** — parsed defensively (`safeFeatures`) so a corrupted row can never crash a listing page.

**Accessibility** — skip link, labeled inputs, `aria-label`s on icon buttons, focus-visible outlines, `prefers-reduced-motion` respected, WCAG-conscious contrast in both themes.

**What's deliberately out of MVP scope** (matching the spec's own "future feature" notes): Google Maps embedding (needs your API key + billing), mortgage calculator, scheduling, reviews, 2FA, and push notifications. The schema already stores latitude/longitude so maps can be added without migration.
