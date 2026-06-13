import { useEffect } from 'react';
import { useLang, type Lang } from './i18n';

const SITE_NAME = 'Meridian';
const SITE_URL = 'https://investwithmeridian.com';

/** A string, or a pair of localized strings. */
export type Localized = string | { en: string; es: string };

const DEFAULT_DESCRIPTION: { en: string; es: string } = {
  en: 'Premium real estate & investment platform for the Dominican Republic. Browse luxury properties, villas, condos, and land for sale or rent in Punta Cana, Santo Domingo, Las Terrenas, and beyond.',
  es: 'Plataforma premium de bienes raíces e inversión para la República Dominicana. Explora propiedades de lujo, villas, condominios y terrenos en venta o alquiler en Punta Cana, Santo Domingo, Las Terrenas y más.',
};
const DEFAULT_TITLE: { en: string; es: string } = {
  en: `${SITE_NAME} — Luxury Real Estate in the Dominican Republic`,
  es: `${SITE_NAME} — Bienes Raíces de Lujo en la República Dominicana`,
};
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_DO' };

function pick(value: Localized | undefined, lang: Lang): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : (value[lang] ?? value.en);
}

interface SEOProps {
  title?: Localized;
  description?: Localized;
  image?: string;
  canonical?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: object;
}

/**
 * Sets <title>, meta description, og:*, twitter:*, canonical, og:locale and
 * hreflang alternates for each page — localized to the active language and
 * re-applied whenever the user switches EN ⇄ ES.
 *
 * `title`/`description` accept either a plain string or `{ en, es }`.
 */
export function useSEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  canonical,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps = {}) {
  const { lang } = useLang();

  const pageTitle = pick(title, lang);
  const fullTitle = pageTitle ? `${pageTitle} — ${SITE_NAME}` : DEFAULT_TITLE[lang];
  const desc = pick(description, lang) ?? DEFAULT_DESCRIPTION[lang];

  useEffect(() => {
    // ── <title> & <html lang> ─────────────────────────────────────────────
    document.title = fullTitle;
    document.documentElement.lang = lang;

    // ── Helper: set/create a <meta> tag ──────────────────────────────────
    const setMeta = (selector: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        const attr = selector.includes('[name=') ? 'name' : 'property';
        const match = selector.match(/['"](.*?)['"]/);
        if (match) el.setAttribute(attr, match[1]);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    // ── Helper: set/create a <link> tag (keyed by rel [+ hreflang]) ──────
    const setLink = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let el = document.querySelector<HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        if (hreflang) el.setAttribute('hreflang', hreflang);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    const pageUrl = canonical ?? (SITE_URL + window.location.pathname);

    // ── Standard meta ─────────────────────────────────────────────────────
    setMeta('[name="description"]', desc);
    if (noindex) setMeta('[name="robots"]', 'noindex,nofollow');
    else setMeta('[name="robots"]', 'index,follow,max-image-preview:large');

    // ── Open Graph ────────────────────────────────────────────────────────
    setMeta('[property="og:type"]', type);
    setMeta('[property="og:title"]', fullTitle);
    setMeta('[property="og:description"]', desc);
    setMeta('[property="og:image"]', image);
    setMeta('[property="og:site_name"]', SITE_NAME);
    setMeta('[property="og:url"]', pageUrl);
    setMeta('[property="og:locale"]', OG_LOCALE[lang]);
    setMeta('[property="og:locale:alternate"]', OG_LOCALE[lang === 'en' ? 'es' : 'en']);

    // ── Twitter Card ─────────────────────────────────────────────────────
    setMeta('[name="twitter:card"]', 'summary_large_image');
    setMeta('[name="twitter:title"]', fullTitle);
    setMeta('[name="twitter:description"]', desc);
    setMeta('[name="twitter:image"]', image);

    // ── Canonical + hreflang alternates (?lang= serves each language) ────
    setLink('canonical', pageUrl);
    const joiner = pageUrl.includes('?') ? '&' : '?';
    setLink('alternate', `${pageUrl}${joiner}lang=en`, 'en');
    setLink('alternate', `${pageUrl}${joiner}lang=es`, 'es');
    setLink('alternate', pageUrl, 'x-default');

    // ── JSON-LD structured data ───────────────────────────────────────────
    if (jsonLd) {
      let script = document.getElementById('page-jsonld') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'page-jsonld';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      // Reset title and remove the previous page-specific JSON-LD block.
      document.title = DEFAULT_TITLE[lang];
      document.getElementById('page-jsonld')?.remove();
    };
  }, [fullTitle, desc, image, canonical, type, noindex, jsonLd, lang]);
}
