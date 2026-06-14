-- Seed Meridian subscription plans into D1 (5-tier catalog).
-- Safe to run multiple times (ON CONFLICT DO UPDATE).
-- Tiers: Explorer ($0, 3% commission) · Professional ($97/mo) ·
--        Brokerage ($299/mo) · Enterprise ($599/mo) · Investor ($199/mo).
-- Feature keys + copy are canonical in web/src/planCatalog.ts.

INSERT INTO plans (id, name, description, price_monthly_cents, price_annual_cents, trial_days, public, sort_order, grants_role, commission_pct, features)
VALUES
  ('free', 'Explorer',
   'Step inside for free. List your first property and browse every listing on the island — no card, no catch, no expiration.',
   0, 0, 0, 1, 1, NULL, 3.0,
   '["browse_listings","favorites_limit_5","basic_search","weekly_alerts","contact_agents","listings_limit_1","photos_limit_12"]'),

  ('pro', 'Professional',
   'Stop giving away 3% of every sale. Unlimited listings, 0% commission, and a Verified badge that turns lookers into buyers.',
   9700, 7800, 7, 1, 2, 'seller', 0,
   '["browse_listings","unlimited_favorites","advanced_search","daily_alerts","listings_limit_100","photos_limit_12","lead_notifications","agent_profile","basic_analytics","digital_contracts","verified_badge","google_maps_pin","featured_1_month","export_csv","email_support_24h"]'),

  ('brokerage', 'Brokerage',
   'One dashboard. Every agent. Every lead. Brand it as your own and close faster than the competition can react.',
   29900, 24900, 14, 1, 3, 'broker', 0,
   '["browse_listings","unlimited_favorites","advanced_search","daily_alerts","unlimited_listings","agent_accounts_10","team_crm","shared_leads","team_analytics","brokerage_branding","priority_support","lead_scoring","performance_analytics","featured_listings_3","shared_favorites","role_based_access","bulk_export","priority_chat_2h"]'),

  ('enterprise', 'Enterprise',
   'White-label the entire platform — your logo, your domain, your rules. Built for institutions that define the market.',
   59900, 49900, 0, 1, 4, 'broker', 0,
   '["browse_listings","unlimited_favorites","advanced_search","daily_alerts","unlimited_listings","agent_accounts_50","advanced_team_mgmt","custom_integrations","api_access","white_label","advanced_reporting","account_manager","unlimited_featured","top_placement","sso_saml","dedicated_success_manager","white_glove_onboarding","sla_uptime"]'),

  ('investor', 'Investor',
   'See the deal before it becomes a listing. Off-market access, instant ROI modeling, and cash-flow clarity for investors who move first.',
   19900, 16500, 7, 1, 5, 'investor', 0,
   '["browse_listings","unlimited_favorites","advanced_search","priority_deal_alerts","investment_search","roi_calculator","market_analysis","portfolio_tracking_10","deal_analysis","comparative_analysis","cash_flow_projections","offmarket_deals","investor_network","sniper_mode","premium_support_30min","export_csv"]')

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

-- Hide any legacy tiers without breaking old subscriptions.
UPDATE plans SET public = 0 WHERE id NOT IN ('free','pro','brokerage','enterprise','investor');
