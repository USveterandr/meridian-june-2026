// Prerenders every ACTIVE property listing into static HTML in dist/property/
// and regenerates dist/sitemap.xml to cover static routes + blog + listings.
//
// WHY: like the blog, listing pages are client-rendered — AI crawlers and
// non-JS search bots saw an empty shell, and the sitemap listed no property
// URLs at all. This fetches the live API at build time and emits crawlable
// pages with RealEstateListing/Offer JSON-LD and per-listing OG images.
//
// Run from web/: node scripts/prerender-properties.mjs (wired into build,
// after prerender-blog.mjs). Fails soft: if the API is unreachable, the
// build continues with blog+static sitemap entries only.

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE = 'https://investwithmeridian.com';
const API = 'https://meridian-api.isaactrinidadllc.workers.dev';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripEmoji = (s) => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim();
const fmtPrice = (cents, currency, listingType) => {
  const f = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  return listingType === 'rent' ? `${f}/mo` : f;
};

// Accepts either the API's camelCase shape or raw D1 snake_case rows
// (the committed snapshot uses the latter).
function normalize(p) {
  if (p.priceCents !== undefined) return p;
  return {
    id: p.id, title: p.title, description: p.description ?? '',
    propertyType: p.property_type, listingType: p.listing_type,
    priceCents: p.price_cents, currency: p.currency,
    address: p.address, city: p.city,
    bedrooms: p.bedrooms, bathrooms: p.bathrooms,
    areaM2: p.area_m2, lotM2: p.lot_m2, yearBuilt: p.year_built,
    features: [], createdAt: p.created_at, updatedAt: p.updated_at,
    images: p.cover_key ? [{ url: `/api/assets/${p.cover_key}` }] : [],
    coverUrl: p.cover_key ? `/api/assets/${p.cover_key}` : null,
  };
}

