import { Hono } from 'hono';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../lib/password';
import { createToken } from '../lib/jwt';
import { registerSchema, loginSchema, profileSchema, flattenZodError } from '../lib/validate';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { validateCedulaFormat } from '../lib/cedula';
import { MAX_IMAGE_BYTES, sniffImageType } from '../lib/imageValidation';
import type { AppEnv } from '../types';

const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const auth = new Hono<AppEnv>();

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
  locale: string;
  notify_matches: number;
  notify_messages: number;
  created_at: string;
};

type SubSummary = {
  plan_id: string; plan_name: string; status: string; billing_interval: string;
  current_period_end: string | null; plan_features: string;
  price_monthly_cents: number; price_annual_cents: number; commission_pct: number;
};

function publicUser(u: UserRow, cedulaVerified = false, avatarUrl: string | null = null) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    role: u.role,
    phone: u.phone,
    locale: u.locale,
    notifyMatches: u.notify_matches === 1,
    notifyMessages: u.notify_messages === 1,
    createdAt: u.created_at,
    cedulaVerified,
    avatarUrl,
  };
}

auth.post('/register', rateLimit('register', 10, 600), async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const { firstName, lastName, cedula, email, password, role, locale, planId } = parsed.data;

  // Cédula is mandatory at signup; we can only check its checksum format
  // against the gov API (no registry name lookup is available), so users
  // self-confirm the name/cédula match on the frontend before submitting.
  const cedulaValid = await validateCedulaFormat(cedula);
  if (!cedulaValid) {
    return c.json({ error: 'Please correct the highlighted fields.', fields: { cedula: 'This cédula does not look valid. Double-check the digits.' } }, 400);
  }

  // Plan selection is a required signup step — validate it before creating the account.
  const plan = planId
    ? await c.env.DB.prepare('SELECT * FROM plans WHERE id = ? AND public = 1').bind(planId)
        .first<{ id: string; price_monthly_cents: number; trial_days: number; grants_role: string | null }>()
    : null;
  if (planId && !plan) {
    return c.json({ error: 'Please choose a valid subscription plan.', fields: { planId: 'Unknown plan.' } }, 400);
  }

  const passwordHash = await hashPassword(password);
  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, locale)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(email, passwordHash, firstName, lastName, role, locale)
      .first<UserRow>();
    if (!result) throw new Error('insert failed');

    // Start the chosen subscription: free → active; paid/custom → 30-day trial
    // (no card required; payment processing is wired in later).
    if (plan) {
      const isPaid = plan.price_monthly_cents > 0 || plan.id === 'enterprise';
      const trialDays = plan.trial_days > 0 ? plan.trial_days : 30;
      const status = isPaid ? 'trialing' : 'active';
      const periodEnd = isPaid ? new Date(Date.now() + trialDays * 86_400_000).toISOString() : null;
      const grantsRole = plan.grants_role && result.role !== 'admin';
      // Record the role chosen at signup so expiration can revert to it.
      const previousRole = grantsRole ? result.role : null;
      await c.env.DB.prepare(
        `INSERT INTO subscriptions (user_id, plan_id, status, billing_interval, current_period_end, previous_role)
         VALUES (?, ?, ?, 'monthly', ?, ?)`
      ).bind(result.id, plan.id, status, periodEnd, previousRole).run();
      if (grantsRole && plan.grants_role) {
        await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(plan.grants_role, result.id).run();
        result.role = plan.grants_role;
      }
    }

    await c.env.DB
      .prepare(`INSERT INTO user_verification (user_id, cedula_verified, cedula_last4, verified_at)
                VALUES (?, 1, ?, datetime('now'))`)
      .bind(result.id, cedula.slice(-4))
      .run();

    const token = await createToken({ id: result.id, email: result.email, role: result.role }, c.env.JWT_SECRET);
    return c.json({ token, user: publicUser(result, true) }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      return c.json({ error: 'An account with this email already exists. Try signing in instead.' }, 409);
    }
    throw e;
  }
});

auth.post('/login', rateLimit('login', 8, 300), async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Email or password is incorrect.' }, 401);
  const { email, password } = parsed.data;

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  // Always run a hash verification so existing and non-existing accounts
  // take the same time to respond (prevents account enumeration).
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return c.json({ error: 'Email or password is incorrect.' }, 401);

  const token = await createToken({ id: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET);
  return c.json({ token, user: publicUser(user) });
});

