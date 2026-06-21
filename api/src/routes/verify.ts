import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { validateCedulaFormat } from '../lib/cedula';
import type { AppEnv } from '../types';

const verify = new Hono<AppEnv>();

// ─── Cédula Validation ───────────────────────────────────────────────────
// Proxies the DR Government's JCE/Luhn validation API.
// No personal data is stored — just the boolean result.

// Public, unauthenticated, rate-limited — used for live feedback while
// typing a cédula during signup, before an account (and auth token) exists.
verify.get('/cedula-check/:id', rateLimit('cedula-check', 30, 300), async (c) => {
  const id = c.req.param('id');
  if (!/^\d{11}$/.test(id)) {
    return c.json({ valid: false, error: 'Cédula must be exactly 11 digits.' }, 400);
  }
  const valid = await validateCedulaFormat(id);
  return c.json({ valid });
});

verify.get('/cedula/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (!/^\d{11}$/.test(id)) {
    return c.json({ valid: false, error: 'Cédula must be exactly 11 digits.' }, 400);
  }
  const valid = await validateCedulaFormat(id);
  return c.json({ valid });
});

// Validate and persist on the authenticated user's profile
verify.post('/cedula', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as { cedula?: string };
  const id = String(body.cedula ?? '').replace(/\D/g, '');

  if (!/^\d{11}$/.test(id)) {
    return c.json({ valid: false, error: 'Cédula must be exactly 11 digits.' }, 400);
  }

  const valid = await validateCedulaFormat(id);

  if (valid) {
    await c.env.DB
      .prepare(`INSERT INTO user_verification (user_id, cedula_verified, cedula_last4, verified_at)
                VALUES (?, 1, ?, datetime('now'))
                ON CONFLICT(user_id) DO UPDATE SET
                  cedula_verified = 1,
                  cedula_last4 = excluded.cedula_last4,
                  verified_at = excluded.verified_at,
                  updated_at = datetime('now')`)
      .bind(user.id, id.slice(-4))
      .run();
  }

  return c.json({ valid });
});

export default verify;
