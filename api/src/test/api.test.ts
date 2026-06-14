import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { app } from '../index';
import { MockD1Database } from './db-mock';
import { MockR2Bucket } from './r2-mock';

// Read schema SQL file
const schemaSql = fs.readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8');
const seedPlansSql = fs.readFileSync(new URL('../../seed-plans.sql', import.meta.url), 'utf8');

const JWT_SECRET = 'test-secret-at-least-32-characters-long!!';
const ALLOWED_ORIGINS = 'http://localhost:5173';

let ipCounter = 1;

// Helper to generate headers with unique IPs to bypass isolate-level rate limits
function getHeaders(extraHeaders: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'CF-Connecting-IP': `127.0.0.${ipCounter++}`,
    ...extraHeaders,
  };
}

describe('Meridian API Integration Tests', () => {
  let dbSync: DatabaseSync;
  let mockDB: MockD1Database;
  let mockAssets: MockR2Bucket;
  let env: any;

  beforeEach(() => {
    // Fresh in-memory SQLite database for each test
    dbSync = new DatabaseSync(':memory:');
    dbSync.exec(schemaSql);
    dbSync.exec(seedPlansSql);
    mockDB = new MockD1Database(dbSync);
    mockAssets = new MockR2Bucket();
    env = {
      DB: mockDB,
      ASSETS: mockAssets,
      JWT_SECRET,
      ALLOWED_ORIGINS,
    };
  });

  describe('GET /api/health', () => {
    it('should return 200 OK', async () => {
      const res = await app.request('/api/health', { method: 'GET', headers: getHeaders() }, env);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.deepStrictEqual(data, { ok: true, service: 'meridian-api' });
    });
  });

  describe('Authentication Routes', () => {
    it('should register a new user successfully', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.token);
      assert.strictEqual(data.user.email, 'john@example.com');
      assert.strictEqual(data.user.firstName, 'John');
      assert.strictEqual(data.user.role, 'buyer');
    });

    it('should fail registration for duplicate email', async () => {
      // First register
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);

      // Register again with same email
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.ok(data.error.includes('already exists'));
    });

    it('should log in successfully with correct credentials', async () => {
      // Register
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'es',
        }),
      }, env);

      // Login
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email: 'john@example.com',
          password: 'Password123!',
        }),
      }, env);

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.strictEqual(data.user.role, 'seller');
      assert.strictEqual(data.user.locale, 'es');
    });

    it('should fail login with incorrect password', async () => {
      // Register
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);

      // Login
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email: 'john@example.com',
          password: 'WrongPassword!',
        }),
      }, env);

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Email or password is incorrect.');
    });

    it('should fetch the current user profile (GET /me)', async () => {
      // Register
      const regRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const { token } = await regRes.json();

      // Get me
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
      }, env);

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.email, 'john@example.com');
    });

    it('should update user profile (PATCH /me)', async () => {
      // Register
      const regRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const { token } = await regRes.json();

      // Update
      const res = await app.request('/api/auth/me', {
        method: 'PATCH',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
        body: JSON.stringify({
          firstName: 'Jonathan',
          phone: '+18091234567',
          notifyMatches: false,
        }),
      }, env);

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.firstName, 'Jonathan');
      assert.strictEqual(data.user.phone, '+18091234567');
      assert.strictEqual(data.user.notifyMatches, false);
    });
  });

  describe('Properties Routes', () => {
    let sellerToken: string;
    let buyerToken: string;
    let sellerId: number;

    beforeEach(async () => {
      // Create seller
      const sellerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Seller',
          lastName: 'One',
          email: 'seller@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
          planId: 'pro', // 100 listings/photos limit, plenty for tests
        }),
      }, env);
      const sellerData = await sellerRes.json();
      sellerToken = sellerData.token;
      sellerId = sellerData.user.id;

      // Create buyer
      const buyerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Buyer',
          lastName: 'One',
          email: 'buyer@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const buyerData = await buyerRes.json();
      buyerToken = buyerData.token;
    });

    it('should prevent buyers from creating listings', async () => {
      const res = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
        body: JSON.stringify({
          title: 'Stunning Villa',
          description: 'A luxurious villa in Punta Cana',
          propertyType: 'villa',
          listingType: 'sale',
          priceCents: 150000000, // $1.5M
          currency: 'USD',
          address: 'Punta Cana Resort',
          city: 'Punta Cana',
          country: 'DO',
          bedrooms: 4,
          bathrooms: 4.5,
          areaM2: 450,
          features: ['Pool', 'Beachfront'],
          status: 'active',
        }),
      }, env);

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, 'Your account type does not have access to this action.');
    });

    it('should allow sellers to create listings and fetch them', async () => {
      // Create
      const res = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sellerToken}` }),
        body: JSON.stringify({
          title: 'Stunning Villa',
          description: 'A luxurious villa in Punta Cana',
          propertyType: 'villa',
          listingType: 'sale',
          priceCents: 150000000,
          currency: 'USD',
          address: 'Punta Cana Resort',
          city: 'Punta Cana',
          country: 'DO',
          bedrooms: 4,
          bathrooms: 4.5,
          areaM2: 450,
          features: ['Pool', 'Beachfront'],
          status: 'active',
        }),
      }, env);

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.property.title, 'Stunning Villa');
      const propId = data.property.id;

      // Get Detail
      const detailRes = await app.request(`/api/properties/${propId}`, {
        method: 'GET',
        headers: getHeaders(),
      }, env);
      assert.strictEqual(detailRes.status, 200);
      const detailData = await detailRes.json();
      assert.strictEqual(detailData.property.title, 'Stunning Villa');
    });

    it('should filter search results correctly', async () => {
      // Insert two listings
      await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sellerToken}` }),
        body: JSON.stringify({
          title: 'Villas de Punta Cana',
          description: 'A luxurious villa',
          propertyType: 'villa',
          listingType: 'sale',
          priceCents: 100000000,
          currency: 'USD',
          address: 'Punta Cana Resort',
          city: 'Punta Cana',
          country: 'DO',
          bedrooms: 4,
          bathrooms: 4,
          status: 'active',
        }),
      }, env);

      await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sellerToken}` }),
        body: JSON.stringify({
          title: 'Santo Domingo Condo',
          description: 'Downtown apartment',
          propertyType: 'apartment',
          listingType: 'rent',
          priceCents: 150000, // $1,500
          currency: 'USD',
          address: 'Naco',
          city: 'Santo Domingo',
          country: 'DO',
          bedrooms: 2,
          bathrooms: 2,
          status: 'active',
        }),
      }, env);

      // Search Santo Domingo rent
      const searchRes = await app.request('/api/properties?city=Santo+Domingo&listingType=rent', {
        method: 'GET',
        headers: getHeaders(),
      }, env);
      assert.strictEqual(searchRes.status, 200);
      const searchData = await searchRes.json();
      assert.strictEqual(searchData.total, 1);
      assert.strictEqual(searchData.results[0].title, 'Santo Domingo Condo');
    });

    it('should enforce IDOR protection on listing updates', async () => {
      // Create listing as Seller
      const createRes = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sellerToken}` }),
        body: JSON.stringify({
          title: 'Seller Villa',
          description: 'My villa',
          propertyType: 'villa',
          listingType: 'sale',
          priceCents: 100000000,
          currency: 'USD',
          address: 'Punta Cana',
          city: 'Punta Cana',
          country: 'DO',
          bedrooms: 3,
          bathrooms: 3,
          status: 'active',
        }),
      }, env);
      const { property } = await createRes.json();

      // Create another seller
      const otherSellerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Other',
          lastName: 'Seller',
          email: 'other@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
        }),
      }, env);
      const { token: otherToken } = await otherSellerRes.json();

      // Other seller tries to patch seller's listing
      const patchRes = await app.request(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: getHeaders({ Authorization: `Bearer ${otherToken}` }),
        body: JSON.stringify({ title: 'Hacked Title' }),
      }, env);

      assert.strictEqual(patchRes.status, 403);
      const patchData = await patchRes.json();
      assert.strictEqual(patchData.error, 'You can only edit your own listings.');
    });

    it('should enforce FREE plan listing limit (1 active listing)', async () => {
      // Register a seller on the FREE Start plan
      const freeRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Free',
          lastName: 'Owner',
          email: 'freeowner@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
          planId: 'free',
        }),
      }, env);
      const { token: freeToken } = await freeRes.json();

      const listing = (title: string) => ({
        title, description: 'Test listing', propertyType: 'house', listingType: 'sale',
        priceCents: 25000000, currency: 'USD', address: 'Calle 1', city: 'Santiago',
        country: 'DO', bedrooms: 2, bathrooms: 1, status: 'active',
      });

      // First listing succeeds
      const first = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${freeToken}` }),
        body: JSON.stringify(listing('First Home')),
      }, env);
      assert.strictEqual(first.status, 201);

      // Second listing is blocked by the plan limit
      const second = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${freeToken}` }),
        body: JSON.stringify(listing('Second Home')),
      }, env);
      assert.strictEqual(second.status, 403);
      const data = await second.json();
      assert.ok(data.upgrade);
      assert.ok(data.error.includes('Upgrade'));
    });

    it('should create a trialing subscription when registering with a paid plan', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Team',
          lastName: 'Lead',
          email: 'teamlead@example.com',
          password: 'Password123!',
          role: 'agent',
          locale: 'es',
          planId: 'pro',
        }),
      }, env);
      assert.strictEqual(res.status, 201);
      const { token, user } = await res.json();
      assert.strictEqual(user.role, 'seller'); // pro plan grants seller role

      const subRes = await app.request('/api/plans/my', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
      }, env);
      const subData = await subRes.json();
      assert.strictEqual(subData.plan, 'pro');
      assert.strictEqual(subData.subscription.status, 'trialing');
      assert.ok(subData.subscription.periodEnd); // 30-day trial end set
    });
  });

  describe('Subscription Lifecycle', () => {
    it('should not grant active status from an unverified PayPal transaction ID', async () => {
      const regRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Shady', lastName: 'Buyer', email: 'shady@example.com',
          password: 'Password123!', role: 'buyer', locale: 'en', planId: 'free',
        }),
      }, env);
      const { token } = await regRes.json();

      // Claiming an arbitrary, unverified PayPal transaction ID must NOT
      // grant a paid 'active' subscription/role for free.
      const res = await app.request('/api/plans/activate', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
        body: JSON.stringify({ planId: 'investor', paypalTransactionId: 'FAKE-NOT-VERIFIED' }),
      }, env);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'trialing');
      assert.strictEqual(data.trial, true);

      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
      }, env);
      const meData = await meRes.json();
      assert.strictEqual(meData.user.role, 'investor'); // role granted, but only as a trial
      assert.strictEqual(meData.subscription.status, 'trialing');
    });

    it('should cancel expired subscriptions and revert the granted role on sweep', async () => {
      const regRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Trial', lastName: 'User', email: 'trialuser@example.com',
          password: 'Password123!', role: 'buyer', locale: 'en', planId: 'pro',
        }),
      }, env);
      const { token, user } = await regRes.json();
      assert.strictEqual(user.role, 'seller'); // pro plan grants seller role

      // Backdate the trial's period end so the sweep treats it as expired.
      dbSync.exec(`UPDATE subscriptions SET current_period_end = '2000-01-01T00:00:00.000Z' WHERE user_id = ${user.id}`);

      // Create an admin to trigger the sweep endpoint.
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Admin', lastName: 'User', email: 'admin-sweep@example.com',
          password: 'Password123!', role: 'buyer', locale: 'en',
        }),
      }, env);
      dbSync.exec(`UPDATE users SET role = 'admin' WHERE email = 'admin-sweep@example.com'`);
      const adminLogin = await app.request('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: 'admin-sweep@example.com', password: 'Password123!' }),
      }, env);
      const { token: adminToken } = await adminLogin.json();

      const sweepRes = await app.request('/api/plans/expire', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${adminToken}` }),
      }, env);
      assert.strictEqual(sweepRes.status, 200);
      const sweepData = await sweepRes.json();
      assert.strictEqual(sweepData.expired, 1);
      assert.strictEqual(sweepData.downgraded, 1);

      // Role reverted to the pre-subscription role, and plan back to free.
      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
      }, env);
      const meData = await meRes.json();
      assert.strictEqual(meData.user.role, 'buyer');
      assert.strictEqual(meData.subscription, null);

      const subRes = await app.request('/api/plans/my', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${token}` }),
      }, env);
      const subData = await subRes.json();
      assert.strictEqual(subData.plan, 'free');
    });
  });

  describe('Image Upload and Asset Validation', () => {
    let sellerToken: string;
    let propertyId: number;

    beforeEach(async () => {
      const sellerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Seller',
          lastName: 'One',
          email: 'seller@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
          planId: 'pro', // 100 listings/photos limit, plenty for tests
        }),
      }, env);
      const sellerData = await sellerRes.json();
      sellerToken = sellerData.token;

      const propRes = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sellerToken}` }),
        body: JSON.stringify({
          title: 'Image House',
          description: 'House to test uploads',
          propertyType: 'house',
          listingType: 'sale',
          priceCents: 50000000,
          currency: 'USD',
          address: 'Santiago',
          city: 'Santiago',
          country: 'DO',
          bedrooms: 3,
          bathrooms: 2,
          status: 'active',
        }),
      }, env);
      const propData = await propRes.json();
      propertyId = propData.property.id;
    });

    it('should upload a valid PNG image and fetch it from Assets with security headers', async () => {
      const formData = new FormData();
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const fileBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      const file = new File([fileBytes], 'photo.png', { type: 'image/png' });
      formData.append('file', file);

      const res = await app.request(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'CF-Connecting-IP': `127.0.0.${ipCounter++}`,
        },
        body: formData,
      }, env);

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.image.id);
      assert.ok(data.image.url);

      // Fetch the asset
      const assetUrl = data.image.url;
      const assetRes = await app.request(assetUrl, { method: 'GET', headers: getHeaders() }, env);
      assert.strictEqual(assetRes.status, 200);
      assert.strictEqual(assetRes.headers.get('Content-Type'), 'image/png');
      assert.strictEqual(assetRes.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.strictEqual(assetRes.headers.get('Content-Security-Policy'), "default-src 'none'");
    });

    it('should reject SVG image due to safety settings (SVG XSS risk)', async () => {
      const formData = new FormData();
      const fileBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const file = new File([fileBytes], 'hacked.svg', { type: 'image/svg+xml' });
      formData.append('file', file);

      const res = await app.request(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'CF-Connecting-IP': `127.0.0.${ipCounter++}`,
        },
        body: formData,
      }, env);

      assert.strictEqual(res.status, 415);
      const data = await res.json();
      assert.strictEqual(data.error, 'Photos must be JPEG, PNG, or WebP.');
    });

    it('should reject invalid magic bytes (e.g. text file renamed to png)', async () => {
      const formData = new FormData();
      const fileBytes = new TextEncoder().encode('This is just raw text, not a PNG.');
      const file = new File([fileBytes], 'fake.png', { type: 'image/png' });
      formData.append('file', file);

      const res = await app.request(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'CF-Connecting-IP': `127.0.0.${ipCounter++}`,
        },
        body: formData,
      }, env);

      assert.strictEqual(res.status, 415);
      const data = await res.json();
      assert.strictEqual(data.error, 'This file does not look like a valid photo.');
    });
  });

  describe('Favorites Routes', () => {
    let buyerToken: string;
    let propertyId: number;

    beforeEach(async () => {
      // Create buyer
      const buyerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Buyer',
          lastName: 'One',
          email: 'buyer@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const buyerData = await buyerRes.json();
      buyerToken = buyerData.token;

      // Create seller and listing
      const sellerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Seller',
          lastName: 'One',
          email: 'seller@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
          planId: 'pro', // 100 listings/photos limit, plenty for tests
        }),
      }, env);
      const { token: sToken } = await sellerRes.json();

      const propRes = await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sToken}` }),
        body: JSON.stringify({
          title: 'Fav Villa',
          description: 'A villa to favorite',
          propertyType: 'villa',
          listingType: 'sale',
          priceCents: 10000000,
          currency: 'USD',
          address: 'Cabarete',
          city: 'Cabarete',
          country: 'DO',
          bedrooms: 2,
          bathrooms: 2,
          status: 'active',
        }),
      }, env);
      const propData = await propRes.json();
      propertyId = propData.property.id;
    });

    it('should add to favorites, check it lists, and remove it', async () => {
      // Add
      const addRes = await app.request('/api/favorites', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
        body: JSON.stringify({ propertyId }),
      }, env);
      assert.strictEqual(addRes.status, 201);

      // List
      const listRes = await app.request('/api/favorites', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
      }, env);
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      assert.strictEqual(listData.results.length, 1);
      assert.strictEqual(listData.results[0].title, 'Fav Villa');

      // Delete
      const delRes = await app.request(`/api/favorites/${propertyId}`, {
        method: 'DELETE',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
      }, env);
      assert.strictEqual(delRes.status, 200);
    });
  });

  describe('Requirements and Automatic Matchmaking', () => {
    let buyerToken: string;

    beforeEach(async () => {
      const buyerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Buyer',
          lastName: 'One',
          email: 'buyer@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const buyerData = await buyerRes.json();
      buyerToken = buyerData.token;
    });

    it('should automatically match a created requirement against active listings', async () => {
      // Create seller
      const sellerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Seller',
          lastName: 'One',
          email: 'seller@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
          planId: 'pro', // 100 listings/photos limit, plenty for tests
        }),
      }, env);
      const { token: sToken } = await sellerRes.json();

      // Create matching property in Las Terrenas
      await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sToken}` }),
        body: JSON.stringify({
          title: 'Beachside Villa',
          description: 'A gorgeous beach house',
          propertyType: 'villa',
          listingType: 'sale',
          priceCents: 50000000, // $500k
          currency: 'USD',
          address: 'Playa Bonita',
          city: 'Las Terrenas',
          country: 'DO',
          bedrooms: 3,
          bathrooms: 3,
          status: 'active',
        }),
      }, env);

      // Create non-matching property (apartment or too expensive or different city)
      await app.request('/api/properties', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${sToken}` }),
        body: JSON.stringify({
          title: 'Expensive Condo Santo Domingo',
          description: 'Apartment',
          propertyType: 'apartment',
          listingType: 'sale',
          priceCents: 80000000,
          currency: 'USD',
          address: 'Piantini',
          city: 'Santo Domingo',
          country: 'DO',
          bedrooms: 3,
          bathrooms: 3,
          status: 'active',
        }),
      }, env);

      // Create requirement looking for Villa under $600k in Las Terrenas
      const reqRes = await app.request('/api/requirements', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
        body: JSON.stringify({
          title: 'Want Beach Villa',
          listingType: 'sale',
          propertyType: 'villa',
          city: 'Las Terrenas',
          maxPriceCents: 60000000, // $600k
          minBedrooms: 2,
          minBathrooms: 2,
        }),
      }, env);

      assert.strictEqual(reqRes.status, 201);
      const reqData = await reqRes.json();
      assert.strictEqual(reqData.requirement.title, 'Want Beach Villa');

      // Fetch matches manually
      const reqId = reqData.requirement.id;
      const matchesRes = await app.request(`/api/requirements/${reqId}/matches`, {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
      }, env);
      assert.strictEqual(matchesRes.status, 200);
      const matchesData = await matchesRes.json();

      // Verify matched listings are returned
      assert.strictEqual(matchesData.results.length, 1);
      assert.strictEqual(matchesData.results[0].title, 'Beachside Villa');
    });
  });

  describe('Private Messaging Routes', () => {
    let senderToken: string;
    let senderId: number;
    let recipientToken: string;
    let recipientId: number;

    beforeEach(async () => {
      // Create user 1 (sender)
      const user1 = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'User1',
          lastName: 'A',
          email: 'user1@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const u1Data = await user1.json();
      senderToken = u1Data.token;
      senderId = u1Data.user.id;

      // Create user 2 (recipient)
      const user2 = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'User2',
          lastName: 'B',
          email: 'user2@example.com',
          password: 'Password123!',
          role: 'seller',
          locale: 'en',
        }),
      }, env);
      const u2Data = await user2.json();
      recipientToken = u2Data.token;
      recipientId = u2Data.user.id;
    });

    it('should send a message, list threads, and fetch conversation history', async () => {
      // Send
      const sendRes = await app.request('/api/messages', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${senderToken}` }),
        body: JSON.stringify({
          recipientId: recipientId,
          body: 'Hello! Is the listing still available?',
        }),
      }, env);

      assert.strictEqual(sendRes.status, 201);
      const sendData = await sendRes.json();
      assert.strictEqual(sendData.message.body, 'Hello! Is the listing still available?');

      // Recipient checks threads
      const threadsRes = await app.request('/api/messages/conversations', {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${recipientToken}` }),
      }, env);
      assert.strictEqual(threadsRes.status, 200);
      const threadsData = await threadsRes.json();
      assert.strictEqual(threadsData.results.length, 1);
      assert.strictEqual(threadsData.results[0].unread, 1);
      assert.strictEqual(threadsData.results[0].lastBody, 'Hello! Is the listing still available?');

      // Recipient reads thread history
      const historyRes = await app.request(`/api/messages/thread/${senderId}`, {
        method: 'GET',
        headers: getHeaders({ Authorization: `Bearer ${recipientToken}` }),
      }, env);
      assert.strictEqual(historyRes.status, 200);
      const historyData = await historyRes.json();
      assert.strictEqual(historyData.results.length, 1);
      assert.strictEqual(historyData.results[0].body, 'Hello! Is the listing still available?');
    });
  });

  describe('Rate Limiter', () => {
    it('should enforce limits and return 429 when threshold exceeded', async () => {
      // Use the exact same IP to trigger rate limits for '/register' (limit is 10/10 min)
      const ip = '1.2.3.4';
      const registerPayload = {
        firstName: 'Rate',
        lastName: 'Limit',
        password: 'Password123!',
        role: 'buyer',
        locale: 'en',
      };

      // Send 10 successful/failed attempts
      for (let i = 1; i <= 10; i++) {
        await app.request('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': ip,
          },
          body: JSON.stringify({
            ...registerPayload,
            email: `rate${i}@example.com`,
          }),
        }, env);
      }

      // 11th request from same IP should return 429
      const limitRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': ip,
        },
        body: JSON.stringify({
          ...registerPayload,
          email: 'rate11@example.com',
        }),
      }, env);

      assert.strictEqual(limitRes.status, 429);
      const limitData = await limitRes.json();
      assert.strictEqual(limitData.error, 'Too many requests. Please wait a moment and try again.');
    });
  });

  describe('Scraper Routes', () => {
    let adminToken: string;
    let buyerToken: string;

    beforeEach(async () => {
      // Create admin user (register as buyer then promote via SQL to bypass registration restrictions)
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      
      dbSync.exec(`UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'`);
      
      // Login to get a token with the new role
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'Password123!',
        }),
      }, env);
      const loginData = await loginRes.json();
      adminToken = loginData.token;

      // Create buyer user
      const buyerRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: 'Buyer',
          lastName: 'User',
          email: 'buyer-scraper@example.com',
          password: 'Password123!',
          role: 'buyer',
          locale: 'en',
        }),
      }, env);
      const buyerData = await buyerRes.json();
      buyerToken = buyerData.token;
    });

    it('should block non-admin users from triggering scraper', async () => {
      const res = await app.request('/api/scrape', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${buyerToken}` }),
        body: JSON.stringify({ minPrice: 100000 }),
      }, env);

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, 'Your account type does not have access to this action.');
    });

    it('should allow admin to scrape properties and prevent duplicates', async () => {
      // Initial scrape for properties >= $500,000 USD.
      // The curated catalog contains 11 listings at or above this threshold.
      const res = await app.request('/api/scrape', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${adminToken}` }),
        body: JSON.stringify({ minPrice: 500000 }),
      }, env);

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.importedCount, 11);

      // Verify they are added to properties table
      const listRes = await app.request('/api/properties', {
        method: 'GET',
        headers: getHeaders(),
      }, env);
      const listData = await listRes.json();
      assert.strictEqual(listData.total, 11);

      // Re-running the scrape should skip duplicate titles and import 0
      const res2 = await app.request('/api/scrape', {
        method: 'POST',
        headers: getHeaders({ Authorization: `Bearer ${adminToken}` }),
        body: JSON.stringify({ minPrice: 500000 }),
      }, env);

      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.importedCount, 0);
    });
  });
});
