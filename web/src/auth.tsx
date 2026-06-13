import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type User } from './api';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    firstName: string; lastName: string; email: string; password: string; role: string; locale: string;
    planId?: string;
  }) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) return;
    api.get<{ user: User }>('/api/auth/me')
      .then((d) => { if (!cancelled) setUser(d.user); })
      .catch(() => { if (!cancelled) setToken(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const d = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
    setToken(d.token);
    setUser(d.user);
  }, []);

  const register = useCallback(async (input: {
    firstName: string; lastName: string; email: string; password: string; role: string; locale: string;
    planId?: string;
  }) => {
    const d = await api.post<{ token: string; user: User }>('/api/auth/register', input);
    setToken(d.token);
    setUser(d.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

