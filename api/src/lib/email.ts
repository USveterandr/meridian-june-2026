// Email engine — provider-agnostic transactional + broadcast sending.
//
// Supports Brevo and Resend; the provider is picked by whichever secret is
// configured (Brevo wins when both are set):
//   npx wrangler secret put BREVO_API_KEY    (app.brevo.com/settings/keys/api)
//   npx wrangler secret put RESEND_API_KEY   (resend.com)
// Plus the EMAIL_FROM var (wrangler.toml), e.g.
//   "Meridian <alerts@investwithmeridian.com>"
// The sender address/domain must be verified in the provider's dashboard
// (Brevo: Senders & Domains) or everything lands in spam.
//
// Every send is recorded in email_log (kind, recipient, subject) which also
// powers throttling (e.g. max one message-notification email per hour) and
// newsletter dedupe (one send per article slug).

import { logger } from './logger';
import type { Bindings } from '../types';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const SITE = 'https://investwithmeridian.com';

export function emailConfigured(env: Bindings): boolean {
  return Boolean((env.BREVO_API_KEY || env.RESEND_API_KEY) && env.EMAIL_FROM);
}

/** Splits `Name <addr@domain>` (or a bare address) into its parts. */
function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'Meridian', email: m[2] } : { name: 'Meridian', email: from.trim() };
}

// ── Unsubscribe tokens: HMAC-SHA256(email, JWT_SECRET), hex ───────────────
export async function unsubscribeToken(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`unsub:${email.toLowerCase()}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyUnsubscribeToken(email: string, token: string, secret: string): Promise<boolean> {
  const expected = await unsubscribeToken(email, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

// ── Branded HTML wrapper (gold-on-dark, matches the site) ─────────────────
export function renderEmail(opts: { heading: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string; unsubscribeUrl?: string }): string {
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto"><tr><td style="border-radius:999px;background:#c8a24b"><a href="${opts.ctaUrl}" style="display:inline-block;padding:13px 34px;color:#18130a;font-weight:600;text-decoration:none;font-family:Georgia,serif">${opts.ctaLabel}</a></td></tr></table>`
    : '';
  const unsub = opts.unsubscribeUrl
    ? `<p style="margin:18px 0 0;font-size:12px;color:#6b7075"><a href="${opts.unsubscribeUrl}" style="color:#6b7075">Unsubscribe</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0d1114">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1114;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#12181c;border:1px solid #2a3238;border-radius:8px">
<tr><td style="padding:28px 36px;border-bottom:1px solid #2a3238" align="center">
  <a href="${SITE}" style="text-decoration:none;color:#c8a24b;font-family:Georgia,serif;font-size:26px;font-weight:700">Meridian</a>
  <div style="color:#8a939a;font-size:11px;letter-spacing:2px;margin-top:4px">LUXURY REAL ESTATE · DOMINICAN REPUBLIC</div>
</td></tr>
<tr><td style="padding:32px 36px;color:#e8ebed;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7">
  <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#e0be6a">${opts.heading}</h1>
  ${opts.bodyHtml}
  ${cta}
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #2a3238;color:#6b7075;font-family:Helvetica,Arial,sans-serif;font-size:12px" align="center">
  © ${new Date().getFullYear()} Meridian Real Estate · Santo Domingo, República Dominicana<br/>
  <a href="${SITE}" style="color:#8a939a">investwithmeridian.com</a>
  ${unsub}
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Sending ────────────────────────────────────────────────────────────────
export interface SendOptions {
  to: string;
  subject: string;
  html: string;
  kind: string; // e.g. 'match-alert', 'message-notify', 'newsletter:<slug>'
}

export async function sendEmail(env: Bindings, opts: SendOptions): Promise<boolean> {
  if (!emailConfigured(env)) {
    logger.info('Email skipped — RESEND_API_KEY / EMAIL_FROM not configured', { kind: opts.kind });
    return false;
  }
  try {
    const useBrevo = Boolean(env.BREVO_API_KEY);
    const res = useBrevo
      ? await fetch(BREVO_ENDPOINT, {
          method: 'POST',
          headers: { 'api-key': env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            sender: parseFrom(env.EMAIL_FROM!),
            to: [{ email: opts.to }],
            subject: opts.subject,
            htmlContent: opts.html,
          }),
        })
      : await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.EMAIL_FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
        });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(`${useBrevo ? 'Brevo' : 'Resend'} send failed`, { status: res.status, detail: detail.slice(0, 200), kind: opts.kind });
      return false;
    }
    await env.DB.prepare('INSERT INTO email_log (kind, recipient, subject) VALUES (?,?,?)')
      .bind(opts.kind, opts.to.toLowerCase(), opts.subject).run();
    return true;
  } catch (err) {
    logger.error('Resend send threw', { error: err instanceof Error ? err.message : err, kind: opts.kind });
    return false;
  }
}

/** True when `recipient` already got an email of `kind` within the last `minutes`. */
export async function recentlyEmailed(env: Bindings, recipient: string, kind: string, minutes: number): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 FROM email_log WHERE recipient = ? AND kind = ? AND created_at >= datetime('now', ?) LIMIT 1`
  ).bind(recipient.toLowerCase(), kind, `-${minutes} minutes`).first();
  return Boolean(row);
}

/** True when an email of exactly this kind was ever sent (newsletter dedupe). */
export async function kindEverSent(env: Bindings, kind: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT 1 FROM email_log WHERE kind = ? LIMIT 1').bind(kind).first();
  return Boolean(row);
}
