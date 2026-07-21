import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { hashPassword } from '../lib/password';
import { adminCreateUserSchema, adminUpdateRoleSchema, flattenZodError } from '../lib/validate';
import type { AppEnv } from '../types';

// Admin-only console: manage users (list, create, change role) and browse
// every property listing platform-wide (not just the caller's own, unlike
// /api/properties/mine). All routes below require role === 'admin'.
const admin = new Hono<AppEnv>();
admin.use('*', requireAuth, requireRole('admin'));

type UserRow = {
  id: number; email: string; first_name: string; last_name: string;
  role: string; phone: string | null; locale: string; created_at: string;
};

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    role: u.role,
    phone: u.phone,
    locale: u.locale,
    createdAt: u.created_at,
  };
}

// ---- List / search users ----
admin.get('/users', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const role = (c.req.query('role') ?? '').trim();
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1);
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('perPage') ?? '50') || 50));
  const offset = (page - 1) * perPage;

  const where: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    where.push('(email LIKE ? ESCAPE \'\\\' OR first_name LIKE ? ESCAPE \'\\\' OR last_name LIKE ? ESCAPE \'\\\')');
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    binds.push(like, like, like);
  }
  if (role) { where.push('role = ?'); binds.push(role); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRow, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users ${whereSql}`).bind(...binds).first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT id, email, first_name, last_name, role, phone, locale, created_at
       FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, perPage, offset).all<UserRow>(),
  ]);

  return c.json({
    total: countRow?.n ?? 0,
    page,
    perPage,
    results: (rows.results ?? []).map(publicUser),
  });
});

// ---- Create a user directly (add an agent, broker, another admin, etc. without self-registration) ----
admin.post('/users', rateLimit('admin-create-user', 30, 3600), async (c) => {
  const parsed = adminCreateUserSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const p = parsed.data;

  // No password supplied → generate a one-time temporary password, returned
  // once in this response so the admin can hand it to the new user directly.
  const generatedPassword = p.password ? null : crypto.randomUUID().replace(/-/g, '').slice(0, 14);
  const passwordHash = await hashPassword(p.password ?? generatedPassword!);

  try {
    const row = await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, phone, locale)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
    ).bind(p.email, passwordHash, p.firstName, p.lastName, p.role, p.phone ?? null, p.locale).first<UserRow>();
    if (!row) throw new Error('insert failed');
    return c.json({ user: publicUser(row), temporaryPassword: generatedPassword ?? undefined }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      return c.json({ error: 'An account with this email already exists.' }, 409);
    }
    throw e;
  }
});

// ---- Change a user's role ----
admin.patch('/users/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'));
  const actor = c.get('user');
  const parsed = adminUpdateRoleSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);

  // Guard against an admin accidentally locking themselves out.
  if (id === actor.id && parsed.data.role !== 'admin') {
    return c.json({ error: 'You cannot remove your own admin access here — ask another admin to do it.' }, 400);
  }

  const row = await c.env.DB.prepare(
    `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(parsed.data.role, id).first<UserRow>();
  if (!row) return c.json({ error: 'User not found.' }, 404);
  return c.json({ user: publicUser(row) });
});

// ---- All properties, any owner/status — for moderation & "edit the app" from one place ----
admin.get('/properties', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const status = (c.req.query('status') ?? '').trim();
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1);
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('perPage') ?? '50') || 50));
  const offset = (page - 1) * perPage;

  const where: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    where.push('(p.title LIKE ? ESCAPE \'\\\' OR p.city LIKE ? ESCAPE \'\\\')');
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    binds.push(like, like);
  }
  if (status) { where.push('p.status = ?'); binds.push(status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  type Row = {
    id: number; title: string; status: string; price_cents: number; currency: string;
    city: string; listing_type: string; created_at: string;
    owner_id: number; owner_first_name: string; owner_last_name: string; owner_email: string;
    cover_key: string | null;
  };

  const [countRow, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM properties p ${whereSql}`).bind(...binds).first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT p.id, p.title, p.status, p.price_cents, p.currency, p.city, p.listing_type, p.created_at,
              u.id AS owner_id, u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.email AS owner_email,
              (SELECT r2_key FROM property_images i WHERE i.property_id = p.id ORDER BY i.position, i.id LIMIT 1) AS cover_key
       FROM properties p JOIN users u ON u.id = p.owner_id
       ${whereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, perPage, offset).all<Row>(),
  ]);

  return c.json({
    total: countRow?.n ?? 0,
    page,
    perPage,
    results: (rows.results ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      priceCents: p.price_cents,
      currency: p.currency,
      city: p.city,
      listingType: p.listing_type,
      createdAt: p.created_at,
      coverUrl: p.cover_key ? `/api/assets/${p.cover_key}` : null,
      owner: { id: p.owner_id, firstName: p.owner_first_name, lastName: p.owner_last_name, email: p.owner_email },
    })),
  });
});

export default admin;
