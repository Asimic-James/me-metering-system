// App.jsx - Final optimized version with admin full access
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { ThemeProvider } from './components/contexts/ThemeContext.jsx';
import Login from './components/auth/Login';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Navigation from './components/common/Navigation';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminReports from './components/admin/AdminReports';
import SubmitForm from './components/submit/SubmitForm';
import MeterSchedule from './components/schedule/MeterSchedule';
import UserManagement from './components/admin/UserManagement';
import ExcelUpload from './components/uploads/ExcelUpload';
import ComplaintForm from './components/complaint/ComplaintForm';
import MeterTypeSettings from './components/settings/MeterTypeSettings';
import ErrorNotification from './components/common/ErrorNotification';
import { usePermissions } from './components/auth/usePermissions.jsx';
import jedApi from './components/services/api';
import { Lock } from 'lucide-react';

// Access Denied Component - Only shown to installers on restricted pages
const AccessDenied = () => (
  <div className="min-h-[400px] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Access Denied
      </h2>
      <p className="text-gray-600">
        You don't have permission to access this page. Please contact your administrator.
      </p>
    </div>
  </div>
);

function AppContent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Validate API integration on mount
  useEffect(() => {
    jedApi.validateApiIntegration();
  }, []);
  
  const { 
    error, 
    dismissError 
  } = { error: null, dismissError: () => {} }; // Placeholder for useSubmissions if not provided
  
  const handleLogin = useCallback(async (credentials) => {
    try {
      console.log('[App] Attempting login...');
      const userData = await jedApi.login(credentials);
      console.log('[App] Login successful:', { role: userData.role });
      login(userData);
      navigate('/dashboard');
      return userData;
    } catch (error) {
      console.error('[App] Login failed:', error);
      throw error;
    }
  }, [login, navigate]);

  const handleFormSuccess = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleAddSubmission = useCallback(async (newSubmission) => {
    try {
      const submissionWithUser = {
        ...newSubmission,
        installer: newSubmission.installer || {
          name: user?.name || 'Unknown',
          employeeId: user?.employeeId || 'N/A',
          email: user?.email || 'N/A',
          phone: user?.phone || 'N/A'
        }
      };
      // Directly use the API service to create the submission
      return await jedApi.createSubmission(submissionWithUser);
    } catch (error) {
      console.error('[App] Failed to add submission:', error);
      // Optionally, you could set an error state here to show in the UI
      throw error;
    }
  }, [user]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        user={user} 
        onLogout={logout}
        onMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
        isMenuOpen={isMobileMenuOpen}
      />
      
      <Navigation 
        userRole={user?.role}
        isOpen={isMobileMenuOpen}
        onMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 mb-20 lg:mb-0">
        {error && (
          <ErrorNotification 
            message={error}
            onDismiss={dismissError}
          />
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/submit" element={permissions.isAdmin || permissions.canCreateInstallation ? <SubmitForm onSubmit={handleAddSubmission} onSuccess={handleFormSuccess} /> : <AccessDenied />} />
          <Route path="/schedule" element={permissions.isAdmin || permissions.canViewSchedule ? <MeterSchedule onComplete={handleAddSubmission} /> : <AccessDenied />} />
          <Route path="/users" element={permissions.isAdmin ? <UserManagement /> : <AccessDenied />} />
          <Route path="/uploads" element={permissions.isAdmin || permissions.canUploadExcel ? <ExcelUpload /> : <AccessDenied />} />
          <Route path="/reports" element={permissions.isAdmin ? <AdminReports /> : <AccessDenied />} />
          <Route path="/settings" element={permissions.isAdmin ? <MeterTypeSettings /> : <AccessDenied />} />
          <Route path="/complaint" element={permissions.isAdmin || permissions.canCreateComplaint ? <ComplaintForm /> : <AccessDenied />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;