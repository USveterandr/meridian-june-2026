import { useEffect } from 'react';

const SITE_NAME = 'Meridian';
const SITE_URL = 'https://investwithmeridian.com';
const DEFAULT_DESCRIPTION =
  'Premium real estate & investment platform for the Dominican Republic. Browse luxury properties, villas, condos, and land for sale or rent in Punta Cana, Santo Domingo, Las Terrenas, and beyond.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: object;
}

/** Sets <title>, meta description, og:*, twitter:* and canonical for each page */
export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  canonical,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps = {}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Luxury Real Estate in the Dominican Republic`;

  useEffect(() => {
    // ── <title> ───────────────────────────────────────────────────────────
    document.title = fullTitle;

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

    // ── Helper: set/create a <link> tag ──────────────────────────────────
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // ── Standard meta ─────────────────────────────────────────────────────
    setMeta('[name="description"]', description);
    if (noindex) setMeta('[name="robots"]', 'noindex,nofollow');
    else setMeta('[name="robots"]', 'index,follow,max-image-preview:large');

    // ── Open Graph ────────────────────────────────────────────────────────
    setMeta('[property="og:type"]', type);
    setMeta('[property="og:title"]', fullTitle);
    setMeta('[property="og:description"]', description);
    setMeta('[property="og:image"]', image);
    setMeta('[property="og:site_name"]', SITE_NAME);
    setMeta('[property="og:url"]', canonical ?? (SITE_URL + window.location.pathname));

    // ── Twitter Card ─────────────────────────────────────────────────────
    setMeta('[name="twitter:card"]', 'summary_large_image');
    setMeta('[name="twitter:title"]', fullTitle);
    setMeta('[name="twitter:description"]', description);
    setMeta('[name="twitter:image"]', image);

    // ── Canonical ─────────────────────────────────────────────────────────
    setLink('canonical', canonical ?? (SITE_URL + window.location.pathname));

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
      document.title = `${SITE_NAME} — Luxury Real Estate in the Dominican Republic`;
      document.getElementById('page-jsonld')?.remove();
    };
  }, [fullTitle, description, image, canonical, type, noindex, jsonLd]);
}
