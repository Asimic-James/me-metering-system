import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import Login from './components/auth/Login';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Navigation from './components/common/Navigation';
import Dashboard from './components/dashboard/Dashboard';
import SubmitForm from './components/submit/SubmitForm';
import MeterSchedule from './components/schedule/MeterSchedule';
import JEDApiService from './components/services/api';

function AppContent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  // State Management
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch customer requests from API
  const fetchCustomerRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await JEDApiService.getAllCustomerRequests({
        page: 1,
        limit: 100
      });

      console.log('API Response:', response);

      // Transform API response to match component format
      const formattedSubmissions = (response.data || response || []).map((item, index) => ({
        id: item.id || item._id || index + 1,
        sealNo: item.sealNo || item.meterSealNumber || item.seal_number || 'N/A',
        accountNumber: item.accountNumber || item.account_number || item.customerId || 'N/A',
        meterNo: item.meterNo || item.meter_number || item.meterNumber || 'N/A',
        submittedAt: item.submittedAt || item.submitted_at || item.createdAt || item.created_at || new Date().toLocaleString(),
        status: item.status || 'pending',
        paymentReference: item.paymentReference || item.payment_reference || item.paymentRef || null,
        installer: item.installer || (item.installer_name ? {
          name: item.installer_name,
          employeeId: item.installer_id || item.employee_id
        } : null)
      }));

      setSubmissions(formattedSubmissions);
      
    } catch (err) {
      console.error('Failed to fetch customer requests:', err);
      setError('Unable to load submissions from server. Displaying sample data.');
      
      // Fallback to sample data
      setSubmissions([
        {
          id: 1,
          sealNo: '9900',
          accountNumber: '477014',
          meterNo: '0123456789898',
          submittedAt: new Date().toLocaleString(),
          status: 'pending',
          paymentReference: 'REF-2024-001',
          installer: {
            name: user?.name || 'Installer',
            employeeId: user?.employeeId || 'EMP-001'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch data on component mount and when refresh key changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomerRequests();
    }
  }, [fetchCustomerRequests, refreshKey, isAuthenticated]);

  // Handle new submission
  const handleAddSubmission = useCallback(async (newSubmission) => {
    try {
      // Add installer info if not present
      const submissionWithInstaller = {
        ...newSubmission,
        installer: newSubmission.installer || {
          name: user?.name || 'Unknown',
          employeeId: user?.employeeId || 'N/A',
          email: user?.email || 'N/A',
          phone: user?.phone || 'N/A'
        }
      };

      // Add to local state immediately for optimistic UI update
      const optimisticSubmission = {
        id: submissions.length + 1,
        sealNo: submissionWithInstaller.sealNo,
        accountNumber: submissionWithInstaller.accountNumber,
        meterNo: submissionWithInstaller.meterNo,
        submittedAt: submissionWithInstaller.submittedAt || new Date().toLocaleString(),
        status: submissionWithInstaller.status || 'pending',
        paymentReference: submissionWithInstaller.paymentReference || null,
        installer: submissionWithInstaller.installer
      };

      setSubmissions(prev => [optimisticSubmission, ...prev]);

      // Trigger a refresh to get updated data from server
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);

      return { success: true };
    } catch (err) {
      console.error('Error adding submission:', err);
      return { success: false, error: err.message };
    }
  }, [submissions.length, user]);

  // Handle form success and navigation
  const handleFormSuccess = useCallback(() => {
    setCurrentPage('dashboard');
  }, []);

  // Handle page navigation
  const handleNavigate = useCallback((page) => {
    setCurrentPage(page);
    // Clear error when navigating
    if (error) {
      setError(null);
    }
  }, [error]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Dismiss error notification
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // Handle login
  const handleLogin = (userData) => {
    login(userData);
    setCurrentPage('dashboard');
  };

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header user={user} onLogout={logout} />
      
      {/* Navigation */}
      <Navigation 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        userRole={user?.role}
      />
      
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* Error Notification */}
        {error && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm animate-fade-in">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-yellow-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={dismissError}
                  className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        {currentPage === 'dashboard' ? (
          <Dashboard 
            submissions={submissions} 
            loading={loading}
            onRefresh={handleRefresh}
          />
        ) : currentPage === 'schedule' ? (
          <MeterSchedule 
            onComplete={handleAddSubmission}
          />
        ) : (
          <SubmitForm 
            onSubmit={handleAddSubmission} 
            onSuccess={handleFormSuccess} 
          />
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
