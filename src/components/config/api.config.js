/**
 * API Configuration for JED Integration
 * Base URL: https://pharez-api.onrender.com/api/v1
 * API Documentation: https://pharez-api.onrender.com/api-docs
 */

// API Base URL
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://pharez-api.onrender.com',
  API_VERSION: '/api/v1',
  JED_ENDPOINT: '/external/jed',
  API_DOCS: 'https://pharez-api.onrender.com/api-docs',
  TIMEOUT: 30000, // 30 seconds
};

// API Endpoints
export const ENDPOINTS = {
  // POST endpoints
  GENERATE_REF: '/generate-ref',
  CONFIRM_PAYMENT: '/confirm-payment',
  COMPLETE_INSTALLATION: '/complete-installation',
  REMITA_WEBHOOK: '/remita/webhook',
  
  // GET endpoints
  GET_REQUEST_BY_ACCOUNT: (accountNumber) => `/requests/${accountNumber}`,
  GET_ALL_REQUESTS: '/requests',
  GET_REQUESTS_BY_STATUS: (status) => `/requests/status/${status}`,
  GET_REQUESTS_BY_INSTALLER: (employeeId) => `/requests/installer/${employeeId}`,
  GET_INSTALLER_STATS: (employeeId) => `/installers/${employeeId}/stats`,
};

// Full API URLs (for reference)
export const FULL_API_URLS = {
  BASE: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.JED_ENDPOINT}`,
  GENERATE_REF: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.JED_ENDPOINT}/generate-ref`,
  CONFIRM_PAYMENT: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.JED_ENDPOINT}/confirm-payment`,
  COMPLETE_INSTALLATION: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.JED_ENDPOINT}/complete-installation`,
  REMITA_WEBHOOK: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.JED_ENDPOINT}/remita/webhook`,
  GET_ALL_REQUESTS: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${API_CONFIG.JED_ENDPOINT}/requests`,
};

// Request Status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Payment Status
export const PAYMENT_STATUS = {
  INITIATED: 'initiated',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

// Installation Status
export const INSTALLATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export default API_CONFIG;