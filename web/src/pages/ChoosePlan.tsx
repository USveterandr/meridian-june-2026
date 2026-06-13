import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useLang } from '../i18n';
import PlanPicker from '../components/PlanPicker';

/**
 * Mandatory plan selection for signed-in users who have no subscription
 * (accounts created before the plan-gate existed). Layout redirects here.
 */
export default function ChoosePlan() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [planId, setPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (!planId || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/plans/activate', { planId, billing: 'monthly' });
      window.dispatchEvent(new Event('meridian:plan-selected'));
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="auth-card" style={{ maxWidth: 720 }}>
        <h1>{lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}</h1>
        <p className="lede" style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
          {lang === 'es'
            ? 'Para continuar, selecciona un plan de suscripción. Todos los planes de pago incluyen 30 días de prueba gratis — sin tarjeta de crédito.'
            : 'To continue, select a subscription plan. All paid plans include a 30-day free trial — no credit card required.'}
        </p>
        <PlanPicker selected={planId} onSelect={setPlanId} />
        {error && <div className="alert error" role="alert" style={{ marginTop: 16 }}>{error}</div>}
        <button
          className="btn gold"
          style={{ width: '100%', marginTop: 20 }}
          disabled={!planId || busy}
          onClick={confirm}
          id="choose-plan-confirm"
        >
          {busy ? t('common.loading') : (lang === 'es' ? 'Confirmar plan' : 'Confirm plan')}
        </button>
      </div>
    </main>
  );
}
