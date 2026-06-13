import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useLang } from '../i18n';
import { useSEO } from '../seo';

const PLAN_LABELS: Record<string, string> = {
  free: 'FREE Start',
  team: 'TEAM Essentials',
  professional: 'PROFESSIONAL Business',
  enterprise: 'ENTERPRISE Solutions',
};

const ALLOWED_BILLING = new Set(['monthly', 'annual']);

type CheckoutResponse = {
  success?: boolean;
  redirect?: string;
  paypal?: {
    amount: string;
    currency: string;
    description: string;
    planId: string;
    billing: string;
  };
  message?: string;
  error?: string;
};

export default function Checkout() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = params.get('plan') ?? 'free';
  const billing = ALLOWED_BILLING.has(params.get('billing') ?? '') ? (params.get('billing') as 'monthly' | 'annual') : 'monthly';
  const [data, setData] = useState<CheckoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useSEO({
    title: 'Checkout',
    description: 'Complete your Meridian subscription checkout.',
    canonical: 'https://investwithmeridian.com/checkout',
    noindex: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!PLAN_LABELS[planId]) {
      setError('Plan not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.post<CheckoutResponse>('/api/plans/checkout/paypal', { planId, billing })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          if (d.success && d.redirect) navigate(d.redirect, { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [planId, billing, navigate, t]);

  const planLabel = PLAN_LABELS[planId] ?? planId;
  const paypal = useMemo(() => data?.paypal ?? null, [data]);

  if (loading) return <main className="section"><div className="container empty">{t('common.loading')}</div></main>;

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1>{t('checkout.title')}</h1>
        <div className="aside-card">
          <p className="eyebrow">{t('checkout.selected')}</p>
          <h2>{planLabel}</h2>
          <p className="meta">{t('checkout.billing')}: {billing === 'annual' ? t('pricing.annual') : t('pricing.monthly')}</p>
          {paypal && (
            <p className="price" style={{ fontSize: '1.8rem', margin: '16px 0' }}>
              {paypal.currency === 'USD' ? '$' : paypal.currency}
              {Number(paypal.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          )}
          {error && <div className="alert error" role="alert">{error}</div>}
          {data?.message && <div className="alert ok">{data.message}</div>}
          {paypal ? (
            <div className="hero-ctas">
              <a className="btn gold" href={`mailto:billing@investwithmeridian.com?subject=${encodeURIComponent(`Meridian ${planLabel} checkout`)}`}>
                {t('checkout.pay')}
              </a>
              <Link className="btn outline" to="/pricing">{t('checkout.back')}</Link>
            </div>
          ) : (
            <div className="hero-ctas">
              <Link className="btn gold" to="/pricing">{t('checkout.choose')}</Link>
              <Link className="btn outline" to="/dashboard">{t('nav.dashboard')}</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
