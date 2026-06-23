// Cloudflare Pages Function: serves /property/:id with per-listing Open
// Graph / Twitter Card meta tags injected into the static SPA shell.
//
// The SPA itself sets these tags client-side (see src/seo.ts), but link
// preview crawlers (Facebook, WhatsApp, X, Slack, Discord, iMessage, etc.)
// fetch the raw HTML and never run JavaScript, so they only ever saw the
// site-wide defaults baked into index.html — every shared listing showed
// the generic "Meridian — Luxury Real Estate..." card instead of that
// property's own title/description/photo. This rewrites those tags at the
// edge using the real listing data before the response is sent.

const API_BASE = 'https://meridian-api.isaactrinidadllc.workers.dev';
const SITE_URL = 'https://investwithmeridian.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

type PropertyImage = { url: string };
type Property = {
  id: number;
  title: string;
  description: string;
  propertyType: string;
  listingType: 'sale' | 'rent';
  priceCents: number;
  currency: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number | null;
  images: PropertyImage[];
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatPrice(priceCents: number, currency: string, listingType: string): string {
  const amount = priceCents / 100;
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  return listingType === 'rent' ? `${formatted}/mo` : formatted;
}

function buildDescription(p: Property): string {
  const type = p.propertyType === 'villa' ? 'Luxury villa' : p.propertyType;
  const area = p.areaM2 ? `, ${p.areaM2} m²` : '';
  const price = formatPrice(p.priceCents, p.currency, p.listingType);
  return `${type} for ${p.listingType} in ${p.city}, Dominican Republic. ${p.bedrooms} beds, ${p.bathrooms} baths${area}. ${price}.`;
}

function replaceTag(html: string, pattern: RegExp, value: string): string {
  return html.replace(pattern, (_match, before: string, after: string) => `${before}${escapeHtml(value)}${after}`);
}

export const onRequestGet: PagesFunction = async (context) => {
  const response = await context.next();

  const id = context.params.id as string;
  if (!/^\d+$/.test(id)) return response;

  let property: Property | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const apiRes = await fetch(`${API_BASE}/api/properties/${id}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (apiRes.ok) {
      const data = await apiRes.json<{ property: Property }>();
      property = data.property;
    }
  } catch {
    // Network hiccup or timeout — fall through and serve the default shell.
  }

  if (!property) return response;

  const title = `${property.title} — Meridian`;
  const description = buildDescription(property);
  const url = `${SITE_URL}/property/${property.id}`;
  const image = property.images[0]?.url ? `${API_BASE}${property.images[0].url}` : DEFAULT_IMAGE;

  let html = await response.text();
  html = replaceTag(html, /(<title>)[^<]*(<\/title>)/, title);
  html = replaceTag(html, /(<meta name="description" content=")[^"]*(")/, description);
  html = replaceTag(html, /(<meta property="og:title" content=")[^"]*(")/, title);
  html = replaceTag(html, /(<meta property="og:description" content=")[^"]*(")/, description);
  html = replaceTag(html, /(<meta property="og:url" content=")[^"]*(")/, url);
  html = replaceTag(html, /(<meta property="og:image" content=")[^"]*(")/, image);
  html = replaceTag(html, /(<meta name="twitter:title" content=")[^"]*(")/, title);
  html = replaceTag(html, /(<meta name="twitter:description" content=")[^"]*(")/, description);
  html = replaceTag(html, /(<meta name="twitter:image" content=")[^"]*(")/, image);
  html = replaceTag(html, /(<link rel="canonical" href=")[^"]*(")/, url);

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(html, { status: response.status, headers });
};
