/* eslint-disable react-refresh/only-export-components */
// src/components/contexts/AuthContext.jsx
// Updated with better error handling and performance optimizations
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import JEDApiService from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize user data with consistent role formatting
  const normalizeUser = useCallback((userData) => {
    if (!userData) return null;

    const firstName = userData.firstName?.trim() || '';
    const lastName = userData.lastName?.trim() || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const displayName = userData.name?.trim() || fullName || null;

    return {
      ...userData,
      role: userData.role?.toLowerCase()?.trim() || 'installer',
      // Ensure all required fields are present
      id: userData.id,
      phone: userData.phone,
      name: displayName,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: userData.email || null
    };
  }, []);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...');
      
      try {
        setError(null);
        
        // Check for both user and token
        const storedUser = JEDApiService.getStoredUser();
        const token = JEDApiService.getAuthToken();

        if (storedUser && token) {
          const normalizedUser = normalizeUser(storedUser);
          
          console.log('[AuthContext] User restored:', {
            id: normalizedUser.id,
            phone: normalizedUser.phone,
            role: normalizedUser.role
          });
          
          setUser(normalizedUser);
        } else {
          console.log('[AuthContext] No valid session found');
          
          // Clear any partial/corrupted data
          if (storedUser && !token) {
            console.warn('[AuthContext] Found user without token, clearing storage');
            JEDApiService.clearTokens();
          }
          
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        setError(error.message);
        
        // Clear potentially corrupted data
        try {
          JEDApiService.clearTokens();
        } catch (clearError) {
          console.error('[AuthContext] Error clearing tokens:', clearError);
        }
        
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [normalizeUser]);

  // Login function
  const login = useCallback(async (userData) => {
    console.log('[AuthContext] Login called with user data');
    
    try {
      setError(null);
      
      // Normalize and validate user data
      const normalizedUser = normalizeUser(userData);
      
      if (!normalizedUser.id || !normalizedUser.phone || !normalizedUser.role) {
        throw new Error('Invalid user data: missing required fields');
      }
      
      console.log('[AuthContext] Setting user:', {
        id: normalizedUser.id,
        phone: normalizedUser.phone,
        role: normalizedUser.role
      });
      
      setUser(normalizedUser);
      
      // Verify storage consistency
      const storedUser = JEDApiService.getStoredUser();
      const token = JEDApiService.getAuthToken();
      
      if (!storedUser || !token) {
        console.error('[AuthContext] Storage verification failed - User:', !!storedUser, 'Token:', !!token);
        throw new Error('Failed to store authentication data');
      }
      
      console.log('[AuthContext] Login successful, storage verified');
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      setError(error.message);
      
      // Cleanup on error
      setUser(null);
      throw error;
    }
  }, [normalizeUser]);

  // Logout function
  const logout = useCallback(async () => {
    console.log('[AuthContext] Logout called');
    
    try {
      setError(null);
      
      // Call API logout (handles both server and local cleanup)
      await JEDApiService.logout();
      
      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      setError(error.message);
      
      // Force clear local state even if API call fails
      try {
        JEDApiService.clearTokens();
      } catch (clearError) {
        console.error('[AuthContext] Error clearing tokens:', clearError);
      }
    } finally {
      setUser(null);
      setError(null);
      console.log('[AuthContext] User state cleared');
    }
  }, []);

  // Update user function
  const updateUser = useCallback(async (updates) => {
    console.log('[AuthContext] Updating user with:', updates);
    
    try {
      setError(null);
      
      setUser(prev => {
        if (!prev) {
          console.warn('[AuthContext] Cannot update user - no user logged in');
          return null;
        }
        
        const updated = {
          ...prev,
          ...updates,
          // Ensure role remains normalized
          role: (updates.role || prev.role)?.toLowerCase()?.trim() || 'installer'
        };
        
        // Update localStorage
        try {
          JEDApiService.storeUser(updated);
          console.log('[AuthContext] User data updated in storage');
        } catch (storageError) {
          console.error('[AuthContext] Failed to store updated user:', storageError);
          setError('Failed to save user data');
        }
        
        return updated;
      });
    } catch (error) {
      console.error('[AuthContext] Update user error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    console.log('[AuthContext] Refreshing user data...');
    
    try {
      setError(null);
      
      if (!user) {
        console.warn('[AuthContext] Cannot refresh - no user logged in');
        return;
      }
      
      const response = await JEDApiService.getProfile();

      // Real API returns the user under `data` (Success + data:User), not
      // `user` — check both so this doesn't silently no-op.
      const userRecord = response.data || response.user;
      if (userRecord) {
        const normalizedUser = normalizeUser(userRecord);
        setUser(normalizedUser);
        console.log('[AuthContext] User data refreshed');
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing user:', error);
      
      // If refresh fails with auth error, logout
      if (error.message?.includes('AUTH_ERROR') || error.message?.includes('401')) {
        console.warn('[AuthContext] Auth error during refresh, logging out');
        await logout();
      } else {
        setError(error.message);
      }
    }
  }, [user, normalizeUser, logout]);

  // Clear error function
  const clearError = useCallback(() => setError(null), []);

  // Check authentication status
  const isAuthenticated = useMemo(() => {
    return Boolean(user && JEDApiService.getAuthToken());
  }, [user]);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    login,
    logout,
    updateUser,
    refreshUser,
    error,
    clearError,
    isAuthenticated,
    loading
  }), [user, login, logout, updateUser, refreshUser, error, clearError, isAuthenticated, loading]);

  // Show loading state with consistent styling
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading authentication...</p>
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