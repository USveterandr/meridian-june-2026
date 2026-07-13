import { Hono } from 'hono';
import {
  propertySchema,
  propertyPatchSchema,
  searchSchema,
  flattenZodError,
} from '../lib/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { LISTING_ROLES, type AppEnv } from '../types';
import { MAX_IMAGE_BYTES, sniffImageType } from '../lib/imageValidation';
import { geocodeAddress } from '../lib/geocode';

const properties = new Hono<AppEnv>();

const MAX_IMAGES_PER_PROPERTY = 20;
// SVG is deliberately excluded: SVGs can contain scripts (stored XSS).
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type PropertyRow = {
  id: number; owner_id: number; title: string; description: string;
  property_type: string; listing_type: string; price_cents: number; currency: string;
  address: string; city: string; country: string; latitude: number | null; longitude: number | null;
  bedrooms: number; bathrooms: number; area_m2: number | null; lot_m2: number | null;
  year_built: number | null; features: string; virtual_tour_url: string | null;
  status: string; created_at: string; updated_at: string;
};
type ImageRow = { id: number; r2_key: string; position: number };

function safeFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : [];
  } catch { return []; }
}

function publicProperty(p: PropertyRow, images: ImageRow[] = []) {
  return {
    id: p.id, ownerId: p.owner_id, title: p.title, description: p.description,
    propertyType: p.property_type, listingType: p.listing_type,
    priceCents: p.price_cents, currency: p.currency,
    address: p.address, city: p.city, country: p.country,
    latitude: p.latitude, longitude: p.longitude,
    bedrooms: p.bedrooms, bathrooms: p.bathrooms,
    areaM2: p.area_m2, lotM2: p.lot_m2, yearBuilt: p.year_built,
    features: safeFeatures(p.features), virtualTourUrl: p.virtual_tour_url,
    status: p.status, createdAt: p.created_at, updatedAt: p.updated_at,
    images: images.map((i) => ({ id: i.id, url: `/api/assets/${i.r2_key}`, position: i.position })),
  };
}

// ---- Search (public) ----
properties.get('/', async (c) => {
  const parsed = searchSchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: 'Invalid search filters.', fields: flattenZodError(parsed.error) }, 400);
  const q = parsed.data;

  // WHERE clauses are fixed strings; every user value is a bound parameter.
  const where: string[] = [`status = 'active'`];
  const binds: unknown[] = [];
  if (q.listingType) { where.push('listing_type = ?'); binds.push(q.listingType); }
  if (q.propertyType) { where.push('property_type = ?'); binds.push(q.propertyType); }
  if (q.city) { where.push('city LIKE ? ESCAPE \'\\\''); binds.push(`%${q.city.replace(/[%_\\]/g, '\\$&')}%`); }
  if (q.minPrice !== undefined) { where.push('price_cents >= ?'); binds.push(q.minPrice); }
  if (q.maxPrice !== undefined) { where.push('price_cents <= ?'); binds.push(q.maxPrice); }
  if (q.minBeds !== undefined) { where.push('bedrooms >= ?'); binds.push(q.minBeds); }
  if (q.minBaths !== undefined) { where.push('bathrooms >= ?'); binds.push(q.minBaths); }
  if (q.q) {
    where.push('(title LIKE ? ESCAPE \'\\\' OR description LIKE ? ESCAPE \'\\\')');
    const like = `%${q.q.replace(/[%_\\]/g, '\\$&')}%`;
    binds.push(like, like);
  }

  const orderBy =
    q.sort === 'price_asc' ? 'price_cents ASC' :
    q.sort === 'price_desc' ? 'price_cents DESC' :
    'created_at DESC';

  const whereSql = where.join(' AND ');
  const offset = (q.page - 1) * q.perPage;

  const [countRow, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM properties WHERE ${whereSql}`).bind(...binds).first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT p.*,
              (SELECT r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position, i.id LIMIT 1) AS cover_key
       FROM properties p WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    ).bind(...binds, q.perPage, offset).all<PropertyRow & { cover_key: string | null }>(),
  ]);

  const total = countRow?.n ?? 0;
  return c.json({
    total,
    page: q.page,
    perPage: q.perPage,
    results: (rows.results ?? []).map((p) => ({
      ...publicProperty(p),
      coverUrl: p.cover_key ? `/api/assets/${p.cover_key}` : null,
    })),
  });
});

// ---- Detail (public for active; owner/admin can see any status) ----
properties.get('/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'));
  const prop = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first<PropertyRow>();
  if (!prop) return c.json({ error: 'Listing not found.' }, 404);

  if (prop.status !== 'active') {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const { readToken } = await import('../lib/jwt');
    const user = token ? await readToken(token, c.env.JWT_SECRET) : null;
    const allowed = user && (user.id === prop.owner_id || user.role === 'admin');
    if (!allowed) return c.json({ error: 'Listing not found.' }, 404);
  }

  const images = await c.env.DB.prepare(
    'SELECT id, r2_key, position FROM property_images WHERE property_id = ? ORDER BY position, id'
  ).bind(id).all<ImageRow>();
  return c.json({ property: publicProperty(prop, images.results ?? []) });
});

// ---- My listings ----
properties.get('/mine', requireAuth, async (c) => {
  const { id } = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT p.*,
            (SELECT r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position, i.id LIMIT 1) AS cover_key
     FROM properties p WHERE owner_id = ? ORDER BY created_at DESC LIMIT 200`
  ).bind(id).all<PropertyRow & { cover_key: string | null }>();
  return c.json({
    results: (rows.results ?? []).map((p) => ({
      ...publicProperty(p),
      coverUrl: p.cover_key ? `/api/assets/${p.cover_key}` : null,
    })),
  });
});

