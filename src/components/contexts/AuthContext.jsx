// src/components/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import jedApi from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize user data with consistent role formatting
  const normalizeUser = useCallback((userData) => {
    if (!userData) return null;
    
    return {
      ...userData,
      role: userData.role?.toLowerCase()?.trim() || 'installer'
    };
  }, []);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...');
      
      try {
        setError(null);
        const [storedUser, token] = await Promise.all([
          jedApi.getStoredUser(),
          jedApi.getAuthToken()
        ]);

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
            await jedApi.clearTokens();
          }
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        setError(error.message);
        // Clear potentially corrupted data
        await jedApi.clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [normalizeUser]);

  const login = useCallback(async (userData) => {
    console.log('[AuthContext] Login called with user data:', userData);
    
    try {
      setError(null);
      const normalizedUser = normalizeUser(userData);
      
      console.log('[AuthContext] Setting user:', {
        id: normalizedUser.id,
        phone: normalizedUser.phone,
        role: normalizedUser.role
      });
      
      setUser(normalizedUser);
      
      // Verify storage consistency
      const [storedUser, token] = await Promise.all([
        jedApi.getStoredUser(),
        jedApi.getAuthToken()
      ]);
      
      console.log('[AuthContext] Storage verification - User:', !!storedUser, 'Token:', !!token);
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      setError(error.message);
      throw error;
    }
  }, [normalizeUser]);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logout called');
    
    try {
      setError(null);
      await jedApi.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      setError(error.message);
      // Force clear local state even if API call fails
    } finally {
      setUser(null);
      setError(null);
      console.log('[AuthContext] User state cleared');
    }
  }, []);

  const updateUser = useCallback(async (updates) => {
    console.log('[AuthContext] Updating user with:', updates);
    
    try {
      setError(null);
      setUser(prev => {
        if (!prev) return null;
        
        const updated = {
          ...prev,
          ...updates,
          // Ensure role remains normalized
          role: (updates.role || prev.role)?.toLowerCase()?.trim() || 'installer'
        };
        
        // Update localStorage asynchronously
        jedApi.storeUser(updated).catch(error => {
          console.error('[AuthContext] Failed to store updated user:', error);
          setError('Failed to save user data');
        });
        
        return updated;
      });
    } catch (error) {
      console.error('[AuthContext] Update user error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    login,
    logout,
    updateUser,
    error,
    clearError,
    isAuthenticated: Boolean(user && jedApi.getAuthToken()),
    loading
  }), [user, login, logout, updateUser, error, clearError, loading]);

  // Show loading state with consistent styling
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
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