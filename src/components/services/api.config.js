/**
 * Optimized API Configuration for JED Integration
 * Base URL: https://pharez-api.onrender.com/api/v1
 * API Documentation: https://pharez-api.onrender.com/api-docs
 * 
 * Enhanced with verification endpoints and better environment handling
 */

// Environment Configuration with validation
const getEnvConfig = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://pharez-api.onrender.com';
  
  // Validate URL format
  if (!baseUrl.startsWith('http')) {
    console.warn('[API Config] Invalid BASE_URL format, using default');
    return 'https://pharez-api.onrender.com';
  }
  
  return baseUrl;
};

// API Base Configuration
export const API_CONFIG = {
  BASE_URL: getEnvConfig(),
  API_VERSION: '/api/v1',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  
  // Enhanced Retry Configuration
  RETRY_CONFIG: {
    MAX_RETRIES: 2,
    BASE_DELAY: 500,
    MAX_DELAY: 5000
  },
  
  // API Endpoint Groups - Updated to match service patterns
  ENDPOINT_GROUPS: {
    AUTH: '/auth',
    VERIFICATION: '/verification',
    JED: '/external/jed',
    ADMIN: '',  // FIXED: Empty prefix - admin endpoints are at root level
    REPORTS: '/reports',
    METERS: '/meters',
    USERS: '', // User endpoints are at the root level
    SETTINGS: '',  // Empty prefix for root-level settings endpoints
    COMPLAINTS: '/complaints',
    UPLOADS: '/uploads',
    // Root-level webhook group. Distinct from /external/jed/remita/webhook —
    // this is the live Remita webhook receiver per the API docs (no auth
    // required). The frontend never POSTs here directly (Remita calls it
    // server-to-server); only the GET verify-payment endpoint is FE-usable.
    WEBHOOKS: '/webhooks',
    // Root-level API key management group. All endpoints require auth
    // (locked in the API docs) — Bearer token is already attached
    // automatically by buildHeaders(), no special handling needed.
    APIKEYS: '',
  },
  
  // Default Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Cache Settings
  CACHE: {
    ENABLED: true,
    DURATION: 5 * 60 * 1000,
  },
  
  // Feature Flags
  FEATURES: {
    RETRY_FAILED_REQUESTS: true,
    CACHE_RESPONSES: true,
    LOG_REQUESTS: import.meta.env.DEV,
  }
};

// Error types for consistent error handling
export const ERROR_TYPES = {
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  NETWORK: 'NETWORK_ERROR',
  VERIFICATION: 'VERIFICATION_ERROR'
};

