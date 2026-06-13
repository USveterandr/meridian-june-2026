import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Property, type SearchResponse } from '../api';
import { useLang } from '../i18n';
import { useAuth } from '../auth';
import { canListProperties } from '../permissions';
import { newListingPath, searchPath } from '../routes';
import PropertyCard from '../components/PropertyCard';
import { useSEO } from '../seo';

const CITY_IMAGES: Record<string, { emoji: string; color: string }> = {
  'Punta Cana':  { emoji: '🏖️', color: 'linear-gradient(135deg,#0d4f3c 0%,#1a7a55 100%)' },
  'Cap Cana':    { emoji: '⛵', color: 'linear-gradient(135deg,#1a3a5c 0%,#2d6a9f 100%)' },
  'Santo Domingo': { emoji: '🏛️', color: 'linear-gradient(135deg,#3a2010 0%,#7a4020 100%)' },
  'Las Terrenas': { emoji: '🌴', color: 'linear-gradient(135deg,#2d5a1b 0%,#5a9e33 100%)' },
  'Cabarete':    { emoji: '🪁', color: 'linear-gradient(135deg,#0d3050 0%,#1e6090 100%)' },
  'Santiago':    { emoji: '🏔️', color: 'linear-gradient(135deg,#2a1a40 0%,#5a3a80 100%)' },
  'Samaná':      { emoji: '🐋', color: 'linear-gradient(135deg,#1a3a3a 0%,#2d7070 100%)' },
  'La Romana':   { emoji: '⛳', color: 'linear-gradient(135deg,#1a3a1a 0%,#3a7a3a 100%)' },
};

const BENEFIT_ICONS = ['🏡', '📋', '💬', '🔔'];

export default function Home() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [listingType, setListingType] = useState('');
  const [featured, setFeatured] = useState<Property[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);

  useSEO({
    title: 'Luxury Real Estate in the Dominican Republic',
    description: 'Browse luxury villas, condos, apartments, and land for sale and rent across the Dominican Republic. Punta Cana, Cap Cana, Santo Domingo, Las Terrenas.',
    canonical: 'https://investwithmeridian.com/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://investwithmeridian.com/search?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  });

  useEffect(() => {
    let cancelled = false;
    api.get<SearchResponse>('/api/properties?perPage=6&sort=newest')
      .then((d) => { if (!cancelled) setFeatured(d.results); })
      .catch(() => { /* hero still renders without listings */ });

    // Load city stats
    Promise.all(
      Object.keys(CITY_IMAGES).map((city) =>
        api.get<SearchResponse>(`/api/properties?city=${encodeURIComponent(city)}&perPage=1`)
          .then((d) => ({ city, count: d.total }))
          .catch(() => ({ city, count: 0 }))
      )
    ).then((results) => {
      if (!cancelled) setCities(results.filter((c) => c.count > 0));
    });

    return () => { cancelled = true; };
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (listingType) params.set('listingType', listingType);
    navigate(`/search?${params.toString()}`);
  }

  const canList = canListProperties(user?.role);

  return (
    <main>
      {/* ─── Hero ─── */}
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow-pill"><span className="spark" aria-hidden="true">✦</span>{t('hero.eyebrow')}</p>
          <h1 className="hero-title">
            {t('hero.title1')} <span className="gold">{t('hero.title2')}</span>
          </h1>
          <p className="lede">{t('hero.lede')}</p>
          <form className="searchbar" onSubmit={onSearch} role="search">
            <span className="search-glyph" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              maxLength={100}
            />
            <select value={listingType} onChange={(e) => setListingType(e.target.value)} aria-label={t('search.any')}>
              <option value="">{t('search.any')}</option>
              <option value="sale">{t('search.buy')}</option>
              <option value="rent">{t('search.rent')}</option>
            </select>
            <button className="btn gold" type="submit">{t('search.go')}</button>
          </form>
        </div>
      </section>

      {/* ─── City Grid ─── */}
      {cities.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="row-between" style={{ marginBottom: '24px' }}>
              <h2>{t('home.cities.title')}</h2>
              <Link className="linkish" to="/search">{t('home.cities.all')} →</Link>
            </div>
            <div className="city-grid">
              {cities.map(({ city, count }) => {
                const meta = CITY_IMAGES[city] ?? { emoji: '🏘️', color: 'linear-gradient(135deg,#333 0%,#555 100%)' };
                return (
                  <Link
                    key={city}
                    to={searchPath({ q: city })}
                    className="city-card"
                    style={{ background: meta.color }}
                  >
                    <span className="city-emoji">{meta.emoji}</span>
                    <span className="city-name">{city}</span>
                    <span className="city-count">{count} {count === 1 ? t('home.listing.one') : t('home.listing.many')}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Why Meridian? ─── */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>{t('value.title')}</h2>
            <p>{t('value.sub')}</p>
          </div>
          <div className="props3">
            {(['1', '2', '3'] as const).map((n, i) => (
              <div className="prop" key={n}>
                <span className="prop-icon" aria-hidden="true">{['🔒', '🌍', '🛎️'][i]}</span>
                <h3>{t(`value.${n}.t` as Parameters<typeof t>[0])}</h3>
                <p>{t(`value.${n}.p` as Parameters<typeof t>[0])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Curated Collections ─── */}
      {featured.length > 0 && (
        <section className="section"><div className="container">
          <div className="section-head left">
            <h2>{t('featured.title').split(' ').map((w, i, arr) => (
              i === arr.length - 1
                ? <span className="gold" key={w}>{w}</span>
                : <span key={w}>{w} </span>
            ))}</h2>
            <p>{t('featured.sub')}</p>
          </div>
          <div className="cards">
            {featured.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link className="linkish" to="/search">{t('featured.viewAll')} →</Link>
          </div>
        </div></section>
      )}

      {/* ─── Sign Up Benefits (shown only to non-logged-in users) ─── */}
      {!user && (
        <section className="section signup-benefits-section">
          <div className="container">
            <div className="signup-benefits-inner">
              <div className="signup-benefits-copy">
                <p className="eyebrow">{t('benefits.eyebrow')}</p>
                <h2>{t('benefits.title')}</h2>
                <p className="lede" style={{ color: 'var(--text-dim)', maxWidth: '42ch' }}>
                  {t('benefits.lede')}
                </p>
                <div className="signup-benefits-ctas">
                  <Link className="btn gold" to="/signup" id="hero-signup-btn">{t('benefits.create')}</Link>
                  <Link className="btn outline" to="/login" id="hero-signin-btn">{t('benefits.signin')}</Link>
                </div>
              </div>
              <div className="benefits-grid">
                {(['1', '2', '3', '4'] as const).map((n, i) => (
                  <div key={n} className="benefit-card">
                    <span className="benefit-icon">{BENEFIT_ICONS[i]}</span>
                    <div>
                      <strong>{t(`benefits.${n}.t` as Parameters<typeof t>[0])}</strong>
                      <p>{t(`benefits.${n}.p` as Parameters<typeof t>[0])}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Stop Dreaming. Start Living. ─── */}
      <section className="cta-lux">
        <div className="container">
          <h2>
            {t('cta.title1')}<br />
            <span className="gold">{t('cta.title2')}</span>
          </h2>
          <p className="lede">{t('cta.lede')}</p>
          <Link className="btn gold" to={canList ? newListingPath() : '/signup'}>{t('cta.btn')} →</Link>
          <p className="cta-note">{t('cta.note')}</p>
        </div>
      </section>
    </main>
  );
}
