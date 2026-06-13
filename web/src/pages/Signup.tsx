import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLang } from '../i18n';
import { ApiError } from '../api';
import PlanPicker from '../components/PlanPicker';

const ROLES = ['buyer', 'renter', 'investor', 'seller', 'agent', 'landlord', 'broker', 'lawyer', 'notary'] as const;
const ROLE_KEY: Record<(typeof ROLES)[number], string> = {
  buyer: 'role.buyer', renter: 'role.renter', investor: 'role.investor', seller: 'role.seller', agent: 'role.agent',
  landlord: 'role.landlord', broker: 'role.broker', lawyer: 'role.lawyer', notary: 'role.notary',
};

// Seller property type options
const SELLER_TYPES = [
  { value: 'house', en: 'House', es: 'Casa' },
  { value: 'apartment', en: 'Apartment', es: 'Apartamento' },
  { value: 'villa', en: 'Villa', es: 'Villa' },
  { value: 'land', en: 'Land / Lot', es: 'Terreno / Solar' },
  { value: 'commercial', en: 'Commercial space', es: 'Local comercial' },
  { value: 'other', en: 'Other', es: 'Otro' },
] as const;

// Investor property type options
const INVESTOR_PROPERTY_TYPES = [
  { value: 'residential', en: 'Residential (buy/flip)', es: 'Residencial (compra/venta)' },
  { value: 'rental', en: 'Rental (buy & hold)', es: 'Alquiler (compra y renta)' },
  { value: 'commercial', en: 'Commercial', es: 'Comercial' },
  { value: 'land', en: 'Land / Development', es: 'Terreno / Desarrollo' },
  { value: 'mixed', en: 'Mixed use', es: 'Uso mixto' },
] as const;

// Investor budget ranges
const INVESTOR_BUDGETS = [
  { value: '100k_300k', en: '$100K – $300K', es: '$100K – $300K' },
  { value: '300k_600k', en: '$300K – $600K', es: '$300K – $600K' },
  { value: '600k_1m', en: '$600K – $1M', es: '$600K – $1M' },
  { value: '1m_5m', en: '$1M – $5M', es: '$1M – $5M' },
  { value: '5m_plus', en: '$5M+', es: '$5M+' },
] as const;

