import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { BLOG_ARTICLES } from '../data/blog';
import { useSEO } from '../seo';

const CATEGORY_COLORS: Record<string, string> = {
  'Buying Guide': '#C8AA6E',
  'Investment': '#5A8A6E',
  'Location Guide': '#5A6E8A',
};

export default function Blog() {
  const { lang } = useLang();

  useSEO({
    title: {
      en: 'Blog — Dominican Republic Real Estate Guides | Meridian',
      es: 'Blog — Guías de Bienes Raíces en República Dominicana | Meridian',
    },
    description: {
      en: 'Expert guides on buying, investing, and living in Dominican Republic real estate. Punta Cana, Cap Cana, Las Terrenas, Santo Domingo and more.',
      es: 'Guías expertas sobre comprar, invertir y vivir en bienes raíces de la República Dominicana. Punta Cana, Cap Cana, Las Terrenas y más.',
    },
    canonical: 'https://investwithmeridian.com/blog',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: lang === 'en' ? 'Meridian Real Estate Blog' : 'Blog de Bienes Raíces Meridian',
      url: 'https://investwithmeridian.com/blog',
      description:
        lang === 'en'
          ? 'Expert guides on Dominican Republic real estate'
          : 'Guías expertas sobre bienes raíces en República Dominicana',
    },
  });

  return (
    <div className="section" style={{ minHeight: '70vh' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        {/* Header */}
        <div style={{ marginBottom: 48, paddingTop: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>
            {lang === 'en' ? 'Resources' : 'Recursos'}
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 16 }}>
            {lang === 'en' ? (
              <>DR Real Estate <span className="gold">Guides</span></>
            ) : (
              <>Guías de Bienes Raíces <span className="gold">RD</span></>
            )}
          </h1>
          <p style={{ color: 'var(--text-dim)', maxWidth: '55ch', fontSize: '1.05rem', lineHeight: 1.7 }}>
            {lang === 'en'
              ? 'Everything you need to know about buying, investing, and living in Dominican Republic real estate — written by the Meridian team.'
              : 'Todo lo que necesitas saber sobre comprar, invertir y vivir en bienes raíces de la República Dominicana.'}
          </p>
        </div>

        {/* Article List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {BLOG_ARTICLES.map((article) => {
            const title = lang === 'en' ? article.titleEn : article.titleEs;
            const description = lang === 'en' ? article.descriptionEn : article.descriptionEs;
            const pubDate = new Date(article.datePublished).toLocaleDateString(
              lang === 'en' ? 'en-US' : 'es-DO',
              { year: 'numeric', month: 'long', day: 'numeric' }
            );

            return (
              <Link
                key={article.slug}
                to={`/blog/${article.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <article
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    padding: '28px 32px',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: CATEGORY_COLORS[article.category] ?? 'var(--gold)',
                        fontWeight: 600,
                      }}
                    >
                      {article.category}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>·</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{pubDate}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>·</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {article.readingMins} {lang === 'en' ? 'min read' : 'min de lectura'}
                    </span>
                  </div>
                  <h2
                    style={{
                      fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
                      marginBottom: 10,
                      color: 'var(--text)',
                      lineHeight: 1.35,
                    }}
                  >
                    {title}
                  </h2>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.65, margin: 0, fontSize: '0.95rem' }}>
                    {description}
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <span className="linkish" style={{ fontSize: '0.9rem' }}>
                      {lang === 'en' ? 'Read article →' : 'Leer artículo →'}
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 60,
            padding: '36px',
            border: '1px solid var(--gold)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>
            {lang === 'en' ? 'Ready to Find Your Property?' : '¿Listo para Encontrar tu Propiedad?'}
          </h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
            {lang === 'en'
              ? 'Browse curated luxury properties across the Dominican Republic.'
              : 'Explora propiedades de lujo seleccionadas en toda la República Dominicana.'}
          </p>
          <Link className="btn gold" to="/search">
            {lang === 'en' ? 'Browse Properties' : 'Ver Propiedades'}
          </Link>
        </div>
      </div>
    </div>
  );
}
