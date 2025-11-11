// src/services/api.js
// ============================================
// JED API Service - Refactored & Optimized
// ============================================

// Enable API debugging globally if needed (set via window.DEBUG_API = true in console)
if (typeof window !== 'undefined' && window.DEBUG_API) {
  console.log('[API] Debug mode enabled - all API calls will be logged');
}

// API Configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://pharez-api.onrender.com',
  VERSION: '/api/v1',
  ENDPOINTS: {
    AUTH: '/auth',
    JED: '/external/jed'
  },
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  RETRY_CONFIG: {
    MAX_RETRIES: 2,
    BASE_DELAY: 500
  }
};

// Error types for consistent error handling
const ERROR_TYPES = {
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  NETWORK: 'NETWORK_ERROR'
};

class JEDApiService {
  constructor() {
    this.config = API_CONFIG;
  }

  // URL construction helper
  buildUrl(endpoint, isAuthEndpoint = false) {
    const baseEndpoint = isAuthEndpoint 
      ? this.config.ENDPOINTS.AUTH 
      : this.config.ENDPOINTS.JED;
    
    return `${this.config.BASE_URL}${this.config.VERSION}${baseEndpoint}${endpoint}`;
  }

  // Generic API URL helper (for endpoints that are not under the JED namespace)
  buildApiUrl(endpoint) {
    return `${this.config.BASE_URL}${this.config.VERSION}${endpoint}`;
  }

