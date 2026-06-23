import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, assetUrl, formatPrice, type Property } from '../api';
import { useLang } from '../i18n';
import { useAuth } from '../auth';
import PropertyMap from '../components/PropertyMap';
import ShareButtons from '../components/ShareButtons';
import { useSEO } from '../seo';

export default function PropertyDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<Property | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [viewingSending, setViewingSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [agent, setAgent] = useState<{ id: number; firstName: string; lastName: string; role: string; phone: string | null } | null>(null);
  const [viewingWhen, setViewingWhen] = useState('');
  const [viewingNote, setViewingNote] = useState('');
  const [viewingSent, setViewingSent] = useState(false);
  const [viewingError, setViewingError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setP(null);
    setNotFound(false);
    setSent(false);
    setSaved(false);
    if (!id || !/^\d+$/.test(id)) { setNotFound(true); return; }
    api.get<{ property: Property }>(`/api/properties/${id}`)
      .then((d) => { if (!cancelled) setP(d.property); })
      .catch(() => { if (!cancelled) setNotFound(true); });
    if (user) {
      api.get<{ results: { id: number }[] }>('/api/favorites')
        .then((d) => { if (!cancelled) setSaved(d.results.some((f) => f.id === Number(id))); })
        .catch(() => { /* favorites are optional UI sugar */ });
    }
    return () => { cancelled = true; };
  }, [id, user]);

  useEffect(() => {
    if (!p) return;
    let cancelled = false;
    api.get<{ user: { id: number; firstName: string; lastName: string; role: string; phone: string | null } }>(`/api/users/${p.ownerId}`)
      .then((d) => { if (!cancelled) setAgent(d.user); })
      .catch(() => { /* agent info is optional */ });
    return () => { cancelled = true; };
  }, [p?.ownerId]);

  async function toggleSave() {
    if (!user) { navigate('/login'); return; }
    if (!p) return;
    try {
      if (saved) { await api.delete(`/api/favorites/${p.id}`); setSaved(false); }
      else { await api.post('/api/favorites', { propertyId: p.id }); setSaved(true); }
    } catch { /* leave state unchanged */ }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!p || !msg.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post('/api/messages', { recipientId: p.ownerId, propertyId: p.id, body: msg.trim() });
      setSent(true);
      setMsg('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSending(false);
    }
  }

  async function sendViewingRequest(e: FormEvent) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!p || viewingSending || viewingSent) return;
    const body = viewingNote.trim() || `I'd like to schedule a viewing${viewingWhen ? ` for ${viewingWhen}` : ''}.`;
    setViewingSending(true);
    setViewingError('');
    try {
      await api.post('/api/messages', { recipientId: p.ownerId, propertyId: p.id, body });
      setViewingSent(true);
      setViewingWhen('');
      setViewingNote('');
    } catch (err) {
      setViewingError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setViewingSending(false);
    }
  }

  const seoProperty = p;

  useSEO({
    title: seoProperty?.title,
    description: seoProperty ? {
      en: `${seoProperty.propertyType === 'villa' ? 'Luxury villa' : seoProperty.propertyType} for ${seoProperty.listingType} in ${seoProperty.city}, Dominican Republic. ${seoProperty.bedrooms} beds, ${seoProperty.bathrooms} baths${seoProperty.areaM2 ? `, ${seoProperty.areaM2} m²` : ''}. ${formatPrice(seoProperty.priceCents, seoProperty.currency, seoProperty.listingType, '/mo')}.`,
      es: `${seoProperty.propertyType === 'villa' ? 'Villa de lujo' : seoProperty.propertyType} en ${seoProperty.listingType === 'sale' ? 'venta' : 'alquiler'} en ${seoProperty.city}, República Dominicana. ${seoProperty.bedrooms} habitaciones, ${seoProperty.bathrooms} baños${seoProperty.areaM2 ? `, ${seoProperty.areaM2} m²` : ''}. ${formatPrice(seoProperty.priceCents, seoProperty.currency, seoProperty.listingType, '/mes')}.`,
    } : undefined,
    canonical: seoProperty ? `https://investwithmeridian.com/property/${seoProperty.id}` : undefined,
    jsonLd: seoProperty ? {
      '@context': 'https://schema.org',
      '@type': 'Residence',
      name: seoProperty.title,
      description: seoProperty.description,
      address: { '@type': 'PostalAddress', streetAddress: seoProperty.address, addressLocality: seoProperty.city, addressCountry: 'DO' },
      numberOfRooms: seoProperty.bedrooms,
      floorSize: seoProperty.areaM2 ? { '@type': 'QuantitativeValue', value: seoProperty.areaM2, unitCode: 'MTK' } : undefined,
      offers: {
        '@type': 'Offer',
        price: seoProperty.priceCents / 100,
        priceCurrency: seoProperty.currency,
        availability: 'https://schema.org/InStock',
      },
    } : undefined,
  });

  if (notFound) {
    return (
      <main className="section"><div className="container empty">
        <h1>{t('notfound.title')}</h1>
        <Link className="btn outline" to="/search">{t('nav.search')}</Link>
      </div></main>
    );
  }
  if (!p) return <main className="section"><div className="container empty">{t('common.loading')}</div></main>;

  const isOwner = user?.id === p.ownerId;
  const facts: Array<[string, string]> = [
    [t('detail.typeLabel'), t(`type.${p.propertyType}` as Parameters<typeof t>[0])],
    [t('detail.beds'), String(p.bedrooms)],
    [t('detail.baths'), String(p.bathrooms)],
  ];
  if (p.areaM2) facts.push([t('detail.area'), `${p.areaM2} m²`]);
  if (p.lotM2) facts.push([t('detail.lot'), `${p.lotM2} m²`]);
  if (p.yearBuilt) facts.push([t('detail.year'), String(p.yearBuilt)]);

  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">{p.city} · {p.listingType === 'sale' ? t('listing.forSale') : t('listing.forRent')}</p>
        <div className="row-between">
          <h1 style={{ marginBottom: 4 }}>{p.title}</h1>
          <span className="status-pill">{t(`status.${p.status}` as Parameters<typeof t>[0])}</span>
        </div>
        <p className="price" style={{ fontSize: '1.6rem' }}>
          {formatPrice(p.priceCents, p.currency, p.listingType, t('listing.perMonth'))}
        </p>

        <ShareButtons url={`https://investwithmeridian.com/property/${p.id}`} title={p.title} />

        {p.images.length > 0 && (
          <div className="gallery">
            {p.images.map((img) => {
              const src = assetUrl(img.url);
              return src ? <img key={img.id} src={src} alt={p.title} loading="lazy" /> : null;
            })}
          </div>
        )}

        <div className="detail-grid" style={{ marginTop: 28 }}>
          <div>
            <table className="table facts"><tbody>
              {facts.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
            </tbody></table>

            {p.description && <p style={{ whiteSpace: 'pre-line', marginTop: 22 }}>{p.description}</p>}

            {p.features.length > 0 && (
              <>
                <h2 style={{ marginTop: 26 }}>{t('detail.features')}</h2>
                <div>{p.features.map((f) => <span className="feature-chip" key={f}>{f}</span>)}</div>
              </>
            )}

            {p.virtualTourUrl && (
              <p style={{ marginTop: 18 }}>
                <a className="btn outline" href={p.virtualTourUrl} target="_blank" rel="noopener noreferrer">
                  {t('detail.tour')} ↗
                </a>
              </p>
            )}

            {/* ─── Google Maps location ─── */}
            {p.latitude && p.longitude && (
              <>
                <h2 style={{ marginTop: 26 }}>{t('detail.location')}</h2>
                <PropertyMap
                  lat={p.latitude}
                  lng={p.longitude}
                  title={p.title}
                />
              </>
            )}
          </div>

          <aside className="aside-card">
            <p className="meta">{p.address}, {p.city}</p>
            {agent && (
              <div style={{ padding: '14px 0', borderTop: '1px solid var(--surface-2)', borderBottom: '1px solid var(--surface-2)', marginBottom: 14 }}>
                <p className="meta" style={{ marginBottom: 4 }}>{t('detail.listingAgent')}</p>
                <strong>{agent.firstName} {agent.lastName}</strong>
                <div className="meta">{t(`role.${agent.role}` as Parameters<typeof t>[0])}{agent.phone ? ` · ${agent.phone}` : ''}</div>
              </div>
            )}
            <button className={`btn ${saved ? 'outline' : 'ghost'}`} style={{ width: '100%', marginBottom: 10 }} onClick={toggleSave}>
              {saved ? `✓ ${t('detail.saved')}` : `♡ ${t('detail.save')}`}
            </button>
            {!isOwner && (sent ? (
              <div className="alert ok">✓</div>
            ) : (
              <>
                <form onSubmit={sendMessage}>
                  <div className="field">
                    <label htmlFor="msg">{t('detail.contact')}</label>
                    <textarea id="msg" rows={4} maxLength={2000} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t('msg.placeholder')} required />
                  </div>
                  {error && <div className="alert error">{error}</div>}
                  <button className="btn gold" style={{ width: '100%' }} disabled={sending || !msg.trim()}>
                    {t('msg.send')}
                  </button>
                </form>
                <hr className="rule" />
                {viewingSent ? (
                  <div className="alert ok">{t('detail.viewingSent')}</div>
                ) : (
                  <form onSubmit={sendViewingRequest}>
                    <div className="field">
                      <label htmlFor="viewing-when">{t('detail.viewingWhen')}</label>
                      <input id="viewing-when" type="datetime-local" value={viewingWhen} onChange={(e) => setViewingWhen(e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="viewing-note">{t('detail.viewingNotes')}</label>
                      <textarea id="viewing-note" rows={3} maxLength={500} value={viewingNote} onChange={(e) => setViewingNote(e.target.value)} placeholder={t('detail.viewingPlaceholder')} />
                    </div>
                    {viewingError && <div className="alert error">{viewingError}</div>}
                    <button className="btn outline" style={{ width: '100%' }} disabled={viewingSending}>{t('detail.viewing')}</button>
                  </form>
                )}
              </>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
