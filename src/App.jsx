// App.jsx - Final optimized version with admin full access
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { ThemeProvider } from './components/contexts/ThemeContext';
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
import { usePermissions } from './components/auth/usePermissions';
import jedApi from './components/services/api';
import { Lock } from 'lucide-react';

// Access Denied Component - Only shown to installers on restricted pages
const AccessDenied = () => (
  <div className="min-h-[400px] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <Lock className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Access Denied
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        You don't have permission to access this page. Please contact your administrator.
      </p>
    </div>
  </div>
);

function AppContent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const permissions = usePermissions();
  
  // Validate API integration on mount
  useEffect(() => {
    jedApi.validateApiIntegration();
  }, []);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = useCallback(async (credentials) => {
    try {
      console.log('[App] Attempting login...');
      const userData = await jedApi.login(credentials);
      console.log('[App] Login successful:', { role: userData.role });
      login(userData);
      return userData;
    } catch (error) {
      console.error('[App] Login failed:', error);
      throw error;
    }
  }, [login]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <Header 
        user={user} 
        onLogout={logout}
        onMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
        isMenuOpen={isMobileMenuOpen}
      />
      
      <Navigation 
        userRole={user?.role}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 mb-20 lg:mb-0">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/submit" element={permissions.isAdmin || permissions.canCreateInstallation ? <SubmitForm /> : <AccessDenied />} />
          <Route path="/schedule" element={permissions.isAdmin || permissions.canViewSchedule ? <MeterSchedule /> : <AccessDenied />} />
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
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;