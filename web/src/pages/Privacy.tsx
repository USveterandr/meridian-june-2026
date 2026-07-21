import { useLang } from '../i18n';
import { useSEO } from '../seo';
import { PRIVACY_CONTENT as CONTENT } from '../data/legal';

export default function Privacy() {
  const { lang } = useLang();
  const c = CONTENT[lang];

  useSEO({
    title: { en: 'Privacy Policy', es: 'Política de Privacidad' },
    description: {
      en: 'Learn how Meridian collects, uses, and protects your information across our real estate listing and investment platform.',
      es: 'Conoce cómo Meridian recopila, usa y protege tu información en nuestra plataforma de listados inmobiliarios e inversión.',
    },
    canonical: 'https://investwithmeridian.com/privacy',
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