// ---- Create ----
properties.post('/', requireAuth, requireRole(...LISTING_ROLES), rateLimit('create-listing', 30, 3600), async (c) => {
  const parsed = propertySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const p = parsed.data;
  const user = c.get('user');

  // ---- Plan listing limit (FREE Start = 1, TEAM = 100, PRO/ENTERPRISE = unlimited) ----
  if (user.role !== 'admin') {
    const sub = await c.env.DB.prepare(
      `SELECT s.current_period_end, pl.features FROM subscriptions s
       JOIN plans pl ON s.plan_id = pl.id
       WHERE s.user_id = ? AND s.status IN ('active','trialing')
       ORDER BY s.created_at DESC LIMIT 1`
    ).bind(user.id).first<{ current_period_end: string | null; features: string }>();

    const subValid = sub && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    const features: string[] = subValid ? JSON.parse(sub!.features ?? '[]') : [];
    const limit = features.includes('unlimited_listings') ? Infinity
      : features.includes('listings_limit_100') ? 100
      : 1; // FREE Start (or no/expired subscription)

    if (limit !== Infinity) {
      const count = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM properties WHERE owner_id = ? AND status NOT IN ('sold','rented','inactive')`
      ).bind(user.id).first<{ n: number }>();
      if ((count?.n ?? 0) >= limit) {
        return c.json({
          error: limit === 1
            ? 'Your FREE Start plan includes 1 active listing. Upgrade your plan to list more properties.'
            : `Your plan allows up to ${limit} active listings. Upgrade to list more properties.`,
          upgrade: true,
        }, 403);
      }
    }
  }

  // Geocode the address when the client didn't supply coordinates, so every
  // listing can be placed on the map without the user needing to know its
  // lat/lng. Best-effort: a failed lookup just leaves latitude/longitude null.
  let latitude = p.latitude ?? null;
  let longitude = p.longitude ?? null;
  if (latitude === null && longitude === null && c.env.GOOGLE_MAPS_SERVER_KEY) {
    const geocoded = await geocodeAddress(c.env.GOOGLE_MAPS_SERVER_KEY, p.address, p.city, p.country);
    if (geocoded) { latitude = geocoded.latitude; longitude = geocoded.longitude; }
  }

  const row = await c.env.DB.prepare(
    `INSERT INTO properties
       (owner_id, title, description, property_type, listing_type, price_cents, currency,
        address, city, country, latitude, longitude, bedrooms, bathrooms, area_m2, lot_m2,
        year_built, features, virtual_tour_url, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`
  ).bind(
    user.id, p.title, p.description, p.propertyType, p.listingType, p.priceCents, p.currency,
    p.address, p.city, p.country, latitude, longitude, p.bedrooms, p.bathrooms,
    p.areaM2 ?? null, p.lotM2 ?? null, p.yearBuilt ?? null, JSON.stringify(p.features),
    p.virtualTourUrl ?? null, p.status
  ).first<PropertyRow>();
  if (!row) return c.json({ error: 'The listing could not be saved. Please try again.' }, 500);
  return c.json({ property: publicProperty(row) }, 201);
});

// Loads a property only if the requester owns it (or is admin). Central
// ownership check = no IDOR on edit/delete/image routes.
async function loadOwned(c: { env: AppEnv['Bindings'] }, id: number, userId: number, role: string) {
  const prop = await c.env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first<PropertyRow>();
  if (!prop) return { prop: null, forbidden: false };
  if (prop.owner_id !== userId && role !== 'admin') return { prop: null, forbidden: true };
  return { prop, forbidden: false };
}

// ---- Update ----
properties.patch('/:id{[0-9]+}', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user');
  const { prop, forbidden } = await loadOwned(c, id, user.id, user.role);
  if (forbidden) return c.json({ error: 'You can only edit your own listings.' }, 403);
  if (!prop) return c.json({ error: 'Listing not found.' }, 404);

  const parsed = propertyPatchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const p = parsed.data;

  // Re-activating a listing counts against the plan limit, exactly like
  // creating one — otherwise the create-time check is trivially bypassed by
  // deactivating, creating a new listing, and flipping the old one back on.
  const reactivating = p.status === 'active' && prop.status !== 'active';
  if (reactivating && user.role !== 'admin') {
    const sub = await c.env.DB.prepare(
      `SELECT s.current_period_end, pl.features FROM subscriptions s
       JOIN plans pl ON s.plan_id = pl.id
       WHERE s.user_id = ? AND s.status IN ('active','trialing')
       ORDER BY s.created_at DESC LIMIT 1`
    ).bind(user.id).first<{ current_period_end: string | null; features: string }>();
    const subValid = sub && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    const features: string[] = subValid ? JSON.parse(sub!.features ?? '[]') : [];
    const limit = features.includes('unlimited_listings') ? Infinity
      : features.includes('listings_limit_100') ? 100
      : 1;
    if (limit !== Infinity) {
      const count = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM properties WHERE owner_id = ? AND id != ? AND status NOT IN ('sold','rented','inactive')`
      ).bind(user.id, id).first<{ n: number }>();
      if ((count?.n ?? 0) >= limit) {
        return c.json({
          error: limit === 1
            ? 'Your FREE Start plan includes 1 active listing. Upgrade your plan to activate more properties.'
            : `Your plan allows up to ${limit} active listings. Upgrade to activate more properties.`,
          upgrade: true,
        }, 403);
      }
    }
  }

  const map: Array<[keyof typeof p, string, (v: unknown) => unknown]> = [
    ['title', 'title', (v) => v], ['description', 'description', (v) => v],
    ['propertyType', 'property_type', (v) => v], ['listingType', 'listing_type', (v) => v],
    ['priceCents', 'price_cents', (v) => v], ['currency', 'currency', (v) => v],
    ['address', 'address', (v) => v], ['city', 'city', (v) => v], ['country', 'country', (v) => v],
    ['latitude', 'latitude', (v) => v ?? null], ['longitude', 'longitude', (v) => v ?? null],
    ['bedrooms', 'bedrooms', (v) => v], ['bathrooms', 'bathrooms', (v) => v],
    ['areaM2', 'area_m2', (v) => v ?? null], ['lotM2', 'lot_m2', (v) => v ?? null],
    ['yearBuilt', 'year_built', (v) => v ?? null],
    ['features', 'features', (v) => JSON.stringify(v)],
    ['virtualTourUrl', 'virtual_tour_url', (v) => v ?? null],
    ['status', 'status', (v) => v],
  ];
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [key, column, convert] of map) {
    if (p[key] !== undefined) { sets.push(`${column} = ?`); binds.push(convert(p[key])); }
  }
  if (sets.length === 0) return c.json({ error: 'Nothing to update.' }, 400);
  sets.push(`updated_at = datetime('now')`);

  const row = await c.env.DB.prepare(`UPDATE properties SET ${sets.join(', ')} WHERE id = ? RETURNING *`)
    .bind(...binds, id).first<PropertyRow>();
  if (!row) return c.json({ error: 'Listing not found.' }, 404);
  const images = await c.env.DB.prepare(
    'SELECT id, r2_key, position FROM property_images WHERE property_id = ? ORDER BY position, id'
  ).bind(id).all<ImageRow>();
  return c.json({ property: publicProperty(row, images.results ?? []) });
});

