import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const verify = new Hono<AppEnv>();

// ─── Cédula Validation ───────────────────────────────────────────────────
// Proxies the DR Government's JCE/Luhn validation API.
// No personal data is stored — just the boolean result.
verify.get('/cedula/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  // Cédulas are exactly 11 digits
  if (!/^\d{11}$/.test(id)) {
    return c.json({ valid: false, error: 'Cédula must be exactly 11 digits.' }, 400);
  }

  try {
    const res = await fetch(
      `https://api.digital.gob.do/v3/cedulas/${id}/validate`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return c.json({ valid: false, error: 'Validation service unavailable.' }, 502);
    const data = await res.json() as { valid: boolean };
    return c.json(data);
  } catch {
    return c.json({ valid: false, error: 'Could not reach the validation service.' }, 502);
  }
});

// Validate and persist on the authenticated user's profile
verify.post('/cedula', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as { cedula?: string };
  const id = String(body.cedula ?? '').replace(/\D/g, '');

  if (!/^\d{11}$/.test(id)) {
    return c.json({ valid: false, error: 'Cédula must be exactly 11 digits.' }, 400);
  }

  let valid = false;
  try {
    const res = await fetch(
      `https://api.digital.gob.do/v3/cedulas/${id}/validate`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json() as { valid: boolean };
      valid = data.valid;
    }
  } catch {
    return c.json({ valid: false, error: 'Could not reach the validation service.' }, 502);
  }

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
