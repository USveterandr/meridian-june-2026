#!/usr/bin/env bash
# =============================================================================
# Meridian — Full Cloudflare Deployment Script
# Run from the project root: ./deploy.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/api"
WEB_DIR="$ROOT/web"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│        MERIDIAN — Cloudflare Deployment                 │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# ── Step 1: Check wrangler login ─────────────────────────────────────────────
echo "▶ Step 1/6  Checking Cloudflare authentication..."
if ! npx wrangler whoami --cwd "$API_DIR" > /dev/null 2>&1; then
  echo ""
  echo "  ⚠️  Not logged in. Opening browser for OAuth..."
  echo ""
  npx wrangler login --cwd "$API_DIR"
fi
echo "  ✅ Authenticated."

# ── Step 2: Apply DB schema to remote D1 ────────────────────────────────────
echo ""
echo "▶ Step 2/6  Applying schema to remote D1 (meridian-db)..."
cd "$API_DIR"
npx wrangler d1 execute meridian-db --remote --file=./schema.sql
echo "  ✅ Schema applied."

# ── Step 3: Set JWT_SECRET if not already set ────────────────────────────────
echo ""
echo "▶ Step 3/6  Setting JWT_SECRET..."
echo "  (If prompted, press Enter to keep existing secret or type a new one)"
echo ""
JWT_VAL=$(openssl rand -base64 48)
echo "$JWT_VAL" | npx wrangler secret put JWT_SECRET
echo "  ✅ JWT_SECRET set."

# ── Step 4: Deploy API Worker ─────────────────────────────────────────────────
echo ""
echo "▶ Step 4/6  Deploying API Worker (meridian-api)..."
cd "$API_DIR"
DEPLOY_OUTPUT=$(npx wrangler deploy)
echo "$DEPLOY_OUTPUT"
WORKER_URL=$(printf '%s\n' "$DEPLOY_OUTPUT" | awk '/^  https:\/\// {print $1; exit}')
if [ -z "$WORKER_URL" ]; then
  WORKER_URL="https://meridian-api.YOUR_SUBDOMAIN.workers.dev"
  echo "  ℹ️  Could not auto-detect Worker URL. Check Cloudflare dashboard."
else
  echo "  🌐 API URL: $WORKER_URL"
fi

# ── Step 5: Build web frontend ────────────────────────────────────────────────
echo ""
echo "▶ Step 5/6  Building web frontend..."
cd "$WEB_DIR"

# Set production API URL
export VITE_API_URL="$WORKER_URL"
echo "  VITE_API_URL=$VITE_API_URL"
npm run build
echo "  ✅ Frontend built."

# ── Step 6: Deploy to Cloudflare Pages ───────────────────────────────────────
echo ""
echo "▶ Step 6/6  Deploying to Cloudflare Pages (meridian)..."
cd "$WEB_DIR"
npx wrangler pages deploy dist --project-name meridian --branch main --commit-dirty=true
echo "  ✅ Frontend deployed to Cloudflare Pages."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│  🎉 DEPLOYMENT COMPLETE                                 │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""
echo "  API Worker : $WORKER_URL"
echo "  Web App    : https://meridian.pages.dev"
echo ""
echo "  ⚡ POST-DEPLOY CHECKLIST:"
echo "  1. Run smoke test:"
echo "     curl $WORKER_URL/api/health"
echo "  2. Seed subscription plans (log in as admin, then):"
echo "     curl -X POST $WORKER_URL/api/plans/seed -H 'Authorization: Bearer YOUR_TOKEN'"
echo "  3. If using a custom domain (investwithmeridian.com):"
echo "     - Cloudflare Dashboard → Pages → meridian → Custom domains → Add"
echo "     - Update ALLOWED_ORIGINS in api/wrangler.toml and redeploy API"
echo "  4. Set up Google Search Console and submit:"
echo "     https://meridian.pages.dev/sitemap.xml"
echo ""
