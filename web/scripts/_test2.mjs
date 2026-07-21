// Prerenders the site's static marketing/legal pages (Terms, Privacy,
// Contact, Founding Agents, Pricing, Private Clients) into dist_test2/<route>/index.html.
//
// WHY: only the homepage, blog, and property-listing routes were previously
// prerendered (see prerender-blog.mjs / prerender-properties.mjs). Every
// other route — including /terms and /privacy — fell through to Cloudflare
// Pages' SPA fallback, which serves dist_test2/index.html. Because prerender-
// properties.mjs injects homepage content into that same index.html as its
// last step, non-JS clients (AI crawlers, link-preview bots, and apparently
// some third-party "site audit" tools) requesting /terms or /privacy saw the
// homepage's content instead of the actual legal text — reading as "Terms of
// Service missing" / "Privacy Policy missing" even though both pages exist
// and render correctly for real (JS-executing) visitors.
//
// This script must run AFTER prerender-blog.mjs (shares the pristine
// dist_test2/index.html shell) and BEFORE prerender-properties.mjs (which
// overwrites dist_test2/index.html itself as its final step).
//
// Run from web/: node scripts/prerender-static.mjs

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE = 'https://investwithmeridian.com';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const shell = readFileSync('dist_test2/index.html', 'utf8');

function setHead(html, { title, description, url }) {
  return html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${esc(title)}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1website$2')
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/<link rel="alternate"[^>]*\/>\s*/g, '')
    .replace('</head>',
      `<link rel="alternate" hreflang="en" href="${url}?lang=en" />\n` +
      `<link rel="alternate" hreflang="es" href="${url}?lang=es" />\n` +
      `<link rel="alternate" hreflang="x-default" href="${url}" />\n</head>`);
}

function writePage(route, html) {
  mkdirSync(`dist_test2/${route}`, { recursive: true });
  writeFileSync(`dist_test2/${route}/index.html`, html);
}

function inject(html, bodyHtml) {
  return html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${bodyHtml}</div>`);
}

// ── Load Terms/Privacy content (TS → temp ESM bundle, same trick as blog.ts) ─
const tmp = 'node_modules/.prerender-legal-data.mjs';
await build({ entryPoints: ['src/data/legal.ts'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent' });
const { TERMS_CONTENT, PRIVACY_CONTENT } = await import(pathToFileURL(tmp).href + `?v=${Date.now()}`);
try { rmSync(tmp, { force: true }); } catch {}

function legalBodyHtml(c) {
  return (
    `<main><section class="section"><div class="container legal-page">` +
    `<p class="eyebrow">${esc(c.eyebrow)}</p>` +
    `<h1>${esc(c.title)}</h1>` +
    `<p class="legal-updated">${esc(c.updated)}</p>` +
    c.intro.map((p) => `<p>${esc(p)}</p>`).join('') +
    c.sections.map((s) =>
      `<div><h2>${esc(s.heading)}</h2>` +
      s.body.map((p) => `<p>${esc(p)}</p>`).join('') +
      (s.list ? `<ul>${s.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '') +
      `</div>`
    ).join('') +
    `</div></section></main>`
  );
}

// ── /terms ───────────────────────────────────────────────────────────────
{
  const c = TERMS_CONTENT.en;
  const url = `${SITE}/terms`;
  let html = setHead(shell, {
    title: 'Terms of Service — Meridian',
    description: 'Read the Meridian Terms of Service for our real estate listing and investment platform in the Dominican Republic.',
    url,
  });
  html = inject(html, legalBodyHtml(c));
  writePage('terms', html);
}

// ── /privacy ─────────────────────────────────────────────────────────────
{
  const c = PRIVACY_CONTENT.en;
  const url = `${SITE}/privacy`;
  let html = setHead(shell, {
    title: 'Privacy Policy — Meridian',
    description: 'Learn how Meridian collects, uses, and protects your information across our real estate listing and investment platform.',
    url,
  });
  html = inject(html, legalBodyHtml(c));
  writePage('privacy', html);
}

