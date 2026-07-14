import { Hono } from 'hono';
import { newsletterSchema, flattenZodError } from '../lib/validate';
import { rateLimit } from '../middleware/rateLimit';
import { verifyUnsubscribeToken } from '../lib/email';
import type { AppEnv } from '../types';

const newsletter = new Hono<AppEnv>();

/** POST /api/newsletter — subscribe an email to the mailing list */
newsletter.post('/', rateLimit('newsletter', 5, 300), async (c) => {
  const parsed = newsletterSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const { email, lang } = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO newsletter_subscribers (email, lang, subscribed_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET lang = excluded.lang`
  ).bind(email, lang).run();

  return c.json({ ok: true });
});

/**
 * GET /api/newsletter/unsubscribe?email=…&token=…[&kind=matches]
 * Token = HMAC(email, JWT_SECRET) embedded in every email footer, so only
 * someone holding the email can unsubscribe it. Default removes the address
 * from the newsletter; kind=matches instead turns off the user's new-match
 * alert preference. Returns a small human-readable page (link is clicked
 * from an email, not called by the SPA).
 */
newsletter.get('/unsubscribe', rateLimit('unsubscribe', 20, 600), async (c) => {
  const email = (c.req.query('email') ?? '').trim().toLowerCase();
  const token = c.req.query('token') ?? '';
  const kind = c.req.query('kind') ?? 'newsletter';

  const ok = email && token && (await verifyUnsubscribeToken(email, token, c.env.JWT_SECRET));
  if (!ok) return c.text('Invalid unsubscribe link.', 400);

  if (kind === 'matches') {
    await c.env.DB.prepare('UPDATE users SET notify_matches = 0 WHERE email = ?').bind(email).run();
  } else if (kind === 'messages') {
    await c.env.DB.prepare('UPDATE users SET notify_messages = 0 WHERE email = ?').bind(email).run();
  } else {
    await c.env.DB.prepare('DELETE FROM newsletter_subscribers WHERE email = ?').bind(email).run();
  }

  return c.html(
    `<!doctype html><meta charset="utf-8"><title>Unsubscribed — Meridian</title>
     <body style="font-family:Georgia,serif;background:#0d1114;color:#e8ebed;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
     <div style="text-align:center;max-width:420px;padding:24px">
       <div style="color:#c8a24b;font-size:26px;margin-bottom:12px">Meridian</div>
       <p>You've been unsubscribed. You can re-enable emails anytime from your
       <a href="https://investwithmeridian.com/profile" style="color:#e0be6a">profile settings</a>.</p>
     </div></body>`
  );
});

export default newsletter;
