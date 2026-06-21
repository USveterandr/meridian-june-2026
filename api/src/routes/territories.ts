import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { MUNICIPIOS } from '../lib/municipios';

const territories = new Hono<AppEnv>();

const DR_GOV_BASE = 'https://api.digital.gob.do/v1/territories';

// Generic proxy helper — fetches from DR Gov API, caches in D1.
// The upstream API always wraps payloads as { valid: boolean, data: T }.
async function proxyWithCache(
  db: AppEnv['Bindings']['DB'],
  cacheKey: string,
  url: string
): Promise<unknown[]> {
  // Check D1 cache first (1-week TTL)
  const cached = await db
    .prepare('SELECT data, cached_at FROM territory_cache WHERE cache_key = ?')
    .bind(cacheKey)
    .first<{ data: string; cached_at: string }>();

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000) {
      return JSON.parse(cached.data) as unknown[];
    }
  }

  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`DR Gov API returned ${res.status}`);
  const body = await res.json() as { data?: unknown[] };
  const data = Array.isArray(body.data) ? body.data : [];

  // Upsert into cache
  await db
    .prepare(`INSERT INTO territory_cache (cache_key, data, cached_at)
              VALUES (?, ?, datetime('now'))
              ON CONFLICT(cache_key) DO UPDATE SET data = excluded.data, cached_at = excluded.cached_at`)
    .bind(cacheKey, JSON.stringify(data))
    .run();

  return data;
}

// ── Regions ────────────────────────────────────────────────────────────────
territories.get('/regions', async (c) => {
  try {
    const data = await proxyWithCache(c.env.DB, 'regions', `${DR_GOV_BASE}/regions`);
    return c.json(data);
  } catch {
    return c.json({ error: 'Could not load regions.' }, 502);
  }
});

// ── Provinces ──────────────────────────────────────────────────────────────
territories.get('/provinces', async (c) => {
  const regionCode = c.req.query('regionCode') ?? '';
  const key = regionCode ? `provinces_${regionCode}` : 'provinces_all';
  const url = regionCode
    ? `${DR_GOV_BASE}/regions/${regionCode}/provinces`
    : `${DR_GOV_BASE}/provinces`;

  try {
    const data = await proxyWithCache(c.env.DB, key, url);
    return c.json(data);
  } catch {
    return c.json({ error: 'Could not load provinces.' }, 502);
  }
});

// ── Municipalities ─────────────────────────────────────────────────────────
// Served from a bundled static dataset (api/src/lib/municipios.ts) rather
// than the upstream DR Gov API: that API is missing municipio data for 11 of
// the 32 provinces and has no per-province endpoint at all.
territories.get('/municipalities', (c) => {
  const provinceCode = c.req.query('provinceCode') ?? '';
  if (!provinceCode) return c.json({ error: 'provinceCode is required.' }, 400);
  return c.json(MUNICIPIOS.filter((m) => m.provinceCode === provinceCode));
});

export default territories;
