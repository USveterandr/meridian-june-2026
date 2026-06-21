import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, assetUrl, type Property } from '../api';
import { ApiError } from '../api';
import { useLang } from '../i18n';
import TerritoryPicker from '../components/TerritoryPicker';

const TYPES = ['house', 'apartment', 'condo', 'villa', 'land', 'commercial'] as const;
const FEATURES = ['ac', 'pool', 'balcony', 'garden', 'oceanview', 'furnished', 'gated', 'washer', 'dishwasher', 'heating', 'fireplace'] as const;
// Land has no structure, so only outdoor/site characteristics apply.
const LAND_FEATURES: readonly (typeof FEATURES)[number][] = ['garden', 'oceanview', 'gated'];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export default function NewListing() {
  const { t, lang } = useLang();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    listingType: 'sale', propertyType: 'house', price: '', title: '', address: '', city: '',
    description: '', areaM2: '', lotM2: '', bedrooms: '0', bathrooms: '0', yearBuilt: '',
    extraFeatures: '', tourUrl: '',
  });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Property | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<'draft' | 'active' | 'pending' | 'sold' | 'rented' | 'inactive'>('draft');
  const { id: editId } = useParams();
  const editingId = editId && /^\d+$/.test(editId) ? Number(editId) : null;
  const fileRef = useRef<HTMLInputElement>(null);

  const isLand = form.propertyType === 'land';

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setPropertyType(v: string) {
    setForm((f) => ({
      ...f,
      propertyType: v,
      ...(v === 'land' ? { bedrooms: '0', bathrooms: '0', yearBuilt: '' } : {}),
    }));
    if (v === 'land') {
      setChecked((s) => new Set([...s].filter((k) => (LAND_FEATURES as readonly string[]).includes(k))));
    }
  }
  function toggleFeature(key: string) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    setLoadingExisting(true);
    api.get<{ property: Property }>(`/api/properties/${editingId}`)
      .then((d) => {
        if (cancelled) return;
        const p = d.property;
        setForm({
          listingType: p.listingType,
          propertyType: p.propertyType,
          price: String(Math.round(p.priceCents / 100)),
          title: p.title,
          address: p.address,
          city: p.city,
          description: p.description,
          areaM2: p.areaM2 === null ? '' : String(p.areaM2),
          lotM2: p.lotM2 === null ? '' : String(p.lotM2),
          bedrooms: String(p.bedrooms),
          bathrooms: String(p.bathrooms),
          yearBuilt: p.yearBuilt === null ? '' : String(p.yearBuilt),
          extraFeatures: '',
          tourUrl: p.virtualTourUrl ?? '',
        });
        setChecked(new Set(p.features));
        setExistingStatus(p.status as 'draft' | 'active' | 'pending' | 'sold' | 'rented' | 'inactive');
      })
      .catch(() => setError(t('common.error')))
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [editingId, t]);

  function buildPayload(status: 'active' | 'draft') {
    const featureLabels = [...checked].map((k) => {
      const featureKey = FEATURES.find((key) => key === k);
      return featureKey ? t(`feat.${featureKey}` as Parameters<typeof t>[0]) : k;
    });
    const extra = form.extraFeatures.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30 - featureLabels.length);
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      propertyType: form.propertyType,
      listingType: form.listingType,
      priceCents: Math.round(Number(form.price) * 100),
      currency: 'USD',
      address: form.address.trim(),
      city: form.city.trim(),
      country: 'DO',
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      areaM2: form.areaM2 ? Number(form.areaM2) : null,
      lotM2: form.lotM2 ? Number(form.lotM2) : null,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
      features: [...featureLabels, ...extra],
      virtualTourUrl: form.tourUrl.trim() || null,
      status: editingId ? existingStatus : status,
    };
  }

  async function submit(status: 'active' | 'draft') {
    if (busy) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      const payload = buildPayload(status);
      const d = editingId
        ? await api.patch<{ property: Property }>(`/api/properties/${editingId}`, payload)
        : await api.post<{ property: Property }>('/api/properties', payload);
      setCreated(d.property);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          setFields(err.fields);
          const f = Object.keys(err.fields)[0] ?? '';
          setError(`${err.message} — ${f}: ${err.fields[f]}`);
          // Jump back to the step containing the first invalid field.
          if (['title', 'price', 'priceCents', 'address', 'city', 'listingType', 'propertyType'].includes(f)) setStep(1);
          else if (['description', 'areaM2', 'lotM2', 'bedrooms', 'bathrooms', 'yearBuilt'].includes(f)) setStep(2);
          else setStep(3);
          // Scroll the offending field into view once the step has rendered.
          const elId: Record<string, string> = {
            title: 'title', price: 'price', priceCents: 'price', address: 'address',
            listingType: 'lt', propertyType: 'pt', description: 'desc', areaM2: 'area',
            lotM2: 'lot', bedrooms: 'beds', bathrooms: 'baths', yearBuilt: 'year', virtualTourUrl: 'tour',
          };
          const targetId = elId[f];
          if (targetId) {
            setTimeout(() => {
              document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              document.getElementById(targetId)?.focus();
            }, 0);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError(t('common.error'));
      }
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit('active');
  }

  async function uploadFiles(files: FileList | null) {
    if (!created || !files || files.length === 0 || uploading) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files).slice(0, 20)) {
        if (!ALLOWED_MIME.includes(file.type)) {
          setError(lang === 'es' ? `Formato no admitido: ${file.name}` : `Unsupported format: ${file.name}`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(lang === 'es' ? `Archivo demasiado grande (máx. 8 MB): ${file.name}` : `File too large (max 8 MB): ${file.name}`);
          continue;
        }
        const d = await api.upload<{ image: { id: number; url: string; position: number } }>(
          `/api/properties/${created.id}/images`, file
        );
        setCreated((c) => c ? { ...c, images: [...c.images, d.image] } : c);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeImage(imageId: number) {
    if (!created) return;
    try {
      await api.delete(`/api/properties/${created.id}/images/${imageId}`);
      setCreated((c) => c ? { ...c, images: c.images.filter((i) => i.id !== imageId) } : c);
    } catch { /* keep image in UI */ }
  }

  if (created) {
    return (
      <main className="section"><div className="container" style={{ maxWidth: 760 }}>
        <h1>{t('new.photos')}</h1>
        <div className="alert ok">{editingId ? t('new.updated') : t('new.created')}</div>
        <div className="field">
          <label htmlFor="photos">{t('new.upload')}</label>
          <input
            id="photos" ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void uploadFiles(e.target.files)} disabled={uploading}
          />
          <p className="meta">{t('new.photosHint')}</p>
        </div>
        {uploading && <p className="meta">{t('common.loading')}</p>}
        {error && <div className="alert error">{error}</div>}
        {created.images.length > 0 && (
          <div className="gallery">
            {created.images.map((img) => {
              const src = assetUrl(img.url);
              return (
                <div className="imgwrap" key={img.id}>
                  {src && <img src={src} alt="" />}
                  <button className="btn small danger" type="button" onClick={() => void removeImage(img.id)} aria-label={t('dash.delete')}>×</button>
                </div>
              );
            })}
          </div>
        )}
        <div className="hero-ctas">
          <Link className="btn gold" to={`/property/${created.id}`}>{t('new.view')}</Link>
          <Link className="btn outline" to="/dashboard">{t('nav.dashboard')}</Link>
        </div>
      </div></main>
    );
  }

  const stepLabels = [t('new.step1'), t('new.step2'), t('new.step3')];

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1>{editingId ? t('new.editTitle') : t('new.title')}</h1>
        {loadingExisting && <p className="empty">{t('common.loading')}</p>}
        {!loadingExisting && (
          <>
        <div className="steps" aria-hidden="true">
          {stepLabels.map((label, i) => <span key={label} className={step === i + 1 ? 'on' : ''}>{i + 1} · {label}</span>)}
        </div>

        <form onSubmit={onSubmit} noValidate>
          {step === 1 && (
            <>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="lt">{t('new.listingType')}</label>
                  <select id="lt" value={form.listingType} onChange={(e) => set('listingType', e.target.value)}>
                    <option value="sale">{t('search.buy')}</option>
                    <option value="rent">{t('search.rent')}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pt">{t('new.propertyType')}</label>
                  <select id="pt" value={form.propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    {TYPES.map((ty) => <option key={ty} value={ty}>{t(`type.${ty}` as Parameters<typeof t>[0])}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="price">{t('new.price')}</label>
                <input id="price" type="number" min={1} step={1} required value={form.price} onChange={(e) => set('price', e.target.value)} />
                {form.listingType === 'rent' && <p className="meta">{t('new.priceRentHint')}</p>}
                {(fields.price || fields.priceCents) && <p className="err">{fields.price ?? fields.priceCents}</p>}
              </div>
              <div className="field">
                <label htmlFor="title">{t('new.headline')}</label>
                <input id="title" required minLength={5} maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} />
                {fields.title && <p className="err">{fields.title}</p>}
              </div>
              <div className="field">
                <label htmlFor="address">{t('new.address')}</label>
                <input id="address" required minLength={3} maxLength={200} value={form.address} onChange={(e) => set('address', e.target.value)} />
                {fields.address && <p className="err">{fields.address}</p>}
              </div>
              <TerritoryPicker
                defaultMunicipality={form.city}
                onSelect={({ municipality, town }) => set('city', town ? `${town}, ${municipality}` : municipality)}
              />
              {fields.city && <p className="err">{fields.city}</p>}
            </>
          )}

          {step === 2 && (
            <>
              {!isLand && (
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="beds">{t('new.beds')}</label>
                    <input id="beds" type="number" min={0} max={50} value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="baths">{t('new.baths')}</label>
                    <input id="baths" type="number" min={0} max={50} step={0.5} value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="field">
                  <label htmlFor="area">{t('new.sqm')}</label>
                  <input id="area" type="number" min={1} value={form.areaM2} onChange={(e) => set('areaM2', e.target.value)} />
                  {fields.areaM2 && <p className="err">{fields.areaM2}</p>}
                </div>
                <div className="field">
                  <label htmlFor="lot">{t('new.lot')}</label>
                  <input id="lot" type="number" min={1} value={form.lotM2} onChange={(e) => set('lotM2', e.target.value)} />
                  {fields.lotM2 && <p className="err">{fields.lotM2}</p>}
                </div>
              </div>
              {!isLand && (
                <div className="field">
                  <label htmlFor="year">{t('new.year')}</label>
                  <input id="year" type="number" min={1800} max={2100} value={form.yearBuilt} onChange={(e) => set('yearBuilt', e.target.value)} />
                  {fields.yearBuilt && <p className="err">{fields.yearBuilt}</p>}
                </div>
              )}
              <div className="field">
                <label htmlFor="desc">{t('new.description')}</label>
                <textarea
                  id="desc" rows={6} maxLength={5000} value={form.description}
                  onChange={(e) => set('description', e.target.value.slice(0, 5000))}
                  aria-invalid={Boolean(fields.description)}
                />
                <p className="meta" style={form.description.length >= 5000 ? { color: '#e08980' } : undefined}>
                  {form.description.length} / 5000
                </p>
                {fields.description && <p className="err">{fields.description}</p>}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="field">
                <label>{t('detail.features')} — {t('new.featuresHint')}</label>
                <div className="checkgrid">
                  {(isLand ? LAND_FEATURES : FEATURES).map((f) => (
                    <label key={f}>
                      <input type="checkbox" checked={checked.has(f)} onChange={() => toggleFeature(f)} />
                      {t(`feat.${f}` as Parameters<typeof t>[0])}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="extra">{t('new.extraFeatures')}</label>
                <input id="extra" maxLength={400} value={form.extraFeatures} onChange={(e) => set('extraFeatures', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="tour">{t('new.tourUrl')}</label>
                <input id="tour" type="url" placeholder="https://…" maxLength={500} value={form.tourUrl} onChange={(e) => set('tourUrl', e.target.value)} />
                {fields.virtualTourUrl && <p className="err">{fields.virtualTourUrl}</p>}
              </div>
            </>
          )}

          {error && <div className="alert error" role="alert">{error}</div>}

          <div className="hero-ctas">
            {step > 1 && <button type="button" className="btn outline" onClick={() => setStep(step - 1)}>← {t('common.back')}</button>}
            {step < 3 && <button type="button" className="btn ghost" onClick={() => setStep(step + 1)}>{t('common.next')} →</button>}
            {step === 3 && (
              <>
                <button type="button" className="btn outline" disabled={busy} onClick={() => void submit('draft')}>{t('new.draft')}</button>
                <button type="submit" className="btn gold" disabled={busy}>{busy ? t('common.loading') : t('new.publish')}</button>
              </>
            )}
          </div>
        </form>
        </>
        )}
      </div>
    </main>
  );
}