export default function Signup() {
  const { user, register } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '', role: 'buyer', terms: false,
  });
  // Conditional fields
  const [sellerType, setSellerType] = useState('house');
  const [investorPropertyType, setInvestorPropertyType] = useState('residential');
  const [investorBudget, setInvestorBudget] = useState('300k_600k');

  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [planId, setPlanId] = useState<string | null>(null);

  if (user) return <Navigate to="/dashboard" replace />;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validateStep1(): boolean {
    const fe: Record<string, string> = {};
    if (form.password !== form.confirm) fe.confirm = lang === 'es' ? 'Las contraseñas no coinciden.' : 'Passwords do not match.';
    if (!form.terms) fe.terms = lang === 'es' ? 'Debes aceptar los términos.' : 'You must accept the terms.';
    setFields(fe);
    return Object.keys(fe).length === 0;
  }

  function onNext(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (validateStep1()) setStep(2);
  }

  // Build role-specific metadata to pass along with registration
  function buildRoleMeta(): Record<string, string> {
    if (form.role === 'seller') return { sellerType };
    if (form.role === 'investor') return { investorPropertyType, investorBudget };
    return {};
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!planId) {
      setError(lang === 'es' ? 'Selecciona un plan para continuar.' : 'Please select a plan to continue.');
      return;
    }
    setBusy(true);
    try {
      await register({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), password: form.password, role: form.role, locale: lang,
        planId,
        ...buildRoleMeta(),
      });
      navigate('/signup/success', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) { setFields(err.fields); setStep(1); }
      } else {
        setError(t('common.error'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (step === 2) {
    return (
      <main className="container">
        <div className="auth-card" style={{ maxWidth: 720 }}>
          <div className="steps" aria-hidden="true">
            <span>1 · {lang === 'es' ? 'Cuenta' : 'Account'}</span>
            <span className="on">2 · {lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}</span>
          </div>
          <h1>{lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}</h1>
          <p className="lede" style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
            {lang === 'es'
              ? 'Todos los planes de pago incluyen 30 días de prueba gratis — sin tarjeta de crédito.'
              : 'All paid plans include a 30-day free trial — no credit card required.'}
          </p>
          <form onSubmit={onSubmit} noValidate>
            <PlanPicker selected={planId} onSelect={setPlanId} />
            {error && <div className="alert error" role="alert" style={{ marginTop: 16 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="button" className="btn outline" onClick={() => setStep(1)} id="signup-back-btn">
                {t('common.back')}
              </button>
              <button className="btn gold" style={{ flex: 1 }} disabled={busy || !planId} id="signup-submit-btn">
                {busy ? t('common.loading') : t('signup.submit')}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="steps" aria-hidden="true">
          <span className="on">1 · {lang === 'es' ? 'Cuenta' : 'Account'}</span>
          <span>2 · {lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}</span>
        </div>
        <h1>{t('signup.title')}</h1>
        <form onSubmit={onNext} noValidate>
          <div className="form-row">
            <div className="field">
              <label htmlFor="first">{t('signup.first')}</label>
              <input id="first" autoComplete="given-name" required maxLength={60} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              {fields.firstName && <p className="err">{fields.firstName}</p>}
            </div>
            <div className="field">
              <label htmlFor="last">{t('signup.last')}</label>
              <input id="last" autoComplete="family-name" required maxLength={60} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              {fields.lastName && <p className="err">{fields.lastName}</p>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">{t('login.email')}</label>
            <input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
            {fields.email && <p className="err">{fields.email}</p>}
          </div>
          <div className="field">
            <label htmlFor="role">{t('signup.role')}</label>
            <select id="role" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{t(ROLE_KEY[r] as Parameters<typeof t>[0])}</option>)}
            </select>
          </div>

          {/* ── Conditional: Seller questions ── */}
          {form.role === 'seller' && (
            <div className="field" style={{ background: 'var(--surface-2,rgba(255,255,255,0.04))', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <label htmlFor="sellerType" style={{ fontWeight: 600 }}>
                {lang === 'es' ? '¿Qué deseas vender?' : 'What do you want to sell?'}
              </label>
              <select id="sellerType" value={sellerType} onChange={(e) => setSellerType(e.target.value)}>
                {SELLER_TYPES.map(({ value, en, es }) => (
                  <option key={value} value={value}>{lang === 'es' ? es : en}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Conditional: Investor questions ── */}
          {form.role === 'investor' && (
            <div style={{ background: 'var(--surface-2,rgba(255,255,255,0.04))', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="investorType" style={{ fontWeight: 600 }}>
                  {lang === 'es' ? '¿Qué tipo de inversión buscas?' : 'What type of investment?'}
                </label>
                <select id="investorType" value={investorPropertyType} onChange={(e) => setInvestorPropertyType(e.target.value)}>
                  {INVESTOR_PROPERTY_TYPES.map(({ value, en, es }) => (
                    <option key={value} value={value}>{lang === 'es' ? es : en}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="investorBudget" style={{ fontWeight: 600 }}>
                  {lang === 'es' ? '¿Cuál es tu presupuesto?' : 'What is your budget?'}
                </label>
                <select id="investorBudget" value={investorBudget} onChange={(e) => setInvestorBudget(e.target.value)}>
                  {INVESTOR_BUDGETS.map(({ value, en, es }) => (
                    <option key={value} value={value}>{lang === 'es' ? es : en}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="field">
              <label htmlFor="password">{t('login.password')}</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={(e) => set('password', e.target.value)} />
              {fields.password && <p className="err">{fields.password}</p>}
            </div>
            <div className="field">
              <label htmlFor="confirm">{t('signup.confirm')}</label>
              <input id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
              {fields.confirm && <p className="err">{fields.confirm}</p>}
            </div>
          </div>
          <div className="field">
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} style={{ marginTop: 3 }} />
              <span>{t('signup.terms')}</span>
            </label>
            {fields.terms && <p className="err">{fields.terms}</p>}
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn gold" style={{ width: '100%' }} id="signup-next-btn">
            {t('common.next')} →
          </button>
        </form>
        <p className="meta" style={{ marginTop: 18 }}>
          {t('signup.have')} <Link to="/login">{t('nav.login')}</Link>
        </p>
      </div>
    </main>
  );
}
