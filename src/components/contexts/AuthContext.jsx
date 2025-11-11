import React, { createContext, useContext, useState, useEffect } from 'react';
import jedApi from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(null);

  // Check for existing authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = jedApi.getAuthToken();
        const storedUser = jedApi.getStoredUser();
        
        if (token && storedUser) {
          console.log('[AuthContext] Restoring session for user:', storedUser.phone);
          setUser(storedUser);
          setIsAuthenticated(true);
          
          // Optional: Validate token with backend
          try {
            await jedApi.getProfile();
            console.log('[AuthContext] Session validation successful');
          } catch (error) {
            console.warn('[AuthContext] Session validation failed:', error);
            logout();
          }
        } else {
          console.log('[AuthContext] No session found');
        }
      } catch (error) {
        console.error('[AuthContext] Auth initialization error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (userData) => {
    try {
      console.log('[AuthContext] Setting user:', userData.phone || userData.username);
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      setLastError(null);
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      setLastError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await jedApi.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      jedApi.clearTokens();
    }
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
    jedApi.storeUser(userData);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    lastError,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};