export type Bindings = {
  DB: D1Database;
  ASSETS: R2Bucket;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
};

export type AuthUser = { id: number; email: string; role: string };

export type Vars = { user: AuthUser };

export type AppEnv = { Bindings: Bindings; Variables: Vars };

export const LISTING_ROLES = ['seller', 'landlord', 'agent', 'broker', 'admin'] as const;
