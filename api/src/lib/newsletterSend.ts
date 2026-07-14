// Weekly newsletter auto-send — Mondays after the Market Pulse publishes.
//
// The Worker fetches the live sitemap, finds the newest Market Pulse article
// (slug prefix dominican-republic-market-pulse-), and — if that slug hasn't
// been broadcast before (email_log kind 'newsletter:<slug>') — emails every
// subscriber a teaser with a link. Idempotent: re-runs are no-ops until a new
// article ships, so the cron can fire weekly regardless of publish timing.

import { sendEmail, renderEmail, kindEverSent, unsubscribeToken, emailConfigured } from './email';
import { logger } from './logger';
import type { Bindings } from '../types';

const SITE = 'https://investwithmeridian.com';
const API_PUBLIC = 'https://meridian-api.isaactrinidadllc.workers.dev';
const PULSE_PREFIX = `${SITE}/blog/dominican-republic-market-pulse-`;

export async function sendWeeklyNewsletter(env: Bindings): Promise<{ sent: number; slug?: string; skipped?: string }> {
  if (!emailConfigured(env)) return { sent: 0, skipped: 'email not configured' };

  // 1. Latest Market Pulse from the sitemap (lastmod order).
  const sitemap = await fetch(`${SITE}/sitemap.xml`).then((r) => r.text()).catch(() => '');
  const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
    .filter(([, loc]) => loc.startsWith(PULSE_PREFIX))
    .sort((a, b) => b[2].localeCompare(a[2]));
  if (entries.length === 0) return { sent: 0, skipped: 'no market pulse in sitemap' };

  const url = entries[0][1];
  const slug = url.slice(SITE.length + '/blog/'.length);
  const kind = `newsletter:${slug}`;
  if (await kindEverSent(env, kind)) return { sent: 0, slug, skipped: 'already sent' };

  // 2. Title + description from the prerendered article head.
  const page = await fetch(url).then((r) => r.text()).catch(() => '');
  const title = (page.match(/<title>([^<]+)<\/title>/)?.[1] ?? 'This week’s DR Market Pulse').replace(/ — Meridian$/, '');
  const description = page.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';

  // 3. Broadcast to subscribers.
  const subs = await env.DB.prepare('SELECT email, lang FROM newsletter_subscribers LIMIT 5000')
    .all<{ email: string; lang: string }>();
  let sent = 0;
  for (const s of subs.results ?? []) {
    const token = await unsubscribeToken(s.email, env.JWT_SECRET);
    const es = s.lang === 'es';
    const html = renderEmail({
      heading: title,
      bodyHtml: `<p>${description}</p><p>${es
        ? 'Cada lunes: la economía dominicana y el mercado inmobiliario, antes que nadie.'
        : 'Every Monday: the Dominican economy and property market, before everyone else.'}</p>`,
      ctaLabel: es ? 'Leer el análisis completo' : 'Read the full briefing',
      ctaUrl: `${url}?lang=${s.lang}`,
      unsubscribeUrl: `${API_PUBLIC}/api/newsletter/unsubscribe?email=${encodeURIComponent(s.email)}&token=${token}`,
    });
    const ok = await sendEmail(env, { to: s.email, subject: `📊 ${title}`, html, kind });
    if (ok) sent += 1;
  }

  logger.info('Weekly newsletter sent', { slug, subscribers: subs.results?.length ?? 0, sent });
  return { sent, slug };
}
