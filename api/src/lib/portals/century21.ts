import type { ScrapedProperty } from '../scraper';
import { extractAttr, extractBlocks, extractText } from '../htmlExtract';
import { fetchRenderedHtml } from '../scrapingbee';

// ───────────────────────────────────────────────────────────────────────────
// century21dominicana.com listing card parser + normalizer.
//
// ⚠️ SCAFFOLDING — NOT YET VERIFIED AGAINST A REAL RESPONSE ⚠️
// This environment could not resolve century21dominicana.com to inspect
// real markup, so the class names below (`.property-item`, `.property-
// title`, etc.) are generic guesses based on common IDX/real-estate-
// franchise templates — not confirmed. Before relying on this:
//   1. Run one ScrapingBee request against a century21dominicana.com
//      search/listing page with render_js=true and inspect the raw HTML.
//   2. Update the class names passed to extractBlocks/extractText below to
//      match what's actually there.
//   3. Remove this warning once verified.
// ───────────────────────────────────────────────────────────────────────────

export const CENTURY21_SEARCH_URL = 'https://www.century21dominicana.com/propiedades/';

export interface Century21Card {
  href: string | null;
  title: string;
  price: string;
  location: string;
  features: string;
}

export function parseCentury21Cards(html: string): Century21Card[] {
  return extractBlocks(html, 'div', 'property-item').map((block) => ({
    href: extractAttr(block, 'a', 'href'),
    title: extractText(block, 'h2', 'property-title') || extractText(block, 'div', 'property-title'),
    price: extractText(block, 'div', 'property-price'),
    location: extractText(block, 'div', 'property-location'),
    features: extractText(block, 'div', 'property-features'),
  }));
}

function parsePrice(price: string): { priceCents: number; currency: 'USD' | 'DOP' } | null {
  const currency: 'USD' | 'DOP' = price.includes('RD$') ? 'DOP' : 'USD';
  const digits = price.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return { priceCents: Number(digits) * 100, currency };
}

/** Best-guess normalizer — unverified, see file header. */
export function normalizeCentury21Card(card: Century21Card): ScrapedProperty | null {
  if (!card.title) return null;
  const price = parsePrice(card.price);
  if (!price) return null;

  const t = card.title.toLowerCase();
  const propertyType: ScrapedProperty['propertyType'] = t.includes('villa')
    ? 'villa'
    : t.includes('penthouse') || t.includes('condo')
      ? 'condo'
      : t.includes('casa') || t.includes('house')
        ? 'house'
        : t.includes('terreno') || t.includes('land') || t.includes('solar')
          ? 'land'
          : t.includes('local') || t.includes('oficina') || t.includes('comercial')
            ? 'commercial'
            : 'apartment';

  const location = card.location.trim() || 'Unknown';

  return {
    title: card.title.trim(),
    description: card.features,
    propertyType,
    listingType: t.includes('alquiler') || t.includes('rent') ? 'rent' : 'sale',
    priceCents: price.priceCents,
    currency: price.currency,
    address: location,
    city: location,
    country: 'DO',
    bedrooms: 0,
    bathrooms: 0,
    areaM2: 0,
    lotM2: null,
    features: card.features ? card.features.split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

export async function fetchCentury21Listings(apiKey: string): Promise<ScrapedProperty[]> {
  const html = await fetchRenderedHtml(apiKey, CENTURY21_SEARCH_URL, { renderJs: true, waitFor: 2000 });
  return parseCentury21Cards(html)
    .map(normalizeCentury21Card)
    .filter((p): p is ScrapedProperty => p !== null);
}
