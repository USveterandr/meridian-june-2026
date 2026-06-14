import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeEveryListingProperty, type EveryListingRawProperty } from '../lib/everylisting';

// These fixtures are best-guess approximations of the EveryListing WWLS
// Pipes response shape — see lib/everylisting.ts for the verification TODO.
describe('normalizeEveryListingProperty', () => {
  it('normalizes a qualifying USD villa listing', () => {
    const raw: EveryListingRawProperty = {
      title: 'Oceanfront Villa in Punta Cana',
      description: 'A stunning villa.',
      property_type: 'Villa',
      listing_type: 'sale',
      price: 750000,
      currency: 'USD',
      city: 'Punta Cana',
      address: 'Cap Cana',
      bedrooms: 5,
      bathrooms: 5,
      area: 600,
      lot_size: 1200,
      features: ['Pool', 'Ocean View'],
    };

    const result = normalizeEveryListingProperty(raw);
    assert.ok(result);
    assert.strictEqual(result?.propertyType, 'villa');
    assert.strictEqual(result?.priceCents, 75_000_000);
    assert.strictEqual(result?.currency, 'USD');
    assert.deepStrictEqual(result?.features, ['Pool', 'Ocean View']);
  });

  it('normalizes a qualifying DOP land listing below the USD threshold', () => {
    const raw: EveryListingRawProperty = {
      name: 'Beachfront Land in Las Terrenas',
      content: 'Prime development land.',
      type: 'Land',
      price: 25_000_000,
      currency: 'DOP',
      city: 'Las Terrenas',
    };

    const result = normalizeEveryListingProperty(raw);
    assert.ok(result);
    assert.strictEqual(result?.propertyType, 'land');
    assert.strictEqual(result?.currency, 'DOP');
    assert.strictEqual(result?.priceCents, 2_500_000_000);
  });

  it('rejects listings below both price thresholds', () => {
    const raw: EveryListingRawProperty = {
      title: 'Small Apartment',
      property_type: 'Apartment',
      price: 150_000,
      currency: 'USD',
      city: 'Santiago',
    };

    assert.strictEqual(normalizeEveryListingProperty(raw), null);
  });

  it('rejects property types not targeted by this feed', () => {
    const raw: EveryListingRawProperty = {
      title: 'Luxury House',
      property_type: 'House',
      price: 900_000,
      currency: 'USD',
      city: 'Santo Domingo',
    };

    assert.strictEqual(normalizeEveryListingProperty(raw), null);
  });

  it('maps hotel/commercial categories to "commercial"', () => {
    const raw: EveryListingRawProperty = {
      title: 'Boutique Hotel in Las Terrenas',
      property_type: 'Hotel',
      price: 1_200_000,
      currency: 'USD',
      city: 'Las Terrenas',
    };

    const result = normalizeEveryListingProperty(raw);
    assert.ok(result);
    assert.strictEqual(result?.propertyType, 'commercial');
  });

  it('rejects listings with no usable price', () => {
    const raw: EveryListingRawProperty = {
      title: 'Mystery Villa',
      property_type: 'Villa',
      currency: 'USD',
      city: 'Punta Cana',
    };

    assert.strictEqual(normalizeEveryListingProperty(raw), null);
  });
});