  // Header construction helper
  buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Enhanced request method with better error handling and retry logic
  async makeRequest(url, options = {}) {
    const { maxRetries = this.config.RETRY_CONFIG.MAX_RETRIES } = options;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[API] Request to ${url} (attempt ${attempt + 1})`, { method: options.method });

        // Respect FormData bodies by allowing the browser to set Content-Type
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
        const headers = this.buildHeaders(options.headers);
        if (isFormData && headers['Content-Type']) {
          delete headers['Content-Type'];
        }

        // Log request body (truncate for large payloads)
        if (options.body && typeof options.body === 'string') {
          const bodyTrunc = options.body.length > 200 ? options.body.substring(0, 200) + '...' : options.body;
          console.log('[API] Request body:', bodyTrunc);
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        const result = await this.handleResponse(response);
        return result;

      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(attempt);
          console.warn(`[API] Retrying after ${delay}ms...`);
          await this.delay(delay);
          continue;
        }
        break;
      }
    }

    throw this.enhanceError(lastError);
  }

  // Handle API response with consistent error formatting
  async handleResponse(response) {
    console.log(`[API] Response: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    let data;

    try {
      // Check if response is HTML (common sign of error page or CORS issue)
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

  // Handle different error responses
  handleErrorResponse(response, data) {
    const { status } = response;

    if (status === 401) {
      this.clearTokens();
      throw new Error(`${ERROR_TYPES.AUTH}:${data?.message || 'Invalid credentials'}`);
    }

    // Check for common error indicators
    const errorMsg = String(data?.message || data?.error || '').toLowerCase();
    const isHtmlError = errorMsg.includes('doctype') || errorMsg.includes('<!');
    
    if (isHtmlError) {
      console.error('[API] Server returned HTML error page — possible CORS or server issue');
      throw new Error(`${ERROR_TYPES.SERVER}:Server responded with an error page — check CORS and API endpoint`);
    }

    const errorMap = {
      400: `${ERROR_TYPES.VALIDATION}:${data?.message || 'Invalid request'}`,
      403: `${ERROR_TYPES.PERMISSION}:${data?.message || 'Access denied'}`,
      404: `${ERROR_TYPES.NOT_FOUND}:${data?.message || 'Resource not found'}`,
      500: `${ERROR_TYPES.SERVER}:${data?.message || 'Internal server error'}`
    };

    const errorMessage = errorMap[status] || 
      data?.message || 
      data?.error || 
      `HTTP ${status}: ${response.statusText}`;

    throw new Error(errorMessage);
  }

  // Enhanced error handling
  enhanceError(error) {
    if (error.message && error.message.includes('401')) {
      this.clearTokens();
      return new Error('Authentication required. Please login again.');
    }

    // Network errors
    if (error.name === 'TypeError' || error.message.toLowerCase().includes('network')) {
      return new Error(`${ERROR_TYPES.NETWORK}:Unable to connect to server`);
    }

    return error;
  }

  // Retry logic helpers
  shouldRetry(error) {
    const isServerError = error.message?.match(/^HTTP 5/);
    const isNetworkError = error.message?.includes(ERROR_TYPES.NETWORK);
    return isServerError || isNetworkError;
  }

  calculateRetryDelay(attempt) {
    return this.config.RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authentication Methods
  async register(userData) {
    console.log('[Auth] Register:', { phone: userData.phone, role: userData.role });
    const url = this.buildUrl('/register', true);
    
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    console.log('[Auth] Login request:', { phone: credentials.phone, hasPassword: !!credentials.password });
    const url = this.buildUrl('/login', true);
    
    // Primary payload shape
    const payloads = [
      { phone: credentials.phone, password: credentials.password },
      { phoneNumber: credentials.phone, password: credentials.password },
      { username: credentials.phone, password: credentials.password },
      { data: { phone: credentials.phone, password: credentials.password } }
    ];

    let response = null;
    let lastErr = null;

    for (let i = 0; i < payloads.length; i++) {
      const p = payloads[i];
      try {
        console.log(`[Auth] Login attempt ${i + 1}/${payloads.length} with payload:`, JSON.stringify(p).substring(0, 100));
        response = await this.makeRequest(url, {
          method: 'POST',
          body: JSON.stringify(p),
        });
        console.log('[Auth] Login successful on attempt', i + 1);
        // stop on success
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`[Auth] Login attempt ${i + 1} failed:`, err.message);
        // If server indicates password/phone required, try next payload. Otherwise, rethrow for non-validation errors.
        const msg = String(err?.message || '').toLowerCase();
        if (!msg.includes('password is required') && !msg.includes('phone is required') && !msg.includes('validation')) {
          throw err;
        }
        // else continue to try alternate payload shapes
      }
    }

    if (!response) {
      // all attempts failed
      console.error('[Auth] All login attempts failed:', lastErr?.message);
      throw lastErr || new Error(`${ERROR_TYPES.VALIDATION}:Invalid authentication response`);
    }

    // extractAuthData returns { userData, token }
    const { userData, token } = this.extractAuthData(response);

    if (!userData || !token) {
      console.error('[Auth] Response extraction failed - userData:', userData, 'token:', !!token);
      throw new Error(`${ERROR_TYPES.VALIDATION}:Invalid authentication response`);
    }

    console.log('[Auth] Login successful - storing user:', { id: userData.id, phone: userData.phone, role: userData.role });
    this.storeTokens({ token });
    this.storeUser(userData);

    return this.normalizeUserData(userData);
  }

  // Extract authentication data from various response formats
  extractAuthData(response) {
    console.log('[Auth] Extracting auth data from response:', response);
    let userData = null;
    let token = null;

    // Try nested data.user format
    if (response.data?.user) {
      userData = response.data.user;
      token = response.data.token || response.token;
    }
    // Try response.user format
    else if (response.user) {
      userData = response.user;
      token = response.token;
    }
    // Try response body is user object directly
    else if (response.phone && response.role) {
      userData = response;
      token = response.token || response.accessToken || response.access_token;
    }
    // Try data is user object
    else if (response.data && response.data.phone && response.data.role) {
      userData = response.data;
      token = response.token || response.data.token;
    }

    console.log('[Auth] Extracted - userData found:', !!userData, 'token found:', !!token);
    return { userData, token };
  }

  // Normalize user data structure
  normalizeUserData(userData) {
    return {
      ...userData,
      role: (userData.role?.toLowerCase() || 'installer')
    };
  }

  // User Management Methods
  async getProfile() {
    const url = this.buildUrl('/profile', true);
    const response = await this.makeRequest(url, { method: 'GET' });

    if (response.user) {
      this.storeUser(response.user);
    }

    return response;
  }

  async updateProfile(profileData) {
    const url = this.buildUrl('/profile', true);
    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });

    if (response.user) {
      this.storeUser(response.user);
    }
    
    return response;
  }

