import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import properties from './routes/properties';
import favorites from './routes/favorites';
import requirements from './routes/requirements';
import messages from './routes/messages';
import assets from './routes/assets';
import scrape from './routes/scrape';
import verify from './routes/verify';
import territories from './routes/territories';
import plans from './routes/plans';
import users from './routes/users';
import newsletter from './routes/newsletter';
import type { AppEnv, Bindings } from './types';
import { logger } from './lib/logger';
import { expireSubscriptions } from './lib/subscriptions';

const app = new Hono<AppEnv>();


// Replace missing JWT_SECRET handling with structured logging
app.use('*', async (c, next) => {
  if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET missing or too short', { path: c.req.path });
    return c.json({ error: 'Server configuration error.' }, 500);
  }
  await next();
});

app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  await next();
});

// Validated ALLOWED_ORIGINS middleware
app.use('/api/*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const handler = cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
  return handler(c, next);
});

// Central error handler with structured logging
app.onError((err, c) => {
  logger.error('Unhandled error', { error: err instanceof Error ? err.stack : err });
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500);
});

// Root — friendly API info (browsers hitting the worker URL directly)
app.get('/', (c) =>
  c.json({
    name: 'Meridian API',
    version: '1.0.0',
    status: 'online',
    docs: 'https://investwithmeridian.com',
    endpoints: {
      health:     'GET  /api/health',
      ready:      'GET  /api/ready',
      listings:   'GET  /api/listings',
      search:     'GET  /api/listings?q=...&city=...&listingType=sale|rent',
      property:   'GET  /api/listings/:id',
      register:   'POST /api/auth/register',
      login:      'POST /api/auth/login',
      me:         'GET  /api/auth/me',
    },
  })
);

// Health check endpoint
app.get('/api/health', (c) => c.json({ ok: true, service: 'meridian-api' }));


// Readiness probe for critical dependencies
app.get('/api/ready', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').run();
    return c.json({ ready: true });
  } catch (err) {
    logger.error('Readiness check failed', { error: err instanceof Error ? err.stack : err });
    return c.json({ ready: false }, 503);
  }
});

app.route('/api/auth', auth);
app.route('/api/properties', properties);
app.route('/api/favorites', favorites);
app.route('/api/requirements', requirements);
app.route('/api/messages', messages);
app.route('/api/assets', assets);
app.route('/api/scrape', scrape);
app.route('/api/verify', verify);
app.route('/api/territories', territories);
app.route('/api/plans', plans);
app.route('/api/users', users);
app.route('/api/newsletter', newsletter);

app.notFound((c) => c.json({ error: 'Not found.' }, 404));

export { app };

export default {
  fetch: app.fetch,
  // Daily sweep: cancels subscriptions/trials past their current_period_end
  // and reverts any role they granted. See lib/subscriptions.ts.
  scheduled: async (_event, env, _ctx) => {
    const result = await expireSubscriptions(env.DB);
    logger.info('Subscription expiration sweep complete', result);
  },
} satisfies ExportedHandler<Bindings>;
