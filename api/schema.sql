-- Meridian D1 schema. Idempotent: safe to run more than once.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'buyer'
                CHECK (role IN ('buyer','renter','investor','seller','landlord','agent','broker','lawyer','notary','admin')),
  phone         TEXT,
  locale        TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en','es')),
  notify_matches  INTEGER NOT NULL DEFAULT 1,
  notify_messages INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  property_type TEXT NOT NULL CHECK (property_type IN ('house','apartment','condo','villa','land','commercial')),
  listing_type  TEXT NOT NULL CHECK (listing_type IN ('sale','rent')),
  -- Money is stored as integer cents to avoid floating point rounding bugs.
  price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
  currency      TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','DOP')),
  address       TEXT NOT NULL,
  city          TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'DO' CHECK (length(country) = 2),
  latitude      REAL,
  longitude     REAL,
  bedrooms      INTEGER NOT NULL DEFAULT 0 CHECK (bedrooms BETWEEN 0 AND 50),
  bathrooms     REAL    NOT NULL DEFAULT 0 CHECK (bathrooms BETWEEN 0 AND 50),
  area_m2       REAL CHECK (area_m2 IS NULL OR area_m2 > 0),
  lot_m2        REAL CHECK (lot_m2 IS NULL OR lot_m2 > 0),
  year_built    INTEGER CHECK (year_built IS NULL OR year_built BETWEEN 1800 AND 2100),
  features      TEXT NOT NULL DEFAULT '[]', -- JSON array of feature strings
  virtual_tour_url TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('draft','active','pending','sold','rented','inactive')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_properties_search
  ON properties (status, listing_type, property_type, city, price_cents);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties (created_at DESC);

CREATE TABLE IF NOT EXISTS property_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_images_property ON property_images (property_id, position);

CREATE TABLE IF NOT EXISTS requirements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  listing_type  TEXT NOT NULL CHECK (listing_type IN ('sale','rent')),
  property_type TEXT CHECK (property_type IS NULL OR property_type IN ('house','apartment','condo','villa','land','commercial')),
  city          TEXT,
  max_price_cents INTEGER CHECK (max_price_cents IS NULL OR max_price_cents > 0),
  min_bedrooms  INTEGER NOT NULL DEFAULT 0,
  min_bathrooms REAL NOT NULL DEFAULT 0,
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_requirements_user ON requirements (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id  INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  body         TEXT NOT NULL,
  read_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, property_id)
);

-- ─── Phase 2A additions ──────────────────────────────────────────────────

-- Cédula verification columns on users (ALTER TABLE is idempotent via triggers)
-- Add with a migration if needed; new installs get these automatically.
CREATE TABLE IF NOT EXISTS user_verification (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cedula_verified INTEGER NOT NULL DEFAULT 0,
  cedula_last4    TEXT,
  verified_at     TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Subscription plans catalogue
CREATE TABLE IF NOT EXISTS plans (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  price_monthly_cents   INTEGER NOT NULL DEFAULT 0,
  price_annual_cents    INTEGER NOT NULL DEFAULT 0,
  trial_days            INTEGER NOT NULL DEFAULT 0,
  public                INTEGER NOT NULL DEFAULT 1,
  sort_order            INTEGER NOT NULL DEFAULT 99,
  grants_role           TEXT,
  commission_pct        REAL NOT NULL DEFAULT 0,
  features              TEXT NOT NULL DEFAULT '[]',
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL REFERENCES plans(id),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('trialing','active','past_due','canceled')),
  billing_interval      TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','annual')),
  current_period_end    TEXT,
  paypal_order_id       TEXT,
  paypal_transaction_id TEXT,
  stripe_subscription_id TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id, status);

-- Territory cache (DR Government API responses, 1-week TTL)
CREATE TABLE IF NOT EXISTS territory_cache (
  cache_key   TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  cached_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

