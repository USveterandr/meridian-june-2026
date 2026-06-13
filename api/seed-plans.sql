-- Seed Meridian subscription plans into D1 (4-tier catalog).
-- Safe to run multiple times (ON CONFLICT DO UPDATE).
-- Tiers: FREE Start ($0, 3% commission) · TEAM Essentials ($147/mo) ·
--        PROFESSIONAL Business ($699/mo) · ENTERPRISE Solutions (custom).

INSERT INTO plans (id, name, description, price_monthly_cents, price_annual_cents, trial_days, public, sort_order, grants_role, commission_pct, features)
VALUES
  ('free', 'FREE Start',
   'List your property today — absolutely free. Pay only when you sell.',
   0, 0, 0, 1, 1, NULL, 3.0,
   '["users_1","listings_limit_1","photos_limit_12","buyer_id_basic","manual_contracts","email_support_72h"]'),

  ('team', 'TEAM Essentials',
   'Boost your team''s reach and efficiency with advanced tools.',
   14700, 11760, 30, 1, 2, 'seller', 0.05,
   '["users_3","listings_limit_100","photos_limit_12","maps_geo_pin","storage_2gb","featured_1_month","verified_badge","buyer_verification_advanced","commission_protection_365","digital_contracts","lead_scoring","chat_support_24h"]'),

  ('professional', 'PROFESSIONAL Business',
   'Scale your brokerage with unlimited listings and 0% commission.',
   69900, 55920, 30, 1, 3, 'broker', 0,
   '["users_12","unlimited_listings","photos_limit_18","maps_pro","storage_10gb","featured_3_months","biometric_verification","smart_contracts","escrow_integration","commission_protection_180","account_manager","extra_users_58"]'),

  ('enterprise', 'ENTERPRISE Solutions',
   'The ultimate real estate platform — custom built for market leaders.',
   0, 0, 30, 1, 4, 'broker', 0,
   '["users_custom_25","unlimited_listings","photos_limit_24","sketch_3d","maps_enterprise","storage_20gb","vip_placement_6_months","ai_verification","blockchain_records","custom_contracts_branding","commission_protection_lifetime","support_24_7_legal"]')

ON CONFLICT(id) DO UPDATE SET
  name                = excluded.name,
  description         = excluded.description,
  price_monthly_cents = excluded.price_monthly_cents,
  price_annual_cents  = excluded.price_annual_cents,
  trial_days          = excluded.trial_days,
  public              = excluded.public,
  sort_order          = excluded.sort_order,
  grants_role         = excluded.grants_role,
  commission_pct      = excluded.commission_pct,
  features            = excluded.features;

-- Hide legacy tiers (pro/brokerage/investor) without breaking old subscriptions.
UPDATE plans SET public = 0 WHERE id NOT IN ('free','team','professional','enterprise');
