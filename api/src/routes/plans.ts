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