// ── /contact ─────────────────────────────────────────────────────────────
{
  const url = `${SITE}/contact`;
  const bodyHtml =
    `<main><section class="section"><div class="container" style="max-width:860px">` +
    `<p class="eyebrow">Get In Touch</p>` +
    `<h1>Connect With Meridian</h1>` +
    `<p>Your Gateway to Smarter Real Estate Decisions</p>` +
    `<p>Whether you're ready to showcase a luxury property, expand your investment portfolio, or secure trusted legal guidance — the Meridian team is here to elevate every step of your journey.</p>` +
    `<h2>Reach us</h2>` +
    `<ul>` +
    `<li>Email: <a href="mailto:info@investwithmeridian.com">info@investwithmeridian.com</a> — we reply within 1 business day</li>` +
    `<li>WhatsApp: <a href="https://wa.me/14707089223">+1 (470) 708-9223</a> — chat with us instantly</li>` +
    `</ul>` +
    `<h2>What we help you with</h2>` +
    `<ul>` +
    `<li><strong>Luxury Listings</strong> — Showcase your property to qualified international buyers.</li>` +
    `<li><strong>Investment Portfolio</strong> — Expand your DR real estate holdings with expert guidance.</li>` +
    `<li><strong>Legal Guidance</strong> — Trusted legal advisors for contracts, due diligence &amp; closings.</li>` +
    `<li><strong>Bilingual Support</strong> — Full service in English and Spanish, 7 days a week.</li>` +
    `</ul>` +
    `<p><a href="/search">Browse properties</a> · <a href="/pricing">View plans</a></p>` +
    `</div></section></main>`;
  let html = setHead(shell, {
    title: 'Contact Meridian — Dominican Republic Real Estate',
    description: 'Connect with the Meridian real estate team. Reach an expert for luxury property listings, investment portfolio advice, and legal guidance in the Dominican Republic.',
    url,
  });
  html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact Meridian',
    url, mainEntity: {
      '@type': 'Organization', name: 'Meridian Real Estate', url: SITE,
      contactPoint: [
        { '@type': 'ContactPoint', email: 'info@investwithmeridian.com', contactType: 'customer support', availableLanguage: ['English', 'Spanish'] },
        { '@type': 'ContactPoint', telephone: '+1-470-708-9223', contactType: 'customer support', contactOption: 'WhatsApp', availableLanguage: ['English', 'Spanish'] },
      ],
    },
  })}</script>\n</head>`);
  html = inject(html, bodyHtml);
  writePage('contact', html);
}

// ── /agents (Founding Agents program) ───────────────────────────────────
{
  const url = `${SITE}/agents`;
  const bodyHtml =
    `<main><section class="section"><div class="container" style="max-width:820px">` +
    `<p class="eyebrow">Founding Agents — Limited Offer</p>` +
    `<h1>List free for a year. Keep 100% of your commission.</h1>` +
    `<p>Meridian is the bilingual home for Dominican Republic real estate. The first 100 agents and brokers get our Pro plan — unlimited listings, 0% platform commission, and a Verified badge — free for 12 months. No card required.</p>` +
    `<h2>What's included</h2>` +
    `<ul>` +
    `<li><strong>Unlimited listings</strong> — Post every property you represent — no per-listing fees, no cap.</li>` +
    `<li><strong>0% platform commission</strong> — We never take a cut of your sale. What you close is yours.</li>` +
    `<li><strong>Verified badge</strong> — A trust mark that turns browsers into leads on every listing.</li>` +
    `<li><strong>Bilingual reach</strong> — Your listings shown to EN + ES buyers, locally and abroad.</li>` +
    `</ul>` +
    `<p><a href="/signup?role=agent">Create my account</a></p>` +
    `<p><em>Free Pro for 12 months for the first 100 verified agents/brokers who claim before the deadline. Reverts to standard Pro pricing after 12 months; cancel anytime.</em></p>` +
    `<h2>Leadership</h2>` +
    `<h3>Isaac Trinidad — CEO &amp; Founder</h3>` +
    `<p>Isaac Trinidad has spent 20 years building a career in Dominican Republic real estate, closing major commercial, land, and residential deals across the country. He entered the market in 2005 and, in 2012, built one of the DR's first online real estate advisory platforms — the direct predecessor to Meridian — to help investors find and close opportunities most agents never see, from hotel and resort land to apartment complexes and mineral-rich territory.</p>` +
    `<p>Before real estate, Isaac served in the U.S. Navy (1996–2000) aboard the amphibious assault ship USS Saipan (LHA-2), where he served as Commissioner of the Hispanic Heritage Committee. After the September 11 attacks, he returned to active duty with the U.S. Air Force Reserve as a Military Police officer, serving with the 459th Security Forces Squadron at Andrews Air Force Base and as a Federal Police Officer with the U.S. Army at Fort Sill.</p>` +
    `<p>He holds a Bachelor's degree in Business Administration with a concentration in Management from Grand Canyon University (Phoenix, AZ) and an Associate of Applied Science in Business Administration from Kaplan University.</p>` +
    `<h3>Starlyn Trinidad Garcia — Project Manager</h3>` +
    `<h3>Yoy Gonzalez — Backend Fullstack Developer</h3>` +
    `</div></section></main>`;
  let html = setHead(shell, {
    title: 'Founding Agents — Free Pro for 12 Months | Meridian',
    description: 'The first 100 Dominican Republic agents and brokers list free for a year on Meridian — unlimited listings, 0% commission, Verified badge. Claim your spot.',
    url,
  });
  html = inject(html, bodyHtml);
  writePage('agents', html);
}

// ── /pricing (dynamic pricing table lives behind the API; static summary
// only, so crawlers/scanners at least see real distinct content) ─────────
{
  const url = `${SITE}/pricing`;
  const bodyHtml =
    `<main><section class="section"><div class="container" style="max-width:820px">` +
    `<h1>Pricing Plans</h1>` +
    `<p>Simple, transparent pricing for Dominican Republic real estate — from a free plan for your first listing up to white-label enterprise solutions.</p>` +
    `<ul>` +
    `<li><strong>Explorer (Free)</strong> — Publish 1 listing, browse every property on the island.</li>` +
    `<li><strong>Professional</strong> — Unlimited listings, 0% commission, Verified badge.</li>` +
    `<li><strong>Brokerage</strong> — Team CRM, shared leads, brokerage branding, 10 agent seats.</li>` +
    `<li><strong>Enterprise</strong> — White-label the platform, API access, dedicated account manager.</li>` +
    `<li><strong>Investor</strong> — Off-market access, ROI calculator, portfolio tracking.</li>` +
    `</ul>` +
    `<p>Live prices and full feature comparison: <a href="/pricing">investwithmeridian.com/pricing</a> (loads interactively).</p>` +
    `</div></section></main>`;
  let html = setHead(shell, {
    title: 'Pricing Plans — Meridian',
    description: 'Choose from FREE Explorer, Professional, Brokerage, Enterprise, or Investor plans. Simple, transparent pricing for Dominican Republic real estate.',
    url,
  });
  html = inject(html, bodyHtml);
  writePage('pricing', html);
}

// ── /private-clients ─────────────────────────────────────────────────────
{
  const url = `${SITE}/private-clients`;
  const bodyHtml =
    `<main><section class="section"><div class="container" style="max-width:820px">` +
    `<p class="eyebrow">Private Clients</p>` +
    `<h1>The private gateway to Dominican Republic luxury real estate</h1>` +
    `<p>For family offices and investors allocating serious capital to the Caribbean's leading market.</p>` +
    `<h2>Why sophisticated capital chooses the DR</h2>` +
    `<ul>` +
    `<li><strong>CONFOTUR: 15 years, zero property tax</strong> — Law 158-01 exempts approved projects from income tax and property tax (IPI) for 15 years, and waives the 3% transfer tax.</li>` +
    `<li><strong>Full foreign ownership, guaranteed repatriation</strong> — Foreign buyers hold identical property rights to citizens. Law 16-95 guarantees repatriation of capital and profits in freely convertible currency.</li>` +
    `<li><strong>Residency fast-track</strong> — A property investment of US$200,000+ fast-tracks Dominican residency.</li>` +
    `</ul>` +
    `<h2>What Private Clients receive</h2>` +
    `<ul>` +
    `<li>Off-market access — invitation-only inventory and discreet, NDA-gated data rooms.</li>` +
    `<li>Dedicated bilingual advisor, from first call to notarized closing.</li>` +
    `<li>Verification &amp; legal desk — title-checked listings, CONFOTUR eligibility screening.</li>` +
    `<li>Portfolio-grade analytics — yield, appreciation, and tax-exemption data per property.</li>` +
    `</ul>` +
    `<p><a href="/contact">Request an introduction</a> · <a href="/search">Browse verified listings</a></p>` +
    `</div></section></main>`;
  let html = setHead(shell, {
    title: 'Private Clients — Meridian',
    description: 'Invitation-led access to verified Dominican Republic luxury real estate for family offices and ultra-high-net-worth investors. CONFOTUR guidance, off-market inventory, bilingual advisory.',
    url,
  });
  html = inject(html, bodyHtml);
  writePage('private-clients', html);
}

console.log('Prerendered static pages: /terms /privacy /contact /agents /pricing /private-clients');
