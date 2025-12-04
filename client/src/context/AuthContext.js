import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUser, updateCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Decode token and get user info
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          
          // Check if token is expired
          if (decoded.exp * 1000 < Date.now()) {
            logout();
            return;
          }
          
          // Fetch user details
          const response = await getCurrentUser(storedToken);
          
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth initialization error:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const { loginUser } = await import('../services/api');
      const response = await loginUser({ email, password });
      const newToken = response.data.token;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      // Fetch full user details
      const userResponse = await getCurrentUser(newToken);
      setUser(userResponse.data);
      
      return { success: true, user: userResponse.data };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const { registerUser } = await import('../services/api');
      const response = await registerUser(userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedData) => {
    try {
      const response = await updateCurrentUser(updatedData, token);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Update failed'
      };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  // Check if user is admin or superadmin
  const isAdmin = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'superadmin';
  };

  const isSuperAdmin = () => {
    if (!user) return false;
    return user.role === 'superadmin';
  };

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
