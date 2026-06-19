import type { ScrapedProperty } from '../scraper';
import { extractAllText, extractAttr, extractBlocks, extractText } from '../htmlExtract';
import { fetchRenderedHtml } from '../scrapingbee';

// ───────────────────────────────────────────────────────────────────────────
// supercasas.com listing card parser + normalizer.
//
// Selectors below were confirmed against real server-rendered HTML from
// supercasas.com: card markup is `<li class="normal"><a href="/slug/ID/">`
// containing `.title1` (type + sale/rent), `.title2` (neighborhood),
// `.title3` (price), and `.property-small-info-slide` with one `<span>` per
// feature (bedrooms, bathrooms, parking, m², condition).
//
// The full category/search grid (e.g. /apartamentos/) hydrates client-side,
// so capturing it requires ScrapingBee with render_js=true — but the card
// component itself is shared with the homepage's server-rendered "recent
// listings" widget, which is what these selectors were captured from.
// Re-run against a real ScrapingBee response for a category page before
// relying on this for production volume, in case the hydrated grid uses
// different markup.
// ───────────────────────────────────────────────────────────────────────────

export const SUPERCASAS_CATEGORY_URLS = {
  apartamentos: 'https://www.supercasas.com/apartamentos/',
  casas: 'https://www.supercasas.com/casas/',
  villas: 'https://www.supercasas.com/villas/',
  penthouse: 'https://www.supercasas.com/penthouse/',
  solares: 'https://www.supercasas.com/solares/',
  fincas: 'https://www.supercasas.com/fincas/',
  edificios: 'https://www.supercasas.com/edificios/',
  oficinas: 'https://www.supercasas.com/oficinas/',
  'locales-comerciales': 'https://www.supercasas.com/locales-comerciales/',
} as const;

export type SupercasasCategory = keyof typeof SUPERCASAS_CATEGORY_URLS;

export interface SupercasasCard {
  href: string | null;
  title1: string; // e.g. "Apartamento / Venta y Alquiler"
  title2: string; // neighborhood/location, e.g. "Piantini"
  title3: string; // price, e.g. "US$ 1,000,000" or "US$ 3,000/Mes"
  features: string[]; // e.g. ["4 Habitaciones", "4.5 Baños", "546 Mt2 Construcción"]
}

export function parseSupercasasCards(html: string): SupercasasCard[] {
  return extractBlocks(html, 'li', 'normal').map((block) => ({
    href: extractAttr(block, 'a', 'href'),
    title1: extractText(block, 'div', 'title1'),
    title2: extractText(block, 'div', 'title2'),
    title3: extractText(block, 'div', 'title3'),
    features: extractAllText(block, 'span'),
  }));
}

function mapPropertyType(title1: string): ScrapedProperty['propertyType'] | null {
  const t = title1.toLowerCase();
  if (t.startsWith('apartamento')) return 'apartment';
  if (t.startsWith('penthouse')) return 'condo';
  if (t.startsWith('casa')) return 'house';
  if (t.startsWith('villa')) return 'villa';
  if (t.startsWith('solar') || t.startsWith('finca') || t.startsWith('terreno')) return 'land';
  if (t.startsWith('edificio') || t.startsWith('oficina') || t.startsWith('local') || t.startsWith('nave')) return 'commercial';
  return null;
}

// "Alquiler" alone means rent-only; "Venta y Alquiler" or "Venta" defaults to sale.
function mapListingType(title1: string): ScrapedProperty['listingType'] {
  const t = title1.toLowerCase();
  return t.includes('alquiler') && !t.includes('venta') ? 'rent' : 'sale';
}

/** Parses "US$ 1,000,000" / "RD$ 5,500,000" / "US$ 3,000/Mes" into cents + currency. */
function parsePrice(title3: string): { priceCents: number; currency: 'USD' | 'DOP' } | null {
  const currency: 'USD' | 'DOP' = title3.includes('RD$') ? 'DOP' : 'USD';
  const digits = title3.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return { priceCents: Number(digits) * 100, currency };
}

function parseFeatures(features: string[]) {
  let bedrooms = 0;
  let bathrooms = 0;
  // DB column allows NULL but rejects 0 (CHECK area_m2/lot_m2 IS NULL OR > 0) —
  // default to null, not 0, when a listing has no usable measurement.
  let areaM2: number | null = null;
  let lotM2: number | null = null;
  const extra: string[] = [];

  for (const f of features) {
    const num = parseFloat(f);
    if (/habitaci/i.test(f)) bedrooms = num || 0;
    else if (/baño/i.test(f)) bathrooms = num || 0;
    else if (/mt2 construcci/i.test(f)) areaM2 = num || null;
    else if (/mt2 (solar|terreno)/i.test(f)) lotM2 = num || null;
    else if (!/parqueo/i.test(f)) extra.push(f);
  }

  return { bedrooms, bathrooms, areaM2, lotM2, extra };
}

/** Normalizes a parsed supercasas.com card into Meridian's `ScrapedProperty` shape. */
export function normalizeSupercasasCard(card: SupercasasCard): ScrapedProperty | null {
  const propertyType = mapPropertyType(card.title1);
  if (!propertyType) return null;

  const price = parsePrice(card.title3);
  if (!price) return null;

  const city = card.title2.trim() || 'Unknown';
  const { bedrooms, bathrooms, areaM2, lotM2, extra } = parseFeatures(card.features);
  const type = card.title1.split('/')[0].trim();

  return {
    title: `${type} — ${city}`,
    description: card.features.join(', '),
    propertyType,
    listingType: mapListingType(card.title1),
    priceCents: price.priceCents,
    currency: price.currency,
    address: city,
    city,
    country: 'DO',
    bedrooms,
    bathrooms,
    areaM2,
    lotM2,
    features: extra,
  };
}

export async function fetchSupercasasListings(
  apiKey: string,
  category: SupercasasCategory = 'apartamentos'
): Promise<ScrapedProperty[]> {
  const url = SUPERCASAS_CATEGORY_URLS[category];
  const html = await fetchRenderedHtml(apiKey, url, { renderJs: true, waitFor: 2000 });
  return parseSupercasasCards(html)
    .map(normalizeSupercasasCard)
    .filter((p): p is ScrapedProperty => p !== null);
}
