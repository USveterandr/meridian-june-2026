import { createMiddleware } from 'hono/factory';
import { readToken } from '../lib/jwt';
import type { AppEnv } from '../types';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'Authentication required.' }, 401);
  const user = await readToken(token, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Your session has expired. Please sign in again.' }, 401);
  c.set('user', user);
  await next();
});

export const requireRole = (...roles: string[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Your account type does not have access to this action.' }, 403);
    }
    await next();
  });
