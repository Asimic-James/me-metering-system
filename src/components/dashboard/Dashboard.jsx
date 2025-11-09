import { useState, useMemo } from 'react';
import { FileText, Power, PlusCircle, Search, Filter, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

function Dashboard({ submissions, loading, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Memoized filtered submissions for performance
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch = 
        (sub.sealNo?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (sub.accountNumber?.toString().includes(searchTerm) || false) ||
        (sub.meterNo?.toString().includes(searchTerm) || false);
      
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchTerm, statusFilter]);

  // Memoized statistics
  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US');
    return {
      total: submissions.length,
      completed: submissions.filter(s => s.status === 'completed').length,
      pending: submissions.filter(s => s.status === 'pending').length,
      today: submissions.filter(s => s.submittedAt?.includes(today)).length
    };
  }, [submissions]);

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Completed'
      },
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: Clock,
        label: 'Pending'
      },
      failed: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: AlertCircle,
        label: 'Failed'
      },
      processing: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: RefreshCw,
        label: 'Processing'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Stats card component
  const StatsCard = ({ title, value, icon: Icon, bgColor, iconColor }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${bgColor} rounded-full p-3`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-gray-600">View and manage all meter submissions</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium">{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Submissions"
          value={stats.total}
          icon={FileText}
          bgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle}
          bgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          bgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <StatsCard
          title="Today"
          value={stats.today}
          icon={PlusCircle}
          bgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Seal Number, Account Number, or Meter Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer transition-all min-w-[180px]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Results Count */}
        {searchTerm || statusFilter !== 'all' ? (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </div>
        ) : null}
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Seal Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Meter Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Installer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Submitted At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Payment Ref
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                      <p className="text-gray-600 font-medium">Loading submissions...</p>
                      <p className="text-gray-400 text-sm mt-1">Please wait</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((submission) => (
                  <tr 
                    key={submission.id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">#{submission.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">{submission.sealNo || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{submission.accountNumber || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">{submission.meterNo || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {submission.installer?.name || 'N/A'}
                        </span>
                        {submission.installer?.employeeId && (
                          <span className="text-xs text-gray-500">
                            ID: {submission.installer.employeeId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{submission.submittedAt || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.paymentReference ? (
                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {submission.paymentReference}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-600 font-medium">No submissions found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'Try adjusting your search or filter' 
                          : 'No data available'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      {filteredSubmissions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Displaying <strong>{filteredSubmissions.length}</strong> submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;