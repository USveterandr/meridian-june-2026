import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useLang } from '../i18n';
import { useSEO } from '../seo';

const PLAN_LABELS: Record<string, { en: string; es: string }> = {
  free:         { en: 'FREE Start',            es: 'Inicio GRATIS' },
  team:         { en: 'TEAM Essentials',        es: 'Equipo Esencial' },
  professional: { en: 'PROFESSIONAL Business',  es: 'Negocio PROFESIONAL' },
  enterprise:   { en: 'ENTERPRISE Solutions',   es: 'Soluciones EMPRESARIALES' },
};

const ALLOWED_BILLING = new Set(['monthly', 'annual']);

type StripeResponse = { success: false; stripeUrl: string; sessionId: string };
type FreeResponse   = { success: true;  redirect: string };
type ErrorResponse  = { error: string };

export default function Checkout() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId  = params.get('plan') ?? 'free';
  const billing = ALLOWED_BILLING.has(params.get('billing') ?? '')
    ? (params.get('billing') as 'monthly' | 'annual')
    : 'monthly';

  const [stripeUrl, setStripeUrl] = useState<string | null>(null); // set if Stripe redirect fails
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useSEO({
    title: { en: 'Checkout', es: 'Pago' },
    description: {
      en: 'Complete your Meridian subscription checkout.',
      es: 'Completa el pago de tu suscripción de Meridian.',
    },
    canonical: 'https://investwithmeridian.com/checkout',
    noindex: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!PLAN_LABELS[planId]) {
      setError(lang === 'es' ? 'Plan no encontrado.' : 'Plan not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    api.post<StripeResponse | FreeResponse | ErrorResponse>(
      '/api/plans/checkout/stripe',
      { planId, billing }
    )
      .then((d) => {
        if (cancelled) return;
        if ('error' in d) {
          setError(d.error);
          return;
        }
        if (d.success && 'redirect' in d) {
          // Free plan — redirected directly
          navigate(d.redirect, { replace: true });
          return;
        }
        if (!d.success && 'stripeUrl' in d) {
          // Show button as fallback if auto-redirect is blocked
          setStripeUrl(d.stripeUrl);
          window.location.href = d.stripeUrl;
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [planId, billing, navigate, t, lang]);

  const planLabel = PLAN_LABELS[planId]?.[lang] ?? planId;

  if (loading) {
    return (
      <main className="section">
        <div className="container empty">
          <p>{lang === 'es' ? 'Preparando tu pago seguro…' : 'Preparing your secure checkout…'}</p>
        </div>
      </main>
    );
  }

  // Should only show if Stripe isn't configured or an error occurred
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1>{t('checkout.title')}</h1>
        <div className="aside-card">
          <p className="eyebrow">{t('checkout.selected')}</p>
          <h2>{planLabel}</h2>
          <p className="meta">{t('checkout.billing')}: {billing === 'annual' ? t('pricing.annual') : t('pricing.monthly')}</p>

          {error && (
            <div className="alert error" role="alert" style={{ marginTop: 16 }}>
              {error}
              <p style={{ marginTop: 8, fontSize: '0.9rem' }}>
                {lang === 'es'
                  ? <>¿Necesitas ayuda? Escríbenos a <a href="mailto:billing@investwithmeridian.com">billing@investwithmeridian.com</a></>
                  : <>Need help? Email us at <a href="mailto:billing@investwithmeridian.com">billing@investwithmeridian.com</a></>
                }
              </p>
            </div>
          )}

          {stripeUrl ? (
            <div className="hero-ctas" style={{ marginTop: 20 }}>
              <a className="btn gold" href={stripeUrl}>{t('checkout.pay')}</a>
              <Link className="btn outline" to="/pricing">{t('checkout.back')}</Link>
            </div>
          ) : (
            <div className="hero-ctas" style={{ marginTop: 20 }}>
              <Link className="btn gold" to="/pricing">{t('checkout.back')}</Link>
              <Link className="btn outline" to="/dashboard">{t('nav.dashboard')}</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
