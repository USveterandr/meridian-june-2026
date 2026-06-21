// API base resolution, in priority order:
//  1. VITE_API_URL build-time env var (explicit override).
//  2. Local dev (localhost): empty base so the Vite proxy forwards /api → wrangler dev.
//  3. Production fallback: the deployed Worker. Without this, a build that ships
//     without VITE_API_URL would call /api on its own origin, where the SPA
//     fallback returns index.html and every API call fails to parse.
const PROD_API_URL = 'https://meridian-api.isaactrinidadllc.workers.dev';

function resolveApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])/.test(location.hostname)) {
    return '';
  }
  return PROD_API_URL;
}

const API_BASE: string = resolveApiBase();

const TOKEN_KEY = 'meridian_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && typeof options.body === 'string') headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }

  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; fields?: Record<string, string> };
    if (res.status === 401 && getToken()) setToken(null); // expired session
    throw new ApiError(res.status, body.error ?? 'Something went wrong.', body.fields);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<T>(path, { method: 'POST', body: form });
  },
};

export function assetUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

// ---- Shared types ----
export type User = {
  id: number; email: string; firstName: string; lastName: string; role: string;
  phone: string | null; locale: 'en' | 'es'; notifyMatches: boolean; notifyMessages: boolean;
  cedulaVerified?: boolean;
  avatarUrl?: string | null;
};

export type Subscription = {
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  billing: 'monthly' | 'annual';
  periodEnd: string | null;
  commissionPct: number;
  features: string[];
};

/** Map plan feature keys → listing limit (null = unlimited) */
export function planListingLimit(features: string[]): number | null {
  if (features.includes('unlimited_listings')) return null;
  if (features.includes('listings_limit_100')) return 100;
  if (features.includes('listings_limit_1')) return 1;
  return 1; // default (free / no sub)
}
export type PropertyImage = { id: number; url: string; position: number };
export type Property = {
  id: number; ownerId: number; title: string; description: string;
  propertyType: string; listingType: 'sale' | 'rent'; priceCents: number; currency: 'USD' | 'DOP';
  address: string; city: string; country: string; latitude: number | null; longitude: number | null;
  bedrooms: number; bathrooms: number; areaM2: number | null; lotM2: number | null;
  yearBuilt: number | null; features: string[]; virtualTourUrl: string | null;
  status: string; createdAt: string; images: PropertyImage[]; coverUrl?: string | null;
};
export type SearchResponse = { total: number; page: number; perPage: number; results: Property[] };
export type Conversation = {
  userId: number; name: string; role: string; lastBody: string; lastAt: string; lastFromMe: boolean; unread: number;
};
export type Message = { id: number; fromMe: boolean; body: string; propertyId: number | null; createdAt: string };

export function formatPrice(priceCents: number, currency: string, listingType: string, perMonth: string): string {
  const amount = priceCents / 100;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount);
  return listingType === 'rent' ? `${formatted}${perMonth}` : formatted;
}
