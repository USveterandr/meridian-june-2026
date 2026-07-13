---
name: deployment-topology
description: Where Meridian's frontend, API, and custom domains actually live on Cloudflare
metadata:
  type: project
---

Meridian production topology (Cloudflare account 44488d79973a81689876492e372fe199), updated 2026-07-13 after the domain migration:

- **investwithmeridian.com + www + investwithmeridian.isaac-trinidad.com** are all custom domains on the **git-connected Pages project `meridian-mobile`** (repo USveterandr/meridian-june-2026, branch main, builds from repo root → `dist/`). **`git push origin main` = production deploy.** All three domains Active with SSL; DNS CNAMEs (@ and www → meridian-mobile.pages.dev, proxied) live in the investwithmeridian.com zone.
- The old **`meridian`** project (meridian-9st.pages.dev, direct-upload) no longer serves any custom domain — retired; do NOT dashboard-upload zips anymore.
- **API** = Worker `meridian-api` at `https://meridian-api.isaactrinidadllc.workers.dev`, deployed separately via `wrangler deploy` from api/ (frontend falls back to this hardcoded URL; VITE_API_URL unset).
- **Build pipeline** (web/package.json `build`): tsc → vite → prerender-blog.mjs → prerender-properties.mjs (fetches live API; falls back to scripts/listings-snapshot.json when offline, e.g. Claude sandbox) which also regenerates sitemap.xml and injects the homepage H1/static content into dist/index.html. See [[pages-functions-root]] — root functions/ re-export ships the per-listing OG function.
- Git pushes from the Claude sandbox need a user-supplied GitHub PAT (no stored credentials); pushing via `https://x-access-token:<PAT>@github.com/...` works.

Related: [[plan-id-mismatch]] (Stripe checkout still unreconciled).
