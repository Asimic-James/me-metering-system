import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import Login from './components/auth/Login';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Navigation from './components/common/Navigation';
import Dashboard from './components/dashboard/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminReports from './components/admin/AdminReports';
import SubmitForm from './components/submit/SubmitForm';
import MeterSchedule from './components/schedule/MeterSchedule';
import UserManagement from './components/admin/UserManagement';
import ExcelUpload from './components/uploads/ExcelUpload';
import ComplaintForm from './components/complaint/ComplaintForm';
import ErrorNotification from './components/common/ErrorNotification';
import { useSubmissions } from './hooks/useSubmissions';
import { useNavigation } from './hooks/useNavigation';
import jedApi from './components/services/api';

// Constants for better maintainability
const PAGE_NAMES = {
  DASHBOARD: 'dashboard',
  SCHEDULE: 'schedule',
  USERS: 'users',
  REPORTS: 'reports',
  SUBMIT: 'submit',
  COMPLAINT: 'complaint'
};


const USER_ROLES = {
  ADMIN: 'admin'
};

function AppContent() {
  const { user, login, logout, isAuthenticated, loading: authLoading } = useAuth();
  
  // Run API health check on app start
  useEffect(() => {
    jedApi.validateApiIntegration();
  }, []);
  
  // Custom hooks for separated concerns
  const { 
    submissions, 
    loading, 
    error, 
    refreshSubmissions, 
    addSubmission, 
    dismissError 
  } = useSubmissions(isAuthenticated);
  
  const {
    currentPage,
    isMobileMenuOpen,
    navigateTo,
    toggleMobileMenu,
    closeMobileMenu
  } = useNavigation();

  // Handle login and redirect to dashboard
  const handleLogin = useCallback(async (credentials) => {
    try {
      console.log('[App] Attempting login with credentials...');
      
      // Use the jedApi singleton to make the actual login request
      const userData = await jedApi.login(credentials);
      
      console.log('[App] Login successful:', userData);
      
      // Update auth context with the user data
      login(userData);
      navigateTo(PAGE_NAMES.DASHBOARD);
      
      return userData; // Return the user data for the Login component
    } catch (error) {
      console.error('[App] Login failed:', error);
      throw error; // Re-throw the error for the Login component to handle
    }
  }, [login, navigateTo]);

  // Handle form success and navigation
  const handleFormSuccess = useCallback(() => {
    navigateTo(PAGE_NAMES.DASHBOARD);
  }, [navigateTo]);

  // Handle new submission with user context
  const handleAddSubmission = useCallback(async (newSubmission) => {
    const submissionWithUser = {
      ...newSubmission,
      installer: newSubmission.installer || {
        name: user?.name || 'Unknown',
        employeeId: user?.employeeId || 'N/A',
        email: user?.email || 'N/A',
        phone: user?.phone || 'N/A'
      }
    };
    
    return await addSubmission(submissionWithUser);
  }, [addSubmission, user]);

  // Render appropriate dashboard based on user role
  const renderDashboard = useMemo(() => {
    if (user?.role === USER_ROLES.ADMIN) {
      return <AdminDashboard />;
    }
    // Installers also get the AdminDashboard but with installer-specific data filtering
    return <AdminDashboard isInstallerView={true} />;
  }, [user?.role]);

  // Render current page content
  const renderPageContent = useMemo(() => {
    switch (currentPage) {
      case PAGE_NAMES.DASHBOARD:
        return renderDashboard;
      
      case PAGE_NAMES.SCHEDULE:
        return (
          <MeterSchedule 
            onComplete={handleAddSubmission}
          />
        );
      
      case PAGE_NAMES.USERS:
        return <UserManagement />;

      case 'uploads':
        return <ExcelUpload />;

      case PAGE_NAMES.REPORTS:
        return <AdminReports />;
      
      case PAGE_NAMES.COMPLAINT:
        return <ComplaintForm />;
      
      default:
        return (
          <SubmitForm 
            onSubmit={handleAddSubmission} 
            onSuccess={handleFormSuccess} 
          />
        );
    }
  }, [currentPage, renderDashboard, handleAddSubmission, handleFormSuccess]);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header 
        user={user} 
        onLogout={logout}
        onMenuToggle={toggleMobileMenu}
        isMenuOpen={isMobileMenuOpen}
      />
      
      {/* Navigation */}
      <Navigation 
        currentPage={currentPage} 
        onNavigate={navigateTo}
        userRole={user?.role}
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
      />
      
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* Error Notification */}
        {error && (
          <ErrorNotification 
            message={error}
            onDismiss={dismissError}
          />
        )}

        {/* Page Content */}
        {renderPageContent}
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