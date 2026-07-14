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
  price_per_m2: number;
};

type IndexEntry = {
  city: string;
  medianPricePerM2: number;
  count: number;
  minPricePerM2: number;
  maxPricePerM2: number;
};

// SQLite doesn't have a built-in MEDIAN — we fetch all rows sorted and
// compute the median in TypeScript. This is fast enough for hundreds to
// a few thousand rows.
market.get('/price-per-m2', async (c) => {
  const { results } = await c.env.DB
    .prepare(
      `SELECT city, CAST(price_cents AS REAL) / area_m2 AS price_per_m2
       FROM properties
       WHERE status = 'active'
         AND area_m2 IS NOT NULL
         AND area_m2 > 0
         AND price_cents > 0
       ORDER BY city, price_per_m2`
    )
    .all<RawRow>();

  const rows = results ?? [];

  // Group by city
  const byCityMap = new Map<string, number[]>();
  for (const row of rows) {
    const list = byCityMap.get(row.city) ?? [];
    list.push(row.price_per_m2);
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
    note: 'Median USD price per m² from active listings with area data. Updated Mon/Wed/Fri after listing ingestion.',
  });
});

export default market;
