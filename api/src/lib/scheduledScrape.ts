// Scheduled listing ingestion — runs from the Worker cron (Mon/Wed/Fri).
//
// Pulls fresh Dominican Republic listings from every configured source and
// imports the ones that qualify, keeping inventory growing without manual
// admin action. Each source is optional: if its secret isn't set, it is
// skipped with a log line rather than failing the whole run.
//
// Sources:
//  - supercasas.com via ScrapingBee (SCRAPINGBEE_API_KEY) — category rotates
//    by weekday so the week covers apartments, houses, and villas.
//  - EveryListing WWLS pipe (EVERYLISTING_API_USER / EVERYLISTING_API_PASS).
//
// Imported listings are owned by the platform account
// (admin@investwithmeridian.com), falling back to user id 1.

import { importScrapedProperties } from './scraper';
import { fetchSupercasasListings, type SupercasasCategory } from './portals/supercasas';
import { fetchAndNormalizeEveryListingProperties } from './everylisting';
import { sendMatchAlerts } from './matchAlerts';
import { sendPriceDropAlerts, type PriceDrop } from './priceDropAlerts';
import { logger } from './logger';
import type { Bindings } from '../types';

// Mon → apartamentos, Wed → casas, Fri → villas (UTC day-of-week).
const CATEGORY_BY_DAY: Record<number, SupercasasCategory> = {
  1: 'apartamentos',
  3: 'casas',
  5: 'villas',
};

export async function runScheduledScrape(env: Bindings): Promise<{ imported: number; sources: string[]; alertsSent: number; dropAlertsSent: number }> {
  // D1's datetime('now') format, captured before imports so we can find the
  // listings this run created and alert matching users afterwards.
  const startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const owner = await env.DB
    .prepare(`SELECT id FROM users WHERE email = 'admin@investwithmeridian.com'`)
    .first<{ id: number }>();
  const ownerId = owner?.id ?? 1;

  let imported = 0;
  const sources: string[] = [];
  const allPriceDrops: PriceDrop[] = [];

  // ── supercasas.com (rotating category) ────────────────────────────────
  if (env.SCRAPINGBEE_API_KEY) {
    const category = CATEGORY_BY_DAY[new Date().getUTCDay()] ?? 'apartamentos';
    try {
      const listings = await fetchSupercasasListings(env.SCRAPINGBEE_API_KEY, category);
      const result = await importScrapedProperties(env.DB, env.ASSETS, listings, ownerId);
      imported += result.imported;
      allPriceDrops.push(...result.priceDrops);
      sources.push(`supercasas/${category}:${result.imported}`);
      logger.info('Scheduled scrape: supercasas complete', { category, fetched: listings.length, imported: result.imported, drops: result.priceDrops.length });
    } catch (err) {
      logger.error('Scheduled scrape: supercasas failed', { error: err instanceof Error ? err.message : err });
    }
  } else {
    logger.info('Scheduled scrape: SCRAPINGBEE_API_KEY not set — skipping supercasas');
  }

  // ── EveryListing WWLS pipe ────────────────────────────────────────────
  if (env.EVERYLISTING_API_USER && env.EVERYLISTING_API_PASS) {
    try {
      const qualifying = await fetchAndNormalizeEveryListingProperties(
        { user: env.EVERYLISTING_API_USER, pass: env.EVERYLISTING_API_PASS },
        10
      );
      const result = await importScrapedProperties(env.DB, env.ASSETS, qualifying, ownerId);
      imported += result.imported;
      allPriceDrops.push(...result.priceDrops);
      sources.push(`everylisting:${result.imported}`);
      logger.info('Scheduled scrape: everylisting complete', { qualifying: qualifying.length, imported: result.imported, drops: result.priceDrops.length });
    } catch (err) {
      logger.error('Scheduled scrape: everylisting failed', { error: err instanceof Error ? err.message : err });
    }
  } else {
    logger.info('Scheduled scrape: EveryListing credentials not set — skipping');
  }

  // ── New-match alert emails (the retention loop) ───────────────────────
  let alertsSent = 0;
  if (imported > 0) {
    try {
      alertsSent = await sendMatchAlerts(env, startedAt);
    } catch (err) {
      logger.error('Match alerts failed', { error: err instanceof Error ? err.message : err });
    }
  }

  // ── Price-drop alerts on favorites ───────────────────────────────────
  let dropAlertsSent = 0;
  if (allPriceDrops.length > 0) {
    try {
      const result = await sendPriceDropAlerts(env, allPriceDrops);
      dropAlertsSent = result.sent;
    } catch (err) {
      logger.error('Price-drop alerts failed', { error: err instanceof Error ? err.message : err });
    }
  }

  return { imported, sources, alertsSent, dropAlertsSent };
}
