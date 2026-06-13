import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import { importListings } from '../lib/scraper';
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

export default scrape;
