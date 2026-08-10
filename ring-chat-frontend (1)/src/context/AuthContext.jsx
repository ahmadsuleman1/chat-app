import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { connectSocket, disconnectSocket } from '../socket/socket';
import { withAvatarUrl } from '../utils/normalize';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    disconnectSocket();
  }, []);

  // Restore session on app start
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const data = await authService.me();
        if (!cancelled) {
          setCurrentUser(withAvatarUrl(data.user ?? data));
          setToken(savedToken);
          connectSocket(savedToken);
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Listen for global 401s raised by the axios interceptor
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setCurrentUser(withAvatarUrl(data.user));
    connectSocket(data.token);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    return authService.register(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout — clear client state regardless.
    }
    clearSession();
  }, [clearSession]);

  const updateCurrentUser = useCallback((partial) => {
    setCurrentUser((prev) => (prev ? withAvatarUrl({ ...prev, ...partial }) : prev));
  }, []);

  const value = {
    currentUser,
    token,
    isAuthenticated: Boolean(token && currentUser),
    loading,
    login,
    register,
    logout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
