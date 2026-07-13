// Prerenders every blog article (and the blog index) into static HTML files
// inside dist/ after `vite build`.
//
// WHY: the site is a client-rendered SPA. AI crawlers (GPTBot, ClaudeBot,
// PerplexityBot, CCBot) and most link-preview bots do NOT execute JavaScript,
// so without this step they see an empty <div id="root"> — the blog content
// is invisible to LLM training and AI search. Cloudflare Pages serves
// dist/blog/<slug>/index.html for GET /blog/<slug> ahead of the SPA fallback,
// so crawlers get full HTML while JS-enabled visitors still get the app
// (React re-renders into #root on load).
//
// Run from web/: node scripts/prerender-blog.mjs  (wired into `npm run build`)

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE = 'https://investwithmeridian.com';

// ── Load the article data (TS → temp ESM bundle) ──────────────────────────
const tmp = 'node_modules/.prerender-blog-data.mjs';
await build({ entryPoints: ['src/data/blog.ts'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent' });
const { BLOG_ARTICLES } = await import(pathToFileURL(tmp).href + `?v=${Date.now()}`);
rmSync(tmp, { force: true });

// ── Minimal markdown → HTML (mirror of pages/BlogPost.tsx renderMarkdown) ──
function renderMarkdown(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
    })
    .replace(/^(\|-+)+\|$/gm, '')
    .replace(/((<tr>.*?<\/tr>\n?)+)/gs, '<table>$1</table>')
    .replace(/<table>\s*<tr>(.*?)<\/tr>/s, (_, inner) =>
      '<table><thead><tr>' + inner.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr></thead><tbody>')
    .replace(/<\/table>/g, '</tbody></table>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    .replace(/\n{3,}/g, '\n\n');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const shell = readFileSync('dist/index.html', 'utf8');

function setHead(html, { title, description, url }) {
  return html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${esc(title)}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1article$2')
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/<link rel="alternate"[^>]*\/>\s*/g, '')
    .replace('</head>',
      `<link rel="alternate" hreflang="en" href="${url}?lang=en" />\n` +
      `<link rel="alternate" hreflang="es" href="${url}?lang=es" />\n` +
      `<link rel="alternate" hreflang="x-default" href="${url}" />\n</head>`);
}

function writePage(path, html) {
  mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, html);
}

// ── Per-article pages ──────────────────────────────────────────────────────
for (const a of BLOG_ARTICLES) {
  const url = `${SITE}/blog/${a.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.titleEn,
    alternativeHeadline: a.titleEs,
    description: a.descriptionEn,
    datePublished: a.datePublished,
    dateModified: a.datePublished,
    inLanguage: ['en', 'es'],
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: a.category,
    author: { '@type': 'Organization', name: 'Meridian Real Estate', url: SITE },
    publisher: { '@type': 'Organization', name: 'Meridian', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/logo.svg` } },
    image: `${SITE}/og-image.jpg`,
  };

  const bodyHtml =
    `<main class="section"><div class="container" style="max-width:720px">` +
    `<article itemscope itemtype="https://schema.org/BlogPosting">` +
    `<p><a href="/blog">← Meridian Blog</a> · ${esc(a.category)} · <time datetime="${a.datePublished}" itemprop="datePublished">${a.datePublished}</time> · ${a.readingMins} min read</p>` +
    `<h1 itemprop="headline">${esc(a.titleEn)}</h1>` +
    `<p><em>${esc(a.descriptionEn)}</em></p>` +
    `<div class="blog-body" itemprop="articleBody">${renderMarkdown(a.bodyEn)}</div>` +
    `<hr /><h2 lang="es">${esc(a.titleEs)}</h2>` +
    `<p lang="es"><em>${esc(a.descriptionEs)}</em></p>` +
    `<div class="blog-body" lang="es">${renderMarkdown(a.bodyEs)}</div>` +
    `<p><a href="/search">Browse verified Dominican Republic listings on Meridian →</a></p>` +
    `</article></div></main>`;

  let html = setHead(shell, { title: `${a.titleEn} — Meridian`, description: a.descriptionEn, url });
  html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`);
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${bodyHtml}</div>`);
  writePage(`dist/blog/${a.slug}/index.html`, html);
}

// ── Blog index page ─────────────────────────────────────────────────────────
{
  const url = `${SITE}/blog`;
  const list = BLOG_ARTICLES.map((a) =>
    `<li><a href="/blog/${a.slug}"><strong>${esc(a.titleEn)}</strong></a><br />${esc(a.descriptionEn)} <em>(${esc(a.category)}, ${a.datePublished})</em></li>`
  ).join('\n');
  const bodyHtml =
    `<main class="section"><div class="container" style="max-width:860px">` +
    `<h1>Dominican Republic Real Estate Guides &amp; Market News — Meridian Blog</h1>` +
    `<p>Expert guides and weekly market briefings on buying, investing, and living in Dominican Republic real estate: Punta Cana, Cap Cana, Las Terrenas, Santo Domingo, Samaná.</p>` +
    `<ul>${list}</ul></div></main>`;
  let html = setHead(shell, {
    title: 'Blog — Dominican Republic Real Estate Guides | Meridian',
    description: 'Expert guides and weekly market briefings on Dominican Republic real estate. Punta Cana, Cap Cana, Las Terrenas, Santo Domingo and more.',
    url,
  });
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${bodyHtml}</div>`);
  writePage('dist/blog/index.html', html);
}

console.log(`Prerendered ${BLOG_ARTICLES.length} blog article(s) + blog index into dist/blog/`);