// API Endpoints - Organized by functionality with better consistency
export const ENDPOINTS = {
  // ==================== AUTHENTICATION ENDPOINTS ====================
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    LOGOUT: '/logout',
    PROFILE: '/profile',
    CHANGE_PASSWORD: '/change-password',
    REFRESH_TOKEN: '/refresh-token',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
  
  // ==================== VERIFICATION ENDPOINTS ====================
  VERIFICATION: {
    SEND_PHONE_OTP: '/send-phone-otp',
    VERIFY_PHONE: '/verify-phone',
    SEND_EMAIL_OTP: '/send-email-otp',
    VERIFY_EMAIL: '/verify-email',
  },
  
  // ==================== JED INTEGRATION ENDPOINTS ====================
  JED: {
    // Payment Endpoints
    GENERATE_REF: '/generate-ref',
    CONFIRM_PAYMENT: '/confirm-payment',
    COMPLETE_INSTALLATION: '/complete-installation',
    REMITA_WEBHOOK: '/remita/webhook',
    // Admin fallback — manually confirm a payment by RRR if the Remita
    // webhook was missed.
    CONFIRM_PAYMENT_MANUAL: (rrr) => `/confirm-payment/manual/${rrr}`,
    
    // Request Management
    GET_REQUEST_BY_ACCOUNT: (accountNumber) => `/requests/${accountNumber}`,
    GET_ALL_REQUESTS: '/requests',
    GET_REQUESTS_BY_STATUS: (status) => `/requests/status/${status}`,
    // Unconfirmed against real API docs — kept for backward compatibility,
    // superseded by GET_REQUESTS_FOR_INSTALLERS below which is what the
    // docs actually show (no employeeId in the path; auth-scoped via JWT).
    GET_REQUESTS_BY_INSTALLER: (employeeId) => `/requests/installer/${employeeId}`,
    // CONFIRMED against real API docs: "Get customer requests for
    // installers (non-sensitive fields only)" — self-scoped to the
    // authenticated installer via the Bearer token, no employeeId param.
    // This is the one JEDApiService.getMyInstallations() actually calls.
    GET_REQUESTS_FOR_INSTALLERS: '/requests/installer',
    // Export customer requests to Excel (admin-locked per docs). Distinct
    // from METERS.CUSTOMER_REQUESTS_EXPORT (/meters/customer-requests/export).
    EXPORT_REQUESTS: '/requests/export',
    GET_REQUESTS_BY_DATE_RANGE: (startDate, endDate) => 
      `/requests?startDate=${startDate}&endDate=${endDate}`,
    
    // Payments & Remita status checks (admin-locked per docs)
    GET_PAYMENTS: '/payments',
    CHECK_STATUS_BY_RRR: (rrr) => `/status/rrr/${rrr}`,
    CHECK_STATUS_BY_ORDER_ID: (orderId) => `/status/order/${orderId}`,
    
    // Installer Management
    GET_INSTALLER_STATS: (employeeId) => `/installers/${employeeId}/dashboard-stats`,
    GET_INSTALLER_PERFORMANCE: '/installer/performance',
    UPDATE_INSTALLER_PROFILE: (employeeId) => `/installers/${employeeId}/profile`,
    GET_INSTALLER_DASHBOARD: '/installer/dashboard',
  },

  // ==================== WEBHOOKS ENDPOINTS (root-level, no auth) ====================
  WEBHOOKS: {
    // Documented as "server-to-server only" (Remita calls this
    // automatically per the merchant dashboard config), but the admin UI
    // now also calls this directly as a manual replay/recovery tool —
    // see JEDApiService.submitRemitaWebhook(). Accepts an array of
    // payment notification objects; see ReplayWebhookTab.jsx for the
    // full documented payload schema.
    REMITA_PAYMENT: '/remita/payment',
    VERIFY_PAYMENT: (rrr) => `/verify-payment/${rrr}`, // FE-usable: check payment status by RRR
  },

  // ==================== API KEYS ENDPOINTS (root-level, auth required) ====================
  APIKEYS: {
    BASE: '/apikeys',
    BY_ID: (id) => `/apikeys/${id}`,
    DEACTIVATE: (id) => `/apikeys/${id}/deactivate`,
    USAGE: (id) => `/apikeys/${id}/usage`,
  },
  
  // ==================== METERS ENDPOINTS ====================
  METERS: {
    BASE: '/meters',
    UPLOAD: '/meters/upload',
    TEMPLATE: '/meters/template',
    EXPORT: '/meters/export',
    STATISTICS: '/meters/statistics',
    BY_NUMBER: (meterNumber) => `/meters/meter-number/${meterNumber}`,
    BY_ID: (id) => `/meters/${id}`,
    CUSTOMER_REQUESTS_EXPORT: '/meters/customer-requests/export',
  },
  
  // ==================== USER MANAGEMENT ENDPOINTS ====================
  USERS: {
    BASE: '/users',
    BY_ID: (userId) => `/users/${userId}`,
    STATUS: (userId) => `/users/${userId}/status`,
  },

  // ==================== ADMIN ENDPOINTS ====================
  ADMIN: {
    // User Management
    USERS: {
      BASE: '/auth/users',  // FIXED: Auth users endpoint
      BY_ID: (userId) => `/auth/users/${userId}`,
      STATUS: (userId) => `/auth/users/${userId}/status`,
    },
    
    // Dashboard & Analytics
    DASHBOARD_STATS: '/dashboard-stats',  // FIXED: Root-level endpoint
    SYSTEM_ANALYTICS: '/analytics',
    PERFORMANCE_REPORTS: '/reports/performance',
    
    // System Management
    SYSTEM_LOGS: '/system/logs',
    AUDIT_TRAIL: '/system/audit-trail',
    SYSTEM_SETTINGS: '/system/settings',
  },
  
  // ==================== SETTINGS ENDPOINTS ====================
  // FIXED: These are root-level endpoints, not prefixed with /settings group
  SETTINGS: {
    METER_TYPES: {
      BASE: '/settings/meter-type',
      BY_ID: (id) => `/settings/meter-type/${id}`,
    }
  },
  
  // ==================== COMPLAINTS ENDPOINTS ====================
  COMPLAINTS: {
    BASE: '/complaints',
    BY_ID: (complaintId) => `/complaints/${complaintId}`,
  },
  
  // ==================== UPLOADS ENDPOINTS ====================
  UPLOADS: {
    EXCEL: '/uploads/excel',
    EXCEL_FIRST_SHEET: '/uploads/excel-first-sheet',
    EXCEL_MODIFIED: '/uploads/excel-modified',
  },
  
  // ==================== REPORTS ENDPOINTS ====================
  REPORTS: {
    GENERATE_REPORT: '/reports/generate',
    EXPORT_DATA: '/reports/export',
    GET_REPORT_TYPES: '/reports/types',
    GET_REPORT_HISTORY: '/reports/history',
  }
};

