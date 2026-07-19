import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import JEDApiService from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyNGN } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { getStatusBadgeClass } from '../../utils/statusBadge';
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
  X,
  LayoutDashboard,
  Wrench
} from 'lucide-react';

// Stat Card Component - Mobile First
 
const StatCard = ({ title, value, icon: Icon, change, changeType = 'neutral' }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 flex flex-col">
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
    <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">{title}</h3>
    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
  </div>
);

/**
 * Resolve a display-ready installation date from a request object.
 *
 * NOTE: the real API response's date field name is unconfirmed — the
 * dashboard was previously reading only `submittedAt`, which showed as a
 * dash ("-") for every row because the real field is (most likely) named
 * something else. This checks the most probable candidates in priority
 * order rather than assuming a single field name. Once the real response
 * shape is confirmed, this fallback chain can be trimmed to just the
 * correct field.
 */
const getInstallDate = (install) => {
  const raw =
    install?.submittedAt ||
    install?.createdAt ||
    install?.dateCreated ||
    install?.requestDate ||
    install?.transactiondate ||
    install?.date ||
    null;

  if (!raw) return '-';
  return formatDateTime(raw);
};

// Recent Installations Table - Mobile Optimized
const RecentInstallations = ({ installations, totalCount, onViewAll, onItemClick }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
    <div className="flex items-center justify-between p-4 sm:p-6 border-b">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Installations</h3>
      <button 
        onClick={onViewAll} 
        className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        View All ({totalCount})
      </button>
    </div>
    
    {/* Mobile Card View */}
    <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
      {installations.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          No installations found
        </div>
      ) : (
        installations.map((install) => (
          <button
            key={install.id}
            type="button"
            onClick={() => onItemClick(install)}
            className="w-full text-left p-4 hover:bg-gray-50 dark:bg-gray-900/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{install.accountNumber}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {install.custNames || install.applicantName || install.installer?.name || '-'}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(install.status)}`}>
                {install.status}
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getInstallDate(install)}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {formatCurrencyNGN(install.amount)}
                </span>
              </div>
              {install.email && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Email: {install.email}
                </div>
              )}
              {(install.rrr || install.paymentReference || install.paymentRef || install.remitaRef) && (
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  RRR: {install.rrr || install.paymentReference || install.paymentRef || install.remitaRef}
                </div>
              )}
            </div>
          </button>
        ))
      )}
    </div>

    {/* Desktop Table View */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b text-xs sm:text-sm">
            <th className="px-4 py-3 font-semibold">Account</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold text-right">Amount</th>
            <th className="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {installations.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No installations found
              </td>
            </tr>
          ) : (
            installations.map((install) => (
              <tr
                key={install.id}
                onClick={() => onItemClick(install)}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    onItemClick(install);
                  }
                }}
                className="hover:bg-gray-50 dark:bg-gray-900/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium text-sm">{install.accountNumber}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                  {install.custNames || install.applicantName || install.installer?.name || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(install.status)}`}>
                    {install.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white text-sm">
                  {formatCurrencyNGN(install.amount)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                  {getInstallDate(install)}
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
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Data</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Data</option>
              <option value="pending">Pending Requests</option>
              <option value="completed">Completed Requests</option>
              <option value="jed">All Requests — Detailed (JED)</option>
              <option value="meters">Meters</option>
              <option value="installers">Installer Performance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
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
// FIX: labels previously used `text-gray-900 dark:text-white`, but the
// gradient button backgrounds (from-blue-50/green-50/purple-50) are NOT
// dark-mode aware — they stay light even in dark mode. That meant in dark
// mode the text flipped to white while sitting on a light pastel
// background, producing low-contrast, hard-to-read buttons (confirmed in
// the reported screenshot). Text is now always dark (`text-gray-900`),
// matching the backgrounds' actual (always-light) appearance.
const QuickActions = ({ onManageUsers, onGoToSettings, onExportData, isAdmin }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
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

const normalizePercentage = (value) => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    const numericValue = Number(String(value).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(numericValue) ? Math.round(numericValue) : undefined;
  }
  return undefined;
};

function AdminDashboard({ isInstallerView = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    completedRequests: 0,
    activeInstallers: 0,
    totalRevenue: 0,
    pendingChange: undefined,
    completedChange: undefined,
    activeInstallersChange: undefined,
    revenueChange: undefined
  });
  const [recentInstallations, setRecentInstallations] = useState([]);
  const [requestsTotalCount, setRequestsTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const isAdmin = user?.role === 'admin';
  const showInstallerData = isInstallerView || !isAdmin;

  useEffect(() => {
    // Helper: calculate stats client-side from a given installations array.
    // Takes the array explicitly rather than reading from state, so it's
    // never stale and never needs to be a dependency of the outer effect.
    const calculateStatsFromInstallations = (installations, forInstallerView) => {
      const normalized = {
        pendingRequests: installations.filter(inst =>
          inst.status === 'pending' || inst.status === 'processing'
        ).length,
        completedRequests: installations.filter(inst =>
          inst.status === 'completed'
        ).length,
        activeInstallers: forInstallerView ? 1 : 0, // installer view: just themselves
        totalRevenue: installations
          .filter(inst => inst.status === 'completed')
          .reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0)
      };
      setStats(normalized);
      console.log('[Dashboard] Stats calculated from installations:', normalized);
    };

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isAdmin && !showInstallerData) {
          // ---- Admin: full pipeline visibility across all installers ----
          const installationsResponse = await JEDApiService.getAllCustomerRequests({
            page: 1,
            limit: 5
          });
          const installations = Array.isArray(installationsResponse)
            ? installationsResponse
            : (installationsResponse?.data || []);
          const paginationData = installationsResponse?.pagination || {};

          setRecentInstallations(installations);
          setRequestsTotalCount(paginationData.totalCount || installations.length);

          try {
            const statsResponse = await JEDApiService.getDashboardStats();
            const payload = statsResponse?.data ?? statsResponse ?? {};
            setStats({
              pendingRequests: payload.pendingRequests ?? payload.pendingCount ?? payload.pending ?? 0,
              completedRequests: payload.completedRequests ?? payload.completedCount ?? payload.completed ?? 0,
              activeInstallers: payload.activeInstallers ?? payload.active_installers ?? payload.installersActive ?? 0,
              totalRevenue: payload.totalRevenue ?? payload.total_revenue ?? payload.revenue ?? 0,
              pendingChange: normalizePercentage(
                payload.pendingChange ?? payload.pending_change ?? payload.pendingPercent ?? payload.pendingPercentChange ?? payload.pendingRequestsChange
              ),
              completedChange: normalizePercentage(
                payload.completedChange ?? payload.completed_change ?? payload.completedPercent ?? payload.completedPercentChange ?? payload.completedRequestsChange
              ),
              activeInstallersChange: normalizePercentage(
                payload.activeInstallersChange ?? payload.active_installers_change ?? payload.installersChange ?? payload.installersChangePercent
              ),
              revenueChange: normalizePercentage(
                payload.revenueChange ?? payload.totalRevenueChange ?? payload.revenue_change ?? payload.revenuePercent ?? payload.revenueGrowth
              )
            });
          } catch (statsError) {
            console.warn('[Dashboard] Failed to fetch admin stats, calculating from installations:', statsError.message);
            calculateStatsFromInstallations(installations, false);
          }
        } else {
          // ---- Installer: jobs assigned to THIS installer only ----
          // CORRECTED: getMyInstallations() no longer takes employeeId as
          // a positional argument — the real endpoint (/requests/installer)
          // is scoped by the auth token, not a URL param. employeeId is
          // now passed inside params, used only by the client-side
          // fallback filter if the dedicated endpoint isn't available.
          const myResponse = await JEDApiService.getMyInstallations({
            page: 1,
            limit: 5,
            employeeId: user?.employeeId || user?.staffId || user?.id
          });
          const installations = Array.isArray(myResponse) ? myResponse : (myResponse?.data || []);
          const paginationData = myResponse?.pagination || {};

          setRecentInstallations(installations);
          setRequestsTotalCount(paginationData.totalCount || installations.length);

          try {
            const installerStatsResponse = await JEDApiService.getInstallerDashboard();
            if (installerStatsResponse) {
              const payload = installerStatsResponse?.data ?? installerStatsResponse ?? {};
              setStats({
                pendingRequests: payload.pendingRequests ?? payload.pendingCount ?? payload.pending ?? 0,
                completedRequests: payload.completedRequests ?? payload.completedCount ?? payload.completed ?? 0,
                activeInstallers: 1,
                totalRevenue: payload.totalRevenue ?? payload.total_revenue ?? payload.revenue ?? 0,
                pendingChange: normalizePercentage(
                  payload.pendingChange ?? payload.pending_change ?? payload.pendingPercent ?? payload.pendingPercentChange ?? payload.pendingRequestsChange
                ),
                completedChange: normalizePercentage(
                  payload.completedChange ?? payload.completed_change ?? payload.completedPercent ?? payload.completedPercentChange ?? payload.completedRequestsChange
                ),
                activeInstallersChange: normalizePercentage(
                  payload.activeInstallersChange ?? payload.active_installers_change ?? payload.installersChange ?? payload.installersChangePercent
                ),
                revenueChange: normalizePercentage(
                  payload.revenueChange ?? payload.totalRevenueChange ?? payload.revenue_change ?? payload.revenuePercent ?? payload.revenueGrowth
                )
              });
            } else {
              calculateStatsFromInstallations(installations, true);
            }
          } catch (installerStatsError) {
            console.warn('[Dashboard] Failed to fetch installer stats, calculating from installations:', installerStatsError.message);
            calculateStatsFromInstallations(installations, true);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
    // NOTE: `recentInstallations` intentionally excluded — it's set inside
    // this effect, so including it as a dependency caused a refetch loop.
  }, [user, showInstallerData, isAdmin]);

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
        case 'jed':
          // Activates the previously dormant JED-group export endpoint
          // (/external/jed/requests/export), distinct from the
          // METERS-group exportCustomerRequests used above.
          blob = await JEDApiService.exportJedRequests({ format });
          filename = `jed_requests_detailed_${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;
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

  const handleRowClick = (install) => {
    navigate(`/installations/${install.accountNumber}`);
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
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white mb-4">{error}</p>
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
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              {showInstallerData && !isAdmin
                ? <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                : <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {showInstallerData && !isAdmin ? 'Installer Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
              {showInstallerData && !isAdmin 
                ? 'Track your installation activity and performance' 
                : 'Monitor system performance and manage users'}
            </p>
          </div>
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
            change={stats.pendingChange ?? (stats.pendingRequests + stats.completedRequests > 0
              ? Math.round((stats.pendingRequests / (stats.pendingRequests + stats.completedRequests)) * 100)
              : undefined)}
            changeType={stats.pendingChange != null || stats.pendingRequests + stats.completedRequests > 0 ? 'negative' : 'neutral'}
          />
          <StatCard
            title="Completed"
            value={stats.completedRequests}
            icon={CheckCircle}
            change={stats.completedChange ?? (stats.pendingRequests + stats.completedRequests > 0
              ? Math.round((stats.completedRequests / (stats.pendingRequests + stats.completedRequests)) * 100)
              : undefined)}
            changeType={stats.completedChange != null || stats.pendingRequests + stats.completedRequests > 0 ? 'positive' : 'neutral'}
          />
          <StatCard
            title="Installers"
            value={stats.activeInstallers}
            icon={Users}
            change={stats.activeInstallersChange}
            changeType={stats.activeInstallersChange > 0 ? 'positive' : stats.activeInstallersChange < 0 ? 'negative' : 'neutral'}
          />
          <StatCard
            title="Revenue"
            value={
              typeof stats.totalRevenue === 'number'
                ? formatCurrencyNGN(stats.totalRevenue)
                : stats.totalRevenue
            }
            icon={BarChart}
            change={stats.revenueChange}
            changeType={stats.revenueChange > 0 ? 'positive' : stats.revenueChange < 0 ? 'negative' : 'neutral'}
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
              onItemClick={handleRowClick}
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