  async changePassword(passwordData) {
    const url = this.buildUrl('/change-password', true);
    return await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  async logout() {
    try {
      const token = this.getAuthToken();
      if (token) {
        const url = this.buildUrl('/logout', true);
        try {
          console.log('[Auth] Attempting server logout...');
          await this.makeRequest(url, { method: 'POST' });
          console.log('[Auth] Server logout successful');
        } catch (err) {
          // 404 means endpoint doesn't exist on backend — this is not critical
          if (err.message && err.message.includes('NOT_FOUND')) {
            console.warn('[Auth] Logout endpoint not found on server, proceeding with local logout');
          } else {
            console.warn('[Auth] Server logout failed:', err.message);
          }
          // Continue with local logout regardless of server error
        }
      } else {
        console.log('[Auth] No token found, skipping server logout');
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      console.log('[Auth] Clearing local tokens');
      this.clearTokens();
    }
  }

  // JED Integration Methods
  async completeInstallation(installationData) {
    const url = this.buildUrl('/complete-installation');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(installationData),
    });
  }

  async generatePaymentReference(meterData) {
    const url = this.buildUrl('/generate-ref');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(meterData),
    });
  }

  async confirmPayment(paymentData) {
    const url = this.buildUrl('/confirm-payment');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async handleRemitaWebhook(webhookEvents) {
    const url = this.buildUrl('/remita/webhook');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(webhookEvents),
    });
  }

  async getCustomerRequest(accountNumber) {
    const url = this.buildUrl(`/requests/${accountNumber}`);
    return await this.makeRequest(url, { method: 'GET' });
  }

  async getAllCustomerRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = this.buildUrl(`/requests${queryString ? `?${queryString}` : ''}`);
    return await this.makeRequest(url, { method: 'GET' });
  }

  // Admin Methods
  async getDashboardStats() {
    const url = this.buildUrl('/dashboard/stats');
    return await this.makeRequest(url, { method: 'GET' });
  }

  async getInstallerPerformance(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = this.buildUrl(`/installer/performance${query ? `?${query}` : ''}`);
    return await this.makeRequest(url, { method: 'GET' });
  }

  // Meters endpoints (based on API documentation)
  async uploadMeters(formData) {
    // formData should be a FormData instance containing the file under 'file' or similar key
    const url = this.buildApiUrl('/meters/upload');
    return await this.makeRequest(url, {
      method: 'POST',
      body: formData,
    });
  }

  async downloadMetersTemplate() {
    const url = this.buildApiUrl('/meters/template');
    // Return the raw blob for download
    const headers = this.buildHeaders();
    if (headers['Content-Type']) delete headers['Content-Type'];

    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `Failed to download template: ${resp.status}`);
    }
    return await resp.blob();
  }

  async exportMeters(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = this.buildApiUrl(`/meters/export${query ? `?${query}` : ''}`);
    // Return blob
    const headers = this.buildHeaders();
    if (headers['Content-Type']) delete headers['Content-Type'];

    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `Failed to export meters: ${resp.status}`);
    }
    return await resp.blob();
  }

  async getMeters(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = this.buildApiUrl(`/meters${query ? `?${query}` : ''}`);
    return await this.makeRequest(url, { method: 'GET' });
  }

  async getMeterStatistics() {
    const url = this.buildApiUrl('/meters/statistics');
    return await this.makeRequest(url, { method: 'GET' });
  }

  async getMeterById(id) {
    const url = this.buildApiUrl(`/meters/${id}`);
    return await this.makeRequest(url, { method: 'GET' });
  }

  async getMeterByNumber(meterNumber) {
    const url = this.buildApiUrl(`/meters/meter-number/${meterNumber}`);
    return await this.makeRequest(url, { method: 'GET' });
  }

  async deleteMeter(meterNumber) {
    const url = this.buildApiUrl(`/meters/${meterNumber}`);
    return await this.makeRequest(url, { method: 'DELETE' });
  }

  async exportCustomerRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = this.buildApiUrl(`/meters/customer-requests/export${query ? `?${query}` : ''}`);
    const headers = this.buildHeaders();
    if (headers['Content-Type']) delete headers['Content-Type'];

    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `Failed to export customer requests: ${resp.status}`);
    }
    return await resp.blob();
  }

  // Uploads / Excel processing endpoints
  async uploadAndProcessExcel(endpoint, formData) {
    const url = this.buildApiUrl(endpoint);
    const headers = this.buildHeaders();
    // Let the browser set Content-Type for FormData
    if (headers['Content-Type']) delete headers['Content-Type'];

    const resp = await fetch(url, { method: 'POST', headers, body: formData });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || `Upload failed: ${resp.status}`);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await resp.json();
    }
    // If server returns a modified file, return Blob
    return await resp.blob();
  }

  async uploadExcel(formData) {
    return await this.uploadAndProcessExcel('/uploads/excel', formData);
  }

  async uploadExcelFirstSheet(formData) {
    return await this.uploadAndProcessExcel('/uploads/excel-first-sheet', formData);
  }

  async uploadExcelModified(formData) {
    // This endpoint may return a modified file; uploadAndProcessExcel will return JSON or Blob accordingly
    return await this.uploadAndProcessExcel('/uploads/excel-modified', formData);
  }

  // Token Management
  getAuthToken() {
    return localStorage.getItem('jedAuthToken');
  }

  getRefreshToken() {
    return localStorage.getItem('jedRefreshToken');
  }

  storeTokens(tokens) {
    if (tokens.token) {
      localStorage.setItem('jedAuthToken', tokens.token);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('jedRefreshToken', tokens.refreshToken);
    }
  }

  storeUser(userData) {
    localStorage.setItem('jedUser', JSON.stringify(userData));
  }

  clearTokens() {
    localStorage.removeItem('jedAuthToken');
    localStorage.removeItem('jedRefreshToken');
    localStorage.removeItem('jedUser');
  }

  getStoredUser() {
    try {
      const userStr = localStorage.getItem('jedUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('[Auth] Error parsing stored user:', error);
      return null;
    }
  }

  isAuthenticated() {
    return !!this.getAuthToken() && !!this.getStoredUser();
  }

  getUserRole() {
    const user = this.getStoredUser();
    return user?.role || null;
  }

  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  isInstaller() {
    return this.getUserRole() === 'installer';
  }

  // API Integration Health Check
  async validateApiIntegration() {
    console.log('[API Health Check] Starting validation...');
    const checks = {
      baseUrl: !!this.config.BASE_URL,
      authEndpoint: !!this.config.ENDPOINTS.AUTH,
      jedEndpoint: !!this.config.ENDPOINTS.JED,
      hasTokenStorage: !!localStorage,
      methods: {
        login: typeof this.login === 'function',
        getProfile: typeof this.getProfile === 'function',
        getAllCustomerRequests: typeof this.getAllCustomerRequests === 'function',
        getDashboardStats: typeof this.getDashboardStats === 'function',
        uploadExcel: typeof this.uploadExcel === 'function',
        downloadMetersTemplate: typeof this.downloadMetersTemplate === 'function'
      }
    };
    
    console.log('[API Health Check] Results:', checks);
    const allPass = Object.values(checks).every(v => v === true || (typeof v === 'object' && Object.values(v).every(vv => vv === true)));
    console.log('[API Health Check]', allPass ? 'PASSED' : 'FAILED');
    return allPass;
  }
}

// Export both the class and a singleton instance
const jedApi = new JEDApiService();

export { JEDApiService, ERROR_TYPES };
export default jedApi;