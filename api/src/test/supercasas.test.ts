import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSupercasasCards, normalizeSupercasasCard } from '../lib/portals/supercasas';

// Fixture below is real, unmodified markup captured from supercasas.com's
// server-rendered "recent listings" widget — see lib/portals/supercasas.ts
// for why these selectors are treated as confirmed rather than guessed.
const REAL_CARD_HTML = `
<ul>
  <li class="normal">
    <a href="/apartamentos-venta-y-alquiler-los-cacicazgos/1435268/">
      <div>
        <img src="https://img.supercasas.com/AdsPhotos/155x110/5/10489484.jpg">
        <div class="title1">Apartamento / Venta y Alquiler</div>
        <div class="title2">Los Cacicazgos</div>
        <div class="title3">US$ 1,000,000</div>
        <div class="property-small-info-slide">
          <ul>
            <li><span>4 Habitaciones</span></li><li><span>4.5 Baños</span></li><li><span>4 Parqueos</span></li><li><span>546 Mt2 Construcción</span></li><li><span>Segundo Uso Condición</span></li>
          </ul>
        </div>
      </div>
    </a>
  </li>
  <li class="normal">
    <a href="/apartamentos-alquiler-piantini/1362101/">
      <div>
        <img src="https://img.supercasas.com/AdsPhotos/155x110/5/10362101.jpg">
        <div class="title1">Apartamento / Alquiler</div>
        <div class="title2">Piantini</div>
        <div class="title3">US$ 3,000/Mes</div>
        <div class="property-small-info-slide">
          <ul>
            <li><span>3 Habitaciones</span></li><li><span>3.5 Baños</span></li><li><span>2 Parqueos</span></li><li><span>210 Mt2 Construcción</span></li><li><span>Nueva Condición</span></li>
          </ul>
        </div>
      </div>
    </a>
  </li>
</ul>
`;

describe('parseSupercasasCards', () => {
  it('extracts each card without bleeding into the next one (nested <li> safe)', () => {
    const cards = parseSupercasasCards(REAL_CARD_HTML);
    assert.strictEqual(cards.length, 2);

    assert.strictEqual(cards[0].href, '/apartamentos-venta-y-alquiler-los-cacicazgos/1435268/');
    assert.strictEqual(cards[0].title1, 'Apartamento / Venta y Alquiler');
    assert.strictEqual(cards[0].title2, 'Los Cacicazgos');
    assert.strictEqual(cards[0].title3, 'US$ 1,000,000');
    assert.deepStrictEqual(cards[0].features, [
      '4 Habitaciones', '4.5 Baños', '4 Parqueos', '546 Mt2 Construcción', 'Segundo Uso Condición',
    ]);

    assert.strictEqual(cards[1].title2, 'Piantini');
    assert.strictEqual(cards[1].title3, 'US$ 3,000/Mes');
  });

  it('upsizes the thumbnail photo URL to a larger size', () => {
    const cards = parseSupercasasCards(REAL_CARD_HTML);
    assert.strictEqual(cards[0].imageUrl, 'https://img.supercasas.com/AdsPhotos/800x600/5/10489484.jpg');
  });
});

describe('normalizeSupercasasCard', () => {
  it('normalizes a for-sale apartment card', () => {
    const [card] = parseSupercasasCards(REAL_CARD_HTML);
    const result = normalizeSupercasasCard(card);
    assert.ok(result);
    assert.strictEqual(result?.propertyType, 'apartment');
    assert.strictEqual(result?.listingType, 'sale');
    assert.strictEqual(result?.priceCents, 100_000_000);
    assert.strictEqual(result?.currency, 'USD');
    assert.strictEqual(result?.city, 'Los Cacicazgos');
    assert.strictEqual(result?.bedrooms, 4);
    assert.strictEqual(result?.bathrooms, 4.5);
    assert.strictEqual(result?.areaM2, 546);
    assert.strictEqual(result?.imageUrl, 'https://img.supercasas.com/AdsPhotos/800x600/5/10489484.jpg');
  });

  it('normalizes a monthly rental, keeping the monthly price as priceCents', () => {
    const cards = parseSupercasasCards(REAL_CARD_HTML);
    const result = normalizeSupercasasCard(cards[1]);
    assert.ok(result);
    assert.strictEqual(result?.listingType, 'rent');
    assert.strictEqual(result?.priceCents, 300_000); // $3,000/mo, matches scraper.ts rental convention
    assert.strictEqual(result?.bedrooms, 3);
  });

  it('rejects a card with no usable price', () => {
    const result = normalizeSupercasasCard({
      href: null, title1: 'Apartamento / Venta', title2: 'Naco', title3: '', features: [], imageUrl: null,
    });
    assert.strictEqual(result, null);
  });

  it('rejects property types this portal scraper does not map', () => {
    const result = normalizeSupercasasCard({
      href: null, title1: 'Tipo Desconocido / Venta', title2: 'Naco', title3: 'US$ 200,000', features: [], imageUrl: null,
    });
    assert.strictEqual(result, null);
  });
});
