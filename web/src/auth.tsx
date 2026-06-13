import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type Subscription, type User } from './api';

type AuthCtx = {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  /** Refresh subscription after checkout/plan change */
  refreshSubscription: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    firstName: string; lastName: string; email: string; password: string; role: string; locale: string;
    planId?: string; [key: string]: unknown;
  }) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) { setLoading(false); return; }
    api.get<{ user: User; subscription: Subscription | null }>('/api/auth/me')
      .then((d) => { if (!cancelled) { setUser(d.user); setSubscription(d.subscription); } })
      .catch(() => { if (!cancelled) setToken(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!getToken()) return;
    try {
      const d = await api.get<{ user: User; subscription: Subscription | null }>('/api/auth/me');
      setUser(d.user);
      setSubscription(d.subscription);
    } catch { /* ignore */ }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const d = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
    setToken(d.token);
    setUser(d.user);
    // Fetch subscription right after login
    try {
      const me = await api.get<{ user: User; subscription: Subscription | null }>('/api/auth/me');
      setSubscription(me.subscription);
    } catch { /* non-blocking */ }
  }, []);

  const register = useCallback(async (input: {
    firstName: string; lastName: string; email: string; password: string; role: string; locale: string;
    planId?: string; [key: string]: unknown;
  }) => {
    const d = await api.post<{ token: string; user: User }>('/api/auth/register', input);
    setToken(d.token);
    setUser(d.user);
    // Fetch subscription created during registration
    try {
      const me = await api.get<{ user: User; subscription: Subscription | null }>('/api/auth/me');
      setSubscription(me.subscription);
    } catch { /* non-blocking */ }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  const value = useMemo(
    () => ({ user, subscription, loading, refreshSubscription, login, register, logout }),
    [user, subscription, loading, refreshSubscription, login, register, logout]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** True if user has an active or trialing subscription */
export function hasActiveSub(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (!['active', 'trialing'].includes(subscription.status)) return false;
  if (subscription.periodEnd && new Date(subscription.periodEnd).getTime() < Date.now()) return false;
  return true;
}
