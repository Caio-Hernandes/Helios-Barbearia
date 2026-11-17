import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { refreshSession, session } from '../services/http';
import type { AuthResponse, LoginInput, RegisterInput, User } from '../types';
import { AuthContext, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const applySession = useCallback((data: AuthResponse | null) => {
    session.setToken(data?.accessToken ?? null);
    setUser(data?.user ?? null);
    setStatus(data ? 'authenticated' : 'anonymous');
  }, []);

  // Ao abrir o app, tenta restaurar a sessão pelo cookie httpOnly de refresh
  useEffect(() => {
    let active = true;
    refreshSession().then((data) => {
      if (active) applySession(data);
    });
    session.onExpired(() => applySession(null));
    return () => {
      active = false;
      session.onExpired(null);
    };
  }, [applySession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const data = await authService.login(input);
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const data = await authService.register(input);
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
