import { useState, useMemo, useCallback, useEffect } from 'react';
import JEDApiService from '../services/api';
import { usePermissions } from '../auth/usePermissions';
import { useDataRefresh } from '../contexts/DataRefreshContext';
import ConfirmationModal from '../common/ConfirmationModal';
import InfoModal from '../common/InfoModal';
import {
  Calendar, MapPin, User, Phone, Clock, CheckCircle,
  AlertCircle, FileText, Search, // Navigation and Filter icons removed — confirmed unused
  Zap,
  Cpu,
  Battery,
  Wrench,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Trash2,
  Loader2,
  UserPlus
} from 'lucide-react';
import { formatDateOnly } from '../../utils/date';

// Constants for better maintainability
const PRIORITY_CONFIG = {
  high: { bg: 'bg-red-100', text: 'text-red-800', label: 'High' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
  low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' }
};

const STATUS_CONFIG = {
  pending: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
  completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle }
};

const METER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status', icon: Battery },
  { value: 'AVAILABLE', label: 'Available', icon: CheckCircle },
  { value: 'INSTALLED', label: 'Installed', icon: Wrench },
  { value: 'FAULTY', label: 'Faulty', icon: AlertTriangle },
  { value: 'RETIRED', label: 'Retired', icon: Battery }
];

const PHASE_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Phases' },
  { value: 'SINGLE PHASE', label: 'Single Phase', icon: Zap },
  { value: 'THREE PHASE', label: 'Three Phase', icon: Cpu }
];

const METER_STATISTICS_CONFIG = {
  totalMeters: {
    title: 'Total Meters',
    icon: Database,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  available: {
    title: 'Available',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  installed: {
    title: 'Installed',
    icon: Wrench,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  faulty: {
    title: 'Faulty',
    icon: AlertTriangle,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  retired: {
    title: 'Retired',
    icon: Battery,
    bgColor: 'bg-gray-100 dark:bg-gray-800/80',
    iconColor: 'text-gray-800 dark:text-gray-200'
  },
  singlePhase: {
    title: 'Single Phase',
    icon: Zap,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  threePhase: {
    title: 'Three Phase',
    icon: Cpu,
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
  completed: {
    title: 'Completed',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  paid: {
    title: 'Paid',
    icon: CheckCircle,
    bgColor: 'bg-teal-100',
    iconColor: 'text-teal-600'
  },
  pending: {
    title: 'Pending',
    icon: Clock,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  }
};

const TABS = [
  { id: 'inventory', label: 'Meter Inventory' },
  { id: 'query', label: 'Meter Query' }
];

// Shared hook for meter data fetching
//
// FIXED (2 issues):
// 1. `updateFilters` previously called `fetchMeters()` directly AND updated
//    `filters` state, which independently re-triggered the effect below
//    (since it watches `filters`) — every filter/search change fired two
//    identical network requests. Now `updateFilters` only updates state;
//    the effect is the single source of truth for "filters changed, fetch."
// 2. Added an `enabled` param. Previously this hook fetched on mount
//    unconditionally, so both the Inventory tab's instance AND the Query
//    tab's instance fired a request immediately even though only one tab
//    is ever visible at a time. Now each instance only fetches once its
//    tab is actually active.
const useMeterData = (initialFilters = {}, enabled = true) => {
  const { refreshSignal } = useDataRefresh();
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: 'ALL',
    phaseType: 'ALL',
    searchTerm: '',
    ...initialFilters
  });

  const fetchMeters = useCallback(async (page = 1, currentFilters = filters, pageLimit = null) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pageLimit || pagination.limit
      };

      if (currentFilters.status !== 'ALL') {
        params.status = currentFilters.status;
      }

      if (currentFilters.phaseType !== 'ALL') {
        params.phaseType = currentFilters.phaseType;
      }

      if (currentFilters.searchTerm) {
        params.search = currentFilters.searchTerm;
      }

      console.log('[MeterData] Fetching meters with params:', JSON.stringify(params)); // Added for debugging
      const response = await JEDApiService.getMeters(params);

      const payload = response?.data ?? response;
      const metersData = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response?.data?.results)
              ? response.data.results
              : Array.isArray(response?.data?.items)
                ? response.data.items
                : Array.isArray(payload?.results)
                  ? payload.results
                  : Array.isArray(payload?.items)
                    ? payload.items
                    : Array.isArray(payload?.records)
                      ? payload.records
                      : Array.isArray(payload)
                        ? payload
                        : [];

      const metadata = response?.meta ?? response?.data?.meta ?? payload?.meta ?? {};
      const paginationData = response?.pagination
        || response?.data?.pagination
        || response?.data?.pageInfo
        || payload?.pagination
        || payload?.pageInfo
        || metadata
        || {};

      // NOTE: the real GET /meters endpoint returns pagination.currentPage as a
      // STRING ("1", "2", ...) while every other paginated endpoint in this app
      // (e.g. GET /external/jed/requests) returns it as a number. Every field
      // extracted here is coerced with Number() so page/limit/total/pages are
      // always numeric — without this, `pagination.page + 1` in the Next button
      // handler does string concatenation ("1" + 1 = "11") instead of numeric
      // addition, silently requesting a wildly out-of-range page that legitimately
      // comes back empty (looked like a pagination bug, was actually this).
      const totalCount = Number(paginationData.total ?? paginationData.totalCount ?? paginationData.total_items ?? paginationData.count ?? paginationData.total_documents ?? paginationData.totalRecords ?? response?.total ?? response?.count ?? response?.totalCount ?? response?.count ?? response?.data?.total ?? response?.data?.count ?? response?.data?.totalCount ?? response?.data?.count ?? metersData.length);
      const currentPage = Number(paginationData.page ?? paginationData.currentPage ?? paginationData.current_page ?? paginationData.currentPageNo ?? paginationData.current_page_no ?? response?.page ?? response?.currentPage ?? response?.current_page ?? response?.pageNumber ?? response?.data?.page ?? response?.data?.currentPage ?? response?.data?.current_page ?? page);
      const limitCount = Number(paginationData.limit ?? paginationData.perPage ?? paginationData.pageSize ?? paginationData.per_page ?? paginationData.per_page_size ?? paginationData.pageSize ?? metadata.perPage ?? metadata.pageSize ?? metadata.per_page ?? metadata.per_page_size ?? response?.limit ?? response?.perPage ?? response?.pageSize ?? pageLimit ?? pagination.limit);
      const inferredTotal = totalCount || metersData.length;
      const totalPages = Number(paginationData.pages ?? paginationData.totalPages ?? paginationData.total_pages ?? paginationData.pageCount ?? Math.max(1, Math.ceil(inferredTotal / (limitCount || pagination.limit || 1)), currentPage));

      console.log('[MeterData] Meters received:', metersData.length, 'items', 'total:', inferredTotal, 'page:', currentPage, 'limit:', limitCount, 'pages:', totalPages);
      
      setMeters(metersData);
      setPagination(prev => ({
        ...prev,
        page: currentPage,
        limit: limitCount,
        total: inferredTotal,
        pages: totalPages
      }));
    } catch (err) {
      console.error('[MeterData] Error fetching meters:', err);
      setError(err.message || 'Failed to load meters');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, filters]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const changePage = useCallback((page, newLimit = null) => {
    if (newLimit && newLimit !== pagination.limit) {
      setPagination(prev => ({ ...prev, limit: newLimit }));
      fetchMeters(1, filters, newLimit);
    } else {
      fetchMeters(page, filters);
    }
  }, [fetchMeters, filters, pagination.limit]);

  const exportMeters = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.status !== 'ALL') {
        params.status = filters.status;
      }
      if (filters.phaseType !== 'ALL') {
        params.phaseType = filters.phaseType;
      }
      if (filters.searchTerm) {
        params.search = filters.searchTerm;
      }

      const blob = await JEDApiService.exportMeters(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meters-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[MeterData] Export failed:', err);
      setError('Failed to export meters');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!enabled) return;
    fetchMeters(1, filters);
    // refreshSignal: re-fetch after an app-wide data mutation elsewhere
    // (e.g. a completed installation) — see DataRefreshContext.
  }, [enabled, fetchMeters, filters, refreshSignal]);

  return {
    meters,
    loading,
    error,
    pagination,
    filters,
    fetchMeters: () => fetchMeters(pagination.page, filters),
    updateFilters,
    changePage,
    exportMeters
  };
};

// Custom hook for meter statistics
const useMeterStatistics = () => {
  const { refreshSignal } = useDataRefresh();
  const [meterStats, setMeterStats] = useState({
    totalMeters: 0,
    available: 0,
    installed: 0,
    faulty: 0,
    retired: 0,
    singlePhase: 0,
    threePhase: 0,
    completed: 0,
    paid: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(true);

  const normalizeStats = (data) => {
    const stats = {
      totalMeters: data.totalMeters ?? data.total_meters ?? data.totalMetersCount ?? data.total_meters_count ?? data.total ?? data.count ?? 0,
      available: data.available ?? data.available_meters ?? data.availableMeters ?? data.available_count ?? data.availableCount ?? 0,
      installed: data.installed ?? data.installed_meters ?? data.installedMeters ?? data.installed_count ?? data.installedCount ?? 0,
      faulty: data.faulty ?? data.faulty_meters ?? data.faultyMeters ?? data.faulty_count ?? data.faultyCount ?? 0,
      retired: data.retired ?? data.retired_meters ?? data.retiredMeters ?? data.retired_count ?? data.retiredCount ?? 0,
      singlePhase: data.singlePhase ?? data.single_phase ?? data.singlePhaseMeters ?? data.single_phase_meters ?? 0,
      threePhase: data.threePhase ?? data.three_phase ?? data.threePhaseMeters ?? data.three_phase_meters ?? 0,
      completed: data.completed ?? data.completed_meters ?? data.completedMeters ?? data.completed_count ?? data.completedCount ?? 0,
      paid: data.paid ?? data.paid_meters ?? data.paidMeters ?? data.paid_count ?? data.paidCount ?? 0,
      pending: data.pending ?? data.pending_meters ?? data.pendingMeters ?? data.pending_count ?? data.pendingCount ?? 0
    };

    console.log('[MeterSchedule] Normalized meter stats:', stats);
    return stats;
  };

  const unwrapStatsResponse = (response) => {
    if (!response) return null;
    if (response.success && response.data) return response.data;
    if (response.data?.data) return response.data.data;
    return response.data ?? response;
  };

  const fetchMeterStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[MeterSchedule] Fetching meter statistics...');
      const response = await JEDApiService.getMeterStatistics();
      const payload = unwrapStatsResponse(response);

      if (!payload) {
        throw new Error('Empty meter statistics response');
      }

      console.log('[MeterSchedule] Meter stats received:', payload);
      setMeterStats(normalizeStats(payload));
      setHasPermission(true);
    } catch (err) {
      console.error('[MeterSchedule] Error fetching meter statistics:', err);
      
      const errorMessage = String(err.message || '').toLowerCase();
      if (errorMessage.includes('permission') || 
          errorMessage.includes('403') || 
          errorMessage.includes('insufficient')) {
        console.warn('[MeterSchedule] User lacks permission for meter statistics - hiding stats section');
        setHasPermission(false);
        setError(null);
      } else if (errorMessage.includes('not_found') || errorMessage.includes('404')) {
        console.warn('[MeterSchedule] Meter statistics endpoint not found');
        setError('Meter statistics service unavailable');
      } else {
        setError(err.message || 'Failed to load meter statistics');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeterStatistics();
  }, [fetchMeterStatistics, refreshSignal]);

  return {
    meterStats,
    loading,
    error,
    hasPermission,
    refetch: fetchMeterStatistics
  };
};

// Stats Cards Component
 
const StatsCard = ({ title, value, icon: Icon, bgColor, iconColor, loading = false, error = false }) => (
  <div className="card p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 truncate">{title}</p>
        <p className={`text-2xl sm:text-3xl font-bold ${error ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
          {loading ? '...' : error ? 'Error' : value}
        </p>
        {error && (
          <p className="text-xs text-red-500 mt-1">Failed to load</p>
        )}
      </div>
      <div className={`${bgColor} rounded-full p-2 sm:p-3 flex-shrink-0 ml-4`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
      </div>
    </div>
  </div>
);

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Meter Status Badge Component
const normalizeStatus = (status) => String(status || '').toUpperCase().trim();
const getMeterStatus = (meter) => {
  const installedAt = meter?.installedAt ?? meter?.installed_at ?? meter?.installedDate ?? meter?.installed_date;
  const isInstalledFlag = meter?.isInstalled === true || meter?.is_installed === true || meter?.installed === true || normalizeStatus(meter?.installed) === 'INSTALLED';
  const status = normalizeStatus(meter?.status);

  if (installedAt || isInstalledFlag || status === 'INSTALLED') {
    return 'INSTALLED';
  }

  if (status === 'FAULTY') {
    return 'FAULTY';
  }

  if (status === 'RETIRED') {
    return 'RETIRED';
  }

  if (status === 'AVAILABLE') {
    return 'AVAILABLE';
  }

  return status || 'AVAILABLE';
};

const getInstalledAtValue = (meter) => {
  return meter?.installedAt ?? meter?.installed_at ?? meter?.installedDate ?? meter?.installed_date ?? null;
};

const MeterStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' };
      case 'INSTALLED':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Installed' };
      case 'FAULTY':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Faulty' };
      case 'RETIRED':
        return { bg: 'bg-gray-100 dark:bg-gray-800/80', text: 'text-gray-800 dark:text-gray-200', label: 'Retired' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800/80', text: 'text-gray-800 dark:text-gray-200', label: status || 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Phase Type Badge Component
const PhaseTypeBadge = ({ phaseType }) => {
  const getPhaseConfig = (phaseType) => {
    switch (phaseType) {
      case 'SINGLE PHASE':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Zap, label: 'Single Phase' };
      case 'THREE PHASE':
        return { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Cpu, label: 'Three Phase' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800/80', text: 'text-gray-800 dark:text-gray-200', icon: null, label: phaseType };
    }
  };

  const config = getPhaseConfig(phaseType);
  const Icon = config.icon;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} flex items-center gap-1`}>
      {Icon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
};


// Meter Card Component
const MeterCard = ({ meter, canDelete, deleting, onDeleteClick, onAssignClick }) => {
  const status = getMeterStatus(meter);
  const canAssign = canDelete && status === 'AVAILABLE';
  return (
  <div className="card p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate mb-1">
          {meter.meterNumber}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          SIM: {meter.simNumber}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <MeterStatusBadge status={status} />
          {canDelete && (
            <button
              onClick={() => onDeleteClick(meter)}
              disabled={deleting}
              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
              title="Delete meter from inventory"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <PhaseTypeBadge phaseType={meter.phaseType} />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
      <div className="flex items-center text-gray-600 dark:text-gray-400">
        <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
        <span>Manufactured: {meter.manufacturedDate}</span>
      </div>
      <div className="flex items-center text-gray-600 dark:text-gray-400">
        <Wrench className="w-3 h-3 mr-2 flex-shrink-0" />
        <span>Make: {meter.meterMake}</span>
      </div>
      {meter.model && (
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
          <span>Model: {meter.model}</span>
        </div>
      )}
      {meter.sgcNumber && (
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
          <span>SGC: {meter.sgcNumber}</span>
        </div>
      )}
    </div>

    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p>Uploaded: {formatDateOnly(meter.uploadedAt)}</p>
          {getInstalledAtValue(meter) && (
            <p>Installed: {formatDateOnly(getInstalledAtValue(meter))}</p>
          )}
        </div>
        {canAssign && (
          <button
            onClick={() => onAssignClick(meter)}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
            title="Assign this meter to an installer/job"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

// Meter Table Component for Query Tab
const MeterTable = ({ meters, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading meters...</span>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Meter Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                SIM Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Make & Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Phase Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Manufactured
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Installed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {meters.map((meter) => (
              <tr key={meter.id} className="hover:bg-gray-50 dark:bg-gray-900/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                  {meter.meterNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {meter.simNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>{meter.meterMake}</div>
                  {meter.model && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{meter.model}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PhaseTypeBadge phaseType={meter.phaseType} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MeterStatusBadge status={getMeterStatus(meter)} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {meter.manufacturedDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {getInstalledAtValue(meter) ? new Date(getInstalledAtValue(meter)).toLocaleDateString() : 'Not Installed'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Loading Skeleton Component
const MeterLoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="card p-4 sm:p-6 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State Component
const EmptyState = ({ hasFilters, searchTerm, type = 'meters' }) => (
  <div className="card p-8 sm:p-12 text-center">
    <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mb-2">
      {hasFilters
        ? `No ${type} match your criteria`
        : `No ${type} found`}
    </p>
    {searchTerm && (
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">You searched for: <strong className="text-gray-700 dark:text-gray-300">"{searchTerm}"</strong></p>
    )}
    {(hasFilters || searchTerm) && (
      <p className="text-gray-400 text-xs sm:text-sm">
        Try adjusting your search criteria
      </p>
    )}
  </div>
);

// Filter Controls Component for Meter Inventory
const MeterFilterControls = ({ filters, onFilterChange, loading, onRefresh, onExport }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearchTerm !== filters.searchTerm) {
        onFilterChange({ ...filters, searchTerm: localSearchTerm });
      }
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [localSearchTerm, filters, onFilterChange]);

  const handleStatusChange = useCallback((status) => {
    onFilterChange({ ...filters, status });
  }, [filters, onFilterChange]);

  const handlePhaseChange = useCallback((phaseType) => {
    onFilterChange({ ...filters, phaseType });
  }, [filters, onFilterChange]);

  return (
    <div className="card p-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Search by Meter Number, SIM, SGC..."
              className="form-input w-full pl-10 pr-3 py-2 text-sm"
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="form-input w-full px-3 py-2 text-sm"
                disabled={loading}
              >
                {METER_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phase Type</label>
              <select
                value={filters.phaseType}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className="form-input w-full px-3 py-2 text-sm"
                disabled={loading}
              >
                {PHASE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-end">
            <button
              onClick={onExport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Advanced Query Controls Component
const QueryFilterControls = ({ filters, onFilterChange, loading, onRefresh, onExport }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearchTerm !== filters.searchTerm) {
        onFilterChange({ ...filters, searchTerm: localSearchTerm });
      }
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [localSearchTerm, filters, onFilterChange]);

  const handleStatusChange = useCallback((status) => {
    onFilterChange({ ...filters, status });
  }, [filters, onFilterChange]);

  const handlePhaseChange = useCallback((phaseType) => {
    onFilterChange({ ...filters, phaseType });
  }, [filters, onFilterChange]);

  return (
    <div className="card p-4">
      <div className="space-y-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Search by Meter Number, SIM, SGC..."
              className="form-input w-full pl-10 pr-3 py-2 text-sm"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="form-input w-full px-3 py-2 text-sm"
                disabled={loading}
              >
                {METER_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phase Type</label>
              <select
                value={filters.phaseType}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className="form-input w-full px-3 py-2 text-sm"
                disabled={loading}
              >
                {PHASE_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-end">
            <button
              onClick={onExport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Pagination Component
const Pagination = ({ pagination, onPageChange, loading }) => {
  const { page, pages, total, limit } = pagination;

  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(pages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < pages - 1) {
      rangeWithDots.push('...', pages);
    } else if (pages > 1) {
      rangeWithDots.push(pages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between card p-4 gap-4">
      <div className="text-sm text-gray-700 dark:text-gray-300 order-2 sm:order-1">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </div>

      <div className="flex items-center space-x-2 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || loading}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center space-x-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-2 text-gray-500 dark:text-gray-400"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
                className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages || loading}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(pages)}
          disabled={page >= pages || loading}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 order-3">
        <span className="hidden md:inline">Items per page:</span>
        <select
          value={limit}
          onChange={(e) => onPageChange(1, parseInt(e.target.value))}
          disabled={loading}
          className="form-input px-2 py-1 disabled:opacity-50"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  );
};

// Meter Inventory Component
const MeterInventory = ({ meterInventory, canManageSchedule }) => {
  const { meters, loading, error, pagination, filters, fetchMeters, updateFilters, changePage, exportMeters } = meterInventory;

  const [meterToDelete, setMeterToDelete] = useState(null);
  const [deletingNumber, setDeletingNumber] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [meterToAssign, setMeterToAssign] = useState(null);

  const handleDelete = useCallback(async () => {
    if (!meterToDelete) return;

    try {
      setDeletingNumber(meterToDelete.meterNumber);
      setDeleteError(null);
      await JEDApiService.deleteMeter(meterToDelete.meterNumber);
      await fetchMeters();
      setMeterToDelete(null);
    } catch (err) {
      console.error('[MeterInventory] Failed to delete meter:', err);
      setDeleteError(err.message || 'Failed to delete meter');
    } finally {
      setDeletingNumber(null);
    }
  }, [meterToDelete, fetchMeters]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <MeterFilterControls
        filters={filters}
        onFilterChange={updateFilters}
        loading={loading}
        onRefresh={fetchMeters}
        onExport={exportMeters}
      />

      {(error || deleteError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error || deleteError}</span>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!meterToDelete}
        onClose={() => setMeterToDelete(null)}
        onConfirm={handleDelete}
        loading={!!deletingNumber}
        title="Delete Meter"
        message={`Remove meter "${meterToDelete?.meterNumber}" from inventory? This cannot be undone.`}
        confirmText="Delete"
      />

      <InfoModal
        isOpen={!!meterToAssign}
        onClose={() => setMeterToAssign(null)}
        title="Meter Assignment Not Yet Available"
      >
        <p>
          Assigning meter <strong className="font-mono">{meterToAssign?.meterNumber}</strong> to an
          installer/job isn't possible yet — the real Pharez API has no field or endpoint linking a
          meter record to an installation request or an installer.
        </p>
        <p className="mt-2">
          This requires a backend change first (an endpoint to reserve a meter against a request,
          and a field recording that reservation). See <span className="font-mono">API_GAP_REPORT.md</span>{' '}
          for the exact endpoints needed. Meters are still linked to a completed installation today via
          the existing <span className="font-mono">meterNo</span>/<span className="font-mono">sealNo</span>{' '}
          fields submitted at completion time.
        </p>
      </InfoModal>

      {loading && <MeterLoadingSkeleton />}

      {!loading && meters.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {meters.map(meter => (
              <MeterCard
                key={meter.id}
                meter={meter}
                canDelete={canManageSchedule}
                deleting={deletingNumber === meter.meterNumber}
                onDeleteClick={setMeterToDelete}
                onAssignClick={setMeterToAssign}
              />
            ))}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={changePage}
            loading={loading}
          />
        </>
      )}

      {!loading && meters.length === 0 && (
        <EmptyState
          hasFilters={filters.status !== 'ALL' || filters.phaseType !== 'ALL'}
          searchTerm={filters.searchTerm}
          type="meters"
        />
      )}
    </div>
  );
};

// Meter Query Component
const MeterQuery = ({ meterQuery }) => {
  const { meters, loading, error, pagination, filters, fetchMeters, updateFilters, changePage, exportMeters } = meterQuery;

  return (
    <div className="space-y-4 sm:space-y-6">
      <QueryFilterControls
        filters={filters}
        onFilterChange={updateFilters}
        loading={loading}
        onRefresh={fetchMeters}
        onExport={exportMeters}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {!loading && meters.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-blue-800">
              Found <span className="font-semibold">{pagination.total}</span> meters matching your criteria
            </div>
            <div className="text-xs text-blue-600 flex items-center gap-2">
              <span>Page {pagination.page} of {pagination.pages}</span>
              <span>•</span>
              <span>Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading meters...</span>
        </div>
      )}

      {!loading && meters.length > 0 ? (
        <>
          <MeterTable meters={meters} loading={loading} />
          <Pagination
            pagination={pagination}
            onPageChange={changePage}
            loading={loading}
          />
        </>
      ) : !loading ? (
        <EmptyState 
          hasFilters={filters.status !== 'ALL' || filters.phaseType !== 'ALL' || filters.searchTerm} 
          searchTerm={filters.searchTerm}
          type="meters"
        />
      ) : null}
    </div>
  );
};

// Main Component
function MeterSchedule() {
  const { canManageSchedule } = usePermissions();
  const { meterStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useMeterStatistics();

  // activeTab now declared before the two useMeterData() instances so each
  // can be told whether it's the currently-visible tab (see fix note above
  // the useMeterData hook definition).
  const [activeTab, setActiveTab] = useState('inventory');
  const meterInventory = useMeterData({ searchTerm: '' }, activeTab === 'inventory');
  const meterQuery = useMeterData({ searchTerm: '' }, activeTab === 'query');

  useEffect(() => {
    console.log('[MeterSchedule] Component mounted');
    console.log('[MeterSchedule] Active tab:', activeTab);
  }, [activeTab]);

  const statsCards = useMemo(() => {
    const cards = [
      { 
        title: 'Total Meters', 
        value: meterStats.totalMeters, 
        icon: Database, 
        bgColor: 'bg-blue-100', 
        iconColor: 'text-blue-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Available', 
        value: meterStats.available, 
        icon: CheckCircle, 
        bgColor: 'bg-green-100', 
        iconColor: 'text-green-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Installed', 
        value: meterStats.installed, 
        icon: Wrench, 
        bgColor: 'bg-purple-100', 
        iconColor: 'text-purple-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Faulty', 
        value: meterStats.faulty, 
        icon: AlertTriangle, 
        bgColor: 'bg-red-100', 
        iconColor: 'text-red-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Retired', 
        value: meterStats.retired, 
        icon: Battery, 
        bgColor: 'bg-gray-100 dark:bg-gray-800/80', 
        iconColor: 'text-gray-800 dark:text-gray-200',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Pending', 
        value: meterStats.pending, 
        icon: Clock, 
        bgColor: 'bg-blue-100', 
        iconColor: 'text-blue-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Paid', 
        value: meterStats.paid, 
        icon: CheckCircle, 
        bgColor: 'bg-teal-100', 
        iconColor: 'text-teal-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Single Phase', 
        value: meterStats.singlePhase, 
        icon: Zap, 
        bgColor: 'bg-yellow-100', 
        iconColor: 'text-yellow-600',
        loading: statsLoading,
        error: !!statsError
      },
      { 
        title: 'Three Phase', 
        value: meterStats.threePhase, 
        icon: Cpu, 
        bgColor: 'bg-indigo-100', 
        iconColor: 'text-indigo-600',
        loading: statsLoading,
        error: !!statsError
      }
    ];

    return cards;
  }, [meterStats, statsLoading, statsError]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Meter Management</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Query your meter inventory and check stock levels
          </p>
          </div>
        </div>
        {statsError && (
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-600 text-sm">{statsError}</span>
            <button
              onClick={refetchStats}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {statsCards.map((card, index) => (
          <StatsCard key={index} {...card} />
        ))}
      </div>

      <div className="card p-3 sm:p-4">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'inventory' && (
        <MeterInventory meterInventory={meterInventory} canManageSchedule={canManageSchedule} />
      )}

      {activeTab === 'query' && (
        <MeterQuery meterQuery={meterQuery} />
      )}
    </div>
  );
}

export default MeterSchedule;