import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const favorites = new Hono<AppEnv>();
favorites.use('*', requireAuth);

favorites.get('/', async (c) => {
  const { id } = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.title, p.city, p.price_cents, p.currency, p.listing_type, p.property_type,
            p.bedrooms, p.bathrooms, p.status, f.created_at AS favorited_at,
            (SELECT r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position, i.id LIMIT 1) AS cover_key
     FROM favorites f JOIN properties p ON p.id = f.property_id
     WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 200`
  ).bind(id).all<{
    id: number; title: string; city: string; price_cents: number; currency: string;
    listing_type: string; property_type: string; bedrooms: number; bathrooms: number;
    status: string; favorited_at: string; cover_key: string | null;
  }>();
  return c.json({
    results: (rows.results ?? []).map((r) => ({
      id: r.id, title: r.title, city: r.city, priceCents: r.price_cents, currency: r.currency,
      listingType: r.listing_type, propertyType: r.property_type,
      bedrooms: r.bedrooms, bathrooms: r.bathrooms, status: r.status,
      favoritedAt: r.favorited_at,
      coverUrl: r.cover_key ? `/api/assets/${r.cover_key}` : null,
    })),
  });
});

favorites.post('/', async (c) => {
  const { id } = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const propertyId = Number((body as { propertyId?: unknown }).propertyId);
  if (!Number.isInteger(propertyId) || propertyId <= 0) return c.json({ error: 'Invalid listing.' }, 400);
  const prop = await c.env.DB.prepare(`SELECT id FROM properties WHERE id = ? AND status = 'active'`)
    .bind(propertyId).first();
  if (!prop) return c.json({ error: 'Listing not found.' }, 404);
  await c.env.DB.prepare('INSERT OR IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)')
    .bind(id, propertyId).run();
  return c.json({ saved: true }, 201);
});

favorites.delete('/:propertyId{[0-9]+}', async (c) => {
  const { id } = c.get('user');
  const propertyId = Number(c.req.param('propertyId'));
  await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND property_id = ?')
    .bind(id, propertyId).run();
  return c.json({ deleted: true });
});

export default favorites;
