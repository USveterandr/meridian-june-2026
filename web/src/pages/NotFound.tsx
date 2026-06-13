import { Link } from 'react-router-dom';
import { useLang } from '../i18n';

export default function NotFound() {
  const { t } = useLang();
  return (
    <main className="section">
      <div className="container empty">
        <h1>{t('notfound.title')}</h1>
        <p>{t('notfound.p')}</p>
        <Link className="btn gold" to="/">{t('notfound.home')}</Link>
      </div>
    </main>
  );
}
