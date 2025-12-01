// src/services/api.js
// ============================================
// Optimized JED API Service with Enhanced Configuration
// ============================================

import { 
  API_CONFIG, 
  ENDPOINTS, 
  ERROR_TYPES, 
  ERROR_CODES,
  API_UTILS 
} from './api.config.js';

// Enable API debugging globally if needed
if (typeof window !== 'undefined' && window.DEBUG_API) {
  console.log('[API] Debug mode enabled - all API calls will be logged');
}

class JEDApiService {
  // Static properties for configuration
  static config = API_CONFIG;
  static endpoints = ENDPOINTS;
  static errorTypes = ERROR_TYPES;
  static errorCodes = ERROR_CODES;
  static utils = API_UTILS;
    
  // Static cache properties
  static requestCache = new Map();
  static cacheTimeout = 30000; // 30 seconds

  // Enhanced request method with caching and better error handling
  static async makeRequest(url, options = {}) {
    const { 
      maxRetries = this.config.RETRY_CONFIG.MAX_RETRIES,
      useCache = false,
      cacheKey = null,
      ...requestOptions 
    } = options;

    // Check cache first if enabled
    if (useCache && cacheKey) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        console.log('[API] Returning cached response for:', cacheKey);
        return cached;
      }
    }

    let lastError;
    let response;
    let timeoutId;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[API] Request to ${url} (attempt ${attempt + 1})`, { 
          method: requestOptions.method,
          cache: useCache ? 'enabled' : 'disabled'
        });

        // Build headers with FormData support
        const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;
        const headers = this.utils.buildHeaders(requestOptions.headers);
        
        if (isFormData && headers['Content-Type']) {
          delete headers['Content-Type'];
        }

        // Log request body (truncate for large payloads)
        if (requestOptions.body && typeof requestOptions.body === 'string') {
          const bodyTrunc = requestOptions.body.length > 200 ? 
            requestOptions.body.substring(0, 200) + '...' : requestOptions.body;
          console.log('[API] Request body:', bodyTrunc);
        }

        // Add timeout support
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), this.utils.getTimeout(url));
        
        response = await fetch(url, {
          ...requestOptions,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await this.handleResponse(response);
        
        // Cache successful responses
        if (useCache && cacheKey && this.utils.isSuccessResponse(response)) {
          this.setCachedResponse(cacheKey, result);
        }

        return result;

      } catch (error) {
        lastError = error;
        if (timeoutId) clearTimeout(timeoutId);
        
        // Check if we should retry
        if (attempt < maxRetries && this.utils.shouldRetry(error)) {
          const delay = this.utils.calculateRetryDelay(attempt);
          console.warn(`[API] Retrying after ${delay}ms...`);
          await this.utils.delay(delay);
          continue;
        }
        break;
      }
    }

    throw this.enhanceError(lastError);
  }

  // Cache management methods
  static getCachedResponse(key) {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  static setCachedResponse(key, data) {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  static clearCache() {
    this.requestCache.clear();
  }

  // Handle API response with consistent error formatting
  static async handleResponse(response) {
    console.log(`[API] Response: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    let data;

    try {
      if (contentType?.includes('text/html') || contentType?.includes('text/plain')) {
        const text = await response.text();
        console.warn('[API] Received HTML/text response instead of JSON:', text.substring(0, 100));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Server returned HTML error page`);
        }
        data = { message: text };
      } else if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn('[API] Unknown content type:', contentType);
        data = text ? { message: text } : { message: 'Empty response' };
      }
    } catch (parseError) {
      console.error('[API] Response parse error:', parseError);
      data = { message: 'Invalid response format' };
    }

    if (!response.ok) {
      this.handleErrorResponse(response, data);
    }

    console.log('[API] Success Response:', data);
    return data;
  }

  // Enhanced error handling with specific error types
  static handleErrorResponse(response, data) {
    const { status } = response;

    if (status === 401) {
      this.clearTokens();
      throw new Error(`${this.errorTypes.AUTH}:${data?.message || 'Invalid credentials'}`);
    }

    const errorMsg = String(data?.message || data?.error || '').toLowerCase();
    const isHtmlError = errorMsg.includes('doctype') || errorMsg.includes('<!');
    
    if (isHtmlError) {
      console.error('[API] Server returned HTML error page — possible CORS or server issue');
      throw new Error(`${this.errorTypes.SERVER}:Server responded with an error page — check CORS and API endpoint`);
    }

    const errorMap = {
      400: `${this.errorTypes.VALIDATION}:${data?.message || 'Invalid request'}`,
      403: `${this.errorTypes.PERMISSION}:${data?.message || 'Access denied'}`,
      404: `${this.errorTypes.NOT_FOUND}:${data?.message || 'Resource not found'}`,
      500: `${this.errorTypes.SERVER}:${data?.message || 'Internal server error'}`
    };

    const errorMessage = errorMap[status] || 
      data?.message || 
      data?.error || 
      `HTTP ${status}: ${response.statusText}`;

    throw new Error(errorMessage);
  }

  // Enhanced error handling with specific error categorization
  static enhanceError(error) {
    if (error.message && error.message.includes('401')) {
      this.clearTokens();
      return new Error('Authentication required. Please login again.');
    }

    if (error.name === 'TypeError' || error.message.toLowerCase().includes('network')) {
      return new Error(`${this.errorTypes.NETWORK}:Unable to connect to server`);
    }

    if (error.name === 'AbortError') {
      return new Error(`${this.errorTypes.NETWORK}:Request timeout`);
    }

    return error;
  }

  // URL construction using config utilities
  static buildUrl(endpoint, isAuthEndpoint = false) {
    const group = isAuthEndpoint ? 'AUTH' : 'JED';
    return this.utils.buildUrl(endpoint, group);
  }

  static buildApiUrl(endpoint) {
    return this.utils.buildApiUrl(endpoint);
  }

  // ==================== AUTHENTICATION METHODS ====================
  static async register(userData) {
    console.log('[Auth] Register:', { phone: userData.phone, role: userData.role });
    const url = this.buildUrl(this.endpoints.AUTH.REGISTER, true);
    
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async login(credentials) {
    console.log('[Auth] Login request:', { phone: credentials.phone, hasPassword: !!credentials.password });
    const url = this.buildUrl(this.endpoints.AUTH.LOGIN, true);
    
    const payloads = [
      { phone: credentials.phone, password: credentials.password },
      { phoneNumber: credentials.phone, password: credentials.password },
      { username: credentials.phone, password: credentials.password },
      { data: { phone: credentials.phone, password: credentials.password } }
    ];

    let response = null;
    let lastErr = null;

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      try {
        console.log(`[Auth] Login attempt ${i + 1}/${payloads.length}`);
        response = await this.makeRequest(url, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        console.log('[Auth] Login successful on attempt', i + 1);
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`[Auth] Login attempt ${i + 1} failed:`, err.message);
        
        const msg = String(err?.message || '').toLowerCase();
        const isValidationError = msg.includes('password is required') || 
                                 msg.includes('phone is required') || 
                                 msg.includes('validation');
        
        if (!isValidationError) {
          throw err;
        }
      }
    }

    if (!response) {
      console.error('[Auth] All login attempts failed:', lastErr?.message);
      throw lastErr || new Error(`${this.errorTypes.VALIDATION}:Invalid authentication response`);
    }

    const { userData, token } = this.extractAuthData(response);

    if (!userData || !token) {
      console.error('[Auth] Response extraction failed');
      throw new Error(`${this.errorTypes.VALIDATION}:Invalid authentication response`);
    }

    console.log('[Auth] Login successful - storing user:', { 
      id: userData.id, 
      phone: userData.phone, 
      role: userData.role 
    });
    
    this.storeTokens({ token });
    this.storeUser(userData);

    return this.normalizeUserData(userData);
  }

  static extractAuthData(response) {
    console.log('[Auth] Extracting auth data from response');
    let userData = null;
    let token = null;

    if (response.data?.user) {
      userData = response.data.user;
      token = response.data.token || response.token;
    } else if (response.user) {
      userData = response.user;
      token = response.token;
    } else if (response.phone && response.role) {
      userData = response;
      token = response.token || response.accessToken || response.access_token;
    } else if (response.data && response.data.phone && response.data.role) {
      userData = response.data;
      token = response.token || response.data.token;
    }

    console.log('[Auth] Extracted - userData found:', !!userData, 'token found:', !!token);
    return { userData, token };
  }

  static normalizeUserData(userData) {
    return {
      ...userData,
      role: (userData.role?.toLowerCase() || 'installer').trim()
    };
  }

  // ==================== USER MANAGEMENT METHODS ====================
  static async getProfile() {
    const url = this.buildUrl(this.endpoints.AUTH.PROFILE, true);
    const response = await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: 'user-profile'
    });

    if (response.user) {
      this.storeUser(response.user);
      this.clearCache();
    }

    return response;
  }

  static async updateProfile(profileData) {
    const url = this.buildUrl(this.endpoints.AUTH.PROFILE, true);
    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });

    if (response.user) {
      this.storeUser(response.user);
      this.clearCache();
    }
    
    return response;
  }

  static async changePassword(passwordData) {
    const url = this.buildUrl(this.endpoints.AUTH.CHANGE_PASSWORD, true);
    return await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  static async logout() {
    try {
      const token = this.getAuthToken();
      if (token) {
        const url = this.buildUrl(this.endpoints.AUTH.LOGOUT, true);
        try {
          console.log('[Auth] Attempting server logout...');
          await this.makeRequest(url, { method: 'POST' });
          console.log('[Auth] Server logout successful');
        } catch (err) {
          if (err.message && err.message.includes('NOT_FOUND')) {
            console.warn('[Auth] Logout endpoint not found on server, proceeding with local logout');
          } else {
            console.warn('[Auth] Server logout failed:', err.message);
          }
        }
      } else {
        console.log('[Auth] No token found, skipping server logout');
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      console.log('[Auth] Clearing local tokens and cache');
      this.clearTokens();
      this.clearCache();
    }
  }

  // ==================== JED INTEGRATION METHODS ====================
  static async completeInstallation(installationData) {
    const url = this.buildUrl(this.endpoints.JED.COMPLETE_INSTALLATION);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(installationData),
    });
  }

  static async generatePaymentReference(meterData) {
    const url = this.buildUrl(this.endpoints.JED.GENERATE_REF);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(meterData),
    });
  }

  static async confirmPayment(paymentData) {
    const url = this.buildUrl(this.endpoints.JED.CONFIRM_PAYMENT);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  static async getCustomerRequest(accountNumber) {
    const url = this.buildUrl(this.endpoints.JED.GET_REQUEST_BY_ACCOUNT(accountNumber));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `customer-request-${accountNumber}`
    });
  }

  static async getAllCustomerRequests(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.JED.GET_ALL_REQUESTS, 
      params, 
      'JED'
    );
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `all-requests-${JSON.stringify(params)}`
    });
  }

  // ==================== ADMIN & DASHBOARD METHODS ====================
  static async getDashboardStats() {
    const url = this.buildApiUrl(this.endpoints.ADMIN.DASHBOARD_STATS);
    console.log('[API] Calling dashboard stats endpoint:', url);
    
    try {
      return await this.makeRequest(url, { 
        method: 'GET',
        useCache: true,
        cacheKey: 'dashboard-stats'
      });
    } catch (error) {
      if (error.message?.includes('PERMISSION_ERROR') || error.message?.includes('403')) {
        console.warn('[API] Dashboard stats requires admin permissions');
        throw new Error('PERMISSION_ERROR:Dashboard stats endpoint requires admin role');
      }
      throw error;
    }
  }

  static async getInstallerPerformance(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.JED.GET_INSTALLER_PERFORMANCE, 
      params, 
      'JED'
    );
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `installer-performance-${JSON.stringify(params)}`
    });
  }

  static async getInstallerDashboard() {
    try {
      const url = this.buildUrl(this.endpoints.JED.GET_INSTALLER_DASHBOARD);
      return await this.makeRequest(url, { 
        method: 'GET',
        useCache: true,
        cacheKey: 'installer-dashboard'
      });
    } catch (error) {
      if (error.message?.includes('NOT_FOUND') || error.message?.includes('404')) {
        console.warn('[API] Installer dashboard endpoint not found, will calculate from requests');
        return null;
      }
      throw error;
    }
  }

  // ==================== METERS MANAGEMENT METHODS ====================
  static async uploadMeters(formData) {
    const url = this.buildApiUrl(this.endpoints.METERS.UPLOAD);
    return await this.makeRequest(url, {
      method: 'POST',
      body: formData,
    });
  }

  static async downloadMetersTemplate() {
    const url = this.buildApiUrl(this.endpoints.METERS.TEMPLATE);
    const headers = this.utils.buildHeaders();
    delete headers['Content-Type'];

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to download template: ${response.status}`);
    }
    return await response.blob();
  }

  static async exportMeters(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.METERS.EXPORT, 
      params
    );
    const headers = this.utils.buildHeaders();
    delete headers['Content-Type'];

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to export meters: ${response.status}`);
    }
    return await response.blob();
  }

  static async getMeters(params = {}) {
    // Ensure only valid parameters are sent
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '' && v !== 'ALL')
    );
    const queryString = new URLSearchParams(cleanParams).toString();
    const url = `${this.buildApiUrl(this.endpoints.METERS.BASE)}?${queryString}`;
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meters-${JSON.stringify(params)}`
    });
  }

  static async getMeterStatistics() {
    const url = this.buildApiUrl(this.endpoints.METERS.STATISTICS);
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: 'meter-statistics'
    });
  }

  static async getMeterById(id) {
    const url = this.buildApiUrl(this.endpoints.METERS.BY_ID(id));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-${id}`
    });
  }

  static async getMeterByNumber(meterNumber) {
    const url = this.buildApiUrl(this.endpoints.METERS.BY_NUMBER(meterNumber));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-number-${meterNumber}`
    });
  }

  static async deleteMeter(meterNumber) {
    const url = this.buildApiUrl(this.endpoints.METERS.BY_ID(meterNumber));
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  static async exportCustomerRequests(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.METERS.CUSTOMER_REQUESTS_EXPORT,
      params
    );
    const headers = this.utils.buildHeaders();
    delete headers['Content-Type'];

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to export customer requests: ${response.status}`);
    }
    return await response.blob();
  }

  // ==================== UPLOADS METHODS ====================
  static async uploadExcel(formData) {
    const url = this.buildApiUrl(this.endpoints.UPLOADS.EXCEL);
    return await this.uploadAndProcessExcel(url, formData);
  }

  static async uploadExcelFirstSheet(formData) {
    const url = this.buildApiUrl(this.endpoints.UPLOADS.EXCEL_FIRST_SHEET);
    return await this.uploadAndProcessExcel(url, formData);
  }

  static async uploadExcelModified(formData) {
    const url = this.buildApiUrl(this.endpoints.UPLOADS.EXCEL_MODIFIED);
    return await this.uploadAndProcessExcel(url, formData);
  }

  static async uploadAndProcessExcel(url, formData) {
    const headers = this.utils.buildHeaders();
    delete headers['Content-Type'];

    const response = await fetch(url, { method: 'POST', headers, body: formData });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Upload failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.blob();
  }

  // ==================== COMPLAINTS METHODS ====================
  static async submitComplaint(complaintData) {
    const url = this.buildApiUrl(this.endpoints.COMPLAINTS.BASE);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(complaintData),
    });
  }

  static async getComplaints(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.COMPLAINTS.BASE,
      params
    );
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `complaints-${JSON.stringify(params)}`
    });
  }

  static async getComplaintById(complaintId) {
    const url = this.buildApiUrl(this.endpoints.COMPLAINTS.BY_ID(complaintId));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `complaint-${complaintId}`
    });
  }

  // ==================== SETTINGS MANAGEMENT METHODS ====================
  static async getMeterTypes(params = {}) {
    console.log('[API] Fetching meter types');
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );
    const queryString = new URLSearchParams(cleanParams).toString();
    const url = `${this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BASE)}?${queryString}`;
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-types-${JSON.stringify(params)}`
    });
  }

  static async getMeterTypeById(id) {
    console.log('[API] Fetching meter type:', id);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BY_ID(id));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-type-${id}`
    });
  }

  static async createMeterType(meterTypeData) {
    console.log('[API] Creating meter type:', meterTypeData);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BASE);
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(meterTypeData),
    });
    this.clearCache();
    return response;
  }

  static async updateMeterType(id, meterTypeData) {
    console.log('[API] Updating meter type:', id, meterTypeData);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BY_ID(id));
    const response = await this.makeRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(meterTypeData),
    });
    this.clearCache();
    return response;
  }

  static async deleteMeterType(id) {
    console.log('[API] Deleting meter type:', id);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BY_ID(id));
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  // ==================== USER MANAGEMENT METHODS ====================
  static async getUsers(params = {}) {
    console.log('[API] Fetching users');
    const url = this.utils.buildUrlWithParams(
      this.endpoints.ADMIN.USERS.BASE, 
      params,
      'AUTH'
    );
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `users-${JSON.stringify(params)}`
    });
  }

  static async getUserById(userId) {
    console.log('[API] Fetching user:', userId);
    const url = this.buildUrl(this.endpoints.ADMIN.USERS.BY_ID(userId), true);
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `user-${userId}`
    });
  }

  static async createUser(userData) {
    console.log('[API] Creating user:', userData.email);
    const url = this.buildUrl(this.endpoints.ADMIN.USERS.BASE, true);
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.clearCache();
    return response;
  }

  static async updateUser(userId, userData) {
    console.log('[API] Updating user:', userId);
    const url = this.buildUrl(this.endpoints.ADMIN.USERS.BY_ID(userId), true);
    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    this.clearCache();
    return response;
  }

  static async deleteUser(userId) {
    console.log('[API] Deleting user:', userId);
    const url = this.buildUrl(this.endpoints.ADMIN.USERS.BY_ID(userId), true);
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  // ==================== TOKEN & STORAGE MANAGEMENT ====================
  static getAuthToken() {
    return localStorage.getItem('jedAuthToken');
  }

  static getRefreshToken() {
    return localStorage.getItem('jedRefreshToken');
  }

  static storeTokens(tokens) {
    if (tokens.token) {
      localStorage.setItem('jedAuthToken', tokens.token);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('jedRefreshToken', tokens.refreshToken);
    }
  }

  static storeUser(userData) {
    localStorage.setItem('jedUser', JSON.stringify(userData));
  }

  static clearTokens() {
    localStorage.removeItem('jedAuthToken');
    localStorage.removeItem('jedRefreshToken');
    localStorage.removeItem('jedUser');
  }

  static getStoredUser() {
    try {
      const userStr = localStorage.getItem('jedUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('[Auth] Error parsing stored user:', error);
      return null;
    }
  }

  static isAuthenticated() {
    return !!this.getAuthToken() && !!this.getStoredUser();
  }

  static getUserRole() {
    const user = this.getStoredUser();
    return user?.role || null;
  }

  static isAdmin() {
    return this.getUserRole() === 'admin';
  }

  static isInstaller() {
    return this.getUserRole() === 'installer';
  }

  // ==================== HEALTH CHECK & VALIDATION ====================
  static async validateApiIntegration() {
    console.log('[API Health Check] Starting validation...');
    const checks = {
      baseUrl: !!this.config.BASE_URL,
      authEndpoint: !!this.config.ENDPOINT_GROUPS.AUTH,
      jedEndpoint: !!this.config.ENDPOINT_GROUPS.JED,
      hasTokenStorage: !!localStorage,
      methods: {
        login: typeof this.login === 'function',
        getMeterTypes: typeof this.getMeterTypes === 'function',
        getUsers: typeof this.getUsers === 'function',
        getDashboardStats: typeof this.getDashboardStats === 'function',
      }
    };
    
    console.log('[API Health Check] Results:', checks);
    const allPass = Object.values(checks.methods).every(v => v === true);
    console.log('[API Health Check]', allPass ? 'PASSED ✅' : 'FAILED ❌');
    return allPass;
  }
}

// Export both the class and a singleton instance
const jedApi = new JEDApiService();

export { JEDApiService, ERROR_TYPES }; // Keep class export for potential extension
export default JEDApiService; // Export the class as default