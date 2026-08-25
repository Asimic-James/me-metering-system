// src/services/api.js
// ============================================
// Optimized JED API Service with Enhanced Configuration
// ============================================

import {
  API_CONFIG,
  ENDPOINTS,
  ERROR_TYPES,
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
      // Set only for the two ApiKeyAuth-only endpoints (generate-ref,
      // status/rrr|order) — see getActiveApiKey()/buildHeaders().
      apiKey = null,
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
        const headers = this.utils.buildHeaders(requestOptions.headers, null, apiKey);

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
  async handleResponse(response) {
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
      this.handleErrorResponse(response, data);
    }

    console.log('[API] Success Response:', data);
    return data;
  }

  // FIXED: Enhanced error handling with specific error types
  handleErrorResponse(response, data) {
    const { status } = response;

    // Handle 401 errors first
    if (status === 401) {
      this.clearTokens();
      throw new Error(`${this.errorTypes.AUTH}:${data?.message || 'Invalid credentials'}`);
    }

    // FIXED: Safely check error message with proper null/undefined handling
    const errorMsg = data?.message || data?.error || '';
    const errorMsgStr = String(errorMsg).toLowerCase(); // Convert to string safely
    const isHtmlError = errorMsgStr.includes('doctype') || errorMsgStr.includes('<!');

    if (isHtmlError) {
      console.error('[API] Server returned HTML error page — possible CORS or server issue');
      throw new Error(`${this.errorTypes.SERVER}:Server responded with an error page — check CORS and API endpoint`);
    }

    // Real ValidationError responses ({ success, message, errors: [{field,
    // message}] }) carry per-field detail beyond the top-level message —
    // surface it so users see exactly which field failed, not just
    // "Validation failed".
    const fieldErrors = Array.isArray(data?.errors) && data.errors.length > 0
      ? data.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).filter(Boolean).join('; ')
      : null;
    const baseMessage = fieldErrors ? `${data?.message || 'Validation failed'} (${fieldErrors})` : data?.message;

    // Map status codes to error messages
    const errorMap = {
      400: `${this.errorTypes.VALIDATION}:${baseMessage || 'Invalid request'}`,
      403: `${this.errorTypes.PERMISSION}:${data?.message || 'Access denied'}`,
      404: `${this.errorTypes.NOT_FOUND}:${data?.message || 'Resource not found'}`,
      500: `${this.errorTypes.SERVER}:${data?.message || 'Internal server error'}`
    };

    const errorMessage = errorMap[status] ||
      baseMessage ||
      data?.error ||
      `HTTP ${status}: ${response.statusText}`;

    throw new Error(errorMessage);
  }

  // FIXED: Enhanced error handling with specific error categorization
  enhanceError(error) {
    // Safely check error message
    const errorMsg = error?.message || '';
    const errorMsgStr = String(errorMsg).toLowerCase();
    
    if (errorMsgStr.includes('401')) {
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

  /**
   * POST /auth/login — real LoginRequest schema is exactly
   * { phone, password }, real LoginResponse is Success + { data: { user, token } }.
   */
  async login(credentials) {
    console.log('[Auth] Login request:', { phone: credentials.phone, hasPassword: !!credentials.password });
    const url = this.buildUrl(this.endpoints.AUTH.LOGIN, true);

    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ phone: credentials.phone, password: credentials.password }),
    });

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

  /**
   * Real LoginResponse shape is `{ success, message, data: { user, token } }`.
   * A top-level `{ user, token }` fallback is kept only as a harmless safety
   * net, not because the shape is unconfirmed.
   */
  extractAuthData(response) {
    if (response.data?.user) {
      return { userData: response.data.user, token: response.data.token };
    }
    if (response.user) {
      return { userData: response.user, token: response.token };
    }
    return { userData: null, token: null };
  }

  normalizeUserData(userData) {
    // Real API's User.role enum is uppercase (SUPERADMIN/ADMIN/INSTALLER),
    // used as-is — uppercase here only guards against incidental casing.
    return {
      ...userData,
      role: (userData.role?.toUpperCase() || 'INSTALLER').trim()
    };
  }

  // ==================== VERIFICATION METHODS ====================
  // CONFIRMED against real API docs: these live under /verification/*,
  // scoped to the authenticated user via the Bearer token (not /auth/*).
  // send-phone-otp / send-email-otp take no request body per the docs —
  // callers may still pass one (e.g. VerificationModal sends { phone })
  // but the backend ignores it.
  async sendPhoneOTP(data) {
    const url = this.utils.buildUrl(this.endpoints.VERIFICATION.SEND_PHONE_OTP, 'VERIFICATION');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyPhone(data) {
    const url = this.utils.buildUrl(this.endpoints.VERIFICATION.VERIFY_PHONE, 'VERIFICATION');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendEmailOTP(data) {
    const url = this.utils.buildUrl(this.endpoints.VERIFICATION.SEND_EMAIL_OTP, 'VERIFICATION');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(data) {
    const url = this.utils.buildUrl(this.endpoints.VERIFICATION.VERIFY_EMAIL, 'VERIFICATION');
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

    // Real API returns the user under `data` (Success + data:User), not
    // `user` — check both so the local cache actually stays in sync.
    const userRecord = response.data || response.user;
    if (userRecord) {
      this.storeUser(userRecord);
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

    const userRecord = response.data || response.user;
    if (userRecord) {
      this.storeUser(userRecord);
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

  /**
   * Admin action: reset another user's password to the system default.
   * POST /auth/reset-password (bearerAuth), body: { userId }.
   */
  async resetPassword(userId) {
    if (!userId) throw new Error('resetPassword requires a userId');
    const url = this.buildUrl(this.endpoints.AUTH.RESET_PASSWORD, true);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * The real API has no /auth/logout endpoint — logout is purely a local
   * operation (clear the stored JWT/user/cache). Kept async for call-site
   * compatibility (AuthContext.logout awaits it).
   */
  async logout() {
    console.log('[Auth] Clearing local tokens and cache');
    this.clearTokens();
    this.clearCache();
  }

  // ==================== JED INTEGRATION METHODS ====================
  // Phase 1 lifecycle:
  // 1. Customer requests meter via JEED
  // 2. We generate RRR (generatePaymentReference) and send to JEED
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
    const apiKey = this.getActiveApiKey();
    if (!apiKey) {
      throw new Error(
        `${this.errorTypes.AUTH}:No active API key configured — set one in Settings → API Keys ` +
        `before generating a payment reference (this endpoint authenticates via a real API key, not your login session).`
      );
    }
    const url = this.buildUrl(this.endpoints.JED.GENERATE_REF);
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(meterData),
      apiKey,
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
    const apiKey = this.getActiveApiKey();
    if (!apiKey) {
      throw new Error(
        `${this.errorTypes.AUTH}:No active API key configured — set one in Settings → API Keys ` +
        `before checking Remita status (this endpoint authenticates via a real API key, not your login session).`
      );
    }
    const url = this.buildUrl(this.endpoints.JED.CHECK_STATUS_BY_RRR(rrr));
    return await this.makeRequest(url, { method: 'GET', apiKey });
  }

  /**
   * NEW: Check a Remita transaction's status by orderId.
   * GET /external/jed/status/order/{orderId} (admin-locked per API docs).
   */
  async checkRemitaStatusByOrderId(orderId) {
    if (!orderId) throw new Error('checkRemitaStatusByOrderId requires an orderId');
    const apiKey = this.getActiveApiKey();
    if (!apiKey) {
      throw new Error(
        `${this.errorTypes.AUTH}:No active API key configured — set one in Settings → API Keys ` +
        `before checking Remita status (this endpoint authenticates via a real API key, not your login session).`
      );
    }
    const url = this.buildUrl(this.endpoints.JED.CHECK_STATUS_BY_ORDER_ID(orderId));
    return await this.makeRequest(url, { method: 'GET', apiKey });
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

  /**
   * Manually submit/replay a Remita payment notification — the same
   * payload shape and endpoint Remita's own webhook uses
   * (POST /webhooks/remita/payment, array of notification objects).
   *
   * Two legitimate uses:
   * 1. Admin recovery — Remita's automatic webhook never fired for a
   *    transaction, so an admin manually resubmits the notification with
   *    details pulled from Remita's own dashboard/logs.
   * 2. Possible fix path for confirm-payment failures — POST
   *    /confirm-payment with only an accountNumber can fail with
   *    "Failed to send installation details to JED" if the backend needs
   *    richer transaction detail to complete the handoff. This endpoint's
   *    full payload (rrr, amount, payer info, dates, etc.) may succeed
   *    where the minimal call doesn't.
   *
   * @param {Object|Object[]} notifications - one notification object or
   *   an array of them; always sent as an array per the documented schema.
   */
  async submitRemitaWebhook(notifications) {
    const payload = Array.isArray(notifications) ? notifications : [notifications];
    const url = this.utils.buildUrl(this.endpoints.WEBHOOKS.REMITA_PAYMENT, 'WEBHOOKS');
    return await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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
   * Get the installer-visible queue of customer requests (paid/completed
   * installation jobs). GET /external/jed/requests/installer, scoped only
   * by the Bearer token's role (INSTALLER required) and an optional
   * `status` filter — NOT by which installer it's assigned to.
   *
   * IMPORTANT: the real JedCustomerRequest schema has no installerId or
   * equivalent field, and there is no assignment endpoint anywhere on the
   * real API. Every installer who calls this sees the same shared list —
   * there is no server-side "my jobs" concept today. A previous version of
   * this method tried to fake per-installer scoping with a client-side
   * filter on fields (installer.employeeId, etc.) that don't exist on real
   * data and could never match; that dead filter has been removed rather
   * than kept as a false promise. See API_GAP_REPORT.md.
   *
   * @param {Object} params - { page, limit, status }
   */
  async getMyInstallations(params = {}) {
    const url = this.utils.buildUrlWithParams(
      this.endpoints.JED.GET_REQUESTS_FOR_INSTALLERS,
      params,
      'JED'
    );
    return await this.makeRequest(url, {
      method: 'GET',
      useCache: true,
      cacheKey: `my-installations-${JSON.stringify(params)}`
    });
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

  // Per-installer stats/performance/dashboard endpoints do not exist on
  // the real API (no such paths in the OpenAPI spec) and were removed —
  // installer-facing stats are now computed client-side from the results
  // of getMyInstallations() (see InstallerDashboard.jsx).

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

  // There is no /complaints resource on the real API (no such tag/paths in
  // the OpenAPI spec) — the complaint submission feature was removed
  // entirely rather than shipping a form with no working backend; see
  // API_GAP_REPORT.md.

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
    const url = this.utils.buildUrl(this.endpoints.APIKEYS.BY_ID(id), 'APIKEYS');
    return await this.makeRequest(url, {
      method: 'GET',
      useCache: true,
      cacheKey: `apikey-${id}`
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
  // Note: there is no /auth/refresh-token endpoint on the real API, so
  // there is no refresh token to store or read — the app relies on the
  // JWT's own expiry and a re-login when it lapses.
  getAuthToken() {
    return localStorage.getItem('jedAuthToken');
  }

  storeTokens(tokens) {
    if (tokens.token) {
      localStorage.setItem('jedAuthToken', tokens.token);
    }
  }

  storeUser(userData) {
    localStorage.setItem('jedUser', JSON.stringify(userData));
  }

  clearTokens() {
    localStorage.removeItem('jedAuthToken');
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

  isSuperAdmin() {
    return this.getUserRole() === 'SUPERADMIN';
  }

  isAdmin() {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'SUPERADMIN';
  }

  isInstaller() {
    return this.getUserRole() === 'INSTALLER';
  }

  // ==================== ACTIVE API KEY (ApiKeyAuth) ====================
  // POST /external/jed/generate-ref and GET /external/jed/status/rrr|order
  // authenticate via a real X-API-Key (ApiKeyAuth), not the user's JWT.
  // The plaintext key value is only ever returned once, at creation time
  // (see ApiKeySettings.jsx), so it's captured then and stored here for
  // reuse — deliberately a separate localStorage slot from the JWT.
  getActiveApiKey() {
    return localStorage.getItem('jedActiveApiKey');
  }

  setActiveApiKey(key, name = null) {
    if (!key) return;
    localStorage.setItem('jedActiveApiKey', key);
    if (name) {
      localStorage.setItem('jedActiveApiKeyName', name);
    } else {
      localStorage.removeItem('jedActiveApiKeyName');
    }
  }

  getActiveApiKeyName() {
    return localStorage.getItem('jedActiveApiKeyName');
  }

  clearActiveApiKey() {
    localStorage.removeItem('jedActiveApiKey');
    localStorage.removeItem('jedActiveApiKeyName');
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
        resetPassword: typeof this.resetPassword === 'function',
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