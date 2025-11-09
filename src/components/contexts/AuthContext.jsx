import { createContext, useState, useContext, useEffect } from 'react';
import JEDApiService from '../services/api';

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

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get stored user data first
        const storedUser = JEDApiService.getStoredUser();
        const token = JEDApiService.getAuthToken();
        
        // If we have both user data and token, set the initial state
        if (storedUser && token) {
          setUser(storedUser);
          
          // Verify token in background
          try {
            const userData = await JEDApiService.verifyAuth();
            // Update user data if verification successful
            setUser(userData);
            localStorage.setItem('jedUser', JSON.stringify(userData));
          } catch (error) {
            console.error('[Auth] Token verification failed:', error.message);
            // Only clear if it's an auth error, not a network error
            if (error.message.includes('401') || error.message.includes('auth')) {
              JEDApiService.clearTokens();
              setUser(null);
            }
          }
        } else {
          // No stored session
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Check auth failed:', error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials, rememberMe = false) => {
    try {
      console.log('[Auth] Attempting login with:', { phone: credentials.phone });
      
      // Call API to authenticate
      const response = await JEDApiService.login(credentials);
      
      console.log('[Auth] Raw login response:', response);

      // Handle the actual API response structure
      let userData;
      let token;

      // API Response Structure:
      // { success: true, message: "...", data: { user: {...}, token: "..." } }
      
      if (response.success && response.data) {
        // Standard API response format
        userData = response.data.user;
        token = response.data.token;
      } else if (response.data?.user) {
        // Alternative format
        userData = response.data.user;
        token = response.data.token || response.token;
      } else if (response.user) {
        // Direct user object
        userData = response.user;
        token = response.token;
      } else if (response.id) {
        // Response IS the user object
        userData = response;
        token = response.token;
      } else {
        console.error('[Auth] Unexpected response format:', response);
        throw new Error('Invalid login response format');
      }

      // Validate user data has required fields
      if (!userData || (!userData.id && !userData._id)) {
        console.error('[Auth] Invalid user data:', userData);
        throw new Error('User ID missing from response');
      }

      // Normalize user data for consistent access
      const normalizedUser = {
        id: userData.id || userData._id,
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email || '',
        phone: userData.phone || credentials.phone,
        role: userData.role?.toLowerCase() || 'installer', // normalize role to lowercase
        nin: userData.nin || '',
        homeAddress: userData.homeAddress || userData.home_address || '',
        officeAddress: userData.officeAddress || userData.office_address || '',
        employeeId: userData.employeeId || userData.employee_id || `EMP-${userData.id}`,
        createdAt: userData.createdAt || userData.created_at,
        updatedAt: userData.updatedAt || userData.updated_at,
      };

      console.log('[Auth] Normalized user data:', normalizedUser);

      // Store tokens if provided
      if (token) {
        JEDApiService.storeTokens({ 
          token: token, 
          refreshToken: response.data?.refreshToken || response.refreshToken 
        }, rememberMe);
      } else {
        console.warn('[Auth] No token in response, proceeding anyway');
      }
      
      // Set user data
      setUser(normalizedUser);
      
      // Store user data for quick access
      localStorage.setItem('jedUser', JSON.stringify(normalizedUser));
      
      console.log('[Auth] Login successful:', normalizedUser);
      
      return normalizedUser;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('[Auth] Logging out...');
      // Call API to logout
      await JEDApiService.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      // Clear all auth state
      setUser(null);
      JEDApiService.clearTokens();
      console.log('[Auth] Logout complete');
    }
  };

  const resetPassword = async (email) => {
    try {
      const url = `${JEDApiService.baseUrl}${JEDApiService.version}${JEDApiService.authEndpoint}/reset-password`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('[Auth] Password reset error:', error);
      throw error;
    }
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('jedUser', JSON.stringify(updatedUser));
  };

  // Register new user
  const register = async (userData) => {
    try {
      console.log('[Auth] Registering new user:', { phone: userData.phone, role: userData.role });
      const response = await JEDApiService.register(userData);
      console.log('[Auth] Registration successful:', response);
      return response;
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      throw error;
    }
  };

  // Get user profile
  const getProfile = async () => {
    try {
      console.log('[Auth] Fetching user profile...');
      const profile = await JEDApiService.getProfile();
      if (profile) {
        setUser(profile);
        localStorage.setItem('jedUser', JSON.stringify(profile));
      }
      return profile;
    } catch (error) {
      console.error('[Auth] Get profile failed:', error);
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      console.log('[Auth] Updating user profile...');
      const updated = await JEDApiService.updateProfile(profileData);
      if (updated) {
        setUser(prev => ({ ...prev, ...updated }));
        localStorage.setItem('jedUser', JSON.stringify(updated));
      }
      return updated;
    } catch (error) {
      console.error('[Auth] Update profile failed:', error);
      throw error;
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      console.log('[Auth] Changing password...');
      return await JEDApiService.changePassword(passwordData);
    } catch (error) {
      console.error('[Auth] Change password failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role?.toLowerCase() === 'admin',
    isSupervisor: user?.role?.toLowerCase() === 'supervisor',
    isInstaller: user?.role?.toLowerCase() === 'installer',
    // Auth methods
    login,
    logout,
    register,
    // Profile methods
    getProfile,
    updateProfile,
    changePassword,
    // Legacy methods
    updateUser,
    resetPassword,
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