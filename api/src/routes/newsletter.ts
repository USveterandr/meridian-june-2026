import { Hono } from 'hono';
import { newsletterSchema, flattenZodError } from '../lib/validate';
import { rateLimit } from '../middleware/rateLimit';
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

export default newsletter;