// Status Constants - Organized by domain
export const STATUS = {
  // Request Status
  REQUEST: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    VERIFIED: 'verified',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  
  // Payment Status
  // CONFIRMED against production dashboard: the real API returns these
  // UPPERCASE ("INITIATED", "PAID", "COMPLETED"). See src/utils/statusBadge.js
  // for the case-insensitive UI mapping consumed by every status badge.
  PAYMENT: {
    INITIATED: 'initiated',
    PENDING: 'pending',
    SUCCESS: 'success',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled',
  },
  
  // Installation Status
  INSTALLATION: {
    NOT_STARTED: 'not_started',
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    VERIFIED: 'verified',
  },
  
  // User Status
  USER: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
  },
  
  // Verification Status
  VERIFICATION: {
    PENDING: 'pending',
    SENT: 'sent',
    VERIFIED: 'verified',
    EXPIRED: 'expired',
    FAILED: 'failed',
  },
  
  // System Status
  SYSTEM: {
    OPERATIONAL: 'operational',
    MAINTENANCE: 'maintenance',
    DEGRADED: 'degraded',
    OFFLINE: 'offline',
  }
};

// Error Codes and Messages
export const ERROR_CODES = {
  // Authentication Errors
  AUTH: {
    INVALID_CREDENTIALS: 'AUTH_001',
    TOKEN_EXPIRED: 'AUTH_002',
    ACCESS_DENIED: 'AUTH_003',
    INVALID_TOKEN: 'AUTH_004',
    SESSION_EXPIRED: 'AUTH_005',
  },
  
  // Verification Errors
  VERIFICATION: {
    INVALID_OTP: 'VER_001',
    OTP_EXPIRED: 'VER_002',
    TOO_MANY_ATTEMPTS: 'VER_003',
    ALREADY_VERIFIED: 'VER_004',
    SEND_FAILED: 'VER_005',
  },
  
  // Validation Errors
  VALIDATION: {
    INVALID_INPUT: 'VAL_001',
    MISSING_REQUIRED_FIELD: 'VAL_002',
    INVALID_FORMAT: 'VAL_003',
    DUPLICATE_ENTRY: 'VAL_004',
  },
  
  // Business Logic Errors
  BUSINESS: {
    PAYMENT_REQUIRED: 'BUS_001',
    INSTALLATION_LIMIT_EXCEEDED: 'BUS_002',
    INSUFFICIENT_PERMISSIONS: 'BUS_003',
    RESOURCE_NOT_FOUND: 'BUS_004',
  },
  
  // System Errors
  SYSTEM: {
    INTERNAL_ERROR: 'SYS_001',
    SERVICE_UNAVAILABLE: 'SYS_002',
    DATABASE_ERROR: 'SYS_003',
    EXTERNAL_SERVICE_ERROR: 'SYS_004',
  }
};

