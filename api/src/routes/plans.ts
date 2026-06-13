import { Hono } from 'hono';
import { requireAuth, requireRole } from '../middleware/auth';
import type { AppEnv } from '../types';

const plans = new Hono<AppEnv>();

// ─── Public: list all plans ───────────────────────────────────────────────
plans.get('/', async (c) => {
  const rows = await c.env.DB
    .prepare('SELECT * FROM plans WHERE public = 1 ORDER BY sort_order')
    .all<PlanRow>();
  return c.json({ plans: (rows.results ?? []).map(formatPlan) });
});

// ─── Get current user subscription ───────────────────────────────────────
plans.get('/my', requireAuth, async (c) => {
  const user = c.get('user');
  const sub = await c.env.DB
    .prepare(`SELECT s.*, p.name AS plan_name, p.features AS plan_features
              FROM subscriptions s JOIN plans p ON s.plan_id = p.id
              WHERE s.user_id = ? AND s.status IN ('active','trialing')
              ORDER BY s.created_at DESC LIMIT 1`)
    .bind(user.id)
    .first<SubRow & { plan_name: string; plan_features: string }>();
  
  if (!sub) return c.json({ subscription: null, plan: 'free' });
  return c.json({
    subscription: formatSub(sub),
    plan: sub.plan_id,
    features: JSON.parse(sub.plan_features ?? '[]'),
  });
});

// ─── Create PayPal subscription order ────────────────────────────────────
plans.post('/checkout/paypal', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as { planId?: string; billing?: string };
  const { planId, billing = 'monthly' } = body;

  if (!planId) return c.json({ error: 'planId is required.' }, 400);

  const plan = await c.env.DB
    .prepare('SELECT * FROM plans WHERE id = ? AND public = 1')
    .bind(planId)
    .first<PlanRow>();
  if (!plan) return c.json({ error: 'Plan not found.' }, 404);

  const priceCents = billing === 'annual' ? plan.price_annual_cents : plan.price_monthly_cents;
  if (priceCents === 0) {
    // Free plan — just upsert subscription record
    await upsertFreeSub(c.env.DB, user.id, planId);
    return c.json({ success: true, redirect: '/dashboard' });
  }

  // For paid plans — return PayPal button configuration
  // In production, use PayPal Orders API to create an order server-side
  const priceUSD = (priceCents / 100).toFixed(2);
  return c.json({
    success: false,
    paypal: {
      amount: priceUSD,
      currency: 'USD',
      description: `Meridian ${plan.name} — ${billing}`,
      planId,
      billing,
    },
    message: 'Use PayPal hosted button to complete payment.',
  });
});

// ─── Create Stripe Checkout Session ─────────────────────────────────────
// Requires STRIPE_SECRET_KEY wrangler secret:
//   npx wrangler secret put STRIPE_SECRET_KEY
//
// Stripe price IDs (from planCatalog.ts / your Stripe dashboard):
//   free:         price_1RB5DtKI2EJqqBKvd8yRNh0Z
//   team:         price_1RB5GdKI2EJqqBKvJ6zIikqD
//   professional: price_1RB5I0KI2EJqqBKvZbvGUC5Z
//   enterprise:   price_1RB5NmKI2EJqqBKv5Yl8ZgRV
const STRIPE_PRICE_IDS: Record<string, string> = {
  free:         'price_1RB5DtKI2EJqqBKvd8yRNh0Z',
  team:         'price_1RB5GdKI2EJqqBKvJ6zIikqD',
  professional: 'price_1RB5I0KI2EJqqBKvZbvGUC5Z',
  enterprise:   'price_1RB5NmKI2EJqqBKv5Yl8ZgRV',
};

plans.post('/checkout/stripe', requireAuth, async (c) => {
  const stripeKey = c.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return c.json({ error: 'Stripe is not configured on this server.' }, 503);

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as { planId?: string; billing?: string };
  const { planId, billing = 'monthly' } = body;

  if (!planId) return c.json({ error: 'planId is required.' }, 400);

  const plan = await c.env.DB
    .prepare('SELECT * FROM plans WHERE id = ? AND public = 1')
    .bind(planId)
    .first<PlanRow>();
  if (!plan) return c.json({ error: 'Plan not found.' }, 404);

  const priceId = STRIPE_PRICE_IDS[planId];
  if (!priceId) return c.json({ error: 'No Stripe price configured for this plan. Contact support.' }, 400);

  // Free plan — skip Stripe, create sub directly
  if (plan.price_monthly_cents === 0 && planId !== 'enterprise') {
    await upsertFreeSub(c.env.DB, user.id, planId);
    return c.json({ success: true, redirect: '/dashboard' });
  }

  // Build Stripe Checkout Session via fetch (no SDK needed in Workers)
  const origin = c.req.header('origin') ?? 'https://investwithmeridian.com';
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
    cancel_url: `${origin}/pricing`,
    customer_email: user.email,
    'subscription_data[trial_period_days]': String(plan.trial_days > 0 ? plan.trial_days : 0),
    'metadata[user_id]': String(user.id),
    'metadata[plan_id]': planId,
    'metadata[billing]': billing,
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await stripeRes.json() as { id?: string; url?: string; error?: { message: string } };
  if (!stripeRes.ok || !session.url) {
    const msg = session.error?.message ?? 'Failed to create Stripe session.';
    return c.json({ error: msg }, 502);
  }

  return c.json({ success: false, stripeUrl: session.url, sessionId: session.id });
});

// ─── Stripe webhook: handle checkout.session.completed ───────────────────
plans.post('/webhook/stripe', async (c) => {
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fail closed: never grant subscriptions from an unverifiable payload.
    return c.json({ error: 'Stripe webhooks are not configured on this server.' }, 503);
  }

  // Signature verification must run against the RAW request body.
  const rawBody = await c.req.text();
  const signature = c.req.header('stripe-signature') ?? '';
  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    return c.json({ error: 'Invalid Stripe signature.' }, 400);
  }

  const body = JSON.parse(rawBody) as { type?: string; data?: { object?: any } } | null;
  if (!body || body.type !== 'checkout.session.completed') {
    return c.json({ received: true });
  }

  const session = body.data?.object;
  const userId = Number(session?.metadata?.user_id);
  const planId = session?.metadata?.plan_id;
  const billing = session?.metadata?.billing ?? 'monthly';
  const stripeSubscriptionId = session?.subscription ?? null;

  if (!userId || !planId) return c.json({ received: true });

  const plan = await c.env.DB
    .prepare('SELECT * FROM plans WHERE id = ?')
    .bind(planId)
    .first<PlanRow>();
  if (!plan) return c.json({ received: true });

  const periodDays = billing === 'annual' ? 365 : 30;
  const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB
    .prepare(`UPDATE subscriptions SET status = 'canceled' WHERE user_id = ? AND status IN ('active','trialing')`)
    .bind(userId)
    .run();

  await c.env.DB
    .prepare(`INSERT INTO subscriptions
                (user_id, plan_id, status, billing_interval, current_period_end, stripe_subscription_id)
              VALUES (?, ?, 'active', ?, ?, ?)`)
    .bind(userId, planId, billing, periodEnd, stripeSubscriptionId)
    .run();

  if (plan.grants_role) {
    await c.env.DB
      .prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind(plan.grants_role, userId)
      .run();
  }

  return c.json({ received: true });
});

