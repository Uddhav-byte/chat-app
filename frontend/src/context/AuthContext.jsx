import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, authService } from '../services/supabase';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let mounted = true;

    // Check if demo session is active
    try {
      const savedDemo = localStorage.getItem('nexus_demo_user');
      if (savedDemo) {
        setUser(JSON.parse(savedDemo));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn(e);
    }

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
            // Keep demo user if set
            const saved = localStorage.getItem('nexus_demo_user');
            if (mounted && !saved) setUser(null);
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
    localStorage.removeItem('nexus_demo_user');
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
    localStorage.removeItem('nexus_demo_user');
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

  const demoLogin = (name = 'Demo') => {
    const demoUser = {
      id: 'demo-user-123',
      _id: 'demo-user-123',
      username: name || 'Demo',
      email: 'demo@nexuschat.dev',
      avatar: '',
      isDemo: true,
    };
    try {
      localStorage.setItem('nexus_demo_user', JSON.stringify(demoUser));
    } catch (e) {
      console.warn(e);
    }
    setUser(demoUser);
    setLoading(false);
    return demoUser;
  };

  const logout = async () => {
    try {
      localStorage.removeItem('nexus_demo_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {
      console.warn(e);
    }

    if (isSupabaseConfigured && !user?.isDemo) {
      await authService.logout();
    }

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
        demoLogin,
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
