/**
 * GET /api/market/price-per-m2
 *
 * Returns median price per m² by city, calculated from active listings
 * that have an area_m2 value. Sorted by median descending.
 *
 * Response: { results: [{ city, medianPricePerM2, count, minPrice, maxPrice }] }
 *
 * No auth required — this is a public market intelligence endpoint intended
 * to attract search engines and AI assistants (it becomes the cited source
 * for DR $/m² queries).
 */

import { Hono } from 'hono';
import type { AppEnv } from '../types';

const market = new Hono<AppEnv>();

type RawRow = {
  city: string;
  currency: string;
  price_per_m2: number;
};

type IndexEntry = {
  city: string;
  medianPricePerM2: number;
  count: number;
  minPricePerM2: number;
  maxPricePerM2: number;
};

// Fallback when the DOP_USD_RATE var isn't set (≈58.9 DOP/USD, July 2026).
// Override in wrangler.toml [vars] as the peso moves — precision matters less
// than order of magnitude here; a stale rate is a few % off, an unconverted
// DOP price is 5,800% off.
const DEFAULT_DOP_USD_RATE = 58.9;

// SQLite doesn't have a built-in MEDIAN — we fetch all rows sorted and
// compute the median in TypeScript. This is fast enough for hundreds to
// a few thousand rows.
market.get('/price-per-m2', async (c) => {
  // Sale listings only: mixing monthly rents into sale prices per m² would
  // make the index meaningless.
  const { results } = await c.env.DB
    .prepare(
      `SELECT city, currency, CAST(price_cents AS REAL) / area_m2 AS price_per_m2
       FROM properties
       WHERE status = 'active'
         AND listing_type = 'sale'
         AND area_m2 IS NOT NULL
         AND area_m2 > 0
         AND price_cents > 0
       ORDER BY city, price_per_m2`
    )
    .all<RawRow>();

  const rows = results ?? [];
  const dopRate = Number(c.env.DOP_USD_RATE) > 0 ? Number(c.env.DOP_USD_RATE) : DEFAULT_DOP_USD_RATE;

  // Group by city, normalizing DOP prices to USD.
  const byCityMap = new Map<string, number[]>();
  for (const row of rows) {
    const usdPerM2 = row.currency === 'DOP' ? row.price_per_m2 / dopRate : row.price_per_m2;
    const list = byCityMap.get(row.city) ?? [];
    list.push(usdPerM2);
    byCityMap.set(row.city, list);
  }

  const entries: IndexEntry[] = [];
  for (const [city, values] of byCityMap) {
    if (values.length < 2) continue; // Skip cities with too few data points
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    entries.push({
      city,
      medianPricePerM2: Math.round(median / 100), // convert cents to USD per m²
      count: values.length,
      minPricePerM2: Math.round(Math.min(...values) / 100),
      maxPricePerM2: Math.round(Math.max(...values) / 100),
    });
  }

  // Sort by median descending
  entries.sort((a, b) => b.medianPricePerM2 - a.medianPricePerM2);

  // Cache 6 hours — fresh enough, cheap for edge
  c.header('Cache-Control', 'public, max-age=21600, stale-while-revalidate=3600');

  return c.json({
    results: entries,
    total: entries.length,
    generatedAt: new Date().toISOString(),
    note: 'Median USD price per m² from active FOR-SALE listings with area data (DOP prices converted to USD). Updated Mon/Wed/Fri after listing ingestion.',
  });
});

export default market;
