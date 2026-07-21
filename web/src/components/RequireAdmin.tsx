import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLang } from '../i18n';

/** Gate for admin-only routes (e.g. /admin). Non-admins are bounced to the
 *  regular dashboard rather than shown a dead end. */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  if (loading) return <main className="wrap"><p className="muted">{t('common.loading')}</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
