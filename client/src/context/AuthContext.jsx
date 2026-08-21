import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints';
import { TOKEN_KEY, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `initialising` gates the whole router until we know whether the stored
  // token is still valid — without it, protected routes flash the login page.
  const [initialising, setInitialising] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setInitialising(false);
        return;
      }
      try {
        const { user: profile } = await authApi.me();
        if (!cancelled) setUser(profile);
      } catch {
        // Expired or tampered token — start clean.
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setInitialising(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const persist = useCallback(({ token, user: profile }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(profile);
    return profile;
  }, []);

  const login = useCallback(async (credentials) => persist(await authApi.login(credentials)), [persist]);
  const register = useCallback(async (payload) => persist(await authApi.register(payload)), [persist]);
  const logout = useCallback(() => clearSession(), [clearSession]);

  const value = useMemo(
    () => ({ user, initialising, isAuthenticated: Boolean(user), login, register, logout }),
    [user, initialising, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
