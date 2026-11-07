import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('ekantin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ekantin_token');
    if (token && !user) {
      setLoading(true);
      api
        .get('/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('ekantin_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('ekantin_token');
          localStorage.removeItem('ekantin_user');
        })
        .finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password, role) => {
    const res = await api.post('/login', { email, password, role });
    localStorage.setItem('ekantin_token', res.data.token);
    localStorage.setItem('ekantin_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // token mungkin sudah kedaluwarsa — tetap bersihkan lokal
    }
    localStorage.removeItem('ekantin_token');
    localStorage.removeItem('ekantin_user');
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
