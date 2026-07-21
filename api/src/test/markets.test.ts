import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveMarket, isTargetMarket, normalizeLocation, TARGET_MARKETS } from '../lib/markets';
import { normalizeEveryListingProperty, sortByMarketPriority } from '../lib/everylisting';
import type { ScrapedProperty } from '../lib/scraper';

describe('resolveMarket', () => {
  it('maps Punta Cana neighborhoods to the Punta Cana bucket', () => {
    for (const loc of ['Bávaro', 'Verón', 'El Cortecito, Bavaro', 'Uvero Alto', 'Cocotal Golf, Punta Cana']) {
      const m = resolveMarket(loc);
      assert.equal(m.city, 'Punta Cana', `expected Punta Cana for "${loc}"`);
      assert.equal(m.isTarget, true);
    }
  });

  it('keeps Cap Cana as its own market and ahead of the generic Punta Cana rule', () => {
    const m = resolveMarket('Marina, Juanillo, Cap Cana');
    assert.equal(m.city, 'Cap Cana');
    assert.equal(m.isTarget, true);
  });

  it('keeps Las Terrenas distinct from the Samaná province bucket', () => {
    assert.equal(resolveMarket('Playa Bonita, Las Terrenas').city, 'Las Terrenas');
    assert.equal(resolveMarket('Las Galeras, Samaná').city, 'Samaná');
  });

  it('maps Santo Domingo sectors to Santo Domingo', () => {
    for (const loc of ['Piantini', 'Naco', 'Bella Vista', 'Los Cacicazgos']) {
      assert.equal(resolveMarket(loc).city, 'Santo Domingo', loc);
    }
  });

  it('does not false-match a substring alias (oeste vs este)', () => {
    // "Costa Norte" must not resolve to a Santo Domingo "norte" bucket.
    assert.notEqual(resolveMarket('Costa Norte, Puerto Plata').city, 'Santo Domingo');
    assert.equal(resolveMarket('Costa Norte, Puerto Plata').city, 'Puerto Plata');
  });

  it('falls back to a title-cased Other market for unknown locations', () => {
    const m = resolveMarket('Villa Fantasía del Río');
    assert.equal(m.region, 'Other');
    assert.equal(m.isTarget, false);
    assert.equal(m.city, 'Villa Fantasia Del Rio');
  });

  it('returns Unknown for empty input', () => {
    assert.equal(resolveMarket('').city, 'Unknown');
    assert.equal(resolveMarket(null).city, 'Unknown');
  });

  it('normalizeLocation strips accents and punctuation', () => {
    assert.equal(normalizeLocation('Bávaro, Punta-Cana!'), 'bavaro punta cana');
  });

  it('every target market resolves back to itself', () => {
    for (const t of TARGET_MARKETS) {
      assert.equal(resolveMarket(t).city, t);
      assert.equal(isTargetMarket(t), true);
    }
  });
});

describe('EveryListing normalization uses canonical markets', () => {
  it('rewrites a Bávaro listing to the Punta Cana bucket', () => {
    const p = normalizeEveryListingProperty({
      title: 'Beachfront Villa',
      property_type: 'villa',
      price_usd: 900000,
      currency: 'USD',
      city: 'Bávaro',
      address: 'Los Corales 12',
      bedrooms: 4,
      bathrooms: 4,
    });
    assert.ok(p);
    assert.equal(p!.city, 'Punta Cana');
    assert.equal(p!.address, 'Los Corales 12'); // original address preserved
  });

  it('still rejects sub-threshold listings', () => {
    const p = normalizeEveryListingProperty({
      title: 'Cheap Lot',
      property_type: 'land',
      price_usd: 50000,
      currency: 'USD',
      city: 'Las Terrenas',
    });
    assert.equal(p, null);
  });
});

describe('sortByMarketPriority', () => {
  const mk = (city: string): ScrapedProperty => ({
    title: `T ${city}`, description: '', propertyType: 'villa', listingType: 'sale',
    priceCents: 60000000, currency: 'USD', address: city, city, country: 'DO',
    bedrooms: 3, bathrooms: 3, areaM2: 200, lotM2: null, features: [],
  });

  it('moves target markets to the front, preserving relative order otherwise', () => {
    const input = [mk('Santo Domingo'), mk('Punta Cana'), mk('Santiago'), mk('Las Terrenas')];
    const out = sortByMarketPriority(input, true).map((p) => p.city);
    assert.deepEqual(out, ['Punta Cana', 'Las Terrenas', 'Santo Domingo', 'Santiago']);
  });

  it('is a no-op when prioritize is false', () => {
    const input = [mk('Santo Domingo'), mk('Punta Cana')];
    assert.deepEqual(sortByMarketPriority(input, false).map((p) => p.city), ['Santo Domingo', 'Punta Cana']);
  });
});