// ---- Delete (also removes R2 objects so storage doesn't leak) ----
properties.delete('/:id{[0-9]+}', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user');
  const { prop, forbidden } = await loadOwned(c, id, user.id, user.role);
  if (forbidden) return c.json({ error: 'You can only delete your own listings.' }, 403);
  if (!prop) return c.json({ error: 'Listing not found.' }, 404);

  const images = await c.env.DB.prepare('SELECT r2_key FROM property_images WHERE property_id = ?')
    .bind(id).all<{ r2_key: string }>();
  await c.env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id).run();
  const keys = (images.results ?? []).map((i) => i.r2_key);
  if (keys.length > 0) await c.env.ASSETS.delete(keys);
  return c.json({ deleted: true });
});

// ---- Image upload (multipart) ----
properties.post('/:id{[0-9]+}/images', requireAuth, rateLimit('upload', 60, 3600), async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user');
  const { prop, forbidden } = await loadOwned(c, id, user.id, user.role);
  if (forbidden) return c.json({ error: 'You can only add photos to your own listings.' }, 403);
  if (!prop) return c.json({ error: 'Listing not found.' }, 404);

  const countRow = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM property_images WHERE property_id = ?')
    .bind(id).first<{ n: number }>();
  if ((countRow?.n ?? 0) >= MAX_IMAGES_PER_PROPERTY) {
    return c.json({ error: `A listing can have up to ${MAX_IMAGES_PER_PROPERTY} photos.` }, 400);
  }

  const contentLength = Number(c.req.header('Content-Length') ?? '0');
  if (contentLength > MAX_IMAGE_BYTES + 4096) {
    return c.json({ error: 'Photos must be 8 MB or smaller.' }, 413);
  }

  const form = await c.req.formData().catch(() => null);
  const file = (form?.get('file') ?? null) as unknown;
  if (!(file instanceof File)) return c.json({ error: 'Attach a photo in the "file" field.' }, 400);
  if (!IMAGE_TYPES[file.type]) return c.json({ error: 'Photos must be JPEG, PNG, or WebP.' }, 415);
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return c.json({ error: 'Photos must be 8 MB or smaller.' }, 413);
  }

  // Trust sniffed magic bytes, not the (attacker-controlled) declared
  // Content-Type, for both the rejection check and the stored extension —
  // a mislabeled file would otherwise pass validation but be stored with
  // a mismatched extension/content-type.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const sniffed = sniffImageType(head);
  if (!sniffed) return c.json({ error: 'This file does not look like a valid photo.' }, 415);

  // Random, server-generated key: user-supplied filenames never touch R2
  // (prevents path traversal and key collisions).
  const key = `properties/${id}/${crypto.randomUUID()}.${sniffed.ext}`;
  await c.env.ASSETS.put(key, file.stream(), { httpMetadata: { contentType: sniffed.contentType } });

  const posRow = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM property_images WHERE property_id = ?'
  ).bind(id).first<{ p: number }>();
  const image = await c.env.DB.prepare(
    'INSERT INTO property_images (property_id, r2_key, content_type, position) VALUES (?,?,?,?) RETURNING id, r2_key, position'
  ).bind(id, key, sniffed.contentType, posRow?.p ?? 0).first<ImageRow>();
  if (!image) return c.json({ error: 'The photo could not be saved. Please try again.' }, 500);
  return c.json({ image: { id: image.id, url: `/api/assets/${image.r2_key}`, position: image.position } }, 201);
});

properties.delete('/:id{[0-9]+}/images/:imageId{[0-9]+}', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  const imageId = Number(c.req.param('imageId'));
  const user = c.get('user');
  const { prop, forbidden } = await loadOwned(c, id, user.id, user.role);
  if (forbidden) return c.json({ error: 'You can only manage photos on your own listings.' }, 403);
  if (!prop) return c.json({ error: 'Listing not found.' }, 404);

  const image = await c.env.DB.prepare(
    'SELECT r2_key FROM property_images WHERE id = ? AND property_id = ?'
  ).bind(imageId, id).first<{ r2_key: string }>();
  if (!image) return c.json({ error: 'Photo not found.' }, 404);
  await c.env.DB.prepare('DELETE FROM property_images WHERE id = ?').bind(imageId).run();
  await c.env.ASSETS.delete(image.r2_key);
  return c.json({ deleted: true });
});

export default properties;
