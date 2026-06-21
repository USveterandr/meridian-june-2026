import { FormEvent, useEffect, useState } from 'react';
import { api, type User } from '../api';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useSEO } from '../seo';

export default function Profile() {
  const { user, loading, refreshSubscription } = useAuth();
  const { t, lang, setLang } = useLang();
  const [form, setForm] = useState<Partial<User>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cedula, setCedula] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useSEO({
    title: { en: 'Profile & Settings', es: 'Perfil y Configuración' },
    description: {
      en: 'Manage your Meridian profile, notifications, language, and account preferences.',
      es: 'Gestiona tu perfil de Meridian, notificaciones, idioma y preferencias de cuenta.',
    },
    canonical: 'https://investwithmeridian.com/profile',
    noindex: true,
  });

  useEffect(() => {
    if (user) setForm(user);
  }, [user]);

  if (loading) return <main className="section"><div className="container empty">{t('common.loading')}</div></main>;
  if (!user) return null;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setFields({});
    try {
      const d = await api.patch<{ user: User }>('/api/auth/me', {
        firstName: form.firstName?.trim(),
        lastName: form.lastName?.trim(),
        phone: form.phone === '' ? null : form.phone,
        locale: lang,
        notifyMatches: form.notifyMatches,
        notifyMessages: form.notifyMessages,
      });
      setForm(d.user);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function verifyCedula(e: FormEvent) {
    e.preventDefault();
    if (verifying) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const d = await api.post<{ valid: boolean }>('/api/verify/cedula', { cedula });
      if (d.valid) {
        await refreshSubscription();
        setCedula('');
      } else {
        setVerifyError(t('profile.cedulaInvalid'));
      }
    } catch {
      setVerifyError(t('common.error'));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1>{t('profile.title')}</h1>
        <div className="aside-card">
          <p className="eyebrow">{user.role}</p>
          <h2>{user.email}</h2>
          {saved && <div className="alert ok">{t('profile.saved')}</div>}
          {error && <div className="alert error" role="alert">{error}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="form-row">
              <div className="field">
                <label htmlFor="first">{t('signup.first')}</label>
                <input id="first" required value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} />
                {fields.firstName && <p className="err">{fields.firstName}</p>}
              </div>
              <div className="field">
                <label htmlFor="last">{t('signup.last')}</label>
                <input id="last" required value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} />
                {fields.lastName && <p className="err">{fields.lastName}</p>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="phone">{t('profile.phone')}</label>
              <input id="phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              {fields.phone && <p className="err">{fields.phone}</p>}
            </div>
            <div className="field">
              <label htmlFor="locale">{t('profile.locale')}</label>
              <select id="locale" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es')}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className="checkgrid">
              <label>
                <input type="checkbox" checked={Boolean(form.notifyMatches)} onChange={(e) => set('notifyMatches', e.target.checked)} />
                {t('profile.notifyMatches')}
              </label>
              <label>
                <input type="checkbox" checked={Boolean(form.notifyMessages)} onChange={(e) => set('notifyMessages', e.target.checked)} />
                {t('profile.notifyMessages')}
              </label>
            </div>
            <button className="btn gold" disabled={saving}>{saving ? t('common.loading') : t('profile.save')}</button>
          </form>
        </div>

        <div className="aside-card">
          <h2>{t('profile.cedulaTitle')}</h2>
          {user.cedulaVerified ? (
            <div className="alert ok">{t('profile.cedulaVerified')}</div>
          ) : (
            <>
              <p className="meta">{t('profile.cedulaHint')}</p>
              <form onSubmit={verifyCedula} noValidate>
                <div className="field">
                  <label htmlFor="cedula">{t('profile.cedulaLabel')}</label>
                  <input
                    id="cedula" required pattern="\d{11}" maxLength={11} placeholder="00112345678"
                    value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                {verifyError && <div className="alert error" role="alert">{verifyError}</div>}
                <button className="btn outline" disabled={verifying || cedula.length !== 11}>
                  {verifying ? t('common.loading') : t('profile.cedulaVerify')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
