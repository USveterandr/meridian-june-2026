export type Bindings = {
  DB: D1Database;
  ASSETS: R2Bucket;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
  /** Set via: npx wrangler secret put STRIPE_SECRET_KEY */
  STRIPE_SECRET_KEY?: string;
  /** Set via: npx wrangler secret put STRIPE_WEBHOOK_SECRET (whsec_...) */
  STRIPE_WEBHOOK_SECRET?: string;
  /** EveryListing.com WWLS Pipes API — set via: npx wrangler secret put EVERYLISTING_API_USER */
  EVERYLISTING_API_USER?: string;
  /** EveryListing.com WWLS Pipes API — set via: npx wrangler secret put EVERYLISTING_API_PASS */
  EVERYLISTING_API_PASS?: string;
  /** ScrapingBee (JS-rendered HTML for DR portal scrapers) — set via: npx wrangler secret put SCRAPINGBEE_API_KEY */
  SCRAPINGBEE_API_KEY?: string;
  /** Google Geocoding API (server-side, unrestricted key) — set via: npx wrangler secret put GOOGLE_MAPS_SERVER_KEY */
  GOOGLE_MAPS_SERVER_KEY?: string;
  /** Resend transactional email API key — set via: npx wrangler secret put RESEND_API_KEY */
  RESEND_API_KEY?: string;
  /** Brevo transactional email API key (takes precedence over Resend) — set via: npx wrangler secret put BREVO_API_KEY */
  BREVO_API_KEY?: string;
  /** Verified sender address, e.g. "Meridian <alerts@investwithmeridian.com>" — set in wrangler.toml [vars] */
  EMAIL_FROM?: string;
  /** DOP per USD used to normalize DOP-priced listings in market stats — set in wrangler.toml [vars] */
  DOP_USD_RATE?: string;
};

export type AuthUser = { id: number; email: string; role: string };

export type Vars = { user: AuthUser };

export type AppEnv = { Bindings: Bindings; Variables: Vars };

export const LISTING_ROLES = ['seller', 'landlord', 'agent', 'broker', 'admin'] as const;
