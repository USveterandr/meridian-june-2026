/**
 * Scrape dry-run harness.
 *
 * Validates the full licensed-feed import DECISION path — fetch shape →
 * normalize → canonical-market resolution → target-market prioritization —
 * without any live credentials, network calls, or database writes. It answers
 * the only question that matters before pointing the real pipeline at prod:
 * "given feed rows like these, what would we import, and under which markets?"
 *
 * Run:
 *   cd api && npx tsx scripts/scrape-dry-run.ts
 *
 * If EVERYLISTING_API_USER / EVERYLISTING_API_PASS are exported in the shell,
 * pass --live to additionally hit the real /status endpoint (read-only):
 *   EVERYLISTING_API_USER=... EVERYLISTING_API_PASS=... npx tsx scripts/scrape-dry-run.ts --live
 */

import {
  normalizeEveryListingProperty,
  sortByMarketPriority,
  fetchEveryListingStatus,
  type EveryListingRawProperty,
} from '../src/lib/everylisting';
import { resolveMarket, TARGET_MARKETS } from '../src/lib/markets';

// Representative feed rows. Mix of target markets (under various neighborhood
// spellings), non-target qualifying markets, and rows that MUST be rejected
// (sub-threshold price, non-imported type, rent, missing title).
const SAMPLE_FEED: EveryListingRawProperty[] = [
  { id: 1, title: 'Cocotal Golf Villa', property_type: 'villa', price_usd: 690000, currency: 'USD', city: 'Bávaro', address: 'Cocotal Country Club', bedrooms: 4, bathrooms: 4 },
  { id: 2, title: 'Marina Estate', property_type: 'villa', price_usd: 3900000, currency: 'USD', city: 'Juanillo', address: 'Marina, Cap Cana', bedrooms: 5, bathrooms: 6 },
  { id: 3, title: 'Verón Investment Condo', property_type: 'apartment', price_usd: 520000, currency: 'USD', city: 'Verón Punta Cana', bedrooms: 2, bathrooms: 2 },
  { id: 4, title: 'Playa Bonita Beach House', property_type: 'villa', price_usd: 750000, currency: 'USD', city: 'Playa Bonita', address: 'Las Terrenas', bedrooms: 3, bathrooms: 3 },
  { id: 5, title: 'Las Galeras Ocean Lot', property_type: 'land', price_usd: 600000, currency: 'USD', city: 'Las Galeras', state: 'Samaná' },
  { id: 6, title: 'Piantini Tower Residence', property_type: 'apartment', price_usd: 545000, currency: 'USD', city: 'Piantini', address: 'Calle A. J. Aybar', bedrooms: 2, bathrooms: 2 },
  { id: 7, title: 'Casa de Campo Villa', property_type: 'villa', price_usd: 2100000, currency: 'USD', city: 'Casa de Campo', address: 'La Romana', bedrooms: 5, bathrooms: 5 },
  { id: 8, title: 'RD Priced Penthouse', property_type: 'apartment', price: 26000000, currency: 'DOP', city: 'Naco', bedrooms: 3, bathrooms: 3 },
  // ── Rows that should be rejected ──────────────────────────────────────
  { id: 9, title: 'Budget Studio', property_type: 'apartment', price_usd: 80000, currency: 'USD', city: 'Bávaro' }, // under $500k
  { id: 10, title: 'Rental Villa', property_type: 'villa', price_usd: 700000, currency: 'USD', listing_type: 'rent', city: 'Cap Cana' }, // rent (kept but flagged rent)
  { id: 11, title: 'Office Floor', property_type: 'office', price_usd: 900000, currency: 'USD', city: 'Santo Domingo' }, // type not imported
  { id: 12, property_type: 'villa', price_usd: 900000, currency: 'USD', city: 'Samaná' }, // missing title
];