// ── Fetch all active listings ───────────────────────────────────────────────
let properties = [];
try {
  let page = 1;
  for (;;) {
    const res = await fetch(`${API}/api/properties?perPage=50&page=${page}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    properties.push(...(data.results ?? []));
    if (page * data.perPage >= data.total) break;
    page += 1;
    if (page > 40) break; // safety cap
  }
  console.log(`Fetched ${properties.length} active listings`);
} catch (err) {
  // Build environments without network access to the API fall back to the
  // committed snapshot (refresh it with scripts/refresh-listings-snapshot).
  try {
    properties = JSON.parse(readFileSync('scripts/listings-snapshot.json', 'utf8'));
    console.warn(`WARN: API unreachable (${err.message}); using listings-snapshot.json (${properties.length} listings)`);
  } catch {
    console.warn(`WARN: could not fetch listings (${err.message}) and no snapshot found; skipping property prerender`);
  }
}

properties = properties.map(normalize);

const shell = readFileSync('dist/index.html', 'utf8');

function setHead(html, { title, description, url, image, type = 'website' }) {
  return html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${esc(title)}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${type}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${image}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${image}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/<link rel="alternate"[^>]*\/>\s*/g, '')
    .replace('</head>',
      `<link rel="alternate" hreflang="en" href="${url}?lang=en" />\n` +
      `<link rel="alternate" hreflang="es" href="${url}?lang=es" />\n` +
      `<link rel="alternate" hreflang="x-default" href="${url}" />\n</head>`);
}

// ── Per-listing static pages ────────────────────────────────────────────────
for (const p of properties) {
  const title = stripEmoji(p.title);
  const url = `${SITE}/property/${p.id}`;
  const price = fmtPrice(p.priceCents, p.currency, p.listingType);
  const typeLabel = p.propertyType === 'villa' ? 'Luxury villa' : p.propertyType;
  const description = `${typeLabel} for ${p.listingType} in ${p.city}, Dominican Republic — ${price}. ${p.bedrooms} beds, ${p.bathrooms} baths${p.areaM2 ? `, ${p.areaM2} m²` : ''}.`;
  const images = (p.images ?? []).map((i) => `${API}${i.url}`);
  const cover = images[0] ?? (p.coverUrl ? `${API}${p.coverUrl}` : `${SITE}/og-image.jpg`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: p.description || description,
    url,
    datePosted: p.createdAt,
    image: images.length ? images : [cover],
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    about: {
      '@type': 'Residence',
      name: title,
      address: { '@type': 'PostalAddress', streetAddress: p.address, addressLocality: p.city, addressCountry: 'DO' },
      numberOfRooms: p.bedrooms,
      ...(p.areaM2 ? { floorSize: { '@type': 'QuantitativeValue', value: p.areaM2, unitCode: 'MTK' } } : {}),
    },
    offers: {
      '@type': 'Offer',
      price: p.priceCents / 100,
      priceCurrency: p.currency,
      availability: 'https://schema.org/InStock',
      url,
    },
  };

  const facts = [
    ['Type', typeLabel], ['Listing', p.listingType === 'sale' ? 'For sale' : 'For rent'],
    ['Price', price], ['City', p.city], ['Bedrooms', p.bedrooms], ['Bathrooms', p.bathrooms],
    ...(p.areaM2 ? [['Area', `${p.areaM2} m²`]] : []),
    ...(p.lotM2 ? [['Lot', `${p.lotM2} m²`]] : []),
    ...(p.yearBuilt ? [['Year built', p.yearBuilt]] : []),
  ];

  const bodyHtml =
    `<main class="section"><div class="container" style="max-width:860px">` +
    `<p><a href="/search">← All listings</a> · ${esc(p.city)}, Dominican Republic</p>` +
    `<h1>${esc(title)}</h1>` +
    `<p><strong>${esc(price)}</strong> · ${esc(typeLabel)} ${p.listingType === 'sale' ? 'for sale' : 'for rent'} in ${esc(p.city)}</p>` +
    (images.length ? `<p>${images.slice(0, 6).map((src) => `<img src="${esc(src)}" alt="${esc(title)}" width="400" loading="lazy" />`).join(' ')}</p>` : '') +
    `<table><tbody>${facts.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` +
    (p.description ? `<div><p>${esc(p.description).replace(/\n+/g, '</p><p>')}</p></div>` : '') +
    ((p.features ?? []).length ? `<p><strong>Features:</strong> ${p.features.map(esc).join(', ')}</p>` : '') +
    `<p><a href="/search?listingType=${p.listingType}">Browse more Dominican Republic ${p.listingType === 'sale' ? 'properties for sale' : 'rentals'} on Meridian →</a></p>` +
    `</div></main>`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Meridian', item: SITE },
      { '@type': 'ListItem', position: 2, name: `${p.city} real estate`, item: `${SITE}/search?q=${encodeURIComponent(p.city)}` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  let html = setHead(shell, { title: `${title} — Meridian`, description, url, image: cover, type: 'article' });
  html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>\n</head>`);
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${bodyHtml}</div>`);
  mkdirSync(`dist/property/${p.id}`, { recursive: true });
  writeFileSync(`dist/property/${p.id}/index.html`, html);
}
if (properties.length) console.log(`Prerendered ${properties.length} property pages into dist/property/`);

// ── Regenerate sitemap.xml (static + blog + properties) ────────────────────
const tmp = 'node_modules/.sitemap-blog-data.mjs';
await build({ entryPoints: ['src/data/blog.ts'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent' });
const { BLOG_ARTICLES } = await import(pathToFileURL(tmp).href + `?v=${Date.now()}`);
rmSync(tmp, { force: true });

const today = new Date().toISOString().slice(0, 10);
const entry = (loc, { lastmod = today, changefreq = 'weekly', priority = '0.7' } = {}) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${loc}?lang=en"/>
    <xhtml:link rel="alternate" hreflang="es" href="${loc}?lang=es"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>
  </url>`;

const urls = [
  entry(`${SITE}/`, { changefreq: 'daily', priority: '1.0' }),
  entry(`${SITE}/search`, { changefreq: 'hourly', priority: '0.95' }),
  entry(`${SITE}/pricing`, { changefreq: 'monthly', priority: '0.8' }),
  entry(`${SITE}/contact`, { changefreq: 'monthly', priority: '0.75' }),
  entry(`${SITE}/signup`, { changefreq: 'monthly', priority: '0.7' }),
  entry(`${SITE}/login`, { changefreq: 'monthly', priority: '0.5' }),
  entry(`${SITE}/blog`, { changefreq: 'weekly', priority: '0.85' }),
  ...BLOG_ARTICLES.map((a) => entry(`${SITE}/blog/${a.slug}`, { lastmod: a.datePublished, changefreq: 'monthly', priority: '0.9' })),
  ...properties.map((p) => entry(`${SITE}/property/${p.id}`, { lastmod: (p.updatedAt ?? p.createdAt ?? today).slice(0, 10), changefreq: 'weekly', priority: '0.8' })),
];

writeFileSync('dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Sitemap: ${urls.length} URLs written to dist/sitemap.xml`);

// ── Homepage: inject static H1 + crawlable content into dist/index.html ────
// Bing's live URL test flags "H1 tag missing" because the hero renders
// client-side only. This static block is replaced by React on mount, but
// gives crawlers (and non-JS agents) real content. IMPORTANT: this must run
// LAST — the blog/property prerender steps use dist/index.html as their
// empty-#root shell.
{
  const cityCounts = {};
  for (const p of properties) cityCounts[p.city] = (cityCounts[p.city] ?? 0) + 1;
  const cities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const homeBody =
    `<main class="section"><div class="container">` +
    `<h1>Luxury Real Estate in the Dominican Republic</h1>` +
    `<p>Meridian is a bilingual platform for buying, renting, and investing in verified Dominican Republic properties — luxury villas, condos, apartments, and land in Punta Cana, Cap Cana, Las Terrenas, Santo Domingo, and Samaná.</p>` +
    `<h2>Explore by city</h2>` +
    `<ul>${cities.map(([c, n]) => `<li><a href="/search?q=${encodeURIComponent(c)}">${esc(c)}</a> — ${n} listing${n === 1 ? '' : 's'}</li>`).join('')}</ul>` +
    `<h2>Start browsing</h2>` +
    `<ul>` +
    `<li><a href="/search?listingType=sale">Properties for sale</a></li>` +
    `<li><a href="/search?listingType=rent">Properties for rent</a></li>` +
    `<li><a href="/blog">DR real estate guides &amp; weekly market news</a></li>` +
    `<li><a href="/pricing">Plans for sellers, agents, and brokerages</a></li>` +
    `</ul>` +
    `</div></main>`;
  const home = shell.replace(/<div id="root">\s*<\/div>/, `<div id="root">${homeBody}</div>`);
  writeFileSync('dist/index.html', home);
  console.log('Homepage: static H1 + content injected into dist/index.html');
}
