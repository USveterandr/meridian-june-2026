import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, type Property, type SearchResponse } from '../api';
import { useLang } from '../i18n';
import { useAuth } from '../auth';
import { canListProperties } from '../permissions';
import { newListingPath, searchPath } from '../routes';
import PropertyCard from '../components/PropertyCard';
import InstallApp from '../components/InstallApp';
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

function NewsletterCapture() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    setError('');
    try {
      await api.post('/api/newsletter', { email: email.trim(), lang });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : t('newsletter.error'));
    }
  }

  return (
    <section className="section" style={{ background: 'var(--surface)' }}>
      <div className="container" style={{ maxWidth: 680, textAlign: 'center' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>{t('newsletter.eyebrow')}</p>
        <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginBottom: 14 }}>
          {t('newsletter.title')} <span className="gold">{t('newsletter.titleGold')}</span>
        </h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 28, lineHeight: 1.7 }}>
          {t('newsletter.lede')}
        </p>
        {status === 'success' ? (
          <div style={{ padding: '16px 24px', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: '0.95rem' }}>
            {t('newsletter.success')}
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', gap: 0, maxWidth: 480, margin: '0 auto' }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRight: 'none',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
              disabled={status === 'loading'}
            />
            <button
              className="btn gold"
              type="submit"
              disabled={status === 'loading'}
              style={{ borderRadius: 0, whiteSpace: 'nowrap' }}
            >
              {status === 'loading' ? t('newsletter.submitting') : t('newsletter.submit')}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p style={{ color: 'var(--danger, #c0392b)', marginTop: 10, fontSize: '0.85rem' }}>{error}</p>
        )}
        <p style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {t('newsletter.unsubscribe')}
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [listingType, setListingType] = useState('');
  const [featured, setFeatured] = useState<Property[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);

  useSEO({
    title: {
      en: 'Luxury Real Estate in the Dominican Republic',
      es: 'Bienes Raíces de Lujo en la República Dominicana',
    },
    description: {
      en: 'Browse luxury villas, condos, apartments, and land for sale and rent across the Dominican Republic. Punta Cana, Cap Cana, Santo Domingo, Las Terrenas.',
      es: 'Explora villas de lujo, condominios, apartamentos y terrenos en venta y alquiler en toda la República Dominicana. Punta Cana, Cap Cana, Santo Domingo, Las Terrenas.',
    },
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
          <div className="hero-ctas" style={{ marginBottom: '28px' }}>
            <Link className="btn gold" to="/search" id="hero-browse-btn">{t('hero.cta.browse')}</Link>
            <Link className="btn outline" to={canList ? newListingPath() : '/signup'} id="hero-list-btn">{t('hero.cta.list')}</Link>
            <Link className="btn outline" to="/contact" id="hero-consult-btn">{t('hero.cta.consult')}</Link>
          </div>
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

      {/* ─── Install App ─── */}
      <InstallApp />

      {/* ─── Newsletter Capture ─── */}
      <NewsletterCapture />

      {/* ─── Blog Teaser ─── */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>
              DR Real Estate <span className="gold">Guides</span>
            </h2>
            <p>Everything you need to know before you buy.</p>
          </div>
          <div className="props3">
            {[
              {
                icon: '📖',
                title: 'How to Buy Property as a Foreigner',
                desc: 'Step-by-step guide: title search, notary, closing costs, taxes, and timelines.',
                slug: 'how-to-buy-property-dominican-republic-foreigner',
              },
              {
                icon: '📊',
                title: 'Rental Yields & ROI (2026)',
                desc: '6–14% gross yields, sample ROI calculations, and government incentives explained.',
                slug: 'dominican-republic-real-estate-investment-roi-2026',
              },
              {
                icon: '📍',
                title: 'Punta Cana vs Cap Cana vs Las Terrenas',
                desc: 'Compare the top DR markets by price, yield, lifestyle, and who each suits best.',
                slug: 'punta-cana-vs-cap-cana-vs-las-terrenas',
              },
            ].map((a) => (
              <Link key={a.slug} to={`/blog/${a.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  className="prop"
                  style={{ cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >
                  <span className="prop-icon" aria-hidden="true">{a.icon}</span>
                  <h3>{a.title}</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.6 }}>{a.desc}</p>
                  <p style={{ marginTop: 12 }}><span className="linkish" style={{ fontSize: '0.88rem' }}>Read guide →</span></p>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link className="linkish" to="/blog">View all guides →</Link>
          </div>
        </div>
      </section>

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
