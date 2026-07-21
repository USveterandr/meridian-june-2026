import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useLang } from '../i18n';
import { useSEO } from '../seo';

interface CampaignStatus {
  limit: number;
  claimed: number;
  remaining: number;
  deadline: string;
  open: boolean;
}

interface ClaimResponse {
  ok: boolean;
  spot?: number;
  remaining?: number;
  alreadyClaimed?: boolean;
  closed?: boolean;
}

const COPY = {
  en: {
    eyebrow: 'Founding Agents — Limited Offer',
    h1a: 'List free for a year.',
    h1b: 'Keep 100% of your commission.',
    lede:
      'Meridian is the bilingual home for Dominican Republic real estate. The first 100 agents and brokers get our Pro plan — unlimited listings, 0% platform commission, and a Verified badge — free for 12 months. No card required.',
    spotsLeft: 'spots left of',
    deadline: 'Offer ends',
    closedTitle: 'The founding-100 is full',
    closedBody: 'All 100 founding spots are claimed. Join the waitlist and we\'ll tell you the moment a spot opens or a new cohort starts.',
    perks: [
      ['Unlimited listings', 'Post every property you represent — no per-listing fees, no cap.'],
      ['0% platform commission', 'We never take a cut of your sale. What you close is yours.'],
      ['Verified badge', 'A trust mark that turns browsers into leads on every listing.'],
      ['Bilingual reach', 'Your listings shown to EN + ES buyers, locally and abroad.'],
    ],
    formTitle: 'Claim your founding spot',
    name: 'Full name',
    email: 'Email',
    phone: 'Phone / WhatsApp (optional)',
    agency: 'Agency / brokerage (optional)',
    submit: 'Claim my free year',
    submitting: 'Reserving…',
    successTitle: "You're in — spot #",
    successBody:
      "Your Pro plan is reserved free for 12 months. Create your account with this email to start listing, and we'll apply your founding benefits.",
    createAccount: 'Create my account',
    alreadyTitle: 'You already claimed spot #',
    alreadyBody: 'You\'re already a founding agent. Sign in to start listing.',
    signIn: 'Sign in',
    error: 'Something went wrong — please try again.',
    fine: 'Free Pro for 12 months for the first 100 verified agents/brokers who claim before the deadline. Reverts to standard Pro pricing after 12 months; cancel anytime.',
    teamEyebrow: 'Leadership',
    teamTitle: 'Who you\'re building with',
    team: [
      {
        name: 'Isaac Trinidad',
        role: 'CEO & Founder',
        photo: '/team/isaac-trinidad.jpg',
        bio: 'Isaac Trinidad has spent 20 years building a career in Dominican Republic real estate, closing major commercial, land, and residential deals across the country. He entered the market in 2005 and, in 2012, built one of the DR’s first online real estate advisory platforms — the direct predecessor to Meridian — to help investors find and close opportunities most agents never see, from hotel and resort land to apartment complexes and mineral-rich territory.\n\nBefore real estate, Isaac served in the U.S. Navy (1996–2000) aboard the amphibious assault ship USS Saipan (LHA-2), where he served as Commissioner of the Hispanic Heritage Committee. After the September 11 attacks, he returned to active duty with the U.S. Air Force Reserve as a Military Police officer, serving with the 459th Security Forces Squadron at Andrews Air Force Base and as a Federal Police Officer with the U.S. Army at Fort Sill.\n\nHe holds a Bachelor’s degree in Business Administration with a concentration in Management from Grand Canyon University (Phoenix, AZ) and an Associate of Applied Science in Business Administration from Kaplan University.',
      },
      {
        name: 'Starlyn Trinidad Garcia',
        role: 'Project Manager',
        photo: null,
        bio: '',
      },
      {
        name: 'Yoy Gonzalez',
        role: 'Backend Fullstack Developer',
        photo: null,
        bio: '',
      },
    ],
  },
  es: {
    eyebrow: 'Agentes Fundadores — Oferta Limitada',
    h1a: 'Publica gratis por un año.',
    h1b: 'Quédate con el 100% de tu comisión.',
    lede:
      'Meridian es el hogar bilingüe de los bienes raíces en República Dominicana. Los primeros 100 agentes y corredores obtienen nuestro plan Pro — listados ilimitados, 0% de comisión de plataforma y una insignia Verificado — gratis por 12 meses. Sin tarjeta.',
    spotsLeft: 'cupos disponibles de',
    deadline: 'La oferta termina',
    closedTitle: 'Los 100 fundadores están completos',
    closedBody: 'Los 100 cupos fundadores fueron reclamados. Únete a la lista y te avisaremos apenas se abra un cupo o comience una nueva ronda.',
    perks: [
      ['Listados ilimitados', 'Publica cada propiedad que representas — sin tarifas por listado, sin límite.'],
      ['0% de comisión', 'Nunca tomamos parte de tu venta. Lo que cierras es tuyo.'],
      ['Insignia Verificado', 'Un sello de confianza que convierte curiosos en prospectos.'],
      ['Alcance bilingüe', 'Tus listados ante compradores EN + ES, local y en el exterior.'],
    ],
    formTitle: 'Reclama tu cupo fundador',
    name: 'Nombre completo',
    email: 'Correo',
    phone: 'Teléfono / WhatsApp (opcional)',
    agency: 'Agencia / corredora (opcional)',
    submit: 'Reclamar mi año gratis',
    submitting: 'Reservando…',
    successTitle: 'Listo — cupo #',
    successBody:
      'Tu plan Pro está reservado gratis por 12 meses. Crea tu cuenta con este correo para empezar a publicar y aplicaremos tus beneficios de fundador.',
    createAccount: 'Crear mi cuenta',
    alreadyTitle: 'Ya reclamaste el cupo #',
    alreadyBody: 'Ya eres agente fundador. Inicia sesión para publicar.',
    signIn: 'Iniciar sesión',
    error: 'Algo salió mal — intenta de nuevo.',
    fine: 'Pro gratis por 12 meses para los primeros 100 agentes/corredores verificados que reclamen antes de la fecha límite. Cambia a precio Pro estándar después de 12 meses; cancela cuando quieras.',
    teamEyebrow: 'Liderazgo',
    teamTitle: 'Con quién estás construyendo',
    team: [
      {
        name: 'Isaac Trinidad',
        role: 'CEO y Fundador',
        photo: '/team/isaac-trinidad.jpg',
        bio: 'Isaac Trinidad lleva 20 años construyendo una carrera en el sector inmobiliario de República Dominicana, cerrando grandes transacciones comerciales, de terrenos y residenciales en todo el país. Entró al mercado en 2005 y, en 2012, creó una de las primeras plataformas de asesoría inmobiliaria en línea de la RD — la predecesora directa de Meridian — para ayudar a inversionistas a encontrar y cerrar oportunidades que la mayoría de los agentes nunca ven, desde terrenos para hoteles y resorts hasta complejos de apartamentos y territorios ricos en minerales.\n\nAntes de bienes raíces, Isaac sirvió en la Marina de los Estados Unidos (1996–2000) a bordo del buque de asalto anfibio USS Saipan (LHA-2), donde fue Comisionado del Comité de la Herencia Hispana. Después de los ataques del 11 de septiembre, regresó al servicio activo con la Reserva de la Fuerza Aérea de EE.UU. como Policía Militar, sirviendo con el 459th Security Forces Squadron en la Base Andrews y como Oficial de Policía Federal con el Ejército de EE.UU. en Fort Sill.\n\nTiene una Licenciatura en Administración de Empresas con mención en Gerencia de Grand Canyon University (Phoenix, AZ) y un Grado Asociado en Administración de Empresas de Kaplan University.',
      },
      {
        name: 'Starlyn Trinidad Garcia',
        role: 'Gerente de Proyectos',
        photo: null,
        bio: '',
      },
      {
        name: 'Yoy Gonzalez',
        role: 'Desarrollador Backend Fullstack',
        photo: null,
        bio: '',
      },
    ],
  },
} as const;

