// App.jsx - Final optimized version with admin full access
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { ThemeProvider, useTheme } from './components/contexts/ThemeContext';
import Login from './components/auth/Login';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Navigation, {
  CONTENT_OFFSET_EXPANDED_CLASS,
  CONTENT_OFFSET_COLLAPSED_CLASS
} from './components/common/Navigation';
import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Loader2, Lock } from 'lucide-react';
import ErrorNotification from './components/common/ErrorNotification';
import { usePermissions } from './components/auth/usePermissions';
import jedApi from './components/services/api';

const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
// Installer-facing tabbed dashboard (Pending/Completed) — added this project.
const InstallerDashboard = lazy(() => import('./components/dashboard/InstallerDashboard'));
// Click-through detail view reached from either dashboard's rows — added this project.
const InstallationDetail = lazy(() => import('./components/installation/InstallationDetail'));
const AdminReports = lazy(() => import('./components/admin/AdminReports'));
// Payments & Remita reconciliation — activates previously dormant api.js
// methods (getPayments, checkRemitaStatusByRRR/OrderId,
// confirmPaymentManually, verifyPaymentByRRR) plus getCustomerRequestsByStatus.
const PaymentsPage = lazy(() => import('./components/admin/PaymentsPage'));
const InstallationForm = lazy(() => import('./components/installation/InstallationForm'));
// Meter Schedule is the single entry point for meter inventory (list,
// filter, search, export, statistics, delete via the real GET /meters,
// GET /meters/statistics, DELETE /meters/{meterNumber} endpoints) — a
// separate standalone "Meters" page/route was removed as a duplicate.
const MeterSchedule = lazy(() => import('./components/schedule/MeterSchedule'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const ExcelUpload = lazy(() => import('./components/uploads/ExcelUpload'));
const SubmissionPage = lazy(() => import('./components/SubmissionPage'));
// Tabbed Settings page (Meter Types + API Keys) — replaces direct
// MeterTypeSettings mount so both settings resources live under one route.
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh]">
    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
    <p className="text-gray-500 font-medium">Loading...</p>
  </div>
);

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
  const { isDark } = useTheme();
  const [globalError, setGlobalError] = useState(null);
  
  // Validate API integration on mount
  useEffect(() => {
    jedApi.validateApiIntegration();
  }, []);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop sidebar collapse — persisted so the choice survives a reload,
  // consistent with the app's existing localStorage-backed preferences
  // (theme, auth token). Only meaningful at lg+; the mobile drawer ignores it.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('jedSidebarCollapsed') === 'true'
  );
  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('jedSidebarCollapsed', String(next));
      return next;
    });
  }, []);

  const handleLogin = useCallback(async (credentials) => {
    try {
      console.log('[App] Attempting login...');
      const userData = await jedApi.login(credentials);
      console.log('[App] Login successful:', { role: userData.role });
      login(userData);
      return userData;
    } catch (error) {
      console.error('[App] Login failed:', error);
      setGlobalError(error.message || 'Failed to log in. Please check your credentials.');
      throw error;
    }
  }, [login]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'app-bg-dark' : 'app-bg-light'}`}>
      {/* Sidebar: off-canvas drawer on mobile, persistent fixed column at
          lg+. Rendered outside the content column below since it's
          `fixed` regardless of breakpoint. */}
      <Navigation
        userRole={user?.role}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Content column — offset right at lg+ to clear the persistent
          sidebar (no offset needed on mobile, where the sidebar is
          off-canvas and doesn't occupy layout space). Offset tracks
          whether the sidebar is currently collapsed to an icon-only rail. */}
      <div className={`min-h-screen flex flex-col ${isSidebarCollapsed ? CONTENT_OFFSET_COLLAPSED_CLASS : CONTENT_OFFSET_EXPANDED_CLASS} transition-[padding] duration-200`}>
        <Header
          user={user}
          onLogout={logout}
          onMenuToggle={() => setIsMobileMenuOpen(prev => !prev)}
          isMenuOpen={isMobileMenuOpen}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
          {globalError && (
            <ErrorNotification
              message={globalError}
              onDismiss={() => setGlobalError(null)}
            />
          )}
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {/* Dashboard routes by role: admin/superadmin get the
                    full-pipeline AdminDashboard (all requests, all
                    installers, payment stages); installer gets the tabbed
                    Pending/Completed InstallerDashboard. */}
                <Route
                  path="/dashboard"
                  element={permissions.isAdmin ? <AdminDashboard /> : <InstallerDashboard />}
                />
                {/* Click-through detail view from either dashboard's rows.
                    Pending jobs show the complete-installation form here;
                    completed jobs show a read-only "Paid & Completed" summary. */}
                <Route
                  path="/installations/:accountNumber"
                  element={
                    permissions.isAdmin || permissions.canViewInstallations
                      ? <InstallationDetail />
                      : <AccessDenied />
                  }
                />
                <Route
                  path="/submit"
                  element={
                    permissions.isAdmin || permissions.canCreateInstallation
                      ? <SubmissionPage />
                      : <AccessDenied />
                  }
                />
                <Route path="/schedule" element={permissions.isAdmin || permissions.canViewSchedule ? <MeterSchedule /> : <AccessDenied />} />
                <Route path="/users" element={permissions.isAdmin ? <UserManagement /> : <AccessDenied />} />
                <Route path="/uploads" element={permissions.isAdmin || permissions.canUploadExcel ? <ExcelUpload /> : <AccessDenied />} />
                <Route path="/reports" element={permissions.isAdmin ? <AdminReports /> : <AccessDenied />} />
                <Route path="/payments" element={permissions.isAdmin ? <PaymentsPage /> : <AccessDenied />} />
                <Route path="/settings" element={permissions.isAdmin ? <SettingsPage /> : <AccessDenied />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
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