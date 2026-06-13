import { FormEvent, useEffect, useState } from 'react';
import { api, type User } from '../api';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useSEO } from '../seo';

export default function Profile() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useLang();
  const [form, setForm] = useState<Partial<User>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useSEO({
    title: 'Profile & Settings',
    description: 'Manage your Meridian profile, notifications, language, and account preferences.',
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
      </div>
    </main>
  );
}
