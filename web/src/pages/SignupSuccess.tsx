import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { useAuth } from '../auth';
import { canListProperties } from '../permissions';
import { newListingPath } from '../routes';

export default function SignupSuccess() {
  const { t } = useLang();
  const { user } = useAuth();
  const canList = canListProperties(user?.role);
  return (
    <main className="container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>{t('signup.success.title')}</h1>
        <p className="lede">{t('signup.success.p')}</p>
        <div className="hero-ctas" style={{ justifyContent: 'center' }}>
          <Link className="btn gold" to="/dashboard">{t('nav.dashboard')}</Link>
          <Link className="btn outline" to=            {canList ? newListingPath() : '/search'}>
            {canList ? t('dash.newListing') : t('nav.search')}
          </Link>
        </div>
      </div>
    </main>
  );
}
