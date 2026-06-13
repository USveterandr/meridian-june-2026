import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, hasActiveSub } from '../auth';
import { useLang } from '../i18n';

/**
 * Gate for routes that require an active (or trialing) subscription.
 * Users without any subscription are redirected to /choose-plan.
 * Admins bypass this check.
 */
export default function RequireSubscription({ children }: { children: ReactNode }) {
  const { user, subscription, loading } = useAuth();
  const { t } = useLang();
  const location = useLocation();

  if (loading) return <main className="wrap"><p className="muted">{t('common.loading')}</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Admins are never gated
  if (user.role === 'admin') return <>{children}</>;

  // If no active subscription, send to plan picker
  if (!hasActiveSub(subscription)) {
    return <Navigate to="/choose-plan" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