// Enhanced Utility Functions
export const API_UTILS = {
  /**
   * Build full URL for an endpoint with group support
   * FIXED: Better handling of empty group prefixes
   * HARDENED: Guards against an undefined/missing endpoint constant
   * (e.g. a typo, or api.js referencing a key that doesn't exist in
   * ENDPOINTS) instead of throwing a cryptic
   * "Cannot read properties of undefined (reading 'startsWith')".
   */
  buildUrl: (endpoint, group = 'JED') => {
    if (endpoint === undefined || endpoint === null) {
      throw new Error(
        `[API Config] buildUrl received an undefined endpoint for group "${group}". ` +
        `This usually means api.js references an ENDPOINTS.${group}.<KEY> that doesn't ` +
        `exist (or wasn't saved) in api.config.js. Check the endpoint constant name.`
      );
    }
    if (typeof endpoint !== 'string') {
      throw new Error(
        `[API Config] buildUrl expected a string endpoint, got ${typeof endpoint}. ` +
        `If this endpoint is a function (e.g. GET_REQUEST_BY_ACCOUNT), make sure it was ` +
        `called with its argument, e.g. GET_REQUEST_BY_ACCOUNT(accountNumber).`
      );
    }
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const baseGroup = API_CONFIG.ENDPOINT_GROUPS[group];
    
    // Handle undefined or null group
    if (baseGroup === undefined || baseGroup === null) {
      console.warn(`[API Config] Unknown endpoint group: ${group}, using default`);
      return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
    }
    
    // Handle empty string group (root level endpoints like settings)
    const groupPath = baseGroup === '' ? '' : baseGroup;
    
    return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${groupPath}${endpoint}`;
  },
  
  /**
   * Build API URL without group prefix (for root endpoints)
   */
  buildApiUrl: (endpoint) => {
    if (endpoint === undefined || endpoint === null) {
      throw new Error('[API Config] buildApiUrl received an undefined endpoint.');
    }
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
  },
  
  /**
   * Build query string from parameters
   */
  buildQueryString: (params) => {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }
    
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  },
  
  /**
   * Build full URL with query parameters
   * FIXED: Support for root-level endpoints without group
   */
  buildUrlWithParams: (endpoint, queryParams = {}, group = null) => {
    // If no group specified, use buildApiUrl for root-level endpoints
    const baseUrl = group !== null 
      ? API_UTILS.buildUrl(endpoint, group)
      : API_UTILS.buildApiUrl(endpoint);
    
    const queryString = API_UTILS.buildQueryString(queryParams);
    return `${baseUrl}${queryString}`;
  },
  
  /**
   * Check if response is successful
   */
  isSuccessResponse: (response) => {
    return response.ok && response.status >= 200 && response.status < 300;
  },
  
  /**
   * Get error message from response
   */
  getErrorMessage: async (response) => {
    try {
      const errorData = await response.json();
      return errorData.message || errorData.error || response.statusText;
    } catch {
      return response.statusText || 'Unknown error occurred';
    }
  },
  
  /**
   * Get timeout duration based on endpoint type
   */
  getTimeout: (endpoint) => {
    const longRunningEndpoints = [
      '/reports/generate',
      '/reports/export',
      '/admin/analytics',
      '/meters/export',
      '/uploads/',
      '/requests/export'
    ];
    
    return longRunningEndpoints.some(e => endpoint.includes(e)) 
      ? 60000
      : API_CONFIG.TIMEOUT;
  },
  
  /**
   * Check if request should be retried based on error
   */
  shouldRetry: (error) => {
    if (!API_CONFIG.FEATURES.RETRY_FAILED_REQUESTS) {
      return false;
    }
    
    const retryableErrors = [
      'NetworkError',
      'TypeError',
      'Failed to fetch'
    ];
    
    const retryableStatuses = [502, 503, 504];
    
    return retryableErrors.some(retryableError => 
      error.message?.includes(retryableError) || 
      error.name === retryableError
    ) || retryableStatuses.includes(error.status);
  },
  
  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay: (attempt) => {
    const delay = API_CONFIG.RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt);
    return Math.min(delay, API_CONFIG.RETRY_CONFIG.MAX_DELAY);
  },
  
  /**
   * Delay utility for retries
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Build headers with authentication
   */
  buildHeaders: (customHeaders = {}, authToken = null) => {
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...customHeaders
    };

    const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('jedAuthToken') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // CONFIRMED against a real, working curl example targeting
      // GET /external/jed/status/rrr/{rrr}: the live API authenticates
      // that call via an `X-API-Key` header carrying the same JWT, not
      // (or not only) via Authorization: Bearer. Sending both is safe and
      // non-breaking — whichever header the backend actually reads for a
      // given endpoint will work, and this avoids calls to endpoints that
      // specifically expect X-API-Key silently failing with an auth error
      // that looks identical to a missing/expired token.
      headers['X-API-Key'] = token;
    }

    return headers;
  }
};

// Default export for convenience
export default {
  CONFIG: API_CONFIG,
  ENDPOINTS,
  STATUS,
  ERROR_CODES,
  ERROR_TYPES,
  UTILS: API_UTILS,
  
  // Legacy exports for backward compatibility
  API_CONFIG,
  REQUEST_STATUS: STATUS.REQUEST,
  PAYMENT_STATUS: STATUS.PAYMENT,
  INSTALLATION_STATUS: STATUS.INSTALLATION,
  VERIFICATION_STATUS: STATUS.VERIFICATION,
  
  // Helper functions
  buildUrl: API_UTILS.buildUrl,
  buildQueryString: API_UTILS.buildQueryString,
};