import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice, type Property } from '../api';
import { useLang } from '../i18n';
import { useAuth } from '../auth';
import { canListProperties, canViewAnalytics } from '../permissions';
import { analyticsPath, editListingPath, newListingPath, requirementsPath } from '../routes';

type Mine = Property & { coverUrl?: string | null };

export default function Dashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [listings, setListings] = useState<Mine[] | null>(null);
  const [error, setError] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState(100000);

  const canList = canListProperties(user?.role);
  const isAdmin = user && user.role === 'admin';
  const canAnalytics = canViewAnalytics(user?.role);

  const load = useCallback(() => {
    api.get<{ results: Mine[] }>('/api/properties/mine')
      .then((d) => setListings(d.results))
      .catch(() => setError(true));
  }, []);

  useEffect(() => { if (canList) load(); else setListings([]); }, [canList, load]);

  async function setStatus(id: number, status: string) {
    try {
      await api.patch(`/api/properties/${id}`, { status });
      load();
    } catch { setError(true); }
  }

  async function remove(id: number) {
    const ok = window.confirm(lang === 'es' ? '¿Eliminar esta publicación de forma permanente?' : 'Permanently delete this listing?');
    if (!ok) return;
    try {
      await api.delete(`/api/properties/${id}`);
      load();
    } catch { setError(true); }
  }

  async function triggerScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await api.post<{ importedCount: number; message: string }>('/api/scrape', { minPrice });
      setScrapeResult(
        lang === 'es'
          ? `¡Éxito! Se importaron ${res.importedCount} propiedades nuevas.`
          : `Success! Imported ${res.importedCount} new properties.`
      );
      if (res.importedCount > 0 && canList) {
        load();
      }
    } catch {
      setScrapeResult(
        lang === 'es'
          ? 'Error al ejecutar el scraper. Por favor intente de nuevo.'
          : 'Error executing the scraper. Please try again.'
      );
    } finally {
      setScraping(false);
    }
  }

  return (
    <main className="section">
      <div className="container">
        <div className="row-between">
          <h1>{t('dash.title')}</h1>
          <div className="hero-ctas" style={{ marginTop: 0 }}>
            <Link className="btn outline" to={requirementsPath()}>{t('dash.requirements')}</Link>
            {canList && <Link className="btn gold" to={newListingPath()}>+ {t('dash.newListing')}</Link>}
            {canAnalytics && <Link className="btn outline" to={analyticsPath()}>{t('dash.analytics')}</Link>}
          </div>
        </div>

        {error && <div className="alert error">{t('common.error')}</div>}

        {canList && (
          <>
            <h2>{t('dash.myListings')}</h2>
            {listings === null && <p className="empty">{t('common.loading')}</p>}
            {listings !== null && listings.length === 0 && <p className="empty">{t('dash.noListings')}</p>}
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
                        <td><Link to={`/property/${p.id}`}>{p.title}</Link><div className="meta">{p.city}</div></td>
                        <td>{formatPrice(p.priceCents, p.currency, p.listingType, t('listing.perMonth'))}</td>
                        <td><span className="status-pill">{t(`status.${p.status}` as Parameters<typeof t>[0])}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <Link className="btn small outline" to={editListingPath(p.id)}>{t('dash.edit')}</Link>{' '}
                          {p.status === 'draft' && (
                            <button className="btn small gold" onClick={() => setStatus(p.id, 'active')}>{t('status.publish')}</button>
                          )}{' '}
                          {p.status === 'active' && p.listingType === 'sale' && (
                            <button className="btn small ghost" onClick={() => setStatus(p.id, 'sold')}>{t('dash.markSold')}</button>
                          )}{' '}
                          {p.status === 'active' && p.listingType === 'rent' && (
                            <button className="btn small ghost" onClick={() => setStatus(p.id, 'rented')}>{t('dash.markRented')}</button>
                          )}{' '}
                          <button className="btn small danger" onClick={() => remove(p.id)}>{t('dash.delete')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!canList && (
          <p className="lede">
            {lang === 'es'
              ? 'Guarda búsquedas, publica requerimientos y escribe a los propietarios — todo desde aquí.'
              : 'Save searches, post requirements, and message owners — all from here.'}
          </p>
        )}

        {isAdmin && (
          <div className="cta-panel" style={{ marginTop: '48px', textAlign: 'left' }}>
            <h2 className="gold" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              🛠️ {lang === 'es' ? 'Herramientas de Administrador' : 'Admin Control Panel'}
            </h2>
            <p className="lede" style={{ fontSize: '0.95rem', marginBottom: '24px' }}>
              {lang === 'es'
                ? 'Importa propiedades de lujo de la República Dominicana directamente desde el internet filtradas por precio.'
                : 'Scrape and auto-import luxury real estate listings in the Dominican Republic above a minimum price.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ color: 'var(--text-dim)' }}>
                  {lang === 'es' ? 'Precio Mínimo (USD)' : 'Minimum Price (USD)'}
                </label>
                <select
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--text)'
                  }}
                >
                  <option value={50000}>$50,000</option>
                  <option value={100000}>$100,000</option>
                  <option value={250000}>$250,000</option>
                  <option value={500000}>$500,000</option>
                  <option value={1000000}>$1,000,000</option>
                </select>
              </div>

              <button
                className="btn gold"
                onClick={triggerScrape}
                disabled={scraping}
                style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {scraping
                  ? (lang === 'es' ? 'Scrapeando...' : 'Scraping...')
                  : (lang === 'es' ? 'Buscar e Importar Propiedades' : 'Search & Import Properties')}
              </button>
            </div>

            {scrapeResult && (
              <div className="alert ok" style={{ marginTop: '20px', marginBottom: 0 }}>
                {scrapeResult}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