export default function Agents() {
  const { lang } = useLang();
  const c = COPY[lang];

  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', agency: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const [error, setError] = useState('');

  useSEO({
    title: {
      en: 'Founding Agents — Free Pro for 12 Months | Meridian',
      es: 'Agentes Fundadores — Pro Gratis por 12 Meses | Meridian',
    },
    description: {
      en: 'The first 100 Dominican Republic agents and brokers list free for a year on Meridian — unlimited listings, 0% commission, Verified badge. Claim your spot.',
      es: 'Los primeros 100 agentes y corredores de RD publican gratis por un año en Meridian — listados ilimitados, 0% comisión, insignia Verificado. Reclama tu cupo.',
    },
    canonical: 'https://investwithmeridian.com/agents',
  });

  useEffect(() => {
    let cancelled = false;
    api.get<CampaignStatus>('/api/agents/status')
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { /* form still works; server re-checks on submit */ });
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || state === 'loading') return;
    setState('loading');
    setError('');
    try {
      const res = await api.post<ClaimResponse>('/api/agents/claim', {
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        agency: form.agency.trim() || undefined,
        lang,
      });
      setResult(res);
      setState('done');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409)) {
        setResult({ ok: false, closed: true });
        setState('done');
      } else {
        setError(err instanceof ApiError ? err.message : c.error);
        setState('error');
      }
    }
  }

  const deadlineStr = status
    ? new Date(status.deadline).toLocaleDateString(lang === 'es' ? 'es-DO' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const closed = status ? !status.open : false;

  const field = (key: keyof typeof form, label: string, type = 'text', required = false) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</span>
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : 'off'}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }}
      />
    </label>
  );

  return (
    <main>
      {/* Hero */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="container" style={{ maxWidth: 820, textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>{c.eyebrow}</p>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', lineHeight: 1.15, marginBottom: 18 }}>
            {c.h1a} <span className="gold">{c.h1b}</span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 24 }}>{c.lede}</p>
          {status && !closed && (
            <div style={{ display: 'inline-flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: '14px 22px', border: '1px solid var(--gold)', borderRadius: 8 }}>
              <strong style={{ color: 'var(--gold)', fontSize: '1.4rem' }}>
                {status.remaining} <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-dim)' }}>{c.spotsLeft} {status.limit}</span>
              </strong>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>· {c.deadline} {deadlineStr}</span>
            </div>
          )}
        </div>
      </section>

      {/* Perks */}
      <section className="section">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="city-grid">
            {c.perks.map(([title, body]) => (
              <div key={title} style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 10 }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>{title}</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.92rem', lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership / team */}
      <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p className="eyebrow">{c.teamEyebrow}</p>
            <h2>{c.teamTitle}</h2>
          </div>
          <div style={{ display: 'grid', gap: 28 }}>
            {c.team.map((member) => (
              <div
                key={member.name}
                style={{
                  display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
                  padding: 20, border: '1px solid var(--border)', borderRadius: 10,
                }}
              >
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={member.name}
                    width={96}
                    height={96}
                    loading="lazy"
                    style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 96, height: 96, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', fontWeight: 600, color: 'var(--gold)',
                    }}
                  >
                    {member.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div style={{ flex: '1 1 320px' }}>
                  <h3 style={{ marginBottom: 2 }}>{member.name}</h3>
                  <p style={{ color: 'var(--gold)', fontSize: '0.88rem', marginBottom: member.bio ? 10 : 0 }}>{member.role}</p>
                  {member.bio.split('\n\n').map((para, i) => (
                    <p key={i} style={{ color: 'var(--text-dim)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 10 }}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Claim / result */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="container" style={{ maxWidth: 520 }}>
          {state === 'done' && result?.ok && !result.alreadyClaimed && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: 12 }}>{c.successTitle}{result.spot}</h2>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>{c.successBody}</p>
              <Link className="btn gold" to={`/signup?email=${encodeURIComponent(form.email.trim())}&role=agent`}>{c.createAccount}</Link>
            </div>
          )}

          {state === 'done' && result?.alreadyClaimed && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: 12 }}>{c.alreadyTitle}{result.spot}</h2>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>{c.alreadyBody}</p>
              <Link className="btn gold" to="/login">{c.signIn}</Link>
            </div>
          )}

          {((state === 'done' && result?.closed) || (closed && state !== 'done')) && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: 12 }}>{c.closedTitle}</h2>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>{c.closedBody}</p>
            </div>
          )}

          {!closed && !(state === 'done' && result?.ok) && (
            <>
              <h2 style={{ textAlign: 'center', marginBottom: 20 }}>{c.formTitle}</h2>
              <form onSubmit={onSubmit}>
                {field('name', c.name)}
                {field('email', c.email, 'email', true)}
                {field('phone', c.phone, 'tel')}
                {field('agency', c.agency)}
                {error && <p style={{ color: '#e88', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}
                <button className="btn gold" type="submit" disabled={state === 'loading'} style={{ width: '100%' }}>
                  {state === 'loading' ? c.submitting : c.submit}
                </button>
              </form>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', lineHeight: 1.5, marginTop: 16 }}>{c.fine}</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
