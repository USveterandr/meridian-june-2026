export type Bindings = {
  DB: D1Database;
  ASSETS: R2Bucket;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
  /** Set via: npx wrangler secret put STRIPE_SECRET_KEY */
  STRIPE_SECRET_KEY?: string;
  /** Set via: npx wrangler secret put STRIPE_WEBHOOK_SECRET (whsec_...) */
  STRIPE_WEBHOOK_SECRET?: string;
};

export type AuthUser = { id: number; email: string; role: string };

export type Vars = { user: AuthUser };

export type AppEnv = { Bindings: Bindings; Variables: Vars };

export const LISTING_ROLES = ['seller', 'landlord', 'agent', 'broker', 'admin'] as const;
