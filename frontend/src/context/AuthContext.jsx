import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../services/supabaseDB';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (email) => {
    try {
      const profile = await db.getProfileByEmail(email);
      if (profile) {
        const normalized = { ...profile, role: profile.Role, token: localStorage.getItem('sb-token') };
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(profile));
        return profile;
      }
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        localStorage.setItem('sb-token', session.access_token);
        await fetchProfile(session.user.email);
      } else {
        const stored = localStorage.getItem('user');
        if (!stored) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('sb-token');
        }
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.email).then(() => setLoading(false));
      } else {
        const stored = localStorage.getItem('user');
        if (stored) {
          try { setUser({ ...JSON.parse(stored), role: JSON.parse(stored).Role }); } catch {}
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (mobileOrEmail, password) => {
    const result = await db.loginUser(mobileOrEmail, password);
    const normalized = { ...result.worker, role: result.worker.Role, token: result.token };
    localStorage.setItem('user', JSON.stringify(result.worker));
    localStorage.setItem('sb-token', result.token);
    setUser(normalized);
    return result.worker;
  };

  const register = async (data) => {
    return db.registerWorker(data);
  };

  const logout = async () => {
    try { await db.signOutUser(); } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('sb-token');
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
