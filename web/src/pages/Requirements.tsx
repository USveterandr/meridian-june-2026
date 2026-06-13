import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type Property } from '../api';
import { ApiError } from '../api';
import { useLang } from '../i18n';
import PropertyCard from '../components/PropertyCard';

type Requirement = {
  id: number; title: string; listingType: 'sale' | 'rent'; propertyType: string | null;
  city: string | null; maxPriceCents: number | null; minBedrooms: number; minBathrooms: number;
  notes: string; createdAt: string;
};
type Match = Pick<Property, 'id' | 'title' | 'city' | 'priceCents' | 'currency' | 'listingType' | 'propertyType' | 'bedrooms' | 'bathrooms'> & { coverUrl?: string | null };

const TYPES = ['house', 'apartment', 'condo', 'villa', 'land', 'commercial'] as const;

export default function Requirements() {
  const { t } = useLang();
  const [items, setItems] = useState<Requirement[] | null>(null);
  const [matches, setMatches] = useState<Record<number, Match[]>>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', listingType: 'sale', propertyType: '', city: '', budget: '', minBeds: '0', notes: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<{ results: Requirement[] }>('/api/requirements')
      .then((d) => setItems(d.results))
      .catch(() => setError(t('common.error')));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      await api.post('/api/requirements', {
        title: form.title.trim(),
        listingType: form.listingType,
        propertyType: form.propertyType || null,
        city: form.city.trim() || null,
        maxPriceCents: form.budget && Number(form.budget) > 0 ? Math.round(Number(form.budget) * 100) : null,
        minBedrooms: Number(form.minBeds) || 0,
        notes: form.notes.trim(),
      });
      setForm({ title: '', listingType: 'sale', propertyType: '', city: '', budget: '', minBeds: '0', notes: '' });
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function viewMatches(id: number) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (!matches[id]) {
      try {
        const d = await api.get<{ results: Match[] }>(`/api/requirements/${id}/matches`);
        setMatches((m) => ({ ...m, [id]: d.results }));
      } catch { setError(t('common.error')); }
    }
  }

  async function remove(id: number) {
    try {
      await api.delete(`/api/requirements/${id}`);
      if (openId === id) setOpenId(null);
      load();
    } catch { setError(t('common.error')); }
  }

  return (
    <main className="section">
      <div className="container">
        <h1>{t('req.title')}</h1>
        <p className="lede">{t('req.lede')}</p>

        <form onSubmit={submit} noValidate style={{ maxWidth: 760 }}>
          <div className="field">
            <label htmlFor="rt">{t('new.headline')}</label>
            <input id="rt" required minLength={3} maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} />
            {fields.title && <p className="err">{fields.title}</p>}
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="rlt">{t('new.listingType')}</label>
              <select id="rlt" value={form.listingType} onChange={(e) => set('listingType', e.target.value)}>
                <option value="sale">{t('search.buy')}</option>
                <option value="rent">{t('search.rent')}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="rpt">{t('new.propertyType')}</label>
              <select id="rpt" value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
                <option value="">{t('search.anyType')}</option>
                {TYPES.map((ty) => <option key={ty} value={ty}>{t(`type.${ty}` as Parameters<typeof t>[0])}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="rcity">{t('new.city')}</label>
              <input id="rcity" maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} />
              {fields.city && <p className="err">{fields.city}</p>}
            </div>
            <div className="field">
              <label htmlFor="rbudget">{t('req.budget')}</label>
              <input id="rbudget" type="number" min={0} step={1} value={form.budget} onChange={(e) => set('budget', e.target.value)} />
              {fields.maxPriceCents && <p className="err">{fields.maxPriceCents}</p>}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="rbeds">{t('req.minBeds')}</label>
              <select id="rbeds" value={form.minBeds} onChange={(e) => set('minBeds', e.target.value)}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rnotes">{t('req.notes')}</label>
              <input id="rnotes" maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn gold" disabled={busy}>{busy ? t('common.loading') : t('req.submit')}</button>
        </form>

        <h2 style={{ marginTop: 40 }}>{t('dash.requirements')}</h2>
        {items === null && <p className="empty">{t('common.loading')}</p>}
        {items !== null && items.length === 0 && <p className="empty">{t('req.none')}</p>}
        {items !== null && items.map((r) => (
          <div key={r.id} className="aside-card" style={{ position: 'static', marginBottom: 14 }}>
            <div className="row-between">
              <div>
                <strong>{r.title}</strong>
                <div className="meta">
                  {r.listingType === 'sale' ? t('search.buy') : t('search.rent')}
                  {r.propertyType ? ` · ${t(`type.${r.propertyType}` as Parameters<typeof t>[0])}` : ''}
                  {r.city ? ` · ${r.city}` : ''}
                  {r.maxPriceCents ? ` · ≤ $${Math.round(r.maxPriceCents / 100).toLocaleString()}` : ''}
                  {r.minBedrooms > 0 ? ` · ${r.minBedrooms}+ ${t('search.beds').toLowerCase()}` : ''}
                </div>
              </div>
              <div className="hero-ctas" style={{ marginTop: 0 }}>
                <button className="btn small outline" onClick={() => void viewMatches(r.id)}>{t('req.viewMatches')}</button>
                <button className="btn small danger" onClick={() => void remove(r.id)}>{t('req.delete')}</button>
              </div>
            </div>
            {openId === r.id && (
              matches[r.id]
                ? (matches[r.id].length === 0
                    ? <p className="empty">{t('search.none')}</p>
                    : (
                      <>
                        <p className="meta" style={{ marginTop: 14 }}>{matches[r.id].length} {t('req.matches')}</p>
                        <div className="cards" style={{ marginTop: 10 }}>
                          {matches[r.id].map((m) => <PropertyCard key={m.id} p={m} />)}
                        </div>
                      </>
                    ))
                : <p className="meta" style={{ marginTop: 14 }}>{t('common.loading')}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