auth.get('/me', requireAuth, async (c) => {
  const { id } = c.get('user');
  const [user, sub, verification, avatar] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>(),
    c.env.DB.prepare(
      `SELECT s.plan_id, s.status, s.billing_interval, s.current_period_end,
              p.features AS plan_features, p.price_monthly_cents, p.price_annual_cents,
              p.commission_pct, p.name AS plan_name
       FROM subscriptions s JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ? AND s.status IN ('active','trialing')
       ORDER BY s.created_at DESC LIMIT 1`
    ).bind(id).first<SubSummary>(),
    c.env.DB.prepare('SELECT cedula_verified FROM user_verification WHERE user_id = ?')
      .bind(id).first<{ cedula_verified: number }>(),
    c.env.DB.prepare('SELECT r2_key FROM user_avatars WHERE user_id = ?')
      .bind(id).first<{ r2_key: string }>(),
  ]);
  if (!user) return c.json({ error: 'Account not found.' }, 404);

  const subscription = sub
    ? {
        planId: sub.plan_id,
        planName: sub.plan_name,
        status: sub.status,
        billing: sub.billing_interval,
        periodEnd: sub.current_period_end,
        commissionPct: sub.commission_pct,
        features: JSON.parse(sub.plan_features ?? '[]') as string[],
      }
    : null;

  const avatarUrl = avatar ? `/api/assets/${avatar.r2_key}` : null;
  return c.json({ user: publicUser(user, verification?.cedula_verified === 1, avatarUrl), subscription });
});

// ─── Avatar upload ───────────────────────────────────────────────────────
auth.post('/me/avatar', requireAuth, rateLimit('avatar-upload', 20, 3600), async (c) => {
  const { id } = c.get('user');

  const contentLength = Number(c.req.header('Content-Length') ?? '0');
  if (contentLength > MAX_IMAGE_BYTES + 4096) {
    return c.json({ error: 'Photos must be 8 MB or smaller.' }, 413);
  }

  const form = await c.req.formData().catch(() => null);
  const file = (form?.get('file') ?? null) as unknown;
  if (!(file instanceof File)) return c.json({ error: 'Attach a photo in the "file" field.' }, 400);
  if (!AVATAR_TYPES[file.type]) return c.json({ error: 'Photos must be JPEG, PNG, or WebP.' }, 415);
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return c.json({ error: 'Photos must be 8 MB or smaller.' }, 413);
  }

  // Trust sniffed magic bytes, not the (attacker-controlled) declared Content-Type.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const sniffed = sniffImageType(head);
  if (!sniffed) return c.json({ error: 'This file does not look like a valid photo.' }, 415);

  const previous = await c.env.DB.prepare('SELECT r2_key FROM user_avatars WHERE user_id = ?')
    .bind(id).first<{ r2_key: string }>();

  // Random, server-generated key: user-supplied filenames never touch R2.
  const key = `avatars/${id}/${crypto.randomUUID()}.${sniffed.ext}`;
  await c.env.ASSETS.put(key, file.stream(), { httpMetadata: { contentType: sniffed.contentType } });

  await c.env.DB.prepare(
    `INSERT INTO user_avatars (user_id, r2_key, content_type, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET r2_key = excluded.r2_key, content_type = excluded.content_type, updated_at = excluded.updated_at`
  ).bind(id, key, sniffed.contentType).run();

  if (previous) await c.env.ASSETS.delete(previous.r2_key);

  return c.json({ avatarUrl: `/api/assets/${key}` }, 201);
});

auth.delete('/me/avatar', requireAuth, async (c) => {
  const { id } = c.get('user');
  const existing = await c.env.DB.prepare('SELECT r2_key FROM user_avatars WHERE user_id = ?')
    .bind(id).first<{ r2_key: string }>();
  if (!existing) return c.json({ error: 'No avatar to remove.' }, 404);

  await c.env.DB.prepare('DELETE FROM user_avatars WHERE user_id = ?').bind(id).run();
  await c.env.ASSETS.delete(existing.r2_key);
  return c.json({ ok: true });
});

auth.patch('/me', requireAuth, async (c) => {
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const { id } = c.get('user');
  const p = parsed.data;

  // Column names are fixed strings chosen here, never user input;
  // only VALUES are bound as parameters.
  const sets: string[] = [];
  const values: unknown[] = [];
  if (p.firstName !== undefined) { sets.push('first_name = ?'); values.push(p.firstName); }
  if (p.lastName !== undefined) { sets.push('last_name = ?'); values.push(p.lastName); }
  if (p.phone !== undefined) { sets.push('phone = ?'); values.push(p.phone); }
  if (p.locale !== undefined) { sets.push('locale = ?'); values.push(p.locale); }
  if (p.notifyMatches !== undefined) { sets.push('notify_matches = ?'); values.push(p.notifyMatches ? 1 : 0); }
  if (p.notifyMessages !== undefined) { sets.push('notify_messages = ?'); values.push(p.notifyMessages ? 1 : 0); }
  if (sets.length === 0) return c.json({ error: 'Nothing to update.' }, 400);
  sets.push(`updated_at = datetime('now')`);

  const user = await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ? RETURNING *`)
    .bind(...values, id)
    .first<UserRow>();
  if (!user) return c.json({ error: 'Account not found.' }, 404);
  return c.json({ user: publicUser(user) });
});

export default auth;
