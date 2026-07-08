import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.getProfile();
      setUser({ ...res.data.data, role: res.data.data.Role, token });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (mobileOrEmail, password) => {
    const res = await authAPI.login({ mobileOrEmail, password });
    const { worker, token } = res.data.data;
    const normalized = { ...worker, role: worker.Role, token };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(worker));
    setUser(normalized);
    return worker;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    return res.data.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isWorker = user?.role === 'worker';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
