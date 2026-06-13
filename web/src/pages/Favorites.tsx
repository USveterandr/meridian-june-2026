import { useEffect, useState } from 'react';
import { api, type Property } from '../api';
import { useLang } from '../i18n';
import PropertyCard from '../components/PropertyCard';

type Fav = Pick<Property, 'id' | 'title' | 'city' | 'priceCents' | 'currency' | 'listingType' | 'propertyType' | 'bedrooms' | 'bathrooms'> & { coverUrl?: string | null };

export default function Favorites() {
  const { t } = useLang();
  const [items, setItems] = useState<Fav[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<{ results: Fav[] }>('/api/favorites')
      .then((d) => { if (!cancelled) setItems(d.results); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="section">
      <div className="container">
        <h1>{t('fav.title')}</h1>
        {error && <div className="alert error">{t('common.error')}</div>}
        {items === null && !error && <p className="empty">{t('common.loading')}</p>}
        {items !== null && items.length === 0 && <p className="empty">{t('fav.none')}</p>}
        {items !== null && items.length > 0 && (
          <div className="cards">
            {items.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </main>
  );
}
