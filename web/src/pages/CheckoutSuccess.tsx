import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useSEO } from '../seo';

export default function CheckoutSuccess() {
  const { lang } = useLang();
  const { refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Stripe passes ?session_id=...&plan=...
  const sessionId = params.get('session_id');
  const planId    = params.get('plan') ?? 'team';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useSEO({
    title: { en: 'Payment Successful', es: 'Pago Exitoso' },
    description: { en: 'Your Meridian subscription is now active.', es: 'Tu suscripción de Meridian ya está activa.' },
    canonical: 'https://investwithmeridian.com/checkout/success',
    noindex: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      try {
        // Activate via Stripe session (webhook may have already done this — activate is idempotent)
        await api.post('/api/plans/activate', {
          planId,
          billing: 'monthly',
          stripeSessionId: sessionId,
        });

        // Refresh subscription in auth context so dashboard shows correct plan
        await refreshSubscription();

        if (!cancelled) setStatus('success');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Something went wrong.');
        }
      }
    }

    activate();
    return () => { cancelled = true; };
  }, [planId, sessionId, refreshSubscription]);

  // Auto-redirect to dashboard after 4s on success
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 4000);
    return () => clearTimeout(t);
  }, [status, navigate]);

  const PLAN_LABELS: Record<string, { en: string; es: string }> = {
    free:         { en: 'FREE Start',           es: 'Inicio GRATIS' },
    team:         { en: 'TEAM Essentials',       es: 'Equipo Esencial' },
    professional: { en: 'PROFESSIONAL Business', es: 'Negocio PROFESIONAL' },
    enterprise:   { en: 'ENTERPRISE Solutions',  es: 'Soluciones EMPRESARIALES' },
  };
  const planLabel = PLAN_LABELS[planId]?.[lang] ?? planId;

  if (status === 'loading') {
    return (
      <main className="section">
        <div className="container empty" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: '2rem', marginBottom: 16 }}>⏳</p>
          <h2>{lang === 'es' ? 'Activando tu suscripción…' : 'Activating your subscription…'}</h2>
          <p className="lede" style={{ color: 'var(--text-dim)' }}>
            {lang === 'es' ? 'Espera un momento.' : 'Just a moment.'}
          </p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: 560, textAlign: 'center', padding: '80px 24px' }}>
          <p style={{ fontSize: '2rem', marginBottom: 16 }}>⚠️</p>
          <h2>{lang === 'es' ? 'Algo salió mal' : 'Something went wrong'}</h2>
          <p className="lede" style={{ color: 'var(--text-dim)', marginBottom: 24 }}>{message}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: 24 }}>
            {lang === 'es'
              ? 'Tu pago fue procesado. Contáctanos si el problema persiste.'
              : 'Your payment was processed. Contact us if this persists.'}
          </p>
          <div className="hero-ctas" style={{ justifyContent: 'center' }}>
            <a className="btn gold" href="mailto:billing@investwithmeridian.com">
              {lang === 'es' ? 'Contactar soporte' : 'Contact support'}
            </a>
            <Link className="btn outline" to="/dashboard">
              {lang === 'es' ? 'Ir al panel' : 'Go to dashboard'}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 580, textAlign: 'center', padding: '80px 24px' }}>
        <p style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</p>
        <h1 style={{ marginBottom: 8 }}>
          {lang === 'es' ? '¡Pago exitoso!' : 'Payment successful!'}
        </h1>
        <p className="lede" style={{ marginBottom: 8 }}>
          {lang === 'es'
            ? <>Tu plan <strong>{planLabel}</strong> ya está activo.</>
            : <>Your <strong>{planLabel}</strong> plan is now active.</>}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 32 }}>
          {lang === 'es'
            ? 'Serás redirigido al panel en unos segundos…'
            : 'Redirecting you to the dashboard in a few seconds…'}
        </p>
        <div className="hero-ctas" style={{ justifyContent: 'center' }}>
          <Link className="btn gold" to="/dashboard">
            {lang === 'es' ? 'Ir al panel ahora' : 'Go to dashboard now'}
          </Link>
          <Link className="btn outline" to="/pricing">
            {lang === 'es' ? 'Ver planes' : 'View plans'}
          </Link>
        </div>
      </div>
    </main>
  );
}
