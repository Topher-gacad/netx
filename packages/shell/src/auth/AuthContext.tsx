import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiLogin, apiSignup, apiGetMe, apiLogout } from '../api/auth.js';
import type { AuthUser } from '../api/auth.js';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('netx-auth-token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiGetMe()
      .then((res) => setUser(res.user))
      .catch(() => localStorage.removeItem('netx-auth-token'))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const result = await apiLogin(username, password);

      // Clear old user's localStorage data before loading new user
      const previousUser = localStorage.getItem('netx-current-user');
      if (previousUser !== result.user.username) {
        localStorage.removeItem('netx-topology');
        localStorage.removeItem('netx-plugin-data');
        localStorage.setItem('netx-current-user', result.user.username);
      }

      localStorage.setItem('netx-auth-token', result.token);
      setUser(result.user);

      // Reload to bootstrap kernel with the correct user's data from server
      window.location.reload();
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
      throw err;
    }
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    setError(null);
    try {
      const result = await apiSignup(username, email, password);

      // New user — clear any existing data
      localStorage.removeItem('netx-topology');
      localStorage.removeItem('netx-plugin-data');
      localStorage.setItem('netx-current-user', result.user.username);
      localStorage.setItem('netx-auth-token', result.token);
      setUser(result.user);

      window.location.reload();
    } catch (err: any) {
      setError(err.message ?? 'Signup failed');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    // Save current work to server before logging out
    const token = localStorage.getItem('netx-auth-token');
    if (token) {
      try {
        const payload = JSON.stringify({
          topology: JSON.parse(localStorage.getItem('netx-topology') ?? '{}'),
          pluginData: JSON.parse(localStorage.getItem('netx-plugin-data') ?? '{}'),
          preferences: { theme: document.documentElement.dataset.theme ?? 'dark' },
        });
        navigator.sendBeacon('/api/data/save', payload);
      } catch { /* best effort */ }
    }

    apiLogout().catch(() => {});
    localStorage.removeItem('netx-auth-token');
    localStorage.removeItem('netx-current-user');
    localStorage.removeItem('netx-topology');
    localStorage.removeItem('netx-plugin-data');
    setUser(null);

    // Reload to show clean login page
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
