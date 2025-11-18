// src/components/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import jedApi from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      console.log('[AuthContext] Initializing authentication...');
      
      try {
        const storedUser = jedApi.getStoredUser();
        const token = jedApi.getAuthToken();

        console.log('[AuthContext] Stored user:', storedUser);
        console.log('[AuthContext] Token exists:', !!token);

        if (storedUser && token) {
          // Normalize role to lowercase
          const normalizedUser = {
            ...storedUser,
            role: storedUser.role?.toLowerCase() || 'installer'
          };
          
          console.log('[AuthContext] User restored:', {
            id: normalizedUser.id,
            phone: normalizedUser.phone,
            role: normalizedUser.role
          });
          
          setUser(normalizedUser);
        } else {
          console.log('[AuthContext] No valid session found');
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        // Clear potentially corrupted data
        jedApi.clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback((userData) => {
    console.log('[AuthContext] Login called with user data:', userData);
    
    // Ensure role is lowercase
    const normalizedUser = {
      ...userData,
      role: userData.role?.toLowerCase() || 'installer'
    };
    
    console.log('[AuthContext] Setting user:', {
      id: normalizedUser.id,
      phone: normalizedUser.phone,
      role: normalizedUser.role
    });
    
    setUser(normalizedUser);
    
    // Verify storage
    const storedUser = jedApi.getStoredUser();
    const token = jedApi.getAuthToken();
    console.log('[AuthContext] Verification - User stored:', !!storedUser, 'Token stored:', !!token);
  }, []);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logout called');
    
    try {
      await jedApi.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
    } finally {
      setUser(null);
      console.log('[AuthContext] User state cleared');
    }
  }, []);

  const updateUser = useCallback((updates) => {
    console.log('[AuthContext] Updating user with:', updates);
    
    setUser(prev => {
      if (!prev) return null;
      
      const updated = {
        ...prev,
        ...updates,
        role: (updates.role || prev.role)?.toLowerCase()
      };
      
      // Update localStorage
      jedApi.storeUser(updated);
      
      return updated;
    });
  }, []);

  const isAuthenticated = Boolean(user && jedApi.getAuthToken());

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated,
    loading
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;