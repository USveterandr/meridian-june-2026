import { Hono } from 'hono';
import { messageSchema, flattenZodError } from '../lib/validate';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import type { AppEnv } from '../types';

const messages = new Hono<AppEnv>();
messages.use('*', requireAuth);

type MessageRow = {
  id: number; sender_id: number; recipient_id: number; property_id: number | null;
  body: string; read_at: string | null; created_at: string;
};

// Conversation list: latest message per counterpart, with unread count.
messages.get('/conversations', async (c) => {
  const { id } = c.get('user');
  const rows = await c.env.DB.prepare(
    `WITH mine AS (
       SELECT m.*, CASE WHEN m.sender_id = ?1 THEN m.recipient_id ELSE m.sender_id END AS other_id
       FROM messages m WHERE m.sender_id = ?1 OR m.recipient_id = ?1
     ),
     latest AS (
       SELECT other_id, MAX(id) AS last_id FROM mine GROUP BY other_id
     )
     SELECT u.id AS other_id, u.first_name, u.last_name, u.role,
            m.body AS last_body, m.created_at AS last_at, m.sender_id AS last_sender_id,
            (SELECT COUNT(*) FROM messages x
              WHERE x.recipient_id = ?1 AND x.sender_id = u.id AND x.read_at IS NULL) AS unread
     FROM latest l
     JOIN mine m ON m.id = l.last_id
     JOIN users u ON u.id = l.other_id
     ORDER BY m.created_at DESC LIMIT 100`
  ).bind(id).all<{
    other_id: number; first_name: string; last_name: string; role: string;
    last_body: string; last_at: string; last_sender_id: number; unread: number;
  }>();
  return c.json({
    results: (rows.results ?? []).map((r) => ({
      userId: r.other_id,
      name: `${r.first_name} ${r.last_name}`,
      role: r.role,
      lastBody: r.last_body,
      lastAt: r.last_at,
      lastFromMe: r.last_sender_id === id,
      unread: r.unread,
    })),
  });
});

// Thread with one user. Only the two participants can ever read it.
messages.get('/thread/:userId{[0-9]+}', async (c) => {
  const { id } = c.get('user');
  const otherId = Number(c.req.param('userId'));
  const rows = await c.env.DB.prepare(
    `SELECT * FROM messages
     WHERE (sender_id = ?1 AND recipient_id = ?2) OR (sender_id = ?2 AND recipient_id = ?1)
     ORDER BY id DESC LIMIT 100`
  ).bind(id, otherId).all<MessageRow>();
  await c.env.DB.prepare(
    `UPDATE messages SET read_at = datetime('now') WHERE recipient_id = ?1 AND sender_id = ?2 AND read_at IS NULL`
  ).bind(id, otherId).run();
  const list = (rows.results ?? []).reverse().map((m) => ({
    id: m.id, fromMe: m.sender_id === id, body: m.body,
    propertyId: m.property_id, createdAt: m.created_at,
  }));
  return c.json({ results: list });
});

messages.post('/', rateLimit('send-message', 60, 3600), async (c) => {
  const parsed = messageSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Please correct the highlighted fields.', fields: flattenZodError(parsed.error) }, 400);
  const { id } = c.get('user');
  const { recipientId, propertyId, body } = parsed.data;
  if (recipientId === id) return c.json({ error: 'You cannot message yourself.' }, 400);

  const recipient = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(recipientId).first();
  if (!recipient) return c.json({ error: 'Recipient not found.' }, 404);
  if (propertyId) {
    const prop = await c.env.DB.prepare('SELECT id FROM properties WHERE id = ?').bind(propertyId).first();
    if (!prop) return c.json({ error: 'Listing not found.' }, 404);
  }

  const row = await c.env.DB.prepare(
    'INSERT INTO messages (sender_id, recipient_id, property_id, body) VALUES (?,?,?,?) RETURNING *'
  ).bind(id, recipientId, propertyId ?? null, body).first<MessageRow>();
  if (!row) return c.json({ error: 'The message could not be sent.' }, 500);

  // Notify the recipient by email if they opted in — throttled to one email
  // per hour so an active conversation doesn't flood their inbox. Fire and
  // forget: notification failure never fails message delivery.
  c.executionCtx.waitUntil(notifyRecipient(c.env, recipientId).catch(() => { /* logged inside */ }));

  return c.json({
    message: { id: row.id, fromMe: true, body: row.body, propertyId: row.property_id, createdAt: row.created_at },
  }, 201);
});

async function notifyRecipient(env: AppEnv['Bindings'], recipientId: number): Promise<void> {
  const { emailConfigured, recentlyEmailed, sendEmail, renderEmail, unsubscribeToken } = await import('../lib/email');
  if (!emailConfigured(env)) return;

  const recipient = await env.DB.prepare(
    'SELECT email, first_name, notify_messages FROM users WHERE id = ?'
  ).bind(recipientId).first<{ email: string; first_name: string; notify_messages: number }>();
  if (!recipient || recipient.notify_messages !== 1) return;
  if (await recentlyEmailed(env, recipient.email, 'message-notify', 60)) return;

  const token = await unsubscribeToken(recipient.email, env.JWT_SECRET);
  await sendEmail(env, {
    to: recipient.email,
    subject: 'You have a new message on Meridian',
    kind: 'message-notify',
    html: renderEmail({
      heading: `${recipient.first_name}, you have a new message`,
      bodyHtml: '<p>Someone just messaged you on Meridian — it may be about one of your listings or a property you inquired about. Quick replies close deals.</p>',
      ctaLabel: 'Open your messages',
      ctaUrl: 'https://investwithmeridian.com/messages',
      unsubscribeUrl: `https://meridian-api.isaactrinidadllc.workers.dev/api/newsletter/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${token}&kind=messages`,
    }),
  });
}

messages.get('/unread-count', async (c) => {
  const { id } = c.get('user');
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE recipient_id = ? AND read_at IS NULL')
    .bind(id).first<{ n: number }>();
  return c.json({ unread: row?.n ?? 0 });
});

export default messages;
