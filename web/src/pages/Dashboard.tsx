import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice, planListingLimit, type Property } from '../api';
import { useLang } from '../i18n';
import { useAuth, hasActiveSub } from '../auth';
import { canListProperties, canViewAnalytics } from '../permissions';
import { analyticsPath, editListingPath, newListingPath, requirementsPath } from '../routes';
import { PLAN_ICON, PLAN_COPY, featureLabel } from '../planCatalog';

type Mine = Property & { coverUrl?: string | null };

const PLAN_COLOR: Record<string, string> = {
  free:         'var(--text-dim)',
  team:         '#2d9e6b',
  professional: '#c8a24b',
  enterprise:   '#8b5cf6',
};

export default function Dashboard() {
  const { t, lang } = useLang();
  const { user, subscription } = useAuth();
  const [listings, setListings] = useState<Mine[] | null>(null);
  const [error, setError] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState(100000);

  const canList = canListProperties(user?.role);
  const isAdmin = user?.role === 'admin';
  const canAnalytics = canViewAnalytics(user?.role);
  const hasSub = hasActiveSub(subscription);

  const load = useCallback(() => {
    api.get<{ results: Mine[] }>('/api/properties/mine')
      .then((d) => setListings(d.results))
      .catch(() => setError(true));
  }, []);

  useEffect(() => { if (canList) load(); else setListings([]); }, [canList, load]);

  async function setStatus(id: number, status: string) {
    try { await api.patch(`/api/properties/${id}`, { status }); load(); }
    catch { setError(true); }
  }

  async function remove(id: number) {
    const ok = window.confirm(lang === 'es'
      ? '¿Eliminar esta publicación de forma permanente?'
      : 'Permanently delete this listing?');
    if (!ok) return;
    try { await api.delete(`/api/properties/${id}`); load(); }
    catch { setError(true); }
  }

  async function triggerScrape() {
    setScraping(true); setScrapeResult(null);
    try {
      const res = await api.post<{ importedCount: number; message: string }>('/api/scrape', { minPrice });
      setScrapeResult(lang === 'es'
        ? `¡Éxito! Se importaron ${res.importedCount} propiedades nuevas.`
        : `Success! Imported ${res.importedCount} new properties.`);
      if (res.importedCount > 0 && canList) load();
    } catch {
      setScrapeResult(lang === 'es'
        ? 'Error al ejecutar el scraper. Por favor intente de nuevo.'
        : 'Error executing the scraper. Please try again.');
    } finally { setScraping(false); }
  }

  // ── Subscription derived values ──────────────────────────────────────────
  const planId = subscription?.planId ?? 'free';
  const planIcon = PLAN_ICON[planId] ?? '🏠';
  const planLabel = PLAN_COPY[planId]?.[lang]?.name ?? subscription?.planName ?? 'FREE Start';
  const planColor = PLAN_COLOR[planId] ?? 'var(--text-dim)';
  const features = subscription?.features ?? ['listings_limit_1'];
  const listingLimit = planListingLimit(features);
  const activeCount = listings?.filter(
    (p) => !['sold', 'rented', 'inactive'].includes(p.status)
  ).length ?? 0;
  const usagePct = listingLimit != null ? Math.min(100, (activeCount / listingLimit) * 100) : 0;

  const daysLeft = subscription?.periodEnd
    ? Math.max(0, Math.ceil((new Date(subscription.periodEnd).getTime() - Date.now()) / 86400000))
    : null;
  const isTrialing = subscription?.status === 'trialing';
  const atLimit = listingLimit != null && activeCount >= listingLimit;

  return (
    <main className="section">
      <div className="container">

        {/* ── Header ── */}
        <div className="row-between" style={{ marginBottom: 32 }}>
          <h1>{t('dash.title')}</h1>
          <div className="hero-ctas" style={{ marginTop: 0 }}>
            <Link className="btn outline" to={requirementsPath()}>{t('dash.requirements')}</Link>
            {canList && !atLimit && (
              <Link className="btn gold" to={newListingPath()}>+ {t('dash.newListing')}</Link>
            )}
            {canAnalytics && (
              <Link className="btn outline" to={analyticsPath()}>{t('dash.analytics')}</Link>
            )}
          </div>
        </div>

        {error && <div className="alert error" style={{ marginBottom: 24 }}>{t('common.error')}</div>}

        {/* ── Subscription widget ── */}
        <div className="aside-card" style={{
          marginBottom: 36,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 28,
        }}>
          {/* Plan identity */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              {lang === 'es' ? 'Tu plan actual' : 'Current plan'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.9rem' }}>{planIcon}</span>
              <div>
                <strong style={{ fontSize: '1.05rem', color: planColor }}>{planLabel}</strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="status-pill" style={{
                    background: isTrialing ? 'rgba(200,162,75,0.15)' : hasSub ? 'rgba(45,158,107,0.15)' : 'rgba(239,68,68,0.12)',
                    color: isTrialing ? '#c8a24b' : hasSub ? '#2d9e6b' : '#ef4444',
                    fontSize: '0.78rem',
                  }}>
                    {isTrialing
                      ? (lang === 'es' ? '🕐 Prueba gratis' : '🕐 Free trial')
                      : hasSub
                        ? (lang === 'es' ? '✓ Activo' : '✓ Active')
                        : (lang === 'es' ? 'Sin suscripción' : 'No subscription')}
                  </span>
                  {isTrialing && daysLeft !== null && (
                    <span className="status-pill" style={{ fontSize: '0.78rem' }}>
                      {daysLeft} {lang === 'es' ? 'días restantes' : 'days left'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {subscription?.commissionPct != null && (
              <p className="meta" style={{ marginBottom: 12 }}>
                {lang === 'es' ? 'Comisión:' : 'Commission:'}{' '}
                <strong>{subscription.commissionPct === 0 ? '0%' : `${subscription.commissionPct}%`}</strong>
              </p>
            )}
            {planId !== 'enterprise' && (
              <Link className="btn outline" to="/pricing"
                style={{ display: 'inline-block', fontSize: '0.85rem' }}>
                {lang === 'es' ? '↑ Mejorar plan' : '↑ Upgrade plan'}
              </Link>
            )}
          </div>

          {/* Listing usage bar */}
          {canList && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                {lang === 'es' ? 'Publicaciones activas' : 'Active listings'}
              </p>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 10 }}>
                {activeCount}
                <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-dim)' }}>
                  {' / '}{listingLimit != null ? listingLimit : '∞'}
                </span>
              </div>
              {listingLimit != null && (
                <div style={{
                  background: 'var(--line)', borderRadius: 99, height: 7,
                  marginBottom: 10, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99, transition: 'width .4s',
                    width: `${usagePct}%`,
                    background: usagePct >= 100 ? '#ef4444' : planColor,
                  }} />
                </div>
              )}
              {atLimit ? (
                <div className="alert error" style={{ fontSize: '0.84rem', padding: '10px 14px' }}>
                  {lang === 'es'
                    ? 'Límite de publicaciones alcanzado.'
                    : 'Listing limit reached.'}{' '}
                  <Link to="/pricing" style={{ color: 'inherit', fontWeight: 700 }}>
                    {lang === 'es' ? 'Mejora tu plan →' : 'Upgrade →'}
                  </Link>
                </div>
              ) : (
                <p className="meta">
                  {listingLimit != null
                    ? lang === 'es'
                      ? `${listingLimit - activeCount} publicaciones disponibles`
                      : `${listingLimit - activeCount} listing slots remaining`
                    : lang === 'es' ? 'Publicaciones ilimitadas' : 'Unlimited listings'}
                </p>
              )}
            </div>
          )}

          {/* Features unlocked */}
          {hasSub && features.length > 0 && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                {lang === 'es' ? 'Funciones incluidas' : 'Included features'}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {features.slice(0, 7).map((f) => (
                  <li key={f} style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ color: planColor, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {featureLabel(f, lang)}
                  </li>
                ))}
                {features.length > 7 && (
                  <li style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    <Link to="/pricing">
                      +{features.length - 7} {lang === 'es' ? 'más →' : 'more →'}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Listings table ── */}
        {canList && (
          <>
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{t('dash.myListings')}</h2>
              {!atLimit && (
                <Link className="btn small gold" to={newListingPath()}>
                  + {t('dash.newListing')}
                </Link>
              )}
            </div>

            {listings === null && <p className="empty">{t('common.loading')}</p>}

            {listings !== null && listings.length === 0 && (
              <div className="empty" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>🏠</p>
                <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>{t('dash.noListings')}</p>
                {!atLimit && (
                  <Link className="btn gold" to={newListingPath()}>+ {t('dash.newListing')}</Link>
                )}
              </div>
            )}

            {listings !== null && listings.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('new.headline')}</th>
                      <th>{t('new.price')}</th>
                      <th>{t('dash.views.status')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/property/${p.id}`}>{p.title}</Link>
                          <div className="meta">{p.city}</div>
                        </td>
                        <td>{formatPrice(p.priceCents, p.currency, p.listingType, t('listing.perMonth'))}</td>
                        <td>
                          <span className="status-pill">
                            {t(`status.${p.status}` as Parameters<typeof t>[0])}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Link className="btn small outline" to={editListingPath(p.id)}>{t('dash.edit')}</Link>{' '}
                          {p.status === 'draft' && (
                            <button className="btn small gold" onClick={() => setStatus(p.id, 'active')}>
                              {t('status.publish')}
                            </button>
                          )}{' '}
                          {p.status === 'active' && p.listingType === 'sale' && (
                            <button className="btn small ghost" onClick={() => setStatus(p.id, 'sold')}>
                              {t('dash.markSold')}
                            </button>
                          )}{' '}
                          {p.status === 'active' && p.listingType === 'rent' && (
                            <button className="btn small ghost" onClick={() => setStatus(p.id, 'rented')}>
                              {t('dash.markRented')}
                            </button>
                          )}{' '}
                          <button className="btn small danger" onClick={() => remove(p.id)}>
                            {t('dash.delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Buyer / Renter / Investor view ── */}
        {!canList && (
          <div style={{ padding: '32px 0' }}>
            <p className="lede">
              {lang === 'es'
                ? 'Guarda búsquedas, publica requerimientos y escribe a los propietarios — todo desde aquí.'
                : 'Save searches, post requirements, and message owners — all from here.'}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
              <Link className="btn gold" to="/search">
                {lang === 'es' ? 'Buscar propiedades' : 'Browse properties'}
              </Link>
              <Link className="btn outline" to={requirementsPath()}>{t('dash.requirements')}</Link>
              <Link className="btn outline" to="/favorites">{t('nav.favorites')}</Link>
            </div>
          </div>
        )}

        {/* ── Upgrade nudge for free plan ── */}
        {canList && planId === 'free' && !atLimit && (
          <div className="cta-panel" style={{
            marginTop: 40,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 20,
            alignItems: 'center',
          }}>
            <div>
              <h3 style={{ margin: '0 0 6px' }}>
                {lang === 'es' ? '🚀 Cierra más ventas con TEAM Essentials' : '🚀 Close more deals with TEAM Essentials'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                {lang === 'es'
                  ? '100 propiedades, verificación de compradores, contratos digitales, mapas pro — $147/mes · 30 días de prueba gratis.'
                  : '100 listings, buyer verification, digital contracts, pro maps — $147/mo · 30-day free trial.'}
              </p>
            </div>
            <Link className="btn gold" to="/pricing" style={{ whiteSpace: 'nowrap' }}>
              {lang === 'es' ? 'Ver planes' : 'View plans'}
            </Link>
          </div>
        )}

        {/* ── Admin scraper ── */}
        {isAdmin && (
          <div className="cta-panel" style={{ marginTop: 48, textAlign: 'left' }}>
            <h2 className="gold" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              🛠️ {lang === 'es' ? 'Panel de Administrador' : 'Admin Control Panel'}
            </h2>
            <p className="lede" style={{ fontSize: '0.95rem', marginBottom: 24 }}>
              {lang === 'es'
                ? 'Importa propiedades de lujo de la República Dominicana filtradas por precio mínimo.'
                : 'Scrape and auto-import luxury DR real estate listings above a minimum price.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, alignItems: 'end' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ color: 'var(--text-dim)' }}>
                  {lang === 'es' ? 'Precio Mínimo (USD)' : 'Minimum Price (USD)'}
                </label>
                <select value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))}
                  style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}>
                  <option value={50000}>$50,000</option>
                  <option value={100000}>$100,000</option>
                  <option value={250000}>$250,000</option>
                  <option value={500000}>$500,000</option>
                  <option value={1000000}>$1,000,000</option>
                </select>
              </div>
              <button className="btn gold" onClick={triggerScrape} disabled={scraping}
                style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {scraping
                  ? (lang === 'es' ? 'Importando...' : 'Importing...')
                  : (lang === 'es' ? 'Buscar e Importar' : 'Search & Import')}
              </button>
            </div>
            {scrapeResult && (
              <div className="alert ok" style={{ marginTop: 20, marginBottom: 0 }}>{scrapeResult}</div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
