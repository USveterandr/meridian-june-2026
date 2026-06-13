import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { useSEO } from '../seo';
import {
  PLAN_ICON as ICON, PLAN_HIGHLIGHT as HIGHLIGHT,
  planName, planTagline, featureLabel, type ApiPlan as Plan,
} from '../planCatalog';

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [myPlan, setMyPlan] = useState<string>('free');
  const [notice, setNotice] = useState('');
  const { user } = useAuth();
  const { lang, t } = useLang();
  const navigate = useNavigate();

  useSEO({
    title: 'Pricing Plans',
    description: 'Choose from Explorer (free), Professional, Brokerage, Enterprise, or Investor plans. Simple, transparent pricing for Dominican Republic real estate.',
    canonical: 'https://investwithmeridian.com/pricing',
  });

  useEffect(() => {
    api.get<{ plans: Plan[] }>('/api/plans')
      .then((d) => setPlans(d.plans))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<{ plan: string }>('/api/plans/my')
      .then((d) => setMyPlan(d.plan))
      .catch(() => {});
  }, [user]);

  async function handleSelect(planId: string) {
    if (!user) { navigate('/signup'); return; }
    if (planId === 'enterprise') {
      window.location.href = 'mailto:enterprise@investwithmeridian.com?subject=Enterprise+Plan+Inquiry';
      return;
    }
    // Free plan activates immediately; paid plans start a 30-day trial
    // (no card required — payment processing is wired in later).
    setActivating(planId);
    setNotice('');
    try {
      const d = await api.post<{ trial?: boolean }>('/api/plans/activate', { planId, billing });
      setMyPlan(planId);
      window.dispatchEvent(new Event('meridian:plan-selected'));
      if (d.trial) {
        setNotice(lang === 'es'
          ? '✨ ¡Tu prueba gratuita de 30 días ha comenzado! No se requiere tarjeta.'
          : '✨ Your 30-day free trial has started! No card required.');
      }
    } catch { /* error alert handled below */ }
    finally { setActivating(null); }
  }

  const price = (p: Plan) => billing === 'annual' ? p.priceAnnual : p.priceMonthly;

  return (
    <main>
      <section className="pricing-hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="eyebrow">{t('pricing.eyebrow')}</p>
          <h1>{t('pricing.title')}</h1>
          <p className="lede" style={{ color: 'var(--text-dim)', maxWidth: '50ch', margin: '0 auto 32px' }}>
            {t('pricing.lede')}
          </p>

          {/* Billing toggle */}
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
              id="billing-monthly"
            >
              {t('pricing.monthly')}
            </button>
            <button
              className={billing === 'annual' ? 'active' : ''}
              onClick={() => setBilling('annual')}
              id="billing-annual"
            >
              {t('pricing.annual')}
              <span className="save-badge">{t('pricing.save')}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {notice && <div className="alert ok" role="status" style={{ maxWidth: 560, margin: '0 auto 24px' }}>{notice}</div>}
          {loading ? (
            <div className="loading-shimmer-grid">
              {[1,2,3,4,5].map(i => <div key={i} className="plan-card-shimmer" />)}
            </div>
          ) : (
            <div className="plans-grid">
              {plans.map((plan) => {
                const isHighlighted = HIGHLIGHT[plan.id];
                const isCurrent = myPlan === plan.id;
                const isEnterprise = plan.id === 'enterprise';
                const p = price(plan);

                return (
                  <div
                    key={plan.id}
                    className={`plan-card ${isHighlighted ? 'plan-highlighted' : ''} ${isCurrent ? 'plan-current' : ''}`}
                    id={`plan-${plan.id}`}
                  >
                    {isHighlighted && <span className="plan-badge">{t('pricing.popular')}</span>}
                    {isCurrent && <span className="plan-badge plan-badge-current">{t('pricing.current')}</span>}

                    <div className="plan-icon">{ICON[plan.id] ?? '⭐'}</div>
                    <h3 className="plan-name">{planName(plan, lang)}</h3>
                    <p className="plan-desc">{planTagline(plan, lang)}</p>

                    <div className="plan-price">
                      {isEnterprise ? (
                        <span className="price-contact">{t('pricing.contactSales')}</span>
                      ) : p === 0 ? (
                        <>
                          <span className="price-amount">{t('pricing.freeLabel')}</span>
                          {plan.commissionPct > 0 && (
                            <span className="price-note">+ {plan.commissionPct}% {t('pricing.onSale')}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="price-amount">${p.toFixed(0)}</span>
                          <span className="price-period">{t('pricing.perMonth')}{billing === 'annual' ? t('pricing.billedAnnually') : ''}</span>
                        </>
                      )}
                    </div>

                    {plan.trialDays > 0 && !isCurrent && !isEnterprise && (
                      <p className="trial-note">
                        ✨ {lang === 'es' ? `${plan.trialDays} días de prueba gratis` : `${plan.trialDays}-day free trial`}
                      </p>
                    )}

                    <button
                      id={`plan-cta-${plan.id}`}
                      className={`btn ${isHighlighted ? 'gold' : 'outline'} plan-cta`}
                      onClick={() => handleSelect(plan.id)}
                      disabled={isCurrent || activating === plan.id}
                    >
                      {isCurrent ? t('pricing.current') :
                       activating === plan.id ? t('pricing.processing') :
                       isEnterprise ? t('pricing.contactSales') :
                       p === 0 ? t('pricing.getFree') :
                       plan.trialDays > 0
                         ? (lang === 'es' ? `Iniciar Prueba de ${plan.trialDays} Días` : `Start ${plan.trialDays}-Day Trial`)
                         : t('pricing.choose')}
                    </button>

                    <ul className="plan-features" aria-label={`${planName(plan, lang)} features`}>
                      {plan.features.map((f) => (
                        <li key={f}>
                          <span className="feature-check" aria-hidden="true">✓</span>
                          {featureLabel(f, lang)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Addons / Media Packages ─────────────────────────────────────────── */}
      <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p className="eyebrow">{t('pricing.addons.eyebrow')}</p>
            <h2>{t('pricing.addons.title')}</h2>
            <p className="lede" style={{ color: 'var(--text-dim)', maxWidth: '48ch', margin: '0 auto' }}>
              {t('pricing.addons.lede')}
            </p>
          </div>

          <div className="addons-grid">
            {ADDONS.map((a) => (
              <div key={a.id} className="addon-card">
                <div className="addon-icon">{a.icon}</div>
                <h3>{a.name[lang]}</h3>
                <div className="addon-price">${a.price.toLocaleString()}<span>{t('pricing.addons.per')}</span></div>
                <p className="plan-desc">{a.tagline[lang]}</p>
                <ul className="plan-features">
                  {a.features[lang].map((f) => <li key={f}><span className="feature-check">✓</span>{f}</li>)}
                </ul>
                <a
                  href={`mailto:media@investwithmeridian.com?subject=${encodeURIComponent(a.name.en + ' Package Inquiry')}`}
                  className="btn outline plan-cta"
                  id={`addon-${a.id}`}
                >
                  {t('pricing.addons.order')}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ teaser ───────────────────────────────────────────────────────── */}
      <section className="section"><div className="container"><div className="cta-panel">
        <h2>{t('pricing.faq.title')}</h2>
        <p className="lede">{t('pricing.faq.lede')}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn gold" href="mailto:hello@investwithmeridian.com" id="pricing-contact-btn">
            {t('pricing.faq.contact')}
          </a>
          <Link className="btn outline" to="/search" id="pricing-browse-btn">{t('pricing.faq.browse')}</Link>
        </div>
      </div></div></section>
    </main>
  );
}

const ADDONS = [
  {
    id: 'essential-exposure',
    icon: '📸',
    price: 399,
    name: { en: 'Essential Exposure', es: 'Exposición Esencial' },
    tagline: {
      en: 'Perfect for apartments and condos. Professional photos that convert browsers to buyers.',
      es: 'Perfecto para apartamentos y condominios. Fotos profesionales que convierten visitantes en compradores.',
    },
    features: {
      en: [
        '25 professionally edited photos',
        '90-second HD video tour',
        '5 drone aerial photos',
        'SEO optimization of listing',
      ],
      es: [
        '25 fotos editadas profesionalmente',
        'Video tour HD de 90 segundos',
        '5 fotos aéreas con dron',
        'Optimización SEO del listado',
      ],
    },
  },
  {
    id: 'premium-presentation',
    icon: '🎬',
    price: 899,
    name: { en: 'Premium Presentation', es: 'Presentación Premium' },
    tagline: {
      en: 'For villas and luxury homes. Cinematic quality that commands attention.',
      es: 'Para villas y casas de lujo. Calidad cinematográfica que exige atención.',
    },
    features: {
      en: [
        '50 advanced edited photos',
        '3-minute cinematic video',
        '15 drone aerial photos',
        'Virtual staging (2 rooms)',
        'Priority listing placement',
      ],
      es: [
        '50 fotos con edición avanzada',
        'Video cinematográfico de 3 minutos',
        '15 fotos aéreas con dron',
        'Staging virtual (2 habitaciones)',
        'Posicionamiento prioritario del listado',
      ],
    },
  },
  {
    id: 'maximum-exposure',
    icon: '🌍',
    price: 1999,
    name: { en: 'Maximum Exposure', es: 'Exposición Máxima' },
    tagline: {
      en: 'For estate properties and new developments. Global luxury portal distribution.',
      es: 'Para propiedades exclusivas y nuevos desarrollos. Distribución global en portales de lujo.',
    },
    features: {
      en: [
        '75+ magazine-style photos',
        '5-minute cinematic video',
        '30 drone aerial photos',
        '360° virtual tour',
        'Global luxury portal distribution',
        'Dedicated marketing campaign',
        'Monthly performance report',
      ],
      es: [
        '75+ fotos estilo revista',
        'Video cinematográfico de 5 minutos',
        '30 fotos aéreas con dron',
        'Tour virtual 360°',
        'Distribución global en portales de lujo',
        'Campaña de marketing dedicada',
        'Informe de rendimiento mensual',
      ],
    },
  },
] as const;
