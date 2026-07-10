import { Link } from 'react-router-dom';
import { assetUrl, formatPrice, type Property } from '../api';
import { useLang } from '../i18n';
import { propertyPath } from '../routes';
import { stripEmoji } from '../text';

export default function PropertyCard({ p }: { p: Pick<Property,
  'id' | 'title' | 'city' | 'priceCents' | 'currency' | 'listingType' | 'propertyType' | 'bedrooms' | 'bathrooms'> & { coverUrl?: string | null; areaM2?: number | null } }) {
  const { t } = useLang();
  const cover = assetUrl(p.coverUrl ?? null);
  return (
    <article className="card">
      <div className="thumb">
        {cover
          ? <img src={cover} alt={p.title} loading="lazy" />
          : <div className="noimg" aria-hidden="true">Meridian</div>}
        <span className="tag">{p.listingType === 'sale' ? t('listing.forSale') : t('listing.forRent')}</span>
        <div className="thumb-overlay">
          <div className="price">{formatPrice(p.priceCents, p.currency, p.listingType, t('listing.perMonth'))}</div>
          <div className="loc"><span className="pin" aria-hidden="true">⌖</span>{p.city}, Dominican Republic</div>
        </div>
      </div>
      <div className="body">
        <div className="title">{stripEmoji(p.title)}</div>
        <div className="stat-row">
          <div className="stat">
            <b>
              <svg className="g" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M5 10V6h14v4"/></svg>
              {p.bedrooms}
            </b>
            <span>{t('detail.beds')}</span>
          </div>
          <div className="stat">
            <b>
              <svg className="g" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM6 12V5a2 2 0 0 1 4 0"/></svg>
              {p.bathrooms}
            </b>
            <span>{t('detail.baths')}</span>
          </div>
          {p.areaM2 != null && p.areaM2 > 0 && (
            <div className="stat">
              <b>
                <svg className="g" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/></svg>
                {p.areaM2}
              </b>
              <span>m²</span>
            </div>
          )}
        </div>
      </div>
      <div className="card-rule" aria-hidden="true" />
      <Link to={propertyPath(p.id)} className="cover" aria-label={p.title} />
    </article>
  );
}
