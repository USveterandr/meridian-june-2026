import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';

// ── Structured data for SEO ──────────────────────────────────────────────────
const LD_JSON = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Meridian Private Clients',
  description:
    'Invitation-led access to verified Dominican Republic luxury real estate for family offices and ultra-high-net-worth investors. CONFOTUR guidance, off-market inventory, bilingual advisory.',
  url: 'https://investwithmeridian.com/private-clients',
};

// ── Bilingual copy (local to this page) ──────────────────────────────────────
const COPY = {
  en: {
    eyebrow: 'Private Clients',
    title: 'The private gateway to Dominican Republic luxury real estate',
    sub: 'For family offices and investors allocating serious capital to the Caribbean’s leading market.',
    stats: [
      { n: '$4.8B', l: 'Foreign direct investment into DR real estate (2025)' },
      { n: '8–10%', l: 'Projected annual growth of the DR luxury segment' },
      { n: '7%+', l: 'Gross rental yields; 8–10% in prime zones' },
      { n: '15 yrs', l: 'CONFOTUR income & property tax exemption' },
    ],
    whyTitle: 'Why sophisticated capital chooses the DR',
    why: [
      { icon: '\u{1F3DB}️', t: 'CONFOTUR: 15 years, zero property tax', p: 'Law 158-01 exempts approved projects from income tax and property tax (IPI) for 15 years, and waives the 3% transfer tax. Our advisory desk screens every eligible listing.' },
      { icon: '\u{1F6E1}️', t: 'Full foreign ownership, guaranteed repatriation', p: 'Foreign buyers hold identical property rights to citizens. Law 16-95 guarantees repatriation of capital and profits in freely convertible currency.' },
      { icon: '\u{1F6C2}', t: 'Residency fast-track', p: 'A property investment of US$200,000+ fast-tracks Dominican residency — lifestyle and planning optionality for you and your family.' },
      { icon: '⚓', t: 'The company your capital keeps', p: 'Casa de Campo, Cap Cana, Puntacana Resort, Tropicalia: the world’s most sophisticated real estate families already anchor this market.' },
    ],
    offerTitle: 'What Private Clients receive',
    offer: [
      { icon: '\u{1F48E}', t: 'Off-market access', p: 'Invitation-only inventory and discreet, NDA-gated data rooms for qualified opportunities.' },
      { icon: '\u{1F464}', t: 'Dedicated bilingual advisor', p: 'One point of contact from first call to notarized closing, in English or Spanish.' },
      { icon: '⚖️', t: 'Verification & legal desk', p: 'Title-checked listings, CONFOTUR eligibility screening, and introductions to vetted lawyers and notaries.' },
      { icon: '\u{1F4CA}', t: 'Portfolio-grade analytics', p: 'Yield, appreciation and tax-exemption data per property — built for family offices, not house hunters.' },
    ],
    discretion: 'Discretion by default: anonymized inquiries, private favoriting, and human support.',
    ctaTitle: 'Access is by introduction',
    ctaLede: 'Tell us who you are and what you’re building. A senior advisor responds within one business day.',
    ctaBtn: 'Request an introduction',
    ctaBrowse: 'Browse verified listings',
  },
  es: {
    eyebrow: 'Clientes Privados',
    title: 'La puerta privada al real estate de lujo en República Dominicana',
    sub: 'Para family offices e inversionistas que asignan capital serio al mercado líder del Caribe.',
    stats: [
      { n: '$4.8B', l: 'Inversión extranjera directa en bienes raíces (2025)' },
      { n: '8–10%', l: 'Crecimiento anual proyectado del segmento de lujo' },
      { n: '7%+', l: 'Rendimientos brutos de alquiler; 8–10% en zonas prime' },
      { n: '15 años', l: 'Exención CONFOTUR de impuesto sobre la renta e IPI' },
    ],
    whyTitle: 'Por qué el capital sofisticado elige RD',
    why: [
      { icon: '\u{1F3DB}️', t: 'CONFOTUR: 15 años sin impuesto a la propiedad', p: 'La Ley 158-01 exime a proyectos aprobados del impuesto sobre la renta y del IPI por 15 años, y elimina el 3% de transferencia. Nuestro equipo verifica cada propiedad elegible.' },
      { icon: '\u{1F6E1}️', t: 'Propiedad extranjera plena y repatriación garantizada', p: 'Los compradores extranjeros tienen los mismos derechos que los ciudadanos. La Ley 16-95 garantiza la repatriación de capital y beneficios en divisa convertible.' },
      { icon: '\u{1F6C2}', t: 'Residencia por inversión', p: 'Una inversión inmobiliaria de US$200,000+ agiliza la residencia dominicana — opcionalidad de estilo de vida y planificación para su familia.' },
      { icon: '⚓', t: 'La compañía que su capital mantiene', p: 'Casa de Campo, Cap Cana, Puntacana Resort, Tropicalia: las familias inmobiliarias más sofisticadas del mundo ya anclan este mercado.' },
    ],
    offerTitle: 'Qué reciben los Clientes Privados',
    offer: [
      { icon: '\u{1F48E}', t: 'Acceso off-market', p: 'Inventario solo por invitación y data rooms discretos bajo NDA para oportunidades calificadas.' },
      { icon: '\u{1F464}', t: 'Asesor bilingüe dedicado', p: 'Un solo punto de contacto desde la primera llamada hasta el cierre notarial, en inglés o español.' },
      { icon: '⚖️', t: 'Verificación y equipo legal', p: 'Títulos verificados, revisión de elegibilidad CONFOTUR e introducciones a abogados y notarios examinados.' },
      { icon: '\u{1F4CA}', t: 'Analítica de nivel portafolio', p: 'Datos de rendimiento, apreciación y exenciones por propiedad — diseñado para family offices, no para cazadores de casas.' },
    ],
    discretion: 'Discreción por defecto: consultas anonimizadas, favoritos privados y soporte humano.',
    ctaTitle: 'El acceso es por introducción',
    ctaLede: 'Cuéntenos quién es y qué está construyendo. Un asesor senior responde en un día hábil.',
    ctaBtn: 'Solicitar una introducción',
    ctaBrowse: 'Ver propiedades verificadas',
  },
} as const;