function rejectionReason(raw: EveryListingRawProperty): string {
  const type = (raw.property_type ?? raw.type ?? raw.category ?? '').toString().toLowerCase();
  const importable = ['land', 'lot', 'terreno', 'apartment', 'apartamento', 'condo', 'villa', 'hotel', 'commercial', 'comercial'];
  if (!importable.some((t) => type.includes(t))) return `type "${type || '—'}" not imported`;
  if (!(raw.title ?? raw.name)) return 'missing title';
  const price = Number(String(raw.price_usd ?? raw.price ?? '').replace(/[^0-9.]/g, ''));
  const isDop = (raw.currency ?? 'USD').toString().toUpperCase() === 'DOP';
  if (!price) return 'no price';
  if (isDop ? price < 20_000_000 : price < 500_000) return `below threshold (${isDop ? 'RD$' : '$'}${price.toLocaleString()})`;
  return 'unknown';
}

function money(cents: number, currency: string): string {
  return `${currency === 'DOP' ? 'RD$' : '$'}${(cents / 100).toLocaleString()}`;
}

function main() {
  console.log('\n=== Meridian scrape dry-run (no network, no DB) ===\n');

  const kept: ReturnType<typeof normalizeEveryListingProperty>[] = [];
  const rejected: { raw: EveryListingRawProperty; reason: string }[] = [];

  for (const raw of SAMPLE_FEED) {
    const norm = normalizeEveryListingProperty(raw);
    if (norm) kept.push(norm);
    else rejected.push({ raw, reason: rejectionReason(raw) });
  }

  const ordered = sortByMarketPriority(
    kept.filter((p): p is NonNullable<typeof p> => p !== null),
    true
  );

  console.log(`Feed rows in:        ${SAMPLE_FEED.length}`);
  console.log(`Would import:        ${ordered.length}`);
  console.log(`Rejected:            ${rejected.length}\n`);

  console.log('── Import order (target markets first) ──');
  for (const p of ordered) {
    const { region, isTarget } = resolveMarket(p!.city);
    const flag = isTarget ? '★ TARGET' : '        ';
    console.log(
      `  ${flag}  ${p!.city.padEnd(14)} ${region.padEnd(18)} ${p!.listingType.padEnd(5)} ${money(p!.priceCents, p!.currency).padStart(12)}  ${p!.title}`
    );
  }

  console.log('\n── Rejected ──');
  for (const { raw, reason } of rejected) {
    console.log(`  ✗  ${(raw.title ?? '(no title)').toString().padEnd(22)} ${reason}`);
  }

  // Coverage summary: how many of the promoted markets got at least one listing.
  const byMarket = new Map<string, number>();
  for (const p of ordered) byMarket.set(p!.city, (byMarket.get(p!.city) ?? 0) + 1);

  console.log('\n── Market coverage ──');
  for (const [city, n] of [...byMarket.entries()].sort((a, b) => b[1] - a[1])) {
    const star = (TARGET_MARKETS as readonly string[]).includes(city) ? ' ★' : '';
    console.log(`  ${city.padEnd(16)} ${n}${star}`);
  }

  const covered = TARGET_MARKETS.filter((t) => byMarket.has(t));
  const missing = TARGET_MARKETS.filter((t) => !byMarket.has(t));
  console.log(`\nPromoted-market coverage: ${covered.length}/${TARGET_MARKETS.length} (${covered.join(', ') || 'none'})`);
  if (missing.length) console.log(`Still empty:              ${missing.join(', ')}`);

  // Assertion: the harness fails loudly if the sample feed didn't light up
  // every promoted market — a canary for regressions in the resolver.
  if (missing.length) {
    console.error(`\n✗ Dry-run FAILED: promoted markets still empty: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('\n✓ Dry-run OK: every promoted market received at least one qualifying listing.\n');
}

async function liveStatus() {
  const user = process.env.EVERYLISTING_API_USER;
  const pass = process.env.EVERYLISTING_API_PASS;
  if (!user || !pass) {
    console.error('--live requested but EVERYLISTING_API_USER / EVERYLISTING_API_PASS are not set.');
    process.exit(2);
  }
  console.log('\n── Live /status check ──');
  try {
    const status = await fetchEveryListingStatus({ user, pass });
    console.log('  reachable:', JSON.stringify(status));
  } catch (err) {
    console.error('  failed:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
if (process.argv.includes('--live')) {
  liveStatus();
}
