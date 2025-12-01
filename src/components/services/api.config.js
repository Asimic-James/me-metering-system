/**
 * Optimized API Configuration for JED Integration
 * Base URL: https://pharez-api.onrender.com/api/v1
 * API Documentation: https://pharez-api.onrender.com/api-docs
 * 
 * Enhanced with better environment handling, error types, and utility functions
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
    JED: '/external/jed',
    ADMIN: '/admin',
    REPORTS: '/reports',
    METERS: '/meters',
    SETTINGS: '/settings',
    COMPLAINTS: '/complaints',
    UPLOADS: '/uploads'
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
    LOG_REQUESTS: import.meta.env.DEV, // Use dev mode instead of process.env
  }
};

// Error types for consistent error handling
export const ERROR_TYPES = {
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER_ERROR',
  NETWORK: 'NETWORK_ERROR'
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
  
  // ==================== JED INTEGRATION ENDPOINTS ====================
  JED: {
    // Payment Endpoints
    GENERATE_REF: '/generate-ref',
    CONFIRM_PAYMENT: '/confirm-payment',
    COMPLETE_INSTALLATION: '/complete-installation',
    REMITA_WEBHOOK: '/remita/webhook',
    
    // Request Management
    GET_REQUEST_BY_ACCOUNT: (accountNumber) => `/requests/${accountNumber}`,
    GET_ALL_REQUESTS: '/requests',
    GET_REQUESTS_BY_STATUS: (status) => `/requests/status/${status}`,
    GET_REQUESTS_BY_INSTALLER: (employeeId) => `/requests/installer/${employeeId}`,
    GET_REQUESTS_BY_DATE_RANGE: (startDate, endDate) => 
      `/requests?startDate=${startDate}&endDate=${endDate}`,
    
    // Installer Management
    GET_INSTALLER_STATS: (employeeId) => `/installers/${employeeId}/dashboard-stats`,
    GET_INSTALLER_PERFORMANCE: '/installer/performance',
    UPDATE_INSTALLER_PROFILE: (employeeId) => `/installers/${employeeId}/profile`,
    GET_INSTALLER_DASHBOARD: '/installer/dashboard',
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
  
  // ==================== ADMIN ENDPOINTS ====================
  ADMIN: {
    // User Management
    USERS: {
      BASE: '/users',
      BY_ID: (userId) => `/users/${userId}`,
      STATUS: (userId) => `/users/${userId}/status`,
    },
    
    // Dashboard & Analytics
    DASHBOARD_STATS: '/dashboard-stats',
    SYSTEM_ANALYTICS: '/analytics',
    PERFORMANCE_REPORTS: '/reports/performance',
    
    // System Management
    SYSTEM_LOGS: '/system/logs',
    AUDIT_TRAIL: '/system/audit-trail',
    SYSTEM_SETTINGS: '/system/settings',
  },
  
  // ==================== SETTINGS ENDPOINTS ====================
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
  PAYMENT: {
    INITIATED: 'initiated',
    PENDING: 'pending',
    SUCCESS: 'success',
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
   * @param {string} endpoint - The endpoint path
   * @param {string} group - Endpoint group (AUTH, JED, etc.)
   * @returns {string} Full URL
   */
  buildUrl: (endpoint, group = 'JED') => {
    // Handle absolute URLs
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const baseGroup = API_CONFIG.ENDPOINT_GROUPS[group] || '';
    return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${baseGroup}${endpoint}`;
  },
  
  /**
   * Build API URL without group prefix (for root endpoints)
   * @param {string} endpoint - The endpoint path
   * @returns {string} Full URL
   */
  buildApiUrl: (endpoint) => {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
  },
  
  /**
   * Build query string from parameters
   * @param {Object} params - Query parameters
   * @returns {string} Query string
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
   * @param {string} endpoint - The endpoint path
   * @param {Object} queryParams - Query parameters
   * @param {string} group - Endpoint group
   * @returns {string} Full URL with query string
   */
  buildUrlWithParams: (endpoint, queryParams = {}, group = 'JED') => {
    const baseUrl = API_UTILS.buildUrl(endpoint, group);
    const queryString = API_UTILS.buildQueryString(queryParams);
    return `${baseUrl}${queryString}`;
  },
  
  /**
   * Check if response is successful
   * @param {Response} response - Fetch response
   * @returns {boolean} Whether response is successful
   */
  isSuccessResponse: (response) => {
    return response.ok && response.status >= 200 && response.status < 300;
  },
  
  /**
   * Get error message from response
   * @param {Response} response - Fetch response
   * @returns {Promise<string>} Error message
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
   * @param {string} endpoint - The endpoint path
   * @returns {number} Timeout in milliseconds
   */
  getTimeout: (endpoint) => {
    const longRunningEndpoints = [
      '/reports/generate',
      '/reports/export',
      '/admin/analytics',
      '/meters/export',
      '/uploads/'
    ];
    
    return longRunningEndpoints.some(e => endpoint.includes(e)) 
      ? 60000 // 60 seconds for long-running operations
      : API_CONFIG.TIMEOUT;
  },
  
  /**
   * Check if request should be retried based on error
   * @param {Error} error - The error object
   * @returns {boolean} Whether to retry
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
    
    const retryableStatuses = [502, 503, 504]; // Gateway errors
    
    return retryableErrors.some(retryableError => 
      error.message?.includes(retryableError) || 
      error.name === retryableError
    ) || retryableStatuses.includes(error.status);
  },
  
  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay: (attempt) => {
    const delay = API_CONFIG.RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt);
    return Math.min(delay, API_CONFIG.RETRY_CONFIG.MAX_DELAY);
  },
  
  /**
   * Delay utility for retries
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Build headers with authentication
   * @param {Object} customHeaders - Additional headers
   * @param {string} authToken - Authentication token
   * @returns {Object} Headers object
   */
  buildHeaders: (customHeaders = {}, authToken = null) => {
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...customHeaders
    };

    const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('jedAuthToken') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
  
  // Helper functions
  buildUrl: API_UTILS.buildUrl,
  buildQueryString: API_UTILS.buildQueryString,
};