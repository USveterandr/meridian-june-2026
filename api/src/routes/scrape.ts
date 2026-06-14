import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import { importListings, importScrapedProperties } from '../lib/scraper';
import { fetchAndNormalizeEveryListingProperties, fetchEveryListingStatus } from '../lib/everylisting';
import type { AppEnv } from '../types';
import { logger } from '../lib/logger';

const scrape = new Hono<AppEnv>();

// Scraper is protected: only admins can trigger data crawling/ingestion.
scrape.post('/', requireAuth, requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  
  let minPrice = Number(body.minPrice ?? c.req.query('minPrice'));
  if (isNaN(minPrice) || minPrice <= 0) {
    minPrice = 100000; // default to $100,000 USD
  }

  const user = c.get('user');

  try {
    const importedCount = await importListings(c.env.DB, c.env.ASSETS, minPrice, user.id);
    return c.json({
      success: true,
      importedCount,
      message: `Scrape complete. Imported ${importedCount} properties above $${minPrice.toLocaleString()} USD.`,
    });
    } catch (err) {
    logger.error('Scraper execution failed', { error: err });
    return c.json({ error: 'Failed to complete property scraping.' }, 500);
  }
});

// ─── EveryListing.com WWLS Pipes integration ──────────────────────────────
// Imports DR land/apartment/villa/hotel/commercial-land listings priced at
// $500K+ USD or RD$20M+ from the EveryListing.com "WWLS Pipes" API. Requires
// EVERYLISTING_API_USER / EVERYLISTING_API_PASS secrets — see lib/everylisting.ts.

// Status check: verifies credentials are configured and the pipe is reachable.
scrape.get('/everylisting/status', requireAuth, requireRole('admin'), async (c) => {
  const user = c.env.EVERYLISTING_API_USER;
  const pass = c.env.EVERYLISTING_API_PASS;
  if (!user || !pass) {
    return c.json(
      { configured: false, error: 'EVERYLISTING_API_USER / EVERYLISTING_API_PASS are not set.' },
      501
    );
  }

  try {
    const status = await fetchEveryListingStatus({ user, pass });
    return c.json({ configured: true, status });
  } catch (err) {
    logger.error('EveryListing status check failed', { error: err });
    return c.json({ configured: true, error: 'Failed to reach EveryListing API.' }, 502);
  }
});

// Fetch + import: pulls up to `amount` (1-10) listings, normalizes them, and
// imports any that qualify (land/apartment/villa/hotel/commercial-land,
// $500K+ USD or RD$20M+ DOP).
scrape.post('/everylisting', requireAuth, requireRole('admin'), async (c) => {
  const user = c.env.EVERYLISTING_API_USER;
  const pass = c.env.EVERYLISTING_API_PASS;
  if (!user || !pass) {
    return c.json(
      { error: 'EveryListing API is not configured. Set EVERYLISTING_API_USER / EVERYLISTING_API_PASS.' },
      501
    );
  }

  const body = await c.req.json().catch(() => ({}));
  let amount = Number(body.amount ?? c.req.query('amount'));
  if (isNaN(amount) || amount <= 0) amount = 10;

  const authedUser = c.get('user');

  try {
    const qualifying = await fetchAndNormalizeEveryListingProperties({ user, pass }, amount);
    const importedCount = await importScrapedProperties(c.env.DB, c.env.ASSETS, qualifying, authedUser.id);
    return c.json({
      success: true,
      fetched: amount,
      qualifying: qualifying.length,
      importedCount,
      message: `Imported ${importedCount} of ${qualifying.length} qualifying EveryListing properties.`,
    });
  } catch (err) {
    logger.error('EveryListing scrape failed', { error: err });
    return c.json({ error: 'Failed to import EveryListing properties.' }, 502);
  }
});

export default scrape;
