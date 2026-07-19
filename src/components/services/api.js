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
  constructor() {
    this.config = API_CONFIG;
    this.endpoints = ENDPOINTS;
    this.errorTypes = ERROR_TYPES;
    this.errorCodes = ERROR_CODES;
    this.utils = API_UTILS;
    
    // Request cache for deduplication
    this.requestCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  // Enhanced request method with caching and better error handling
  async makeRequest(url, options = {}) {
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

        const result = await this.handleResponse(response, { url, ...requestOptions });
        
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
  getCachedResponse(key) {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  setCachedResponse(key, data) {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.requestCache.clear();
  }

  // Handle API response with consistent error formatting
  async handleResponse(response, requestOptions = {}) {
    console.log(`[API] Response: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type') || '';
    let data;

    try {
      if (contentType.includes('text/html') || contentType.includes('text/plain')) {
        const text = await response.text();
        console.warn('[API] Received HTML/text response instead of JSON:', text.substring(0, 100));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Server returned HTML error page`);
        }
        data = { message: text };
      } else if (contentType.includes('application/json')) {
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
      this.handleErrorResponse(response, data, requestOptions);
    }

    console.log('[API] Success Response:', data);
    return data;
  }

  // FIXED: Enhanced error handling with specific error types
  handleErrorResponse(response, data, requestOptions = {}) {
    const { status } = response;
    const requestUrl = String(requestOptions.url || '').toLowerCase();
    const isAuthEndpoint = requestUrl.includes('/auth') || requestUrl.includes('/login') || requestUrl.includes('/logout') || requestUrl.includes('/refresh-token') || requestUrl.includes('/profile');

    // Only clear auth state for actual auth requests. Other endpoints should
    // surface the error without force-logging the user out.
    if (status === 401) {
      if (isAuthEndpoint) {
        this.clearTokens();
        throw new Error(`${this.errorTypes.AUTH}:${data?.message || 'Invalid credentials'}`);
      }

      throw new Error(data?.message || 'Authentication failed for this request');
    }

    // FIXED: Safely check error message with proper null/undefined handling
    const errorMsg = data?.message || data?.error || '';
    const errorMsgStr = String(errorMsg).toLowerCase(); // Convert to string safely
    const isHtmlError = errorMsgStr.includes('doctype') || errorMsgStr.includes('<!');
    
    if (isHtmlError) {
      console.error('[API] Server returned HTML error page — possible CORS or server issue');
      throw new Error(`${this.errorTypes.SERVER}:Server responded with an error page — check CORS and API endpoint`);
    }

    // Map status codes to error messages
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

  // FIXED: Enhanced error handling with specific error categorization
  enhanceError(error) {
    // Safely check error message
    const errorMsg = error?.message || '';
    const errorMsgStr = String(errorMsg).toLowerCase();
    const isAuthError = errorMsgStr.includes(this.errorTypes.AUTH.toLowerCase()) ||
      errorMsgStr.includes('authentication required') ||
      errorMsgStr.includes('invalid credentials');
    
    if (isAuthError) {
      this.clearTokens();
      return new Error('Authentication required. Please login again.');
    }

    if (error.name === 'TypeError' || errorMsgStr.includes('network')) {
      return new Error(`${this.errorTypes.NETWORK}:Unable to connect to server`);
    }

    if (error.name === 'AbortError') {
      return new Error(`${this.errorTypes.NETWORK}:Request timeout`);
    }

    return error;
  }

  // FIXED: URL construction using config utilities with validation
  buildUrl(endpoint, isAuthEndpoint = false) {
    // Ensure endpoint is a string
    if (!endpoint || typeof endpoint !== 'string') {
      console.error('[API] Invalid endpoint provided:', endpoint);
      throw new Error('Invalid endpoint: must be a non-empty string');
    }
    
    const group = isAuthEndpoint ? 'AUTH' : 'JED';
    return this.utils.buildUrl(endpoint, group);
  }

  buildApiUrl(endpoint) {
    // Ensure endpoint is a string
    if (!endpoint || typeof endpoint !== 'string') {
      console.error('[API] Invalid endpoint provided:', endpoint);
      throw new Error('Invalid endpoint: must be a non-empty string');
    }
    
    return this.utils.buildApiUrl(endpoint);
  }

  // ==================== AUTHENTICATION METHODS ====================
  async register(userData) {
    console.log('[Auth] Register:', { phone: userData.phone, role: userData.role });
    const url = this.buildUrl(this.endpoints.AUTH.REGISTER, true);
    
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
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
        const isAuthOrValidationError = msg.includes(this.errorTypes.AUTH.toLowerCase()) ||
                                        msg.includes(this.errorTypes.VALIDATION.toLowerCase()) ||
                                        msg.includes('invalid credentials');
        
        if (!isAuthOrValidationError) {
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

    // Diagnostic: installer-scoped features (My Jobs, Meter Schedule,
    // complete-installation payloads) expect an installer identifier.
    // Surface it loudly here rather than let it fail silently downstream —
    // this is exactly the gap that caused InstallerDashboard to hang
    // indefinitely on load until traced back to this field being absent.
    const normalizedRole = (userData.role || '').toLowerCase();
    if (normalizedRole === 'installer' && !userData.employeeId && !userData.staffId) {
      console.warn(
        '[Auth] Installer login response has no "employeeId" or "staffId" field. ' +
        'Installer-scoped API calls will fall back to user.id. If that is not the ' +
        'correct identifier, check the real field name on the login response and ' +
        'update AuthContext/normalizeUserData accordingly.'
      );
    }
    
    this.storeTokens({ token });
    this.storeUser(userData);

    return this.normalizeUserData(userData);
  }

  extractAuthData(response) {
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

  normalizeUserData(userData) {
    return {
      ...userData,
      role: (userData.role?.toLowerCase() || 'installer').trim()
    };
  }

  // ==================== VERIFICATION METHODS ====================
  async sendPhoneOTP(data) {
    const url = this.buildUrl(this.endpoints.AUTH.SEND_PHONE_OTP, true);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyPhone(data) {
    const url = this.buildUrl(this.endpoints.AUTH.VERIFY_PHONE, true);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendEmailOTP(data) {
    const url = this.buildUrl(this.endpoints.AUTH.SEND_EMAIL_OTP, true);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(data) {
    const url = this.buildUrl(this.endpoints.AUTH.VERIFY_EMAIL, true);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== USER MANAGEMENT METHODS ====================
  async getProfile() {
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

  async updateProfile(profileData) {
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

  async changePassword(passwordData) {
    const url = this.buildUrl(this.endpoints.AUTH.CHANGE_PASSWORD, true);
    return await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  async logout() {
    try {
      const token = this.getAuthToken();
      if (token) {
        const url = this.buildUrl(this.endpoints.AUTH.LOGOUT, true);
        try {
          console.log('[Auth] Attempting server logout...');
          await this.makeRequest(url, { method: 'POST' });
          console.log('[Auth] Server logout successful');
        } catch (err) {
          const errMsg = String(err?.message || '').toLowerCase();
          if (errMsg.includes('not_found') || errMsg.includes('404')) {
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
  // Phase 1 lifecycle:
  // 1. Customer requests meter via JED
  // 2. We generate RRR (generatePaymentReference) and send to JED
  // 3. Customer pays via Remita using the RRR
  // 4. Remita webhook notifies us of successful payment
  // 5. We confirmPayment with Remita -> Remita returns installation details
  // 6. Installer logs in, pulls jobs whose installation details are ready (getMyInstallations)
  // 7. Installer completes the physical install, calls completeInstallation

  async completeInstallation(installationData) {
    const url = this.buildUrl(this.endpoints.JED.COMPLETE_INSTALLATION);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(installationData),
    });
  }

  async generatePaymentReference(meterData) {
    const url = this.buildUrl(this.endpoints.JED.GENERATE_REF);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(meterData),
    });
  }

  async confirmPayment(paymentData) {
    const url = this.buildUrl(this.endpoints.JED.CONFIRM_PAYMENT);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  /**
   * NEW: Admin fallback — manually confirm a payment by RRR when the
   * Remita webhook was missed. POST /external/jed/confirm-payment/manual/{rrr}
   * @param {string} rrr - Remita Retrieval Reference
   */
  async confirmPaymentManually(rrr) {
    if (!rrr) throw new Error('confirmPaymentManually requires an rrr');
    const url = this.buildUrl(this.endpoints.JED.CONFIRM_PAYMENT_MANUAL(rrr));
    return await this.makeRequest(url, { method: 'POST' });
  }

  async getCustomerRequest(accountNumber) {
    const url = this.buildUrl(this.endpoints.JED.GET_REQUEST_BY_ACCOUNT(accountNumber));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `customer-request-${accountNumber}`
    });
  }

  async getAllCustomerRequests(params = {}) {
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

  /**
   * NEW: Export customer requests to Excel.
   * GET /external/jed/requests/export (admin-locked per API docs).
   * Distinct from exportCustomerRequests() below, which hits the METERS
   * group's /meters/customer-requests/export instead — kept separate
   * rather than merged, since they're genuinely different endpoints.
   * @param {Object} params - filter/date-range params
   * @returns {Promise<Blob>}
   */
  async exportJedRequests(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.JED.EXPORT_REQUESTS,
      params,
      'JED'
    );
    const headers = this.utils.buildHeaders();
    delete headers['Content-Type'];

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to export requests: ${response.status}`);
    }
    return await response.blob();
  }

  /**
   * NEW: Get payments (paid or completed), with optional date range/presets.
   * GET /external/jed/payments (admin-locked per API docs).
   * @param {Object} params - { startDate, endDate, preset, page, limit }
   */
  async getPayments(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.JED.GET_PAYMENTS,
      params,
      'JED'
    );
    return await this.makeRequest(url, {
      method: 'GET',
      useCache: true,
      cacheKey: `payments-${JSON.stringify(params)}`
    });
  }

  /**
   * NEW: Check a Remita transaction's status directly by RRR.
   * GET /external/jed/status/rrr/{rrr} (admin-locked per API docs).
   */
  async checkRemitaStatusByRRR(rrr) {
    if (!rrr) throw new Error('checkRemitaStatusByRRR requires an rrr');
    const url = this.buildUrl(this.endpoints.JED.CHECK_STATUS_BY_RRR(rrr));
    return await this.makeRequest(url, { method: 'GET' });
  }

  /**
   * NEW: Check a Remita transaction's status by orderId.
   * GET /external/jed/status/order/{orderId} (admin-locked per API docs).
   */
  async checkRemitaStatusByOrderId(orderId) {
    if (!orderId) throw new Error('checkRemitaStatusByOrderId requires an orderId');
    const url = this.buildUrl(this.endpoints.JED.CHECK_STATUS_BY_ORDER_ID(orderId));
    return await this.makeRequest(url, { method: 'GET' });
  }

  /**
   * NEW: Verify payment status by RRR via the public webhooks group.
   * GET /webhooks/verify-payment/{rrr} — no auth required per API docs.
   * Useful as a lighter-weight check than checkRemitaStatusByRRR when the
   * caller isn't necessarily an admin (e.g. an installer double-checking
   * before starting a job).
   */
  async verifyPaymentByRRR(rrr) {
    if (!rrr) throw new Error('verifyPaymentByRRR requires an rrr');
    const url = this.utils.buildUrl(this.endpoints.WEBHOOKS.VERIFY_PAYMENT(rrr), 'WEBHOOKS');
    return await this.makeRequest(url, { method: 'GET' });
  }

  async getCustomerRequestsByStatus(status) {
    const url = this.buildUrl(this.endpoints.JED.GET_REQUESTS_BY_STATUS(status));
    return await this.makeRequest(url, {
      method: 'GET',
      useCache: true,
      cacheKey: `requests-status-${status}`
    });
  }

  /**
   * Get installations assigned to the CURRENTLY AUTHENTICATED installer
   * (Phase 1, step 6/7: the installer pulls jobs where JEED has already
   * handed over installation details, i.e. payment has been confirmed via
   * Remita).
   *
   * CORRECTED: the real endpoint is GET /external/jed/requests/installer
   * with NO employeeId in the path — it's scoped by the Bearer token, not
   * a URL param. An earlier version of this method assumed a path param;
   * that was wrong against the confirmed API docs and has been fixed.
   *
   * `params.employeeId`, if passed, is used ONLY by the client-side
   * fallback filter below (never sent to the real endpoint as a query
   * param) — useful if an admin wants a specific installer's history via
   * the general /requests list as a last resort.
   *
   * @param {Object} params - { page, limit, status, employeeId? }
   */
  async getMyInstallations(params = {}) {
    const { employeeId, ...queryParams } = params;

    try {
      const url = this.utils.buildUrlWithParams(
        this.endpoints.JED.GET_REQUESTS_FOR_INSTALLERS,
        queryParams,
        'JED'
      );
      return await this.makeRequest(url, {
        method: 'GET',
        useCache: true,
        cacheKey: `my-installations-${JSON.stringify(queryParams)}`
      });
    } catch (error) {
      const errMsg = String(error?.message || '').toLowerCase();
      if (!errMsg.includes('not_found') && !errMsg.includes('404')) {
        throw error;
      }
      console.warn('[API] /requests/installer not found on server, falling back to client-side filter');
    }

    if (!employeeId) {
      console.warn('[API] getMyInstallations fallback needs employeeId to filter — returning empty set');
      return { data: [], pagination: { totalCount: 0 } };
    }

    // Fallback: fetch a wide page of requests, filter to this installer,
    // then apply the caller's requested page/limit on the filtered set.
    const fetchLimit = Math.max(queryParams.limit || 5, 200);
    const response = await this.getAllCustomerRequests({ ...queryParams, page: 1, limit: fetchLimit });
    const list = Array.isArray(response) ? response : (response?.data || []);

    const mine = list.filter(
      (item) =>
        item.installer?.employeeId === employeeId ||
        item.installerEmployeeId === employeeId ||
        item.installer?.id === employeeId
    );

    const requestedLimit = queryParams.limit || mine.length;
    return {
      data: mine.slice(0, requestedLimit),
      pagination: { totalCount: mine.length }
    };
  }

  // ==================== ADMIN & DASHBOARD METHODS ====================
  async getDashboardStats() {
    const url = this.buildApiUrl(this.endpoints.ADMIN.DASHBOARD_STATS);
    console.log('[API] Calling dashboard stats endpoint:', url);
    
    try {
      return await this.makeRequest(url, { 
        method: 'GET',
        useCache: true,
        cacheKey: 'dashboard-stats'
      });
    } catch (error) {
      const errMsg = String(error?.message || '').toLowerCase();
      if (errMsg.includes('permission_error') || errMsg.includes('403')) {
        console.warn('[API] Dashboard stats requires admin permissions');
        throw new Error('PERMISSION_ERROR:Dashboard stats endpoint requires admin role');
      }
      throw error;
    }
  }

  async getInstallerPerformance(params = {}) {
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

  async getInstallerDashboard() {
    try {
      const url = this.buildUrl(this.endpoints.JED.GET_INSTALLER_DASHBOARD);
      return await this.makeRequest(url, { 
        method: 'GET',
        useCache: true,
        cacheKey: 'installer-dashboard'
      });
    } catch (error) {
      const errMsg = String(error?.message || '').toLowerCase();
      if (errMsg.includes('not_found') || errMsg.includes('404')) {
        console.warn('[API] Installer dashboard endpoint not found, will calculate from requests');
        return null;
      }
      throw error;
    }
  }

  // ==================== METERS MANAGEMENT METHODS ====================
  async uploadMeters(formData) {
    const url = this.buildApiUrl(this.endpoints.METERS.UPLOAD);
    return await this.makeRequest(url, {
      method: 'POST',
      body: formData,
    });
  }

  async downloadMetersTemplate() {
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

  async exportMeters(params = {}) {
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

  async getMeters(params = {}) {
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

  async getMeterStatistics() {
    const url = this.buildApiUrl(this.endpoints.METERS.STATISTICS);
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: 'meter-statistics'
    });
  }

  async getMeterById(id) {
    const url = this.buildApiUrl(this.endpoints.METERS.BY_ID(id));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-${id}`
    });
  }

  async getMeterByNumber(meterNumber) {
    const url = this.buildApiUrl(this.endpoints.METERS.BY_NUMBER(meterNumber));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-number-${meterNumber}`
    });
  }

  async deleteMeter(meterNumber) {
    const url = this.buildApiUrl(this.endpoints.METERS.BY_ID(meterNumber));
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  async exportCustomerRequests(params = {}) {
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
  async processExcelUpload(endpoint, formData) {
    const url = this.utils.buildUrl(endpoint, 'UPLOADS');
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
  async submitComplaint(complaintData) {
    const url = this.buildApiUrl(this.endpoints.COMPLAINTS.BASE);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(complaintData),
    });
  }

  async getComplaints(params = {}) {
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

  async getComplaintById(complaintId) {
    const url = this.buildApiUrl(this.endpoints.COMPLAINTS.BY_ID(complaintId));
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `complaint-${complaintId}`
    });
  }

  // ==================== SETTINGS MANAGEMENT METHODS ====================
  async getMeterTypes(params = {}) {
    console.log('[API] Fetching meter types from /settings/meter-type');
    // Use buildApiUrl (root level) instead of buildUrl with group
    const url = this.utils.buildUrlWithParams(
      this.endpoints.SETTINGS.METER_TYPES.BASE, 
      params
    );
    console.log('[API] Final URL:', url);
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-types-${JSON.stringify(params)}`
    });
  }

  async getMeterTypeById(id) {
    console.log('[API] Fetching meter type:', id);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BY_ID(id));
    console.log('[API] Final URL:', url);
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `meter-type-${id}`
    });
  }

  async createMeterType(meterTypeData) {
    console.log('[API] Creating meter type:', meterTypeData);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BASE);
    console.log('[API] Final URL:', url);
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(meterTypeData),
    });
    this.clearCache();
    return response;
  }

  async updateMeterType(id, meterTypeData) {
    console.log('[API] Updating meter type:', id, meterTypeData);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BY_ID(id));
    console.log('[API] Final URL:', url);
    const response = await this.makeRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(meterTypeData),
    });
    this.clearCache();
    return response;
  }

  async deleteMeterType(id) {
    console.log('[API] Deleting meter type:', id);
    const url = this.buildApiUrl(this.endpoints.SETTINGS.METER_TYPES.BY_ID(id));
    console.log('[API] Final URL:', url);
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  // ==================== API KEYS MANAGEMENT METHODS ====================
  // All endpoints below require auth (Bearer token attached automatically
  // by buildHeaders()). Admin-only in practice since /settings is fully
  // admin-gated at the route level in App.jsx.

  /**
   * Create a new API key. IMPORTANT: the full secret key value is only
   * ever returned in THIS response — it cannot be re-fetched afterward.
   * The caller (ApiKeySettings.jsx) is responsible for surfacing it
   * prominently so the admin can copy it before navigating away.
   */
  async createApiKey(data) {
    console.log('[API] Creating API key:', data.name);
    const url = this.utils.buildUrl(this.endpoints.APIKEYS.BASE, 'APIKEYS');
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.clearCache();
    return response;
  }

  async getApiKeys(params = {}) {
    const url = this.utils.buildUrlWithParams(this.endpoints.APIKEYS.BASE, params, 'APIKEYS');
    return await this.makeRequest(url, {
      method: 'GET',
      useCache: true,
      cacheKey: `apikeys-${JSON.stringify(params)}`
    });
  }

  async getApiKeyById(id) {
    const safeId = typeof id === 'string' || typeof id === 'number' || typeof id === 'boolean'
      ? String(id)
      : (id?.$oid ? String(id.$oid) : JSON.stringify(id));
    const url = this.utils.buildUrl(this.endpoints.APIKEYS.BY_ID(id), 'APIKEYS');
    return await this.makeRequest(url, {
      method: 'GET',
      useCache: true,
      cacheKey: `apikey-${safeId}`
    });
  }

  async deleteApiKey(id) {
    console.log('[API] Deleting API key:', id);
    const url = this.utils.buildUrl(this.endpoints.APIKEYS.BY_ID(id), 'APIKEYS');
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  async deactivateApiKey(id) {
    console.log('[API] Deactivating API key:', id);
    const url = this.utils.buildUrl(this.endpoints.APIKEYS.DEACTIVATE(id), 'APIKEYS');
    const response = await this.makeRequest(url, { method: 'POST' });
    this.clearCache();
    return response;
  }

  /**
   * Usage statistics for an API key over the last N days.
   * @param {string} id
   * @param {Object} params - e.g. { days: 30 }
   */
  async getApiKeyUsage(id, params = {}) {
    const url = this.utils.buildUrlWithParams(this.endpoints.APIKEYS.USAGE(id), params, 'APIKEYS');
    return await this.makeRequest(url, { method: 'GET' });
  }

  // ==================== USER MANAGEMENT METHODS ====================
  async getUsers(params = {}) {
    console.log('[API] Fetching users');
    const url = this.utils.buildUrlWithParams(
      this.endpoints.USERS.BASE, 
      params,
      'USERS'
    );
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `users-${JSON.stringify(params)}`
    });
  }

  async getUserById(userId) {
    console.log('[API] Fetching user:', userId);
    const url = this.utils.buildUrl(this.endpoints.USERS.BY_ID(userId), 'USERS');
    return await this.makeRequest(url, { 
      method: 'GET',
      useCache: true,
      cacheKey: `user-${userId}`
    });
  }

  async createUser(userData) {
    console.log('[API] Creating user:', userData.email);
    const url = this.utils.buildUrl(this.endpoints.USERS.BASE, 'USERS');
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.clearCache();
    return response;
  }

  async updateUser(userId, userData) {
    console.log('[API] Updating user:', userId);
    const url = this.utils.buildUrl(this.endpoints.USERS.BY_ID(userId), 'USERS');
    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    this.clearCache();
    return response;
  }

  async deleteUser(userId) {
    console.log('[API] Deleting user:', userId);
    const url = this.utils.buildUrl(this.endpoints.USERS.BY_ID(userId), 'USERS');
    const response = await this.makeRequest(url, { method: 'DELETE' });
    this.clearCache();
    return response;
  }

  // ==================== TOKEN & STORAGE MANAGEMENT ====================
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

  // ==================== HEALTH CHECK & VALIDATION ====================
  async validateApiIntegration() {
    console.log('[API Health Check] Starting validation...');
    const checks = {
      baseUrl: !!this.config.BASE_URL,
      authEndpoint: !!this.config.ENDPOINT_GROUPS.AUTH,
      jedEndpoint: !!this.config.ENDPOINT_GROUPS.JED,
      webhooksEndpoint: !!this.config.ENDPOINT_GROUPS.WEBHOOKS,
      hasTokenStorage: !!localStorage,
      methods: {
        login: typeof this.login === 'function',
        getMeterTypes: typeof this.getMeterTypes === 'function',
        getUsers: typeof this.getUsers === 'function',
        getDashboardStats: typeof this.getDashboardStats === 'function',
        getMyInstallations: typeof this.getMyInstallations === 'function',
        getPayments: typeof this.getPayments === 'function',
        verifyPaymentByRRR: typeof this.verifyPaymentByRRR === 'function',
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

export { JEDApiService, ERROR_TYPES };
export default jedApi;