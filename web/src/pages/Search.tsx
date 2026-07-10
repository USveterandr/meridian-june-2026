import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type SearchResponse } from '../api';
import { useLang } from '../i18n';
import PropertyCard from '../components/PropertyCard';
import { hasMapsKey, SearchMap } from '../components/PropertyMap';
import { useSEO } from '../seo';

const TYPES = ['house', 'apartment', 'condo', 'villa', 'land', 'commercial'] as const;

export default function Search() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: { en: 'Search Properties', es: 'Buscar Propiedades' },
    description: {
      en: 'Search luxury properties for sale and rent in the Dominican Republic. Filter by city, price, bedrooms, and property type.',
      es: 'Busca propiedades de lujo en venta y alquiler en la República Dominicana. Filtra por ciudad, precio, habitaciones y tipo de propiedad.',
    },
    canonical: 'https://investwithmeridian.com/search',
  });

  // Draft filter state, seeded from the URL so links are shareable.
  const [q, setQ] = useState(params.get('q') ?? '');
  const [listingType, setListingType] = useState(params.get('listingType') ?? '');
  const [propertyType, setPropertyType] = useState(params.get('propertyType') ?? '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');
  const [minBeds, setMinBeds] = useState(params.get('minBeds') ?? '');
  const [sort, setSort] = useState(params.get('sort') ?? 'newest');
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; query: string }>>([]);

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('meridian_saved_searches');
      if (raw) setSavedSearches(JSON.parse(raw));
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const apiParams = new URLSearchParams();
    const q0 = params.get('q'); if (q0) apiParams.set('q', q0);
    const lt = params.get('listingType'); if (lt) apiParams.set('listingType', lt);
    const pt = params.get('propertyType'); if (pt) apiParams.set('propertyType', pt);
    // UI prices are USD; the API filters on integer cents.
    const mn = Number(params.get('minPrice')); if (mn > 0) apiParams.set('minPrice', String(Math.round(mn * 100)));
    const mx = Number(params.get('maxPrice')); if (mx > 0) apiParams.set('maxPrice', String(Math.round(mx * 100)));
    const mb = Number(params.get('minBeds')); if (mb > 0) apiParams.set('minBeds', String(mb));
    const so = params.get('sort'); if (so) apiParams.set('sort', so);
    apiParams.set('page', String(page));
    apiParams.set('perPage', '24');
    api.get<SearchResponse>(`/api/properties?${apiParams.toString()}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params, page]);

  function apply(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (listingType) next.set('listingType', listingType);
    if (propertyType) next.set('propertyType', propertyType);
    if (minPrice && Number(minPrice) > 0) next.set('minPrice', minPrice);
    if (maxPrice && Number(maxPrice) > 0) next.set('maxPrice', maxPrice);
    if (minBeds && Number(minBeds) > 0) next.set('minBeds', minBeds);
    if (sort !== 'newest') next.set('sort', sort);
    setParams(next); // resets page to 1 implicitly
  }

  function saveSearch() {
    const next = new URLSearchParams(params);
    const name = [q, listingType, propertyType, minPrice ? `$${minPrice}+` : '', maxPrice ? `≤ $${maxPrice}` : '', minBeds ? `${minBeds}+ beds` : ''].filter(Boolean).join(' · ') || 'Saved search';
    const existing = savedSearches.filter((s) => s.name !== name);
    const list = [{ name, query: next.toString() }, ...existing].slice(0, 5);
    setSavedSearches(list);
    try { localStorage.setItem('meridian_saved_searches', JSON.stringify(list)); } catch { /* private mode */ }
  }

  function loadSaved(query: string) {
    setParams(new URLSearchParams(query));
  }

  function goPage(p: number) {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
    window.scrollTo({ top: 0 });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const mapPins = data ? data.results
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => ({ id: p.id, lat: p.latitude as number, lng: p.longitude as number, title: p.title, priceCents: p.priceCents, currency: p.currency }))
    : [];

  return (
    <main className="section">
      <div className="container">
        <h1>{t('nav.search')}</h1>
        <form className="filters" onSubmit={apply}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} aria-label={t('search.placeholder')} maxLength={100} />
          <select value={listingType} onChange={(e) => setListingType(e.target.value)} aria-label={t('search.any')}>
            <option value="">{t('search.any')}</option>
            <option value="sale">{t('search.buy')}</option>
            <option value="rent">{t('search.rent')}</option>
          </select>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} aria-label={t('new.propertyType')}>
            <option value="">{t('search.anyType')}</option>
            {TYPES.map((ty) => <option key={ty} value={ty}>{t(`type.${ty}` as Parameters<typeof t>[0])}</option>)}
          </select>
          <input type="number" min={0} step={1} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder={t('search.minPrice')} aria-label={t('search.minPrice')} />
          <input type="number" min={0} step={1} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder={t('search.maxPrice')} aria-label={t('search.maxPrice')} />
          <select value={minBeds} onChange={(e) => setMinBeds(e.target.value)} aria-label={t('search.beds')}>
            <option value="">{t('search.beds')}: 0+</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{t('search.beds')}: {n}+</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('search.sort')}>
            <option value="newest">{t('search.sort')}: {t('sort.newest')}</option>
            <option value="price_asc">{t('sort.priceAsc')}</option>
            <option value="price_desc">{t('sort.priceDesc')}</option>
          </select>
          <button className="btn gold" type="submit">{t('search.go')}</button>
        </form>
        <div className="row-between" style={{ marginTop: 18 }}>
          <button className="btn outline small" type="button" onClick={saveSearch}>{t('search.save')}</button>
          {savedSearches.length > 0 && (
            <div className="steps" style={{ margin: 0 }}>
              {savedSearches.map((s) => (
                <button key={s.name} type="button" className={params.toString() === s.query ? 'on' : ''} onClick={() => loadSaved(s.query)}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <p className="empty">{t('common.loading')}</p>}
        {error && <div className="alert error">{t('common.error')}</div>}
        {data && !loading && (
          data.results.length === 0
            ? <p className="empty">{t('search.none')}</p>
            : (
              <>
                <p className="meta">{data.total} {t('search.results')}</p>
                <div className="cards">
                  {data.results.map((p) => <PropertyCard key={p.id} p={p} />)}
                </div>
                {mapPins.length > 0 && (
                  hasMapsKey ? (
                    <div className="property-map-wrap" style={{ height: 320, marginTop: 22 }}>
                      <SearchMap pins={mapPins} />
                    </div>
                  ) : <div className="alert ok">Map preview is available after adding VITE_GOOGLE_MAPS_KEY.</div>
                )}
                {totalPages > 1 && (
                  <nav className="pager" aria-label="Pagination">
                    <button className="btn outline" disabled={page <= 1} onClick={() => goPage(page - 1)}>←</button>
                    <span className="meta">{page} / {totalPages}</span>
                    <button className="btn outline" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>→</button>
                  </nav>
                )}
              </>
            )
        )}
      </div>
    </main>
  );
}
