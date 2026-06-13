import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';

// ── micro-structured data for SEO ────────────────────────────────────────────
const LD_JSON = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Meridian',
  description:
    'Connect with the Meridian real estate team. Reach an expert for luxury property listings, investment portfolio advice, and legal guidance in the Dominican Republic.',
  url: 'https://investwithmeridian.com/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'Meridian Real Estate',
    url: 'https://investwithmeridian.com',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'info@investwithmeridian.com',
        contactType: 'customer support',
        availableLanguage: ['English', 'Spanish'],
      },
      {
        '@type': 'ContactPoint',
        telephone: '+1-470-708-9223',
        contactType: 'customer support',
        contactOption: 'WhatsApp',
        availableLanguage: ['English', 'Spanish'],
      },
    ],
  },
};

export default function Contact() {
  const { t } = useLang();

  // Inject JSON-LD for structured data
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'contact-jsonld';
    script.textContent = JSON.stringify(LD_JSON);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const channels = [
    {
      id: 'contact-email',
      icon: '✉️',
      label: 'Email',
      value: 'info@investwithmeridian.com',
      href: 'mailto:info@investwithmeridian.com',
      cta: t('contact.email.cta'),
      note: t('contact.email.note'),
    },
    {
      id: 'contact-whatsapp',
      icon: '💬',
      label: 'WhatsApp',
      value: '+1 (470) 708-9223',
      href: 'https://wa.me/14707089223?text=Hello%20Meridian%2C%20I%27m%20interested%20in%20a%20property.',
      cta: t('contact.wa.cta'),
      note: t('contact.wa.note'),
    },
  ];

  const specialties = (['1', '2', '3', '4'] as const).map((n, i) => ({
    icon: ['🏖️', '📈', '⚖️', '🌍'][i],
    title: t(`contact.spec.${n}.t` as Parameters<typeof t>[0]),
    desc: t(`contact.spec.${n}.p` as Parameters<typeof t>[0]),
  }));

  return (
    <main id="main">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="contact-hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="eyebrow">{t('contact.eyebrow')}</p>
          <h1>{t('contact.title')}</h1>
          <p className="contact-hero-sub">{t('contact.sub')}</p>
          <p className="lede" style={{ color: 'var(--text-dim)', maxWidth: '58ch', margin: '0 auto' }}>
            {t('contact.lede')}
          </p>
        </div>
      </section>

      {/* ── Promise banner ───────────────────────────────────────────────── */}
      <section className="contact-promise">
        <div className="container">
          <div className="promise-band">
            <span className="promise-icon">⚡</span>
            <p>
              {t('contact.promise.a')}<strong>{t('contact.promise.b')}</strong>
              {t('contact.promise.c')}<strong>{t('contact.promise.d')}</strong>
              {t('contact.promise.e')}
            </p>
          </div>
        </div>
      </section>

      {/* ── Contact channels ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="contact-channels-grid">
            {channels.map((ch) => (
              <a
                key={ch.id}
                id={ch.id}
                href={ch.href}
                className="contact-channel-card"
                target={ch.href.startsWith('https') ? '_blank' : undefined}
                rel={ch.href.startsWith('https') ? 'noopener noreferrer' : undefined}
                aria-label={`${ch.label}: ${ch.value}`}
              >
                <span className="channel-icon" aria-hidden="true">{ch.icon}</span>
                <div className="channel-body">
                  <span className="channel-label">{ch.label}</span>
                  <span className="channel-value">{ch.value}</span>
                  <span className="channel-note">{ch.note}</span>
                </div>
                <span className="channel-cta">{ch.cta} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Specialties / Trust signals ──────────────────────────────────── */}
      <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p className="eyebrow">{t('contact.spec.eyebrow')}</p>
            <h2>{t('contact.spec.title')}</h2>
          </div>
          <div className="specialties-grid">
            {specialties.map((s) => (
              <div key={s.title} className="specialty-card">
                <span className="specialty-icon" aria-hidden="true">{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <h2>{t('contact.cta.title')}</h2>
            <p className="lede">{t('contact.cta.lede')}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn gold" to="/search" id="contact-cta-search">{t('contact.cta.browse')}</Link>
              <Link className="btn outline" to="/pricing" id="contact-cta-pricing">{t('contact.cta.plans')}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
