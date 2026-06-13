import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLang } from '../i18n';

/** Gate for routes that need a session. Waits for the initial /me check
 *  before redirecting so a page refresh doesn't bounce signed-in users. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  if (loading) return <main className="wrap"><p className="muted">{t('common.loading')}</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
