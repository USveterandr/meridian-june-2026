import { Hono } from 'hono';
import type { AppEnv } from '../types';

const assets = new Hono<AppEnv>();

// Keys are server-generated UUIDs under properties/<id>/ or avatars/<userId>/ — anything else 404s.
const KEY_PATTERN = /^(properties|avatars)\/\d{1,12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

assets.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/assets\//, '');
  if (!KEY_PATTERN.test(key)) return c.json({ error: 'Not found.' }, 404);

  const object = await c.env.ASSETS.get(key);
  if (!object) return c.json({ error: 'Not found.' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Keys are immutable (random UUIDs), so aggressive caching is safe and
  // keeps R2 class-B operations (and your bill) low.
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  // Defense in depth: never let a stored object execute in the browser.
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'");
  return new Response(object.body, { headers });
});

export default assets;
