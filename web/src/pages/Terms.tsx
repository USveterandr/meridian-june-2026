import { useLang } from '../i18n';
import { useSEO } from '../seo';
import { TERMS_CONTENT as CONTENT } from '../data/legal';

export default function Terms() {
  const { lang } = useLang();
  const c = CONTENT[lang];

  useSEO({
    title: { en: 'Terms of Service', es: 'Términos de Servicio' },
    description: {
      en: 'Read the Meridian Terms of Service for our real estate listing and investment platform in the Dominican Republic.',
      es: 'Lee los Términos de Servicio de Meridian para nuestra plataforma de listados inmobiliarios e inversión en la República Dominicana.',
    },
    canonical: 'https://investwithmeridian.com/terms',
  });

  return (
    <main>
      <section className="section">
        <div className="container legal-page">
          <p className="eyebrow">{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className="legal-updated">{c.updated}</p>

          {c.intro.map((p, i) => <p key={i}>{p}</p>)}

          {c.sections.map((s) => (
            <div key={s.heading}>
              <h2>{s.heading}</h2>
              {s.body.map((p, i) => <p key={i}>{p}</p>)}
              {s.list && (
                <ul>
                  {s.list.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
