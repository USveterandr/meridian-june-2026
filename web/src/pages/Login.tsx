import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { ApiError } from '../api';

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="auth-card">
        <h1>{t('login.title')}</h1>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">{t('login.email')}</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">{t('login.password')}</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn gold" style={{ width: '100%' }} disabled={busy}>
            {busy ? t('common.loading') : t('login.submit')}
          </button>
        </form>
        <p className="meta" style={{ marginTop: 18 }}>
          {t('login.noAccount')} <Link to="/signup">{t('login.create')}</Link>
        </p>
      </div>
    </main>
  );
}
