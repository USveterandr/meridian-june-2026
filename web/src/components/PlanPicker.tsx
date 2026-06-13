import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';
import { PLAN_ICON, PLAN_HIGHLIGHT, planName, featureLabel, type ApiPlan } from '../planCatalog';

/**
 * Compact plan selection cards. Used in the signup flow (mandatory step)
 * and the /choose-plan gate for existing users without a subscription.
 */
export default function PlanPicker({ selected, onSelect }: {
  selected: string | null;
  onSelect: (planId: string) => void;
}) {
  const { lang } = useLang();
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ plans: ApiPlan[] }>('/api/plans')
      .then((d) => setPlans(d.plans))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-shimmer-grid">
        {[1, 2, 3, 4].map((i) => <div key={i} className="plan-card-shimmer" style={{ height: 220 }} />)}
      </div>
    );
  }

  return (
    <div className="plan-picker" role="radiogroup" aria-label={lang === 'es' ? 'Planes de suscripción' : 'Subscription plans'}>
      {plans.map((p) => {
        const isSelected = selected === p.id;
        const isEnterprise = p.id === 'enterprise';
        const paid = p.priceMonthly > 0;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            id={`pick-plan-${p.id}`}
            className={`plan-pick ${isSelected ? 'selected' : ''} ${PLAN_HIGHLIGHT[p.id] ? 'popular' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            {PLAN_HIGHLIGHT[p.id] && (
              <span className="plan-pick-badge">{lang === 'es' ? 'Más Popular' : 'Most Popular'}</span>
            )}
            <span className="plan-pick-icon" aria-hidden="true">{PLAN_ICON[p.id] ?? '⭐'}</span>
            <span className="plan-pick-name">{planName(p, lang)}</span>
            <span className="plan-pick-price">
              {isEnterprise
                ? (lang === 'es' ? 'Precio personalizado' : 'Custom pricing')
                : paid
                  ? <>${p.priceMonthly.toFixed(0)}<small>/{lang === 'es' ? 'mes' : 'mo'}</small></>
                  : (lang === 'es' ? 'Gratis' : 'Free')}
            </span>
            {!isEnterprise && p.commissionPct > 0 && (
              <span className="plan-pick-note">+ {p.commissionPct}% {lang === 'es' ? 'sobre venta exitosa' : 'on successful sale'}</span>
            )}
            {!isEnterprise && paid && p.trialDays > 0 && (
              <span className="plan-pick-note gold">
                ✨ {p.trialDays} {lang === 'es' ? 'días de prueba gratis — sin tarjeta' : 'days free trial — no card required'}
              </span>
            )}
            {isEnterprise && (
              <span className="plan-pick-note">{lang === 'es' ? 'Nuestro equipo te contactará' : 'Our team will contact you'}</span>
            )}
            <ul className="plan-pick-features">
              {p.features.slice(0, 4).map((f) => (
                <li key={f}><span className="feature-check" aria-hidden="true">✓</span>{featureLabel(f, lang)}</li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
