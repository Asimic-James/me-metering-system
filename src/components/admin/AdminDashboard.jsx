import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import { JEDApiService } from '../services/api';
import { 
  BarChart,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, change, changeType = 'neutral' }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${
        changeType === 'positive' ? 'bg-green-100 text-green-600' :
        changeType === 'negative' ? 'bg-red-100 text-red-600' :
        'bg-blue-100 text-blue-600'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      {change && (
        <div className={`flex items-center text-sm ${
          changeType === 'positive' ? 'text-green-600' :
          changeType === 'negative' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {changeType === 'positive' ? <ArrowUpRight className="w-4 h-4" /> :
           changeType === 'negative' ? <ArrowDownRight className="w-4 h-4" /> : null}
          <span>{Math.abs(change)}%</span>
        </div>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

// Recent Installations Table
const RecentInstallations = ({ installations, totalCount, onViewAll }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 overflow-hidden">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Recent Installations</h3>
      <button onClick={onViewAll} className="text-sm text-blue-600 hover:text-blue-700">
        View All ({totalCount})
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500">
            <th className="pb-4 font-medium">Account No.</th>
            <th className="pb-4 font-medium">Customer</th>
            <th className="pb-4 font-medium">Status</th>
            <th className="pb-4 font-medium">Amount</th>
            <th className="pb-4 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {installations.map((install) => (
            <tr key={install.id} className="border-t border-gray-100">
              <td className="py-4 pr-4">{install.accountNumber}</td>
              <td className="py-4 pr-4">{install.custNames || install.applicantName || install.installer?.name || '-'}</td>
              <td className="py-4 pr-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  install.status === 'completed' ? 'bg-green-100 text-green-800' :
                  install.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {install.status}
                </span>
              </td>
              <td className="py-4 pr-4 font-medium">{typeof install.amount === 'number' ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(install.amount) : (install.amount || '-')}</td>
              <td className="py-4">{install.submittedAt ? new Date(install.submittedAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Quick Actions Component
const QuickActions = () => (
  <div className="grid grid-cols-2 gap-4">
    <button className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <Users className="w-6 h-6 text-blue-600 mb-2" />
      <span className="text-sm font-medium text-gray-900">Manage Users</span>
    </button>
    <button className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <BarChart className="w-6 h-6 text-blue-600 mb-2" />
      <span className="text-sm font-medium text-gray-900">Export Data</span>
    </button>
  </div>
);

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    // Normalized shape matching API: { pendingRequests, completedRequests, activeInstallers, totalRevenue }
    pendingRequests: 0,
    completedRequests: 0,
    activeInstallers: 0,
    totalRevenue: 0
  });
  const [recentInstallations, setRecentInstallations] = useState([]);
  const [requestsTotalCount, setRequestsTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const api = new JEDApiService();

        // Fetch stats
        const statsResponse = await api.getDashboardStats();
        const payload = statsResponse?.data ?? statsResponse ?? {};

        // Normalize field names from possible legacy shapes
        const normalized = {
          pendingRequests: payload.pendingRequests ?? payload.pendingCount ?? payload.pending ?? 0,
          completedRequests: payload.completedRequests ?? payload.completedCount ?? payload.completed ?? 0,
          activeInstallers: payload.activeInstallers ?? payload.active_installers ?? payload.installersActive ?? 0,
          totalRevenue: payload.totalRevenue ?? payload.total_revenue ?? payload.revenue ?? 0
        };

        setStats(normalized);

        // Fetch recent installations
        const installationsResponse = await api.getAllCustomerRequests({
          page: 1,
          limit: 5
        });
        // Extract data array and pagination metadata
        const installations = Array.isArray(installationsResponse) 
          ? installationsResponse 
          : (installationsResponse?.data || []);
        const paginationData = installationsResponse?.pagination || {};
        
        setRecentInstallations(installations);
        setRequestsTotalCount(paginationData.totalCount || installations.length);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (hasPermission(user?.role, PERMISSIONS.VIEW_ADMIN_DASHBOARD)) {
      fetchDashboardData();
    }
  }, [user]);

  if (!hasPermission(user?.role, PERMISSIONS.VIEW_ADMIN_DASHBOARD)) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view the admin dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-900">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor system performance and manage users</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          icon={Clock}
          change={5}
          changeType="neutral"
        />
        <StatCard
          title="Completed Requests"
          value={stats.completedRequests}
          icon={CheckCircle}
          change={8}
          changeType="positive"
        />
        <StatCard
          title="Active Installers"
          value={stats.activeInstallers}
          icon={Users}
          change={-2}
          changeType="negative"
        />
        <StatCard
          title="Total Revenue"
          value={
            // Format as currency if number, otherwise show raw
            typeof stats.totalRevenue === 'number'
              ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(stats.totalRevenue)
              : stats.totalRevenue
          }
          icon={BarChart}
          change={0}
          changeType="neutral"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Installations - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <RecentInstallations 
            installations={recentInstallations}
            totalCount={requestsTotalCount}
            onViewAll={() => console.log('Navigate to reports with full requests list')}
          />
        </div>

        {/* Right Side Panel - Takes up 1 column */}
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;