import { useParams, Link, Navigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { getArticle } from '../data/blog';
import { useSEO } from '../seo';

/** Very lightweight markdown-to-HTML converter for our article bodies */
function renderMarkdown(md: string): string {
  return md
    // headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // horizontal rule
    .replace(/^---$/gm, '<hr />')
    // table rows (basic)
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      const isHeader = false; // we handle the separator row separately
      void isHeader;
      const tag = 'td';
      return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    })
    .replace(/^(\|-+)+\|$/gm, '') // remove separator rows
    // wrap consecutive <tr> blocks in <table>
    .replace(/((<tr>.*?<\/tr>\n?)+)/gs, '<table>$1</table>')
    // convert first <tr> in each table to th
    .replace(/<table>\s*<tr>(.*?)<\/tr>/s, (_, inner) => {
      return '<table><thead><tr>' + inner.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr></thead><tbody>';
    })
    .replace(/<\/table>/g, '</tbody></table>')
    // unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    // ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // paragraphs: lines that aren't already wrapped in tags
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // clean up extra blank lines
    .replace(/\n{3,}/g, '\n\n');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLang();
  const article = slug ? getArticle(slug) : undefined;

  useSEO(
    article
      ? {
          title: { en: article.titleEn, es: article.titleEs },
          description: { en: article.descriptionEn, es: article.descriptionEs },
          canonical: `https://investwithmeridian.com/blog/${article.slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: lang === 'en' ? article.titleEn : article.titleEs,
            description: lang === 'en' ? article.descriptionEn : article.descriptionEs,
            datePublished: article.datePublished,
            author: { '@type': 'Organization', name: 'Meridian Real Estate' },
            publisher: {
              '@type': 'Organization',
              name: 'Meridian',
              url: 'https://investwithmeridian.com',
            },
          },
        }
      : {
          title: { en: 'Article not found | Meridian', es: 'Artículo no encontrado | Meridian' },
          description: { en: '', es: '' },
        }
  );

  if (!article) return <Navigate to="/blog" replace />;

  const title = lang === 'en' ? article.titleEn : article.titleEs;
  const body = lang === 'en' ? article.bodyEn : article.bodyEs;
  const pubDate = new Date(article.datePublished).toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-DO',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div className="section" style={{ minHeight: '70vh' }}>
      <div className="container" style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: 28, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          <Link to="/" className="linkish">Meridian</Link>
          {' / '}
          <Link to="/blog" className="linkish">{lang === 'en' ? 'Blog' : 'Blog'}</Link>
          {' / '}
          <span style={{ color: 'var(--text)' }}>{article.category}</span>
        </nav>

        {/* Article Header */}
        <header style={{ marginBottom: 40, paddingBottom: 32, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span
              style={{
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
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
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', lineHeight: 1.25, marginBottom: 20 }}>
            {title}
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.05rem', lineHeight: 1.7, margin: 0 }}>
            {lang === 'en' ? article.descriptionEn : article.descriptionEs}
          </p>
        </header>

        {/* Article Body */}
        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          style={{
            lineHeight: 1.8,
            fontSize: '1.02rem',
          }}
        />

        {/* CTA block */}
        <div
          style={{
            marginTop: 60,
            padding: '32px',
            border: '1px solid var(--gold)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 12,
            }}
          >
            Meridian
          </p>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 12 }}>
            {lang === 'en' ? 'Find Your DR Property' : 'Encuentra tu Propiedad en RD'}
          </h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: 24, fontSize: '0.95rem' }}>
            {lang === 'en'
              ? 'Browse verified luxury properties across Punta Cana, Cap Cana, Las Terrenas, and Santo Domingo.'
              : 'Explora propiedades de lujo verificadas en Punta Cana, Cap Cana, Las Terrenas y Santo Domingo.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn gold" to="/search">
              {lang === 'en' ? 'Browse Properties' : 'Ver Propiedades'}
            </Link>
            <Link className="btn outline" to="/signup">
              {lang === 'en' ? 'Create Free Account' : 'Crear Cuenta Gratis'}
            </Link>
          </div>
        </div>

        {/* Back to blog */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link className="linkish" to="/blog">
            ← {lang === 'en' ? 'Back to all guides' : 'Volver a todas las guías'}
          </Link>
        </div>
      </div>
    </div>
  );
}
