import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { JEDApiService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiService = new JEDApiService();

  // Normalize user data consistently with API service
  const normalizeUser = useCallback((userData, credentials = {}) => {
    return {
      id: userData.id || userData._id,
      firstName: userData.firstName || userData.first_name || '',
      lastName: userData.lastName || userData.last_name || '',
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      email: userData.email || '',
      phone: userData.phone || credentials.phone || '',
      role: (userData.role || 'installer').toLowerCase(),
      nin: userData.nin || '',
      homeAddress: userData.homeAddress || userData.home_address || '',
      officeAddress: userData.officeAddress || userData.office_address || '',
      employeeId: userData.employeeId || userData.employee_id || `EMP-${userData.id || ''}`,
      createdAt: userData.createdAt || userData.created_at,
      updatedAt: userData.updatedAt || userData.updated_at,
    };
  }, []);

  // Store user data consistently
  const storeUser = useCallback((userData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    localStorage.setItem('jedUser', JSON.stringify(normalizedUser));
    return normalizedUser;
  }, [normalizeUser]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = apiService.getStoredUser();
        const token = apiService.getAuthToken();
        
        if (storedUser && token) {
          setUser(storedUser);
          
          // Verify token by fetching fresh profile data
          try {
            const profileData = await apiService.getProfile();
            storeUser(profileData.user || profileData);
          } catch (error) {
            console.warn('[Auth] Token verification failed:', error.message);
            // Clear only on auth errors, preserve on network errors
            if (error.message.includes('AUTH_ERROR') || error.message.includes('401')) {
              apiService.clearTokens();
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Check auth failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [apiService, storeUser]);

  const login = async (credentials) => {
    try {
      console.log('[Auth] Attempting login with:', { phone: credentials.phone });
      
      // Use API service for authentication
      const userData = await apiService.login(credentials);
      
      console.log('[Auth] Login successful:', userData);
      
      // Store normalized user data
      const normalizedUser = storeUser(userData);
      
      // Debug logging
      console.log('[Auth] Normalized user data:', {
        role: normalizedUser.role,
        isAdmin: normalizedUser.role === 'admin',
        permissions: normalizedUser.role === 'admin' ? ROLE_PERMISSIONS['admin'] : ROLE_PERMISSIONS['installer']
      });
      
      return normalizedUser;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('[Auth] Logging out...');
      await apiService.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      setUser(null);
      apiService.clearTokens();
      console.log('[Auth] Logout complete');
    }
  };

  const register = async (userData) => {
    try {
      console.log('[Auth] Registering new user:', { phone: userData.phone, role: userData.role });
      const response = await apiService.register(userData);
      console.log('[Auth] Registration successful:', response);
      return response;
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      throw error;
    }
  };

  const getProfile = async () => {
    try {
      console.log('[Auth] Fetching user profile...');
      const profile = await apiService.getProfile();
      if (profile) {
        storeUser(profile.user || profile);
      }
      return profile;
    } catch (error) {
      console.error('[Auth] Get profile failed:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      console.log('[Auth] Updating user profile...');
      const updated = await apiService.updateProfile(profileData);
      if (updated) {
        storeUser(updated.user || updated);
      }
      return updated;
    } catch (error) {
      console.error('[Auth] Update profile failed:', error);
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      console.log('[Auth] Changing password...');
      return await apiService.changePassword(passwordData);
    } catch (error) {
      console.error('[Auth] Change password failed:', error);
      throw error;
    }
  };

  // Update local user state (for immediate UI updates)
  const updateUser = useCallback((updates) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      storeUser(updatedUser);
    }
  }, [user, storeUser]);

  // Check user roles
  const isAdmin = user?.role === 'admin';
  const isInstaller = user?.role === 'installer';

  const value = {
    // State
    user,
    loading,
    isAuthenticated: !!user,
    
    // Roles
    isAdmin,
    isInstaller,
    
    // Auth methods
    login,
    logout,
    register,
    
    // Profile methods
    getProfile,
    updateProfile,
    changePassword,
    updateUser,
    
    // Token access (for API calls outside context)
    getAuthToken: () => apiService.getAuthToken(),
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}