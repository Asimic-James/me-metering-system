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
const RecentInstallations = ({ installations }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 overflow-hidden">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Recent Installations</h3>
      <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500">
            <th className="pb-4 font-medium">Account No.</th>
            <th className="pb-4 font-medium">Installer</th>
            <th className="pb-4 font-medium">Status</th>
            <th className="pb-4 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {installations.map((install) => (
            <tr key={install.id} className="border-t border-gray-100">
              <td className="py-4 pr-4">{install.accountNumber}</td>
              <td className="py-4 pr-4">{install.installer?.name}</td>
              <td className="py-4 pr-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  install.status === 'completed' ? 'bg-green-100 text-green-800' :
                  install.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {install.status}
                </span>
              </td>
              <td className="py-4">{new Date(install.submittedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Installer Performance Component
const InstallerPerformance = ({ installers }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Installer Performance</h3>
      <button className="text-sm text-blue-600 hover:text-blue-700">View Details</button>
    </div>
    <div className="space-y-4">
      {installers.map((installer) => (
        <div key={installer.id} className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            {installer.name.charAt(0)}
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900">{installer.name}</p>
              <span className="text-sm text-gray-500">{installer.successRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2" 
                style={{ width: `${installer.successRate}%` }}
              />
            </div>
          </div>
        </div>
      ))}
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
    totalInstallations: 0,
    pendingCount: 0,
    completedCount: 0,
    activeInstallers: 0
  });
  const [recentInstallations, setRecentInstallations] = useState([]);
  const [installerPerformance, setInstallerPerformance] = useState([]);
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
        setStats(statsResponse.data || statsResponse);

        // Fetch recent installations
        const installationsResponse = await api.getAllCustomerRequests({
          page: 1,
          limit: 5
        });
        setRecentInstallations(installationsResponse.data || installationsResponse);

        // Fetch installer performance
        const performanceResponse = await api.getInstallerPerformance();
        setInstallerPerformance(performanceResponse.data || performanceResponse);

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
          title="Total Installations" 
          value={stats.totalInstallations} 
          icon={BarChart}
          change={12}
          changeType="positive"
        />
        <StatCard 
          title="Pending" 
          value={stats.pendingCount} 
          icon={Clock}
          change={5}
          changeType="neutral"
        />
        <StatCard 
          title="Completed" 
          value={stats.completedCount} 
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
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Installations - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <RecentInstallations installations={recentInstallations} />
        </div>

        {/* Right Side Panel - Takes up 1 column */}
        <div className="space-y-6">
          <InstallerPerformance installers={installerPerformance} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;