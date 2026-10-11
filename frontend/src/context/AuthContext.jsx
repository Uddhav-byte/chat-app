import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, authService } from '../services/supabase';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (isSupabaseConfigured && supabase) {
      // 1. Check existing Supabase session
      const initializeSupabaseAuth = async () => {
        try {
          const currentUser = await authService.getCurrentUser();
          if (mounted && currentUser) {
            setUser(currentUser);
          }
        } catch (error) {
          console.error('Error restoring Supabase session:', error);
        } finally {
          if (mounted) setLoading(false);
        }
      };

      initializeSupabaseAuth();

      // 2. Listen for auth changes (sign in, sign out, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          if (session?.user) {
            const currentUser = await authService.getCurrentUser();
            if (mounted) setUser(currentUser);
          } else {
            if (mounted) setUser(null);
          }
        }
      );

      return () => {
        mounted = false;
        subscription?.unsubscribe();
      };
    } else {
      // Fallback: Legacy API / local token verification
      const verifyLegacyToken = async () => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          try {
            const { data } = await api.get('/auth/me');
            if (mounted) {
              setUser(data.user);
              const s = initSocket(savedToken);
              setSocket(s);
            }
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (mounted) setUser(null);
          }
        }
        if (mounted) setLoading(false);
      };

      verifyLegacyToken();

      return () => {
        mounted = false;
      };
    }
  }, []);

  const login = async (email, password) => {
    if (isSupabaseConfigured) {
      const data = await authService.login(email, password);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return data;
    }

    // Legacy fallback
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    const s = initSocket(data.token);
    setSocket(s);
    return data;
  };

  const register = async (username, email, password) => {
    if (isSupabaseConfigured) {
      const data = await authService.register(username, email, password);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return data;
    }

    // Legacy fallback
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    const s = initSocket(data.token);
    setSocket(s);
    return data;
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await authService.logout();
      setUser(null);
      return;
    }

    // Legacy fallback
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
    setSocket(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        socket,
        isSupabase: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
