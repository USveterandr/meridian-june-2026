import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

// Per-isolate sliding window limiter. This is a first line of defense against
// credential stuffing and spam from a single client; because Workers run in
// many isolates it is NOT a global guarantee. For production, pair it with a
// Cloudflare WAF rate-limiting rule on /api/auth/* (see DEPLOYMENT.md).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(headers: Headers): string {
  return headers.get('CF-Connecting-IP') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const rateLimit = (name: string, limit: number, windowSeconds: number) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const key = `${name}:${clientIp(c.req.raw.headers)}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowSeconds * 1000 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    if (bucket.count > limit) {
      c.header('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ error: 'Too many requests. Please wait a moment and try again.' }, 429);
    }
    await next();
  });
