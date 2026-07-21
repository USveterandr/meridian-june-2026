import { Hono } from 'hono';
import { waitlistSchema, foundingAgentSchema, flattenZodError } from '../lib/validate';
import { rateLimit } from '../middleware/rateLimit';
import { logger } from '../lib/logger';
import type { AppEnv } from '../types';

// ───────────────────────────────────────────────────────────────────────────
// Growth endpoints — two launch-time capture flows:
//   • POST /api/waitlist          — email capture for "coming soon" markets
//   • GET  /api/agents/status     — founding-agent campaign state (public)
//   • POST /api/agents/claim      — claim one of the first-100 free-Pro spots
// Neither touches auth; both are rate-limited by IP.
// ───────────────────────────────────────────────────────────────────────────

const growth = new Hono<AppEnv>();

// First-100 agents get Pro free for 12 months, until this date (UTC) or until
// the 100 spots are gone — whichever comes first. Adjust to move the deadline.
export const FOUNDING_AGENT_LIMIT = 100;
export const FOUNDING_AGENT_DEADLINE = '2026-09-30T23:59:59Z';

// ── Market waitlist ────────────────────────────────────────────────────────
growth.post('/waitlist', rateLimit('waitlist', 5, 300), async (c) => {
  const parsed = waitlistSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  }
  const { email, market, lang } = parsed.data;
  try {
    await c.env.DB.prepare(
      `INSERT INTO market_waitlist (email, market, lang)
       VALUES (?, ?, ?)
       ON CONFLICT(email, market) DO NOTHING`
    ).bind(email, market, lang).run();
    return c.json({ ok: true });
  } catch (err) {
    logger.error('Waitlist insert failed', { error: err instanceof Error ? err.message : err });
    return c.json({ error: 'Could not join the waitlist right now.' }, 500);
  }
});

// ── Founding-agent campaign status ─────────────────────────────────────────
async function campaignStatus(db: AppEnv['Bindings']['DB']) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM founding_agents').first<{ n: number }>();
  const claimed = row?.n ?? 0;
  const remaining = Math.max(0, FOUNDING_AGENT_LIMIT - claimed);
  const beforeDeadline = Date.now() < Date.parse(FOUNDING_AGENT_DEADLINE);
  return {
    limit: FOUNDING_AGENT_LIMIT,
    claimed,
    remaining,
    deadline: FOUNDING_AGENT_DEADLINE,
    open: remaining > 0 && beforeDeadline,
  };
}

growth.get('/agents/status', rateLimit('agents-status', 60, 300), async (c) => {
  try {
    return c.json(await campaignStatus(c.env.DB));
  } catch (err) {
    logger.error('Founding-agent status failed', { error: err instanceof Error ? err.message : err });
    return c.json({ error: 'Status unavailable.' }, 500);
  }
});

growth.post('/agents/claim', rateLimit('agents-claim', 5, 300), async (c) => {
  const parsed = foundingAgentSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  }
  const { email, name, phone, agency, lang } = parsed.data;

  try {
    // Idempotent: if this email already claimed, return its existing spot.
    const existing = await c.env.DB
      .prepare('SELECT spot_number FROM founding_agents WHERE email = ?')
      .bind(email)
      .first<{ spot_number: number }>();
    if (existing) {
      return c.json({ ok: true, alreadyClaimed: true, spot: existing.spot_number, limit: FOUNDING_AGENT_LIMIT });
    }

    const status = await campaignStatus(c.env.DB);
    if (!status.open) {
      return c.json({ ok: false, closed: true, ...status }, 409);
    }

    const spot = status.claimed + 1;
    await c.env.DB.prepare(
      `INSERT INTO founding_agents (spot_number, email, name, phone, agency, lang)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(spot, email, name ?? null, phone ?? null, agency ?? null, lang).run();

    return c.json({ ok: true, spot, remaining: Math.max(0, FOUNDING_AGENT_LIMIT - spot), limit: FOUNDING_AGENT_LIMIT });
  } catch (err) {
    // Most likely a race on the UNIQUE(spot_number) index — treat as "try again".
    logger.error('Founding-agent claim failed', { error: err instanceof Error ? err.message : err });
    return c.json({ error: 'Could not reserve your spot — please try again.' }, 500);
  }
});

export default growth;
