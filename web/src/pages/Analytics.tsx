import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Property } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { canViewAnalytics } from '../permissions';
import { newListingPath } from '../routes';
import { useSEO } from '../seo';

export default function Analytics() {
  const { user } = useAuth();
  const { t } = useLang();
  const [listings, setListings] = useState<Property[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useSEO({
    title: 'Analytics',
    description: 'Track Meridian listing performance and lead activity.',
    canonical: 'https://investwithmeridian.com/analytics',
    noindex: true,
  });

  const load = useCallback(() => {
    api.get<{ results: Property[] }>('/api/properties/mine')
      .then((d) => setListings(d.results))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canViewAnalytics(user?.role)) return;
    load();
  }, [load, user?.role]);

  const stats = useMemo(() => {
    if (!listings) return null;
    return {
      total: listings.length,
      active: listings.filter((p) => p.status === 'active').length,
      draft: listings.filter((p) => p.status === 'draft').length,
      closed: listings.filter((p) => p.status === 'sold' || p.status === 'rented' || p.status === 'inactive').length,
    };
  }, [listings]);

  if (!canViewAnalytics(user?.role)) {
    return (
      <main className="section"><div className="container empty">
        <h1>{t('analytics.title')}</h1>
        <p className="lede">{t('analytics.noListings')}</p>
      </div></main>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <div className="row-between">
          <div>
            <h1>{t('analytics.title')}</h1>
            <p className="lede">{t('analytics.lede')}</p>
          </div>
          {canViewAnalytics(user?.role) && <Link className="btn gold" to={newListingPath()}>{t('dash.newListing')}</Link>}
        </div>

        {loading && <p className="empty">{t('common.loading')}</p>}
        {error && <div className="alert error">{t('common.error')}</div>}
        {stats && listings && (
          <>
            <div className="cards" style={{ marginTop: 24 }}>
              <div className="aside-card"><span className="price">{stats.total}</span><p className="meta">{t('analytics.total')}</p></div>
              <div className="aside-card"><span className="price">{stats.active}</span><p className="meta">{t('analytics.active')}</p></div>
              <div className="aside-card"><span className="price">{stats.draft}</span><p className="meta">{t('analytics.draft')}</p></div>
              <div className="aside-card"><span className="price">{stats.closed}</span><p className="meta">{t('analytics.closed')}</p></div>
            </div>
            <div className="section" style={{ borderTop: '1px solid var(--line)' }}>
              <h2>{t('analytics.leads')}</h2>
              {listings.length === 0 ? (
                <p className="empty">{t('analytics.noListings')}</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('new.headline')}</th>
                        <th>{t('dash.views.status')}</th>
                        <th>{t('new.price')}</th>
                        <th>{t('analytics.leads')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((p) => (
                        <tr key={p.id}>
                          <td><Link to={`/property/${p.id}`}>{p.title}</Link></td>
                          <td><span className="status-pill">{t(`status.${p.status}` as Parameters<typeof t>[0])}</span></td>
                          <td>{p.priceCents}</td>
                          <td>—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
