import { Hono } from 'hono';
import { requirementSchema, flattenZodError } from '../lib/validate';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const requirements = new Hono<AppEnv>();
requirements.use('*', requireAuth);

type ReqRow = {
  id: number; user_id: number; title: string; listing_type: string;
  property_type: string | null; city: string | null; max_price_cents: number | null;
  min_bedrooms: number; min_bathrooms: number; notes: string; created_at: string;
};

function publicReq(r: ReqRow) {
  return {
    id: r.id, title: r.title, listingType: r.listing_type, propertyType: r.property_type,
    city: r.city, maxPriceCents: r.max_price_cents, minBedrooms: r.min_bedrooms,
    minBathrooms: r.min_bathrooms, notes: r.notes, createdAt: r.created_at,
  };
}

requirements.get('/', async (c) => {
  const { id } = c.get('user');
  const rows = await c.env.DB.prepare('SELECT * FROM requirements WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .bind(id).all<ReqRow>();
  return c.json({ results: (rows.results ?? []).map(publicReq) });
});

requirements.post('/', async (c) => {
  const parsed = requirementSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const { id } = c.get('user');
  const r = parsed.data;
  const row = await c.env.DB.prepare(
    `INSERT INTO requirements (user_id, title, listing_type, property_type, city, max_price_cents, min_bedrooms, min_bathrooms, notes)
     VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`
  ).bind(id, r.title, r.listingType, r.propertyType ?? null, r.city ?? null,
    r.maxPriceCents ?? null, r.minBedrooms, r.minBathrooms, r.notes).first<ReqRow>();
  if (!row) return c.json({ error: 'The requirement could not be saved.' }, 500);
  return c.json({ requirement: publicReq(row) }, 201);
});

requirements.delete('/:id{[0-9]+}', async (c) => {
  const { id: userId } = c.get('user');
  const id = Number(c.req.param('id'));
  // Scoped to user_id: a user can never delete someone else's requirement.
  await c.env.DB.prepare('DELETE FROM requirements WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ deleted: true });
});

// Active listings matching one of the user's saved requirements.
requirements.get('/:id{[0-9]+}/matches', async (c) => {
  const { id: userId } = c.get('user');
  const id = Number(c.req.param('id'));
  const req = await c.env.DB.prepare('SELECT * FROM requirements WHERE id = ? AND user_id = ?')
    .bind(id, userId).first<ReqRow>();
  if (!req) return c.json({ error: 'Requirement not found.' }, 404);

  const where: string[] = [`status = 'active'`, 'listing_type = ?', 'bedrooms >= ?', 'bathrooms >= ?'];
  const binds: unknown[] = [req.listing_type, req.min_bedrooms, req.min_bathrooms];
  if (req.property_type) { where.push('property_type = ?'); binds.push(req.property_type); }
  if (req.city) { where.push('city LIKE ? ESCAPE \'\\\''); binds.push(`%${req.city.replace(/[%_\\]/g, '\\$&')}%`); }
  if (req.max_price_cents) { where.push('price_cents <= ?'); binds.push(req.max_price_cents); }

  const rows = await c.env.DB.prepare(
    `SELECT id, title, city, price_cents, currency, listing_type, property_type, bedrooms, bathrooms,
            (SELECT r2_key FROM property_images i WHERE i.property_id = properties.id ORDER BY i.position, i.id LIMIT 1) AS cover_key
     FROM properties WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 30`
  ).bind(...binds).all<{
    id: number; title: string; city: string; price_cents: number; currency: string;
    listing_type: string; property_type: string; bedrooms: number; bathrooms: number; cover_key: string | null;
  }>();
  return c.json({
    results: (rows.results ?? []).map((r) => ({
      id: r.id, title: r.title, city: r.city, priceCents: r.price_cents, currency: r.currency,
      listingType: r.listing_type, propertyType: r.property_type,
      bedrooms: r.bedrooms, bathrooms: r.bathrooms,
      coverUrl: r.cover_key ? `/api/assets/${r.cover_key}` : null,
    })),
  });
});

export default requirements;
