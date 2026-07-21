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
import admin from './routes/admin';
import newsletter from './routes/newsletter';
import market from './routes/market';
import growth from './routes/growth';
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
app.route('/api/admin', admin);
app.route('/api/newsletter', newsletter);
app.route('/api/market', market);
app.route('/api', growth); // /api/waitlist, /api/agents/status, /api/agents/claim

app.notFound((c) => c.json({ error: 'Not found.' }, 404));

export { app };

const SCRAPE_CRON = '0 7 * * 1,3,5';
const NEWSLETTER_CRON = '0 10 * * 1';

export default {
  fetch: app.fetch,
  // Cron triggers (see wrangler.toml):
  //  - daily 06:00 UTC        → subscription expiration sweep
  //  - Mon/Wed/Fri 07:00 UTC  → listing ingestion + new-match alert emails
  //  - Monday 10:00 UTC       → newsletter: latest Market Pulse to subscribers
  scheduled: async (event, env, _ctx) => {
    if (event.cron === SCRAPE_CRON) {
      const { runScheduledScrape } = await import('./lib/scheduledScrape');
      const result = await runScheduledScrape(env);
      logger.info('Scheduled listing scrape complete', result);
      return;
    }
    if (event.cron === NEWSLETTER_CRON) {
      const { sendWeeklyNewsletter } = await import('./lib/newsletterSend');
      const result = await sendWeeklyNewsletter(env);
      logger.info('Weekly newsletter run complete', result);
      return;
    }
    const result = await expireSubscriptions(env.DB);
    logger.info('Subscription expiration sweep complete', result);
  },
} satisfies ExportedHandler<Bindings>;
