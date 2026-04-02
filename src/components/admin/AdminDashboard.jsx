import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import JEDApiService from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyNGN } from '../../utils/currency';
import { 
  BarChart,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  Settings,
  Menu,
  X
} from 'lucide-react';

// Stat Card Component - Mobile First
 
const StatCard = ({ title, value, icon: Icon, change, changeType = 'neutral' }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${
        changeType === 'positive' ? 'bg-green-100 text-green-600' :
        changeType === 'negative' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 text-blue-600'
      }`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      {change !== undefined && change !== 0 && (
        <div className={`flex items-center text-xs sm:text-sm font-medium ${
          changeType === 'positive' ? 'text-green-600' :
          changeType === 'negative' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {changeType === 'positive' ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" /> :
           changeType === 'negative' ? <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" /> : null}
          <span>{Math.abs(change)}%</span>
        </div>
      )}
    </div>
    <h3 className="text-gray-500 text-xs sm:text-sm font-medium">{title}</h3>
    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

// Recent Installations Table - Mobile Optimized
const RecentInstallations = ({ installations, totalCount, onViewAll }) => (
  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
    <div className="flex items-center justify-between p-4 sm:p-6 border-b">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Installations</h3>
      <button 
        onClick={onViewAll} 
        className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        View All ({totalCount})
      </button>
    </div>
    
    {/* Mobile Card View */}
    <div className="sm:hidden divide-y divide-gray-200">
      {installations.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">
          No installations found
        </div>
      ) : (
        installations.map((install) => (
          <div key={install.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900 text-sm">{install.accountNumber}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {install.custNames || install.applicantName || install.installer?.name || '-'}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                install.status === 'completed' ? 'bg-green-100 text-green-800' :
                install.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {install.status}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {install.submittedAt ? new Date(install.submittedAt).toLocaleDateString() : '-'}
              </span>
              <span className="font-semibold text-gray-900 text-sm">
                {formatCurrencyNGN(install.amount)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>

    {/* Desktop Table View */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-600 bg-gray-50 border-b text-xs sm:text-sm">
            <th className="px-4 py-3 font-semibold">Account</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold text-right">Amount</th>
            <th className="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {installations.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-4 py-8 text-center text-gray-500 text-sm">
                No installations found
              </td>
            </tr>
          ) : (
            installations.map((install) => (
              <tr key={install.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-700 font-medium text-sm">{install.accountNumber}</td>
                <td className="px-4 py-3 text-gray-700 text-sm">
                  {install.custNames || install.applicantName || install.installer?.name || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    install.status === 'completed' ? 'bg-green-100 text-green-800' :
                    install.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {install.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 text-sm">
                  {formatCurrencyNGN(install.amount)}
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">
                  {install.submittedAt ? new Date(install.submittedAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Export Modal Component
const ExportModal = ({ isOpen, onClose, onExport }) => {
  const [exportType, setExportType] = useState('all');
  const [format, setFormat] = useState('excel');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportType, format);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Type
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Data</option>
              <option value="pending">Pending Requests</option>
              <option value="completed">Completed Requests</option>
              <option value="meters">Meters</option>
              <option value="installers">Installer Performance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Actions Component - Mobile First
const QuickActions = ({ onManageUsers, onGoToSettings, onExportData, isAdmin }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-3">
      {isAdmin && (
        <button 
          onClick={onManageUsers}
          className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all border border-blue-200"
        >
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-2 mx-auto" />
          <span className="text-xs sm:text-sm font-medium text-gray-900 block text-center">
            Manage Users
          </span>
        </button>
      )}
      <button 
        onClick={onExportData}
        className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all border border-green-200"
      >
        <Download className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mb-2 mx-auto" />
        <span className="text-xs sm:text-sm font-medium text-gray-900 block text-center">
          Export Data
        </span>
      </button>
      {isAdmin && (
        <button 
          onClick={onGoToSettings}
          className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all border border-purple-200 col-span-2"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mb-2 mx-auto" />
          <span className="text-xs sm:text-sm font-medium text-gray-900 block text-center">
            System Settings
          </span>
        </button>
      )}
    </div>
  </div>
);

function AdminDashboard({ isInstallerView = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    completedRequests: 0,
    activeInstallers: 0,
    totalRevenue: 0
  });
  const [recentInstallations, setRecentInstallations] = useState([]);
  const [requestsTotalCount, setRequestsTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const isAdmin = user?.role === 'admin';
  const showInstallerData = isInstallerView || !isAdmin;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch installations first (works for both admin and installer)
        const installationsResponse = await JEDApiService.getAllCustomerRequests({
          page: 1,
          limit: 5
        });
        
        let installations = Array.isArray(installationsResponse) 
          ? installationsResponse 
          : (installationsResponse?.data || []);
        const paginationData = installationsResponse?.pagination || {};
        
        // Filter for installer-specific data
        if (showInstallerData && !isAdmin) {
          installations = installations.filter(inst => 
            inst.installer?.id === user?.id || inst.installerPhone === user?.phone
          );
        }
        
        setRecentInstallations(installations);
        setRequestsTotalCount(paginationData.totalCount || installations.length);

        // Fetch stats based on role
        if (isAdmin) {
          // Admin: Fetch from dashboard stats endpoint
          try {
            const statsResponse = await JEDApiService.getDashboardStats();
            const payload = statsResponse?.data ?? statsResponse ?? {};

            const normalized = {
              pendingRequests: payload.pendingRequests ?? payload.pendingCount ?? payload.pending ?? 0,
              completedRequests: payload.completedRequests ?? payload.completedCount ?? payload.completed ?? 0,
              activeInstallers: payload.activeInstallers ?? payload.active_installers ?? payload.installersActive ?? 0,
              totalRevenue: payload.totalRevenue ?? payload.total_revenue ?? payload.revenue ?? 0
            };

            setStats(normalized);
          } catch (statsError) {
            console.warn('[Dashboard] Failed to fetch admin stats, calculating from installations:', statsError.message);
            // Fallback: Calculate stats from installations
            calculateStatsFromInstallations(installations);
          }
        } else {
          // Installer: Try installer-specific endpoint first, then fallback to calculation
          try {
            const installerStatsResponse = await JEDApiService.getInstallerDashboard();
            if (installerStatsResponse) {
              const payload = installerStatsResponse?.data ?? installerStatsResponse ?? {};
              const normalized = {
                pendingRequests: payload.pendingRequests ?? payload.pendingCount ?? payload.pending ?? 0,
                completedRequests: payload.completedRequests ?? payload.completedCount ?? payload.completed ?? 0,
                activeInstallers: 1, // Always 1 for installers (themselves)
                totalRevenue: payload.totalRevenue ?? payload.total_revenue ?? payload.revenue ?? 0
              };
              setStats(normalized);
            } else {
              // Endpoint returned null, calculate from installations
              calculateStatsFromInstallations(installations);
            }
          } catch (installerStatsError) {
            console.warn('[Dashboard] Failed to fetch installer stats, calculating from installations:', installerStatsError.message);
            // Fallback: Calculate stats from installations
            calculateStatsFromInstallations(installations);
          }
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Helper function to calculate stats from installations data
    const calculateStatsFromInstallations = (installations) => {
      const allInstallations = installations || recentInstallations;
      const normalized = {
        pendingRequests: allInstallations.filter(inst => 
          inst.status === 'pending' || inst.status === 'processing'
        ).length,
        completedRequests: allInstallations.filter(inst => 
          inst.status === 'completed'
        ).length,
        activeInstallers: isAdmin ? 0 : 1, // For installers, show 1 (themselves)
        totalRevenue: allInstallations
          .filter(inst => inst.status === 'completed')
          .reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0)
      };
      setStats(normalized);
      console.log('[Dashboard] Stats calculated from installations:', normalized);
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, showInstallerData, isAdmin, recentInstallations]);

  const handleExportData = async (exportType, format) => {
    try {
      let blob;
      let filename;

      switch (exportType) {
        case 'meters':
          blob = await JEDApiService.exportMeters({ format });
          filename = `meters_export_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
          break;
        case 'pending':
          blob = await JEDApiService.exportCustomerRequests({ status: 'pending', format });
          filename = `pending_requests_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
          break;
        case 'completed':
          blob = await JEDApiService.exportCustomerRequests({ status: 'completed', format });
          filename = `completed_requests_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
          break;
        default:
          blob = await JEDApiService.exportCustomerRequests({ format });
          filename = `all_requests_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      }

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  const handleGenerateReport = async () => {
    // Open export modal with report preset
    setShowExportModal(true);
  };

  const handleManageUsers = () => {
    navigate('/users');
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {showInstallerData && !isAdmin ? 'Installer Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {showInstallerData && !isAdmin 
                ? 'Track your installation activity and performance' 
                : 'Monitor system performance and manage users'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            {isAdmin && (
              <button 
                onClick={handleGenerateReport}
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            )}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard
            title="Pending"
            value={stats.pendingRequests}
            icon={Clock}
            change={5}
            changeType="neutral"
          />
          <StatCard
            title="Completed"
            value={stats.completedRequests}
            icon={CheckCircle}
            change={8}
            changeType="positive"
          />
          <StatCard
            title="Installers"
            value={stats.activeInstallers}
            icon={Users}
            change={-2}
            changeType="negative"
          />
          <StatCard
            title="Revenue"
            value={
              typeof stats.totalRevenue === 'number'
                ? formatCurrencyNGN(stats.totalRevenue)
                : stats.totalRevenue
            }
            icon={BarChart}
            changeType="neutral"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Installations */}
          <div className="lg:col-span-2">
            <RecentInstallations 
              installations={recentInstallations}
              totalCount={requestsTotalCount}
              onViewAll={() => navigate('/reports')}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-4 sm:space-y-6">
            <QuickActions 
              onManageUsers={handleManageUsers}
              onGoToSettings={handleGoToSettings}
              onExportData={() => setShowExportModal(true)}
              isAdmin={isAdmin}
            />
          </div>
        </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportData}
      />
    </div>
  );
}

export default AdminDashboard;