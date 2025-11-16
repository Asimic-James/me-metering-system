import { useState, useEffect, useCallback, useRef } from 'react';
import { JEDApiService } from '../components/services/api';

export const useSubmissions = (isAuthenticated) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
    limit: 100
  });
  
  const apiService = useRef(new JEDApiService());
  const refreshTimeout = useRef(null);

  // Transform API response to consistent format
  const transformSubmissionData = useCallback((item, index) => ({
    id: item.id || item._id || index + 1,
    sealNo: item.sealNo || item.meterSealNumber || item.seal_number || 'N/A',
    accountNumber: item.accountNumber || item.account_number || item.customerId || 'N/A',
    meterNo: item.meterNo || item.meter_number || item.meterNumber || 'N/A',
    // prefer server-provided dateRequested, fall back to createdAt
    submittedAt: item.dateRequested || item.submittedAt || item.submitted_at || item.createdAt || item.created_at || new Date().toLocaleString(),
    // additional customer-facing fields from API
    custNames: item.custNames || item.customerName || item.applicantName || item.name || null,
    gsm: item.gsm || item.phone || item.phone1 || item.phone2 || null,
    email: item.email || null,
    amount: typeof item.amount === 'string' ? Number(item.amount) : (item.amount || 0),
    status: item.status || 'pending',
    paymentReference: item.paymentReference || item.payment_reference || item.paymentRef || null,
    installer: item.installer || (item.installer_name ? {
      name: item.installer_name,
      employeeId: item.installer_id || item.employee_id
    } : null)
  }), []);

  // Fallback sample data for error states
  const getSampleData = useCallback(() => [
    {
      id: 1,
      sealNo: '9900',
      accountNumber: '477014',
      meterNo: '0123456789898',
      submittedAt: new Date().toLocaleString(),
      status: 'pending',
      paymentReference: 'REF-2024-001',
      installer: {
        name: 'Sample Installer',
        employeeId: 'EMP-001'
      }
    }
  ], []);

  // Handle API errors with appropriate messaging
  const handleApiError = useCallback((err) => {
    console.error('API Error:', err);
    
    if (err.message && (err.message.includes('SERVER_ERROR') || err.message.match(/^HTTP 5/))) {
      setError('Server temporarily unavailable. Showing cached/sample data — will retry automatically.');
    } else if (err.message && err.message.includes('AUTH_ERROR')) {
      setError('Authentication error. Please login again.');
    } else {
      setError('Unable to load submissions from server. Displaying sample data.');
    }
    
    setSubmissions(getSampleData());
  }, [getSampleData]);

  // Fetch specific page of customer requests
  const fetchCustomerRequestsPage = useCallback(async (page = 1, limit = 100) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useSubmissions] Fetching customer requests - page ${page}, limit ${limit}...`);

      try {
        // Use the centralized API service instead of raw fetch
        const response = await apiService.current.getAllCustomerRequests({ page, limit });
        console.log('[useSubmissions] API response received:', response);

        // Extract data array and pagination metadata
        const items = Array.isArray(response) ? response : (response?.data || []);
        const paginationData = response?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalCount: items.length,
          hasNext: false,
          hasPrev: page > 1,
          limit
        };
        
        if (items.length === 0) {
          console.warn('[useSubmissions] No items in response');
        }
        
        const formattedSubmissions = items.map(transformSubmissionData);
        setSubmissions(formattedSubmissions);
        setPagination(paginationData);
        
      } catch (apiErr) {
        console.error('[useSubmissions] API service error:', apiErr);
        // Fall back to sample data on API error
        handleApiError(apiErr);
      }
      
    } catch (err) {
      console.error('[useSubmissions] Unexpected error:', err);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, transformSubmissionData, handleApiError]);

  // Fetch customer requests from API (uses current page from state)
  const fetchCustomerRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    return await fetchCustomerRequestsPage(pagination.currentPage, pagination.limit);
  }, [isAuthenticated, pagination.currentPage, pagination.limit, fetchCustomerRequestsPage]);

  // Navigate to a specific page
  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages) {
      console.log(`[useSubmissions] Navigating to page ${pageNumber}`);
      fetchCustomerRequestsPage(pageNumber, pagination.limit);
    }
  }, [pagination.totalPages, pagination.limit, fetchCustomerRequestsPage]);

  // Change items per page
  const setPageLimit = useCallback((newLimit) => {
    console.log(`[useSubmissions] Changing limit to ${newLimit}`);
    setPagination(prev => ({ ...prev, limit: newLimit, currentPage: 1 }));
    fetchCustomerRequestsPage(1, newLimit);
  }, [fetchCustomerRequestsPage]);

  // Debounced refresh mechanism
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Clear any existing refresh timeout
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    
    // Only fetch if refreshKey is not 0 (initial state)
    if (refreshKey !== 0) {
      console.log('[Refresh] Fetching new data...');
      
      refreshTimeout.current = setTimeout(() => {
        fetchCustomerRequests();
      }, 500);
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, [refreshKey, isAuthenticated, fetchCustomerRequests]);

  // Initial data fetch on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomerRequests();
    }
  }, [isAuthenticated, fetchCustomerRequests]);

  // Add new submission with optimistic update
  const addSubmission = useCallback(async (newSubmission) => {
    try {
      // Optimistic UI update
      const optimisticSubmission = {
        id: submissions.length + 1,
        sealNo: newSubmission.sealNo,
        accountNumber: newSubmission.accountNumber,
        meterNo: newSubmission.meterNo,
        submittedAt: newSubmission.submittedAt || new Date().toLocaleString(),
        status: newSubmission.status || 'pending',
        paymentReference: newSubmission.paymentReference || null,
        installer: newSubmission.installer
      };

      setSubmissions(prev => [optimisticSubmission, ...prev]);

      // Trigger refresh to sync with server
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);

      return { success: true };
    } catch (err) {
      console.error('Error adding submission:', err);
      return { success: false, error: err.message };
    }
  }, [submissions.length]);

  // Manual refresh trigger
  const refreshSubmissions = useCallback(() => {
    console.log('[Refresh] Manual refresh triggered');
    if (!loading) {
      setRefreshKey(prev => prev + 1);
      fetchCustomerRequests(); // Immediate fetch
    }
  }, [loading, fetchCustomerRequests]);

  // Dismiss error notification
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submissions,
    loading,
    error,
    pagination,
    goToPage,
    setPageLimit,
    refreshSubmissions,
    addSubmission,
    dismissError
  };
};