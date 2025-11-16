import { useState, useMemo, useCallback } from 'react';
import { 
  FileText, Power, PlusCircle, Search, Filter, RefreshCw, 
  CheckCircle, Clock, AlertCircle 
} from 'lucide-react';

// Constants for better maintainability
const STATUS_CONFIG = {
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

const STATS_CARDS = [
  {
    key: 'total',
    title: 'Total Submissions',
    icon: FileText,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    key: 'completed',
    title: 'Completed',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    key: 'pending',
    title: 'Pending',
    icon: Clock,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    key: 'today',
    title: 'Today',
    icon: PlusCircle,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  }
];

// Stats card component
const StatsCard = ({ title, value, icon: Icon, bgColor, iconColor }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-gray-500 text-sm font-medium mb-1 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${bgColor} rounded-full p-2 sm:p-3 flex-shrink-0 ml-4`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// Status badge component
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};

// Loading state component
const LoadingState = () => (
  <tr>
    <td colSpan="8" className="px-4 sm:px-6 py-16 text-center">
      <div className="flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-gray-600 font-medium">Loading submissions...</p>
        <p className="text-gray-400 text-sm mt-1">Please wait</p>
      </div>
    </td>
  </tr>
);

// Empty state component
const EmptyState = ({ hasFilters, searchTerm, statusFilter }) => (
  <tr>
    <td colSpan="8" className="px-4 sm:px-6 py-16 text-center">
      <div className="flex flex-col items-center justify-center">
        <Filter className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">No submissions found</p>
        <p className="text-gray-400 text-sm mt-1 max-w-xs">
          {hasFilters 
            ? 'Try adjusting your search or filter' 
            : 'No data available. Submit your first installation to get started.'
          }
        </p>
      </div>
    </td>
  </tr>
);

// Table row component
const SubmissionRow = ({ submission }) => (
  <tr className="hover:bg-gray-50 transition-colors duration-150">
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      <span className="text-sm font-semibold text-gray-900">#{submission.id}</span>
    </td>
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      <span className="text-sm text-gray-900 font-medium">{submission.sealNo || 'N/A'}</span>
    </td>
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      <span className="text-sm text-gray-900">{submission.accountNumber || 'N/A'}</span>
    </td>
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      <span className="text-sm text-gray-900 font-mono">{submission.meterNo || 'N/A'}</span>
    </td>
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
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
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      <StatusBadge status={submission.status} />
    </td>
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      <span className="text-sm text-gray-500">{submission.submittedAt || 'N/A'}</span>
    </td>
    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
      {submission.paymentReference ? (
        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {submission.paymentReference}
        </span>
      ) : (
        <span className="text-xs text-gray-400">N/A</span>
      )}
    </td>
  </tr>
);

function Dashboard({ submissions, loading, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Memoized filtered submissions for performance
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch = 
        sub.sealNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.accountNumber?.toString().includes(searchTerm) ||
        sub.meterNo?.toString().includes(searchTerm);
      
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

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
  }, []);

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return searchTerm || statusFilter !== 'all';
  }, [searchTerm, statusFilter]);

  // Table headers for responsive design
  const tableHeaders = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'sealNo', label: 'Seal Number', className: 'min-w-[120px]' },
    { key: 'accountNumber', label: 'Account Number', className: 'min-w-[140px]' },
    { key: 'meterNo', label: 'Meter Number', className: 'min-w-[140px]' },
    { key: 'installer', label: 'Installer', className: 'min-w-[150px]' },
    { key: 'status', label: 'Status', className: 'w-24' },
    { key: 'submittedAt', label: 'Submitted At', className: 'min-w-[140px]' },
    { key: 'paymentRef', label: 'Payment Ref', className: 'min-w-[120px]' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-gray-600 text-sm sm:text-base">View and manage all meter submissions</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium">{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STATS_CARDS.map((card) => (
          <StatsCard
            key={card.key}
            title={card.title}
            value={stats[card.key]}
            icon={card.icon}
            bgColor={card.bgColor}
            iconColor={card.iconColor}
          />
        ))}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search by Seal, Account, or Meter Number..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer transition-all w-full sm:w-auto text-sm sm:text-base"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </div>
        )}
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {tableHeaders.map((header) => (
                  <th 
                    key={header.key}
                    className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${header.className || ''}`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <LoadingState />
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((submission) => (
                  <SubmissionRow key={submission.id} submission={submission} />
                ))
              ) : (
                <EmptyState 
                  hasFilters={hasActiveFilters}
                  searchTerm={searchTerm}
                  statusFilter={statusFilter}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      {filteredSubmissions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 gap-2">
            <span className="text-center sm:text-left">
              Displaying <strong>{filteredSubmissions.length}</strong> submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-500 text-center sm:text-right">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;