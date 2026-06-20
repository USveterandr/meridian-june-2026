// Lightweight, dependency-free HTML text extraction helpers for parsing
// scraped real-estate listing HTML. Deliberately regex-based (not a full
// DOM parser) so the same code runs unmodified in both the Cloudflare
// Workers runtime and the plain-Node test runner (`tsx --test`) — Workers'
// HTMLRewriter isn't available in Node, and cheerio pulls in Node internals
// that don't run reliably in Workers.
//
// These helpers assume well-formed, non-nested markup of the kind real
// estate listing portals use for their card grids. They are not a general
// HTML parser — don't reuse them outside the scraper integrations.

/** Strips HTML tags and decodes the handful of entities DR listing sites use. */
export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the HTML between consecutive `<tag class="className">` siblings
 * (i.e. everything up to the next sibling's opening tag, or end of string).
 * Splitting on sibling boundaries — rather than matching to the first
 * closing tag — is required because card markup commonly nests same-named
 * tags inside (e.g. a feature `<ul><li>…</li></ul>` inside a `<li
 * class="normal">` card), which would otherwise truncate the block early.
 */
export function extractBlocks(html: string, tag: string, className: string): string[] {
  const openTagRe = new RegExp(`<${tag}[^>]*\\bclass="${className}"[^>]*>`, 'g');
  const matches = [...html.matchAll(openTagRe)];
  return matches.map((m, i) => {
    const contentStart = (m.index ?? 0) + m[0].length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index! : html.length;
    return html.slice(contentStart, contentEnd);
  });
}

/** Extracts the plain-text content of the first `<tag class="className">…</tag>` inside a block. */
export function extractText(block: string, tag: string, className: string): string {
  const re = new RegExp(`<${tag}[^>]*\\bclass="${className}"[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  return stripTags(block.match(re)?.[1] ?? '');
}

/** Extracts the value of an attribute on the first matching tag in a block. */
export function extractAttr(block: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`);
  return block.match(re)?.[1] ?? null;
}

/** Extracts the plain-text content of every `<tag>…</tag>` inside a block (e.g. a feature `<span>` list). */
export function extractAllText(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  return [...block.matchAll(re)].map((m) => stripTags(m[1])).filter(Boolean);
}
