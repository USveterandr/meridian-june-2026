/**
 * Price-drop alerts — notify users who have saved a listing as a favorite
 * when the scraper detects the price has fallen since the last import.
 *
 * Called from runScheduledScrape after importScrapedProperties completes.
 * One email per user per 24 hours maximum (throttled via email_log).
 */

import { sendEmail, renderEmail, recentlyEmailed, unsubscribeToken, emailConfigured } from './email';
import { logger } from './logger';
import type { Bindings } from '../types';

const SITE = 'https://investwithmeridian.com';
const API_PUBLIC = 'https://meridian-api.isaactrinidadllc.workers.dev';

export interface PriceDrop {
  propertyId: number;
  title: string;
  city: string;
  oldPriceCents: number;
  newPriceCents: number;
  currency: string;
}

function fmt(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type FavoriteUser = {
  email: string;
  first_name: string;
};

export async function sendPriceDropAlerts(env: Bindings, drops: PriceDrop[]): Promise<{ sent: number }> {
  if (!drops.length) return { sent: 0 };
  if (!emailConfigured(env)) return { sent: 0 };

  // For each drop, find all users who favorited that listing
  const byUser = new Map<string, { user: FavoriteUser; drops: PriceDrop[] }>();

  for (const drop of drops) {
    const { results: favorites } = await env.DB
      .prepare(
        `SELECT u.email, u.first_name
         FROM favorites f
         JOIN users u ON u.id = f.user_id
         WHERE f.property_id = ? AND u.notify_matches = 1`
      )
      .bind(drop.propertyId)
      .all<FavoriteUser>();

    for (const user of favorites ?? []) {
      const key = user.email.toLowerCase();
      if (!byUser.has(key)) byUser.set(key, { user, drops: [] });
      byUser.get(key)!.drops.push(drop);
    }
  }

  let sent = 0;

  for (const [, { user, drops: userDrops }] of byUser) {
    const { email, first_name } = user;

    // Throttle: one price-drop email per 24 hours per user
    if (await recentlyEmailed(env, email, 'price-drop', 24 * 60)) continue;

    const items = userDrops
      .map((d) => {
        const diff = d.oldPriceCents - d.newPriceCents;
        const pct = Math.round((diff / d.oldPriceCents) * 100);
        return `<p style="margin:0 0 14px;padding:14px;border:1px solid #2a3238;border-radius:6px">
          <a href="${SITE}/property/${d.propertyId}" style="color:#e0be6a;font-family:Georgia,serif;font-size:16px;text-decoration:none">${d.title.replace(/</g, '&lt;')}</a><br/>
          <span style="color:#8a939a;font-size:13px">${d.city}</span><br/>
          <span style="color:#8a939a;text-decoration:line-through;font-size:13px">${fmt(d.oldPriceCents, d.currency)}</span>
          &nbsp;→&nbsp;
          <strong style="color:#4ade80;font-size:16px">${fmt(d.newPriceCents, d.currency)}</strong>
          &nbsp;<span style="color:#4ade80;font-size:13px">↓ ${pct}% (${fmt(diff, d.currency)} off)</span>
        </p>`;
      })
      .join('');

    const token = await unsubscribeToken(email, env.JWT_SECRET);
    const subject =
      userDrops.length === 1
        ? `Price drop: ${userDrops[0].title.slice(0, 55)} is now ${fmt(userDrops[0].newPriceCents, userDrops[0].currency)}`
        : `${userDrops.length} of your saved listings just dropped in price`;

    const html = renderEmail({
      heading: `${first_name}, a property you saved just got cheaper`,
      bodyHtml: `<p>Good news — ${
        userDrops.length === 1
          ? 'a listing in your favorites just dropped in price'
          : `${userDrops.length} listings in your favorites just dropped in price`
      }:</p>${items}`,
      ctaLabel: 'View your favorites',
      ctaUrl: `${SITE}/favorites`,
      unsubscribeUrl: `${API_PUBLIC}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}&kind=matches`,
    });

    const ok = await sendEmail(env, { to: email, subject, html, kind: 'price-drop' });
    if (ok) sent++;
  }

  logger.info('Price drop alerts sent', { drops: drops.length, notifiedUsers: byUser.size, sent });
  return { sent };
}