export default function PrivateClients() {
  const { lang } = useLang();
  const c = COPY[lang];

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'private-clients-jsonld';
    script.textContent = JSON.stringify(LD_JSON);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <main id="main">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="contact-hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 style={{ maxWidth: '24ch', margin: '0 auto' }}>{c.title}</h1>
          <p className="lede" style={{ color: 'var(--text-dim)', maxWidth: '58ch', margin: '16px auto 0' }}>
            {c.sub}
          </p>
        </div>
      </section>

      {/* ── Market stats ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="specialties-grid">
            {c.stats.map((s) => (
              <div key={s.n} className="specialty-card" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '2rem', color: 'var(--gold-bright, var(--gold))' }}>{s.n}</h3>
                <p>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why the DR ───────────────────────────────────────────────────── */}
      <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2>{c.whyTitle}</h2>
          </div>
          <div className="specialties-grid">
            {c.why.map((w) => (
              <div key={w.t} className="specialty-card">
                <span className="specialty-icon" aria-hidden="true">{w.icon}</span>
                <h3>{w.t}</h3>
                <p>{w.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The offer ────────────────────────────────────────────────────── */}
      <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2>{c.offerTitle}</h2>
          </div>
          <div className="specialties-grid">
            {c.offer.map((o) => (
              <div key={o.t} className="specialty-card">
                <span className="specialty-icon" aria-hidden="true">{o.icon}</span>
                <h3>{o.t}</h3>
                <p>{o.p}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 28, fontStyle: 'italic' }}>
            {c.discretion}
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <h2>{c.ctaTitle}</h2>
            <p className="lede">{c.ctaLede}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn gold" to="/contact" id="pc-cta-contact">{c.ctaBtn}</Link>
              <Link className="btn outline" to="/search" id="pc-cta-search">{c.ctaBrowse}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
