// New-listing match alerts — the retention engine.
//
// Called after each scheduled scrape run with the run's start timestamp.
// Finds listings created since then, matches them against every user's
// saved requirements (listing type, property type, city, budget, beds/baths),
// and emails users who opted in (users.notify_matches = 1). One email per
// user per run, listing up to 5 matches, throttled to one match-alert email
// per 20 hours so back-to-back runs don't spam.

import { sendEmail, renderEmail, recentlyEmailed, unsubscribeToken, emailConfigured } from './email';
import { logger } from './logger';
import type { Bindings } from '../types';

const SITE = 'https://investwithmeridian.com';

type NewListing = {
  id: number; title: string; property_type: string; listing_type: string;
  price_cents: number; currency: string; city: string; bedrooms: number; bathrooms: number;
};

type Match = NewListing & { user_id: number; email: string; first_name: string; req_title: string };

const fmtPrice = (cents: number, currency: string, listingType: string) => {
  const f = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  return listingType === 'rent' ? `${f}/mo` : f;
};

export async function sendMatchAlerts(env: Bindings, sinceSql: string): Promise<number> {
  if (!emailConfigured(env)) return 0;

  // One joined query: new listings × requirements × opted-in users.
  const rows = await env.DB.prepare(
    `SELECT p.id, p.title, p.property_type, p.listing_type, p.price_cents, p.currency,
            p.city, p.bedrooms, p.bathrooms,
            u.id AS user_id, u.email, u.first_name, r.title AS req_title
     FROM properties p
     JOIN requirements r
       ON r.listing_type = p.listing_type
      AND (r.property_type IS NULL OR r.property_type = p.property_type)
      AND (r.city IS NULL OR p.city LIKE '%' || r.city || '%')
      AND (r.max_price_cents IS NULL OR p.price_cents <= r.max_price_cents)
      AND p.bedrooms >= r.min_bedrooms
      AND p.bathrooms >= r.min_bathrooms
     JOIN users u ON u.id = r.user_id AND u.notify_matches = 1
     WHERE p.status = 'active' AND p.created_at >= ? AND p.owner_id != u.id
     LIMIT 200`
  ).bind(sinceSql).all<Match>();

  const matches = rows.results ?? [];
  if (matches.length === 0) return 0;

  // Group by user.
  const byUser = new Map<number, Match[]>();
  for (const m of matches) {
    const list = byUser.get(m.user_id) ?? [];
    list.push(m);
    byUser.set(m.user_id, list);
  }

  let sent = 0;
  for (const [, list] of byUser) {
    const { email, first_name } = list[0];
    if (await recentlyEmailed(env, email, 'match-alert', 20 * 60)) continue;

    const top = list.slice(0, 5);
    const items = top.map((m) =>
      `<p style="margin:0 0 14px;padding:14px;border:1px solid #2a3238;border-radius:6px">
         <a href="${SITE}/property/${m.id}" style="color:#e0be6a;font-family:Georgia,serif;font-size:16px;text-decoration:none">${m.title.replace(/</g, '&lt;')}</a><br/>
         <span style="color:#8a939a;font-size:13px">${m.city} · ${m.bedrooms} bd / ${m.bathrooms} ba · matches “${m.req_title.replace(/</g, '&lt;')}”</span><br/>
         <strong style="color:#e8ebed">${fmtPrice(m.price_cents, m.currency, m.listing_type)}</strong>
       </p>`
    ).join('');

    const token = await unsubscribeToken(email, env.JWT_SECRET);
    const html = renderEmail({
      heading: `${first_name}, ${list.length === 1 ? 'a new listing matches' : list.length + ' new listings match'} your search`,
      bodyHtml: `<p>Fresh on Meridian ${list.length === 1 ? 'is a property' : 'are properties'} matching your saved requirements — you're seeing ${list.length === 1 ? 'it' : 'them'} before most buyers:</p>${items}`,
      ctaLabel: 'View all new listings',
      ctaUrl: `${SITE}/search?sort=newest`,
      unsubscribeUrl: `${SITE.replace('https://investwithmeridian.com', 'https://meridian-api.isaactrinidadllc.workers.dev')}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}&kind=matches`,
    });

    const ok = await sendEmail(env, {
      to: email,
      subject: list.length === 1 ? `New match: ${top[0].title.slice(0, 60)}` : `${list.length} new listings match your search`,
      html,
      kind: 'match-alert',
    });
    if (ok) sent += 1;
  }

  logger.info('Match alerts processed', { matchedUsers: byUser.size, sent });
  return sent;
}
