// JED API Service - Debugged & Optimized


// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pharez-api.onrender.com';
const API_VERSION = '/api/v1';
const JED_ENDPOINT = '/external/jed';
const AUTH_ENDPOINT = '/auth';

// Token refresh configuration
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * API Service for JED Integration
 * Base URL: https://pharez-api.onrender.com/api/v1
 * API Documentation: https://pharez-api.onrender.com/api-docs
 */

class JEDApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.version = API_VERSION;
    this.jedEndpoint = JED_ENDPOINT;
    this.authEndpoint = AUTH_ENDPOINT;
  }

  /**
   * Get full API URL
   * @param {string} endpoint 
   * @param {boolean} isAuthEndpoint - Whether this is an auth endpoint
   * @returns {string}
   */
  getFullUrl(endpoint, isAuthEndpoint = false) {
    const baseEndpoint = isAuthEndpoint ? this.authEndpoint : this.jedEndpoint;
    return `${this.baseUrl}${this.version}${baseEndpoint}${endpoint}`;
  }

  /**
   * Get default headers including auth token if available
   * @returns {Object} Headers object
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Generic request handler with error handling and logging
   * @param {string} url - Full URL to request
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(url, options = {}) {
    try {
      console.log(`[API] ${options.method || 'GET'} ${url}`);
      if (options.body) {
        console.log('[API] Request Body:', JSON.parse(options.body));
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`[API] Response Status: ${response.status} ${response.statusText}`);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[API] Error Response:', data);
        throw new Error(errorMessage);
      }

      console.log('[API] Success Response:', data);
      return data;

    } catch (error) {
      console.error('[API] Request Failed:', error.message);
      
      // Enhanced error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      if (error.message.includes('401')) {
        this.clearTokens();
        throw new Error('Authentication required. Please login again.');
      }

      throw error;
    }
  }

  // ============================================
  // Authentication Methods
  // ============================================

  /**
   * Authenticate user with phone and password
   * POST /api/v1/auth/login
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.phone - User's phone number
   * @param {string} credentials.password - User's password
   * @returns {Promise<Object>} Authentication response with user data and token
   */
  async login(credentials) {
    try {
      console.log('[API] Login request:', { phone: credentials.phone });
      const url = this.getFullUrl('/login', true);
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      console.log('[API] Login response:', response);

      // Handle different response formats
      let userData, token, refreshToken;

      if (response.data) {
        // Standard API format: { data: { user: {...}, token: "..." } }
        userData = response.data.user || response.data;
        token = response.data.token;
        refreshToken = response.data.refreshToken;
      } else {
        // Direct format: { user: {...}, token: "..." }
        userData = response.user || response;
        token = response.token;
        refreshToken = response.refreshToken;
      }

      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid user data in response');
      }

      // Store the tokens if available
      if (token) {
        this.storeTokens({ token, refreshToken });
        
        // Store normalized user data
        const normalizedUser = {
          ...userData,
          role: userData.role?.toLowerCase() || 'installer'
        };
        localStorage.setItem('jedUser', JSON.stringify(normalizedUser));
        return normalizedUser;
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  }

  /**
   * Verify current authentication token
   * GET /api/v1/auth/verify
   * @returns {Promise<Object>} User data if token is valid
   */
  async verifyAuth() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = this.getFullUrl('/verify', true);
      return await this.makeRequest(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('[Auth] Verification error:', error);
      throw error;
    }
  }

  /**
   * Logout user and invalidate token
   * POST /api/v1/auth/logout
   */
  async logout() {
    try {
      const token = this.getAuthToken();
      if (token) {
        const url = this.getFullUrl('/logout', true);
        await this.makeRequest(url, {
          method: 'POST',
          headers: this.getHeaders(),
        });
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  // ============================================
  // JED Integration Methods - POST
  // ============================================

  /**
   * Complete meter installation and notify JED
   * POST /api/v1/external/jed/complete-installation
   * @param {Object} installationData - Installation completion data
   * @returns {Promise} Installation completion response
   */
  async completeInstallation(installationData) {
    try {
      const url = this.getFullUrl('/complete-installation');
      return await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(installationData),
      });
    } catch (error) {
      console.error('[Installation] Complete installation error:', error);
      throw error;
    }
  }

  /**
   * Generate Remita payment reference for meter installation
   * POST /api/v1/external/jed/generate-ref
   * @param {Object} meterData - Meter installation data
   * @returns {Promise} Payment reference response
   */
  async generatePaymentReference(meterData) {
    try {
      const url = this.getFullUrl('/generate-ref');
      return await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(meterData),
      });
    } catch (error) {
      console.error('[Payment] Generate reference error:', error);
      throw error;
    }
  }

  /**
   * Confirm payment with JED after customer pays via Remita
   * POST /api/v1/external/jed/confirm-payment
   * @param {Object} paymentData - Payment confirmation data
   * @returns {Promise} Payment confirmation response
   */
  async confirmPayment(paymentData) {
    try {
      const url = this.getFullUrl('/confirm-payment');
      return await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    } catch (error) {
      console.error('[Payment] Confirm payment error:', error);
      throw error;
    }
  }

  /**
   * Remita webhook endpoint (array of webhook events)
   * POST /api/v1/external/jed/remita/webhook
   * @param {Array} webhookEvents - Array of webhook events from Remita
   * @returns {Promise} Webhook processing response
   */
  async handleRemitaWebhook(webhookEvents) {
    try {
      const url = this.getFullUrl('/remita/webhook');
      return await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(webhookEvents),
      });
    } catch (error) {
      console.error('[Webhook] Handle webhook error:', error);
      throw error;
    }
  }

  // ============================================
  // JED Integration Methods - GET
  // ============================================

  /**
   * Get single customer request by account number
   * GET /api/v1/external/jed/requests/{accountNumber}
   * @param {string} accountNumber - Customer account number
   * @returns {Promise} Customer request data
   */
  async getCustomerRequest(accountNumber) {
    try {
      const url = this.getFullUrl(`/requests/${accountNumber}`);
      return await this.makeRequest(url, {
        method: 'GET',
      });
    } catch (error) {
      console.error('[Requests] Get customer request error:', error);
      throw error;
    }
  }

  /**
   * Get all customer requests with pagination
   * GET /api/v1/external/jed/requests
   * @param {Object} params - Query parameters (page, limit, etc.)
   * @returns {Promise} Paginated customer requests
   */
  async getAllCustomerRequests(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = this.getFullUrl(`/requests${queryString ? `?${queryString}` : ''}`);
      return await this.makeRequest(url, {
        method: 'GET',
      });
    } catch (error) {
      console.error('[Requests] Get all requests error:', error);
      throw error;
    }
  }

  /**
   * Get customer requests by status
   * GET /api/v1/external/jed/requests/status/{status}
   * @param {string} status - Request status (pending, completed, failed, etc.)
   * @returns {Promise} Filtered customer requests by status
   */
  async getCustomerRequestsByStatus(status) {
    try {
      const url = this.getFullUrl(`/requests/status/${status}`);
      return await this.makeRequest(url, {
        method: 'GET',
      });
    } catch (error) {
      console.error('[Requests] Get by status error:', error);
      throw error;
    }
  }

  /**
   * Get installations by installer
   * GET /api/v1/external/jed/requests/installer/{employeeId}
   * @param {string} employeeId - Installer employee ID
   * @returns {Promise} Installations by specific installer
   */
  async getInstallationsByInstaller(employeeId) {
    try {
      const url = this.getFullUrl(`/requests/installer/${employeeId}`);
      return await this.makeRequest(url, {
        method: 'GET',
      });
    } catch (error) {
      console.error('[Installer] Get installations error:', error);
      throw error;
    }
  }

  /**
   * Get installer statistics and performance
   * GET /api/v1/external/jed/installers/{employeeId}/stats
   * @param {string} employeeId - Installer employee ID
   * @returns {Promise} Installer statistics
   */
  async getInstallerStats(employeeId) {
    try {
      const url = this.getFullUrl(`/installers/${employeeId}/stats`);
      return await this.makeRequest(url, {
        method: 'GET',
      });
    } catch (error) {
      console.error('[Installer] Get stats error:', error);
      throw error;
    }
  }

  // ============================================
  // User Management Methods (Admin)
  // ============================================

  /**
   * Get all users with pagination
   * GET /api/v1/auth/users
   * @param {Object} params - Query parameters (page, limit, etc.)
   * @returns {Promise<Object>} Paginated list of users
   */
  async getUsers(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = this.getFullUrl(`/users${queryString ? `?${queryString}` : ''}`, true);
      return await this.makeRequest(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('[Users] Get users error:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * POST /api/v1/auth/users
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user data
   */
  async createUser(userData) {
    try {
      const url = this.getFullUrl('/users', true);
      return await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });
    } catch (error) {
      console.error('[Users] Create user error:', error);
      throw error;
    }
  }

  /**
   * Update an existing user
   * PUT /api/v1/auth/users/{userId}
   * @param {string} userId - ID of the user to update
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, userData) {
    try {
      const url = this.getFullUrl(`/users/${userId}`, true);
      return await this.makeRequest(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });
    } catch (error) {
      console.error('[Users] Update user error:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   * DELETE /api/v1/auth/users/{userId}
   * @param {string} userId - ID of the user to delete
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteUser(userId) {
    try {
      const url = this.getFullUrl(`/users/${userId}`, true);
      return await this.makeRequest(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('[Users] Delete user error:', error);
      throw error;
    }
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Get auth token for API requests
   * @returns {string|null} Current auth token
   */
  getAuthToken() {
    return localStorage.getItem('jedAuthToken');
  }

  /**
   * Get refresh token
   * @returns {string|null} Current refresh token
   */
  getRefreshToken() {
    return localStorage.getItem('jedRefreshToken');
  }

  /**
   * Store authentication tokens
   * @param {Object} tokens - Auth and refresh tokens
   * @param {string} tokens.token - Authentication token
   * @param {string} [tokens.refreshToken] - Refresh token
   */
  storeTokens(tokens) {
    if (tokens.token) {
      localStorage.setItem('jedAuthToken', tokens.token);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('jedRefreshToken', tokens.refreshToken);
    }
  }

  /**
   * Clear all stored tokens
   */
  clearTokens() {
    localStorage.removeItem('jedAuthToken');
    localStorage.removeItem('jedRefreshToken');
    localStorage.removeItem('jedUser');
  }

  /**
   * Check if current token needs refresh
   * @returns {boolean} True if token needs refresh
   */
  needsRefresh() {
    return true; // Always refresh to ensure token validity
  }

  /**
   * Refresh auth token using refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const url = this.getFullUrl('/refresh', true);
      const tokens = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      this.storeTokens(tokens);
      return tokens;

    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      this.clearTokens(); // Clear invalid tokens
      throw error;
    }
  }

  /**
   * Ensure valid auth token exists, refreshing if necessary
   * @returns {Promise<string>} Valid auth token
   */
  async ensureValidToken() {
    if (this.needsRefresh()) {
      await this.refreshToken();
    }
    return this.getAuthToken();
  }

  /**
   * Check if user session has timed out
   * @returns {boolean} True if session has timed out
   * @deprecated Session timeout has been removed
   */
  isSessionTimedOut() {
    return false; // Session timeout functionality removed
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get API documentation URL
   * @returns {string} API documentation URL
   */
  getApiDocsUrl() {
    return `${this.baseUrl}/api-docs`;
  }

  /**
   * Get API base URL
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    return `${this.baseUrl}${this.version}${this.jedEndpoint}`;
  }

  /**
   * Check API health
   * @returns {Promise<boolean>} True if API is healthy
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get stored user data
   * @returns {Object|null} User data if available
   */
  getStoredUser() {
    try {
      const userStr = localStorage.getItem('jedUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
const jedApiService = new JEDApiService();
export default jedApiService;

// Also export the class for testing
export { JEDApiService };