import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUser, updateCurrentUser } from '../services/api';
import { track, identify, resetAnalytics } from '../services/analytics';

const AuthContext = createContext(null);

// Ensure user object always has _id regardless of whether the API returns _id or id
const normalizeUser = (u) => (u ? { ...u, _id: u._id || u.id } : null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState(() => localStorage.getItem('token'));

  // Tracks whether a fetchUser is already in-flight to prevent duplicate calls
  const fetchingRef  = useRef(false);
  // setTimeout id for proactive expiry
  const expiryTimer  = useRef(null);

  // ── Core logout — centralised so every code path calls the same cleanup ────
  const logout = useCallback((reason = 'manual') => {
    clearTimeout(expiryTimer.current);
    if (reason === 'expired') track('auth_expired', {});
    resetAnalytics();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // ── Schedule proactive logout slightly before token expires ───────────────
  const scheduleExpiry = useCallback((decoded) => {
    clearTimeout(expiryTimer.current);
    if (!decoded?.exp) return;
    const msUntilExpiry = decoded.exp * 1000 - Date.now() - 30_000;
    if (msUntilExpiry <= 0) { logout('expired'); return; }
    expiryTimer.current = setTimeout(() => logout('expired'), msUntilExpiry);
  }, [logout]);

  // ── Hydrate from stored token on mount ────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) { setLoading(false); return; }

      try {
        const decoded = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
          setLoading(false);
          return;
        }
        // Guard against concurrent calls (StrictMode double-invoke)
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        const response = await getCurrentUser(storedToken);
        const normalized = normalizeUser(response.data);
        setUser(normalized);
        setToken(storedToken);
        scheduleExpiry(decoded);
        identify(normalized._id, { role: normalized.role, account_type: normalized.accountType });
      } catch (error) {
        console.error('[AuthContext] init failed:', error?.response?.status ?? error.message);
        logout();
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for 401 events dispatched by the API interceptor ──────────────
  useEffect(() => {
    const handleExpired = () => logout('expired');
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [logout]);

  // ── Cross-tab session sync — logout in one tab propagates to all others ───
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed in another tab — mirror the logout here
        logout();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [logout]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const { loginUser } = await import('../services/api');
      const response  = await loginUser({ email, password });
      const newToken  = response.data.token;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      scheduleExpiry(jwtDecode(newToken));

      const userResponse = await getCurrentUser(newToken);
      const normalized = normalizeUser(userResponse.data);
      setUser(normalized);

      identify(normalized._id, { role: normalized.role, account_type: normalized.accountType });
      track('login_completed', { role: normalized.role });

      return { success: true, user: normalized };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (userData) => {
    try {
      const { registerUser } = await import('../services/api');
      const response = await registerUser(userData);
      track('signup_completed', {});
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  };

  // ── Update user profile ───────────────────────────────────────────────────
  const updateUser = async (updatedData) => {
    try {
      const response = await updateCurrentUser(updatedData, token);
      const normalized = normalizeUser(response.data);
      setUser(normalized);
      return { success: true, user: normalized };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Update failed.',
      };
    }
  };

  // ── Role helpers ──────────────────────────────────────────────────────────
  const hasRole    = (role) => user?.role === role;
  const isAdmin    = () => user?.role === 'admin'      || user?.role === 'superadmin';
  const isSuperAdmin = () => user?.role === 'superadmin';

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
