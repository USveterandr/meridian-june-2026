import type { ScrapedProperty } from './scraper';

// ───────────────────────────────────────────────────────────────────────────
// EveryListing.com "WWLS Pipes" API client + normalizer
//
// Source: https://dominican-republic.everylisting.com/wp-json/propertiespipe/v1/{status,fetch}
// Auth:   HTTP Basic Auth (username/password issued per pipe subscription).
// Params: `amount` (1-10), `format` (json|xml).
//
// ⚠️ SCAFFOLDING — NOT YET VERIFIED AGAINST A REAL RESPONSE ⚠️
// Meridian does not have EveryListing API credentials yet, so the response
// shape below (`EveryListingRawProperty`) and `normalizeEveryListingProperty`
// are a best-guess based on common WordPress real-estate-listing plugin
// field names (WPL / WP Residence style "pipes" exports). Once credentials
// are available:
//   1. Set them with:
//        npx wrangler secret put EVERYLISTING_API_USER
//        npx wrangler secret put EVERYLISTING_API_PASS
//   2. Call GET /api/scrape/everylisting/status (admin) and compare the raw
//      JSON against `EveryListingRawProperty` below — adjust field names in
//      `normalizeEveryListingProperty` to match reality.
//   3. Remove this warning once verified.
// ───────────────────────────────────────────────────────────────────────────

const EVERYLISTING_BASE_URL = 'https://dominican-republic.everylisting.com/wp-json/propertiespipe/v1';

/**
 * Best-guess shape of a single property as returned by the WWLS Pipes
 * `/fetch` endpoint. Field names are guesses based on common WPL/WP Residence
 * exports — verify against a real response before relying on this.
 */
export interface EveryListingRawProperty {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  content?: string;
  property_type?: string;
  type?: string;
  category?: string;
  listing_type?: string; // e.g. "sale" | "rent" | "for-sale" | "for-rent"
  price?: string | number;
  price_usd?: string | number;
  currency?: string;
  address?: string;
  location?: string;
  city?: string;
  state?: string;
  province?: string;
  country?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  area?: string | number;
  living_area?: string | number;
  lot_size?: string | number;
  land_area?: string | number;
  features?: string[] | string;
  amenities?: string[] | string;
  images?: string[];
  gallery?: string[];
  [key: string]: unknown;
}

interface EveryListingFetchResponse {
  properties?: EveryListingRawProperty[];
  items?: EveryListingRawProperty[];
  data?: EveryListingRawProperty[];
  [key: string]: unknown;
}

export interface EveryListingCredentials {
  user: string;
  pass: string;
}

function authHeader(creds: EveryListingCredentials): string {
  return `Basic ${btoa(`${creds.user}:${creds.pass}`)}`;
}

/** Calls GET /status — used to verify credentials and check pipe availability. */
export async function fetchEveryListingStatus(creds: EveryListingCredentials): Promise<unknown> {
  const res = await fetch(`${EVERYLISTING_BASE_URL}/status`, {
    headers: { Authorization: authHeader(creds), Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`EveryListing /status returned ${res.status}`);
  }
  return res.json();
}

/**
 * Calls GET /fetch?amount=N&format=json — returns up to `amount` (1-10) raw
 * listings. The exact response envelope (`properties`/`items`/`data`) is
 * unconfirmed; this checks the common possibilities.
 */
export async function fetchEveryListingProperties(
  creds: EveryListingCredentials,
  amount: number = 10
): Promise<EveryListingRawProperty[]> {
  const clampedAmount = Math.min(10, Math.max(1, Math.floor(amount)));
  const url = `${EVERYLISTING_BASE_URL}/fetch?amount=${clampedAmount}&format=json`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(creds), Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`EveryListing /fetch returned ${res.status}`);
  }

  const body = (await res.json()) as EveryListingFetchResponse | EveryListingRawProperty[];
  if (Array.isArray(body)) return body;
  return body.properties ?? body.items ?? body.data ?? [];
}

// Minimum price thresholds for import — a listing qualifies if it meets
// EITHER threshold in its own currency.
const MIN_PRICE_USD = 500_000;
const MIN_PRICE_DOP = 20_000_000;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toFeaturesArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Maps a raw "type"/"category" string from EveryListing to one of Meridian's
 * `property_type` enum values. Returns null if it doesn't map to a type we
 * import from this feed (land, apartment, villa, commercial/hotel).
 */
function mapPropertyType(raw: EveryListingRawProperty): ScrapedProperty['propertyType'] | null {
  const source = (raw.property_type ?? raw.type ?? raw.category ?? '').toString().toLowerCase();

  if (source.includes('land') || source.includes('lot') || source.includes('terreno')) return 'land';
  if (source.includes('apartment') || source.includes('apartamento') || source.includes('condo')) return 'apartment';
  if (source.includes('villa')) return 'villa';
  if (source.includes('hotel') || source.includes('commercial') || source.includes('comercial')) return 'commercial';

  return null;
}

function mapListingType(raw: EveryListingRawProperty): ScrapedProperty['listingType'] {
  const source = (raw.listing_type ?? '').toString().toLowerCase();
  return source.includes('rent') ? 'rent' : 'sale';
}

/**
 * Normalizes a raw EveryListing property into Meridian's `ScrapedProperty`
 * shape, returning `null` if the listing doesn't meet the import criteria:
 * property type (land/apartment/villa/hotel/commercial-land) AND
 * price >= $500K USD or RD$20M DOP.
 */
export function normalizeEveryListingProperty(raw: EveryListingRawProperty): ScrapedProperty | null {
  const propertyType = mapPropertyType(raw);
  if (!propertyType) return null;

  const rawPrice = toNumber(raw.price_usd ?? raw.price);
  if (rawPrice === null || rawPrice <= 0) return null;

  const currency: 'USD' | 'DOP' = (raw.currency ?? 'USD').toString().toUpperCase() === 'DOP' ? 'DOP' : 'USD';

  const meetsThreshold = currency === 'DOP' ? rawPrice >= MIN_PRICE_DOP : rawPrice >= MIN_PRICE_USD;
  if (!meetsThreshold) return null;

  const title = (raw.title ?? raw.name ?? '').toString().trim();
  if (!title) return null;

  const city = (raw.city ?? raw.location ?? raw.state ?? raw.province ?? '').toString().trim() || 'Unknown';
  const address = (raw.address ?? raw.location ?? city).toString().trim();
  const description = (raw.description ?? raw.content ?? '').toString().trim();

  return {
    title,
    description,
    propertyType,
    listingType: mapListingType(raw),
    priceCents: Math.round(rawPrice * 100),
    currency,
    address,
    city,
    country: 'DO',
    bedrooms: toNumber(raw.bedrooms) ?? 0,
    bathrooms: toNumber(raw.bathrooms) ?? 0,
    areaM2: toNumber(raw.area ?? raw.living_area) ?? 0,
    lotM2: toNumber(raw.lot_size ?? raw.land_area),
    features: [...toFeaturesArray(raw.features), ...toFeaturesArray(raw.amenities)],
  };
}

/** Fetches and normalizes listings, filtering out any that don't qualify. */
export async function fetchAndNormalizeEveryListingProperties(
  creds: EveryListingCredentials,
  amount: number = 10
): Promise<ScrapedProperty[]> {
  const raw = await fetchEveryListingProperties(creds, amount);
  return raw
    .map(normalizeEveryListingProperty)
    .filter((p): p is ScrapedProperty => p !== null);
}