// ─── PayPal webhook / return URL (after successful payment) ──────────────
plans.post('/activate', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as {
    planId?: string; billing?: string;
    paypalOrderId?: string; paypalTransactionId?: string;
  };
  
  const { planId, billing = 'monthly', paypalOrderId, paypalTransactionId } = body;
  if (!planId) return c.json({ error: 'planId is required.' }, 400);

  const plan = await c.env.DB
    .prepare('SELECT * FROM plans WHERE id = ? AND public = 1')
    .bind(planId)
    .first<PlanRow>();
  if (!plan) return c.json({ error: 'Plan not found.' }, 404);

  // Paid (or custom-priced) plans without a verified payment start as a free
  // trial — no card required. Payment processing (Stripe) is wired in later.
  const isPaidPlan = plan.price_monthly_cents !== 0 || plan.price_annual_cents !== 0 || plan.id === 'enterprise';
  const hasPayment = Boolean(paypalOrderId || paypalTransactionId) || user.role === 'admin';
  const trialDays = plan.trial_days > 0 ? plan.trial_days : 30;

  if (isPaidPlan && !hasPayment && plan.trial_days <= 0 && plan.id !== 'enterprise') {
    return c.json({ error: 'Payment has not been verified for this plan.' }, 402);
  }

  const status = isPaidPlan && !hasPayment ? 'trialing' : 'active';
  const periodDays = status === 'trialing' ? trialDays : (billing === 'annual' ? 365 : 30);
  const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

  // Cancel existing active subscriptions for this user
  await c.env.DB
    .prepare(`UPDATE subscriptions SET status = 'canceled' WHERE user_id = ? AND status IN ('active','trialing')`)
    .bind(user.id)
    .run();

  // Create new subscription record
  await c.env.DB
    .prepare(`INSERT INTO subscriptions
                (user_id, plan_id, status, billing_interval, current_period_end, paypal_order_id, paypal_transaction_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(user.id, planId, status, billing, plan.price_monthly_cents === 0 && plan.id !== 'enterprise' ? null : periodEnd, paypalOrderId ?? null, paypalTransactionId ?? null)
    .run();

  // Update user role if plan grants a role upgrade
  if (plan.grants_role) {
    await c.env.DB
      .prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind(plan.grants_role, user.id)
      .run();
  }

  return c.json({ success: true, planId, status, periodEnd, trial: status === 'trialing' });
});

// ─── Admin: seed/reset plans (4-tier catalog, mirrors seed-plans.sql) ─────
plans.post('/seed', requireAuth, requireRole('admin'), async (c) => {
  const PLANS: Array<Omit<PlanRow, 'created_at'>> = [
    {
      id: 'free',
      name: 'FREE Start',
      description: 'List your property today — absolutely free. Pay only when you sell.',
      price_monthly_cents: 0,
      price_annual_cents: 0,
      trial_days: 0,
      public: 1,
      sort_order: 1,
      grants_role: null,
      commission_pct: 3.0,
      features: JSON.stringify([
        'users_1','listings_limit_1','photos_limit_12','buyer_id_basic',
        'manual_contracts','email_support_72h',
      ]),
    },
    {
      id: 'team',
      name: 'TEAM Essentials',
      description: 'Boost your team\'s reach and efficiency with advanced tools.',
      price_monthly_cents: 14700,
      price_annual_cents: 11760,
      trial_days: 30,
      public: 1,
      sort_order: 2,
      grants_role: 'seller',
      commission_pct: 0.05,
      features: JSON.stringify([
        'users_3','listings_limit_100','photos_limit_12','maps_geo_pin','storage_2gb',
        'featured_1_month','verified_badge','buyer_verification_advanced',
        'commission_protection_365','digital_contracts','lead_scoring','chat_support_24h',
      ]),
    },
    {
      id: 'professional',
      name: 'PROFESSIONAL Business',
      description: 'Scale your brokerage with unlimited listings and 0% commission.',
      price_monthly_cents: 69900,
      price_annual_cents: 55920,
      trial_days: 30,
      public: 1,
      sort_order: 3,
      grants_role: 'broker',
      commission_pct: 0,
      features: JSON.stringify([
        'users_12','unlimited_listings','photos_limit_18','maps_pro','storage_10gb',
        'featured_3_months','biometric_verification','smart_contracts','escrow_integration',
        'commission_protection_180','account_manager','extra_users_58',
      ]),
    },
    {
      id: 'enterprise',
      name: 'ENTERPRISE Solutions',
      description: 'The ultimate real estate platform — custom built for market leaders.',
      price_monthly_cents: 0,
      price_annual_cents: 0,
      trial_days: 30,
      public: 1,
      sort_order: 4,
      grants_role: 'broker',
      commission_pct: 0,
      features: JSON.stringify([
        'users_custom_25','unlimited_listings','photos_limit_24','sketch_3d','maps_enterprise',
        'storage_20gb','vip_placement_6_months','ai_verification','blockchain_records',
        'custom_contracts_branding','commission_protection_lifetime','support_24_7_legal',
      ]),
    },
  ];

  for (const p of PLANS) {
    await c.env.DB
      .prepare(`INSERT INTO plans
                  (id, name, description, price_monthly_cents, price_annual_cents, trial_days,
                   public, sort_order, grants_role, commission_pct, features)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET
                  name=excluded.name, description=excluded.description,
                  price_monthly_cents=excluded.price_monthly_cents,
                  price_annual_cents=excluded.price_annual_cents,
                  trial_days=excluded.trial_days, public=excluded.public,
                  sort_order=excluded.sort_order, grants_role=excluded.grants_role,
                  features=excluded.features, commission_pct=excluded.commission_pct`)
      .bind(p.id, p.name, p.description, p.price_monthly_cents, p.price_annual_cents,
            p.trial_days, p.public, p.sort_order, p.grants_role, p.commission_pct, p.features)
      .run();
  }

  // Hide legacy tiers without breaking existing subscriptions.
  await c.env.DB
    .prepare(`UPDATE plans SET public = 0 WHERE id NOT IN ('free','team','professional','enterprise')`)
    .run();

  return c.json({ seeded: PLANS.length });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature (scheme `v1`) using WebCrypto HMAC-SHA256.
 * Mirrors Stripe's `constructEvent`: signed payload is `${timestamp}.${rawBody}`,
 * compared in constant time against the `v1` signatures in the header. Rejects
 * events older than the tolerance window to block replay attacks.
 */
async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header) return false;

  // Header format: "t=1492774577,v1=abc...,v1=def..."
  const parts = header.split(',').map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  // Replay protection
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

/** Constant-time string comparison to avoid timing side channels. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function upsertFreeSub(db: AppEnv['Bindings']['DB'], userId: number, planId: string) {
  await db
    .prepare(`UPDATE subscriptions SET status = 'canceled'
              WHERE user_id = ? AND status IN ('active','trialing')`)
    .bind(userId)
    .run();
  await db
    .prepare(`INSERT INTO subscriptions (user_id, plan_id, status, billing_interval, current_period_end)
              VALUES (?, ?, 'active', 'monthly', NULL)`)
    .bind(userId, planId)
    .run();
}

type PlanRow = {
  id: string; name: string; description: string;
  price_monthly_cents: number; price_annual_cents: number;
  trial_days: number; public: number; sort_order: number;
  grants_role: string | null; commission_pct: number; features: string;
  created_at?: string;
};

type SubRow = {
  id: number; user_id: number; plan_id: string; status: string;
  billing_interval: string; current_period_end: string | null;
  paypal_order_id: string | null; paypal_transaction_id: string | null;
  created_at: string;
};

function formatPlan(p: PlanRow) {
  return {
    id: p.id, name: p.name, description: p.description,
    priceMonthly: p.price_monthly_cents / 100,
    priceAnnual: p.price_annual_cents / 100,
    trialDays: p.trial_days,
    commissionPct: p.commission_pct,
    features: JSON.parse(p.features ?? '[]') as string[],
  };
}

function formatSub(s: SubRow) {
  return {
    id: s.id, planId: s.plan_id, status: s.status,
    billing: s.billing_interval,
    periodEnd: s.current_period_end,
    paypalOrderId: s.paypal_order_id,
  };
}

export default plans;
