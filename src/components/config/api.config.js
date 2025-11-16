/**
 * API Configuration for JED Integration
 * Base URL: https://pharez-api.onrender.com/api/v1
 * API Documentation: https://pharez-api.onrender.com/api-docs
 * 
 * This configuration provides a centralized API setup with environment variables,
 * endpoint definitions, status constants, and utility functions.
 */

// Environment Configuration
const ENV_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://pharez-api.onrender.com',
  API_VERSION: '/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Base Configuration
export const API_CONFIG = {
  ...ENV_CONFIG,
  
  // API Endpoint Groups
  ENDPOINT_GROUPS: {
    JED: '/external/jed',
    AUTH: '/auth',
    ADMIN: '/admin',
    REPORTS: '/reports'
  },
  
  // Default Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Cache Settings
  CACHE: {
    ENABLED: true,
    DURATION: 5 * 60 * 1000, // 5 minutes
  },
  
  // Feature Flags
  FEATURES: {
    RETRY_FAILED_REQUESTS: true,
    CACHE_RESPONSES: true,
    LOG_REQUESTS: process.env.NODE_ENV === 'development',
  }
};

// API Endpoints - Organized by functionality
export const ENDPOINTS = {
  // ==================== AUTHENTICATION ENDPOINTS ====================
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // ==================== JED INTEGRATION ENDPOINTS ====================
  JED: {
    // Payment Endpoints
    GENERATE_REF: '/external/jed/generate-ref',
    CONFIRM_PAYMENT: '/external/jed/confirm-payment',
    COMPLETE_INSTALLATION: '/external/jed/complete-installation',
    REMITA_WEBHOOK: '/external/jed/remita/webhook',
    
    // Request Management
    GET_REQUEST_BY_ACCOUNT: (accountNumber) => `/external/jed/requests/${accountNumber}`,
    GET_ALL_REQUESTS: '/external/jed/requests',
    GET_REQUESTS_BY_STATUS: (status) => `/external/jed/requests/status/${status}`,
    GET_REQUESTS_BY_INSTALLER: (employeeId) => `/external/jed/requests/installer/${employeeId}`,
    GET_REQUESTS_BY_DATE_RANGE: (startDate, endDate) => 
      `/external/jed/requests?startDate=${startDate}&endDate=${endDate}`,
    
    // Installer Management
    GET_INSTALLER_STATS: (employeeId) => `/external/jed/installers/${employeeId}/dashboard-stats`,
    GET_INSTALLER_PERFORMANCE: '/external/jed/installer/performance',
    UPDATE_INSTALLER_PROFILE: (employeeId) => `/external/jed/installers/${employeeId}/profile`,
  },
  
  // ==================== ADMIN ENDPOINTS ====================
  ADMIN: {
    // User Management
    GET_USERS: '/admin/users',
    CREATE_USER: '/admin/users',
    GET_USER: (userId) => `/admin/users/${userId}`,
    UPDATE_USER: (userId) => `/admin/users/${userId}`,
    DELETE_USER: (userId) => `/admin/users/${userId}`,
    UPDATE_USER_STATUS: (userId) => `/admin/users/${userId}/status`,
    
    // Dashboard & Analytics
    GET_DASHBOARD_STATS: '/admin/dashboard-stats',
    GET_SYSTEM_ANALYTICS: '/admin/analytics',
    GET_PERFORMANCE_REPORTS: '/admin/reports/performance',
    
    // System Management
    GET_SYSTEM_LOGS: '/admin/system/logs',
    GET_AUDIT_TRAIL: '/admin/system/audit-trail',
    UPDATE_SYSTEM_SETTINGS: '/admin/system/settings',
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

// Utility Functions
export const API_UTILS = {
  /**
   * Build full URL for an endpoint
   * @param {string} endpoint - The endpoint path
   * @returns {string} Full URL
   */
  buildUrl: (endpoint) => {
    // Handle absolute URLs
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    // Handle endpoints that already include the base path
    if (endpoint.includes(API_CONFIG.ENDPOINT_GROUPS.JED) || 
        endpoint.includes(API_CONFIG.ENDPOINT_GROUPS.AUTH)) {
      return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
    }
    
    // Default: assume it's a JED endpoint
    return `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.ENDPOINT_GROUPS.JED}${endpoint}`;
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
      if (value !== null && value !== undefined) {
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
   * @returns {string} Full URL with query string
   */
  buildUrlWithParams: (endpoint, queryParams = {}) => {
    const baseUrl = API_UTILS.buildUrl(endpoint);
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
      '/admin/analytics'
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
  }
};

// Default export for convenience
export default {
  CONFIG: API_CONFIG,
  ENDPOINTS,
  STATUS,
  ERROR_CODES,
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