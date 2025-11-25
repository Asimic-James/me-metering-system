import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import JEDApiService from '../services/api';
import { 
  Calendar, MapPin, User, Phone, Clock, CheckCircle, 
  AlertCircle, Navigation, FileText, Search, Filter,
  Zap, // For single phase
  Cpu, // For three phase
  Battery, // For available meters
  Wrench, // For installed meters
  AlertTriangle, // For faulty meters
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload
} from 'lucide-react';

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

const TABS = [
  { id: 'schedule', label: 'Installation Schedule' },
  { id: 'inventory', label: 'Meter Inventory' },
  { id: 'query', label: 'Meter Query' }
];

// Custom hook for meter statistics
// Custom hook for meter statistics with real-time calculation
const useMeterStatistics = () => {
  const [meterStats, setMeterStats] = useState({
    totalMeters: 0,
    available: 0,
    installed: 0,
    faulty: 0,
    retired: 0,
    singlePhase: 0,
    threePhase: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(true);

  const fetchMeterStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[MeterSchedule] Fetching meter statistics...');
      const response = await JEDApiService.getMeterStatistics();
      
      if (response.success && response.data) {
        console.log('[MeterSchedule] Meter stats received:', response.data);
        setMeterStats(response.data);
        setHasPermission(true);
      } else if (response.data) {
        console.log('[MeterSchedule] Meter stats received (direct data):', response.data);
        setMeterStats(response.data);
        setHasPermission(true);
      } else {
        console.log('[MeterSchedule] Meter stats received (raw response):', response);
        setMeterStats(response);
        setHasPermission(true);
      }
    } catch (err) {
      console.error('[MeterSchedule] Error fetching meter statistics:', err);
      
      const errorMessage = err.message || '';
      if (errorMessage.includes('PERMISSION_ERROR') || 
          errorMessage.includes('403') || 
          errorMessage.includes('Insufficient permissions') ||
          errorMessage.includes('requires elevated permissions')) {
        console.warn('[MeterSchedule] User lacks permission for meter statistics - hiding stats section');
        setHasPermission(false);
        setError(null);
      } else if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
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
  }, [fetchMeterStatistics]);

  return {
    meterStats,
    loading,
    error,
    hasPermission,
    refetch: fetchMeterStatistics
  };
};

// Enhanced useMeterInventory hook with export functionality
const useMeterInventory = () => {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: 'ALL',
    phaseType: 'ALL'
  });

  const fetchMeters = useCallback(async (page = 1, statusFilter = 'ALL', phaseFilter = 'ALL') => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (phaseFilter !== 'ALL') {
        params.phaseType = phaseFilter;
      }

      console.log('[MeterInventory] Fetching meters with params:', params);
      const response = await JEDApiService.getMeters(params);
      
      let metersData = [];
      let paginationData = {};
      
      if (response.success) {
        metersData = response.data || [];
        paginationData = response.pagination || {};
      } else if (Array.isArray(response.data)) {
        metersData = response.data;
        paginationData = response.pagination || {};
      } else if (Array.isArray(response)) {
        metersData = response;
      } else {
        metersData = response.data || [];
        paginationData = response.pagination || {};
      }

      console.log('[MeterInventory] Meters received:', metersData.length, 'items');
      setMeters(metersData);
      setPagination(prev => ({
        ...prev,
        page: paginationData.page || page,
        total: paginationData.total || metersData.length,
        pages: paginationData.pages || Math.ceil((paginationData.total || metersData.length) / pagination.limit)
      }));
    } catch (err) {
      console.error('[MeterInventory] Error fetching meters:', err);
      setError(err.message || 'Failed to load meters');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

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
      console.error('[MeterInventory] Export failed:', err);
      setError('Failed to export meters');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    fetchMeters(1, newFilters.status, newFilters.phaseType);
  }, [fetchMeters]);

  const changePage = useCallback((page) => {
    fetchMeters(page, filters.status, filters.phaseType);
  }, [fetchMeters, filters.status, filters.phaseType]);

  useEffect(() => {
    fetchMeters(1, 'ALL', 'ALL');
  }, [fetchMeters]);

  return {
    meters,
    loading,
    error,
    pagination,
    filters,
    fetchMeters: () => fetchMeters(pagination.page, filters.status, filters.phaseType),
    updateFilters,
    changePage,
    exportMeters
  };
};

// Custom hook for advanced meter query with search
const useMeterQuery = () => {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: 'ALL',
    phaseType: 'ALL',
    searchTerm: '',
    searchField: 'meterNumber'
  });

  const fetchMeters = useCallback(async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit
      };

      if (filters.status !== 'ALL') {
        params.status = filters.status;
      }

      if (filters.phaseType !== 'ALL') {
        params.phaseType = filters.phaseType;
      }

      if (filters.searchTerm && filters.searchField) {
        params[filters.searchField] = filters.searchTerm;
      }

      console.log('[MeterQuery] Fetching meters with params:', params);
      const response = await JEDApiService.getMeters(params);
      
      let metersData = [];
      let paginationData = {};
      
      if (response.success) {
        metersData = response.data || [];
        paginationData = response.pagination || {};
      } else if (Array.isArray(response.data)) {
        metersData = response.data;
        paginationData = response.pagination || {};
      } else {
        metersData = response.data || [];
        paginationData = response.pagination || {};
      }

      console.log('[MeterQuery] Meters received:', metersData.length, 'items');
      setMeters(metersData);
      setPagination(prev => ({
        ...prev,
        page: paginationData.page || page,
        total: paginationData.total || metersData.length,
        pages: paginationData.pages || Math.ceil((paginationData.total || metersData.length) / pagination.limit)
      }));
    } catch (err) {
      console.error('[MeterQuery] Error fetching meters:', err);
      setError(err.message || 'Failed to load meters');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    fetchMeters(1, newFilters);
  }, [fetchMeters]);

  const changePage = useCallback((page) => {
    fetchMeters(page, filters);
  }, [fetchMeters, filters]);

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
      if (filters.searchTerm && filters.searchField) {
        params[filters.searchField] = filters.searchTerm;
      }

      const blob = await JEDApiService.exportMeters(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meter-query-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[MeterQuery] Export failed:', err);
      setError('Failed to export meters');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMeters(1, filters);
  }, [fetchMeters]);

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

// Custom hook for schedule data management
const useScheduleData = () => {
  const [scheduledJobs, setScheduledJobs] = useState([
    {
      id: 1,
      sealNo: '9900',
      meterNo: '0123456789898',
      accountNumber: '477014',
      customerName: 'John Smith',
      customerPhone: '08012345678',
      address: '123 Main Street, Lagos',
      scheduledDate: '2025-10-15',
      scheduledTime: '09:00 AM',
      priority: 'high',
      status: 'pending',
      notes: 'Customer prefers morning installation'
    }
  ]);

  const updateJobStatus = useCallback((jobId, updates) => {
    setScheduledJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  return {
    scheduledJobs,
    updateJobStatus
  };
};

// Stats Cards Component
const StatsCard = ({ title, value, icon: Icon, bgColor, iconColor, loading = false, error = false }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-gray-500 text-sm font-medium mb-1 truncate">{title}</p>
        <p className={`text-2xl sm:text-3xl font-bold ${
          error ? 'text-red-600' : 'text-gray-900'
        }`}>
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
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Retired' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
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
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: null, label: phaseType };
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

// Job Card Component
const JobCard = ({ job, isSelected, onClick }) => {
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${statusConfig.bg} flex-shrink-0`}>
            <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {job.customerName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              Account: {job.accountNumber}
            </p>
          </div>
        </div>
        <PriorityBadge priority={job.priority} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex items-center text-gray-600 min-w-0">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span className="truncate">{job.address}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span>{job.customerPhone}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span>{job.scheduledDate} at {job.scheduledTime}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span>Seal: {job.sealNo}</span>
        </div>
      </div>

      {job.notes && (
        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-gray-50 rounded text-xs sm:text-sm text-gray-700">
          <strong>Notes:</strong> {job.notes}
        </div>
      )}

      {job.status === 'completed' && job.completedAt && (
        <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-green-600">
          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span>Completed at {job.completedAt}</span>
        </div>
      )}
    </div>
  );
};

// Meter Card Component
const MeterCard = ({ meter }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate mb-1">
          {meter.meterNumber}
        </h3>
        <p className="text-xs text-gray-500 truncate">
          SIM: {meter.simNumber}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <MeterStatusBadge status={meter.status} />
        <PhaseTypeBadge phaseType={meter.phaseType} />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
      <div className="flex items-center text-gray-600">
        <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
        <span>Manufactured: {meter.manufacturedDate}</span>
      </div>
      <div className="flex items-center text-gray-600">
        <Wrench className="w-3 h-3 mr-2 flex-shrink-0" />
        <span>Make: {meter.meterMake}</span>
      </div>
      {meter.model && (
        <div className="flex items-center text-gray-600">
          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
          <span>Model: {meter.model}</span>
        </div>
      )}
      {meter.sgcNumber && (
        <div className="flex items-center text-gray-600">
          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
          <span>SGC: {meter.sgcNumber}</span>
        </div>
      )}
    </div>

    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
      <div className="flex justify-between">
        <span>Uploaded: {new Date(meter.uploadedAt).toLocaleDateString()}</span>
        {meter.installedAt && (
          <span>Installed: {new Date(meter.installedAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  </div>
);

// Meter Table Component for Query Tab
const MeterTable = ({ meters, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading meters...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meter Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SIM Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Make & Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phase Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manufactured
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Installed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meters.map((meter) => (
              <tr key={meter.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {meter.meterNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {meter.simNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{meter.meterMake}</div>
                  {meter.model && (
                    <div className="text-gray-500 text-xs">{meter.model}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PhaseTypeBadge phaseType={meter.phaseType} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MeterStatusBadge status={meter.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {meter.manufacturedDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {meter.installedAt ? new Date(meter.installedAt).toLocaleDateString() : 'Not installed'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Installation Form Component
const InstallationForm = ({ 
  job, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    actualMeterNo: job?.meterNo || '',
    actualSealNo: job?.sealNo || '',
    installationTime: new Date().toTimeString().slice(0, 5),
    installationNotes: '',
    photosUploaded: false
  });

  const [errors, setErrors] = useState({});

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.actualMeterNo || formData.actualMeterNo.length !== 13) {
      newErrors.actualMeterNo = 'Meter Number must be 13 digits';
    }

    if (!formData.actualSealNo.trim()) {
      newErrors.actualSealNo = 'Seal Number is required';
    }

    if (!formData.installationTime) {
      newErrors.installationTime = 'Installation time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  const getInputStyle = useCallback((field) => {
    return `w-full px-3 py-2 border rounded-lg font-mono text-sm ${
      errors[field] ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
    } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors`;
  }, [errors]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <h4 className="font-medium text-gray-900 text-sm sm:text-base">Complete Installation</h4>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
          Actual Meter Number *
        </label>
        <input
          type="text"
          value={formData.actualMeterNo}
          onChange={(e) => handleChange('actualMeterNo', e.target.value)}
          maxLength="13"
          className={getInputStyle('actualMeterNo')}
          placeholder="13 digits"
          disabled={loading}
        />
        {errors.actualMeterNo && (
          <p className="mt-1 text-xs text-red-600">{errors.actualMeterNo}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">{formData.actualMeterNo.length}/13</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
          Actual Seal Number *
        </label>
        <input
          type="text"
          value={formData.actualSealNo}
          onChange={(e) => handleChange('actualSealNo', e.target.value)}
          className={getInputStyle('actualSealNo')}
          disabled={loading}
        />
        {errors.actualSealNo && (
          <p className="mt-1 text-xs text-red-600">{errors.actualSealNo}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
          Installation Time *
        </label>
        <input
          type="time"
          value={formData.installationTime}
          onChange={(e) => handleChange('installationTime', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm"
          disabled={loading}
        />
        {errors.installationTime && (
          <p className="mt-1 text-xs text-red-600">{errors.installationTime}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
          Installation Notes
        </label>
        <textarea
          value={formData.installationNotes}
          onChange={(e) => handleChange('installationNotes', e.target.value)}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm"
          placeholder="Any notes about the installation..."
          disabled={loading}
        />
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Completing...' : 'Complete Installation'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Job Details Component
const JobDetails = ({ job, onStartInstallation, showInstallForm, onInstallationSubmit, onCancelInstallation, installationLoading }) => {
  if (!job) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center h-full flex items-center justify-center">
        <div>
          <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
          <p className="text-gray-600 text-sm sm:text-base">Select a job to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-4 sm:top-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Job Details</h3>

      {!showInstallForm ? (
        <div className="space-y-3 sm:space-y-4">
          <DetailItem label="Customer" value={job.customerName} />
          <DetailItem label="Account Number" value={job.accountNumber} monospace />
          <DetailItem label="Address" value={job.address} />
          <DetailItem label="Phone" value={job.customerPhone} />
          <DetailItem label="Scheduled" value={`${job.scheduledDate} at ${job.scheduledTime}`} />
          <DetailItem label="Meter Number" value={job.meterNo} monospace />
          <DetailItem label="Seal Number" value={job.sealNo} />

          {job.status === 'pending' && (
            <button
              onClick={onStartInstallation}
              className="w-full bg-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-4 text-sm sm:text-base"
            >
              Start Installation
            </button>
          )}

          {job.status === 'completed' && job.completedAt && (
            <div className="mt-4 p-3 sm:p-4 bg-green-50 rounded-lg text-center">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-1 sm:mb-2" />
              <p className="text-green-800 font-medium text-sm sm:text-base">Installation Completed</p>
              <p className="text-green-600 text-xs sm:text-sm">{job.completedAt}</p>
            </div>
          )}
        </div>
      ) : (
        <InstallationForm
          job={job}
          onSubmit={onInstallationSubmit}
          onCancel={onCancelInstallation}
          loading={installationLoading}
        />
      )}
    </div>
  );
};

// Detail Item Component
const DetailItem = ({ label, value, monospace = false }) => (
  <div>
    <label className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">{label}</label>
    <p className={`text-gray-900 text-sm sm:text-base ${monospace ? 'font-mono' : ''}`}>
      {value}
    </p>
  </div>
);

// Empty State Component
const EmptyState = ({ hasFilters, searchTerm, type = 'jobs' }) => (
  <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
    <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
    <p className="text-gray-600 text-sm sm:text-base mb-2">
      {hasFilters ? `No ${type} match your search` : `No ${type} found`}
    </p>
    {hasFilters && (
      <p className="text-gray-400 text-xs sm:text-sm">
        Try adjusting your search criteria
      </p>
    )}
  </div>
);

// Filter Controls Component for Meter Inventory
const MeterFilterControls = ({ filters, onFilterChange, loading, onRefresh, onExport }) => {
  const handleStatusChange = useCallback((status) => {
    onFilterChange({ ...filters, status });
  }, [filters, onFilterChange]);

  const handlePhaseChange = useCallback((phaseType) => {
    onFilterChange({ ...filters, phaseType });
  }, [filters, onFilterChange]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={loading}
            >
              {METER_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Phase Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phase Type</label>
            <select
              value={filters.phaseType}
              onChange={(e) => handlePhaseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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

        {/* Action Buttons */}
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
  );
};

// Advanced Query Controls Component
const QueryFilterControls = ({ filters, onFilterChange, loading, onRefresh, onExport }) => {
  const handleStatusChange = useCallback((status) => {
    onFilterChange({ ...filters, status });
  }, [filters, onFilterChange]);

  const handlePhaseChange = useCallback((phaseType) => {
    onFilterChange({ ...filters, phaseType });
  }, [filters, onFilterChange]);

  const handleSearchChange = useCallback((searchTerm) => {
    onFilterChange({ ...filters, searchTerm });
  }, [filters, onFilterChange]);

  const handleSearchFieldChange = useCallback((searchField) => {
    onFilterChange({ ...filters, searchField });
  }, [filters, onFilterChange]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Search Field */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Field</label>
            <select
              value={filters.searchField}
              onChange={(e) => handleSearchFieldChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={loading}
            >
              <option value="meterNumber">Meter Number</option>
              <option value="simNumber">SIM Number</option>
              <option value="sgcNumber">SGC Number</option>
            </select>
          </div>

          {/* Search Term */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Term</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Enter search term..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={loading}
              >
                {METER_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Phase Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phase Type</label>
              <select
                value={filters.phaseType}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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

          {/* Action Buttons */}
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

// Pagination Component
const Pagination = ({ pagination, onPageChange, loading }) => {
  const { page, pages, total } = pagination;

  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-4">
      <div className="text-sm text-gray-700">
        Showing page {page} of {pages} ({total} total meters)
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, pages) }, (_, i) => {
            let pageNum;
            if (pages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= pages - 2) {
              pageNum = pages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
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
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Meter Inventory Component
const MeterInventory = ({ meterInventory }) => {
  const { meters, loading, error, pagination, filters, fetchMeters, updateFilters, changePage, exportMeters } = meterInventory;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter Controls */}
      <MeterFilterControls
        filters={filters}
        onFilterChange={updateFilters}
        loading={loading}
        onRefresh={fetchMeters}
        onExport={exportMeters}
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Meters Grid */}
      {!loading && meters.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {meters.map(meter => (
              <MeterCard key={meter.id} meter={meter} />
            ))}
          </div>
          
          {/* Pagination */}
          <Pagination
            pagination={pagination}
            onPageChange={changePage}
            loading={loading}
          />
        </>
      )}

      {/* Empty State */}
      {!loading && meters.length === 0 && (
        <EmptyState 
          hasFilters={filters.status !== 'ALL' || filters.phaseType !== 'ALL'} 
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
      {/* Query Filter Controls */}
      <QueryFilterControls
        filters={filters}
        onFilterChange={updateFilters}
        loading={loading}
        onRefresh={fetchMeters}
        onExport={exportMeters}
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {!loading && meters.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              Found {pagination.total} meters matching your criteria
            </div>
            <div className="text-xs text-blue-600">
              Page {pagination.page} of {pagination.pages}
            </div>
          </div>
        </div>
      )}

      {/* Meters Table */}
      {!loading && meters.length > 0 ? (
        <>
          <MeterTable meters={meters} loading={loading} />
          
          {/* Pagination */}
          <Pagination
            pagination={pagination}
            onPageChange={changePage}
            loading={loading}
          />
        </>
      ) : !loading ? (
        <EmptyState 
          hasFilters={filters.status !== 'ALL' || filters.phaseType !== 'ALL' || filters.searchTerm} 
          type="meters"
        />
      ) : null}
    </div>
  );
};

function MeterSchedule({ onComplete }) {
  const { user } = useAuth();
  const { scheduledJobs, updateJobStatus } = useScheduleData();
  const { meterStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useMeterStatistics();
  const meterInventory = useMeterInventory();
  const meterQuery = useMeterQuery();
  
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [installationLoading, setInstallationLoading] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[MeterSchedule] Component mounted');
    console.log('[MeterSchedule] Active tab:', activeTab);
  }, [activeTab]);

  // Filter jobs by status and search
  const filteredJobs = useMemo(() => {
    return scheduledJobs.filter(job => {
      const matchesTab = activeTab === 'schedule' || job.status === activeTab;
      const matchesSearch = 
        job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.accountNumber?.includes(searchTerm) ||
        job.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.sealNo?.includes(searchTerm);
      
      return matchesTab && matchesSearch;
    });
  }, [scheduledJobs, activeTab, searchTerm]);

  // Stats calculation for jobs
  const jobStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: scheduledJobs.length,
      pending: scheduledJobs.filter(j => j.status === 'pending').length,
      completed: scheduledJobs.filter(j => j.status === 'completed').length,
      today: scheduledJobs.filter(j => j.scheduledDate === today).length
    };
  }, [scheduledJobs]);

  // Stats cards configuration using API data
  const statsCards = useMemo(() => {
    const cards = [
      { 
        title: 'Total Meters', 
        value: meterStats.totalMeters, 
        icon: Battery, 
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

  // Handle job selection
  const handleSelectJob = useCallback((job) => {
    setSelectedJob(job);
    setShowInstallForm(false);
  }, []);

  // Handle start installation
  const handleStartInstallation = useCallback(() => {
    setShowInstallForm(true);
  }, []);

  // Handle complete installation
  const handleCompleteInstallation = useCallback(async (formData) => {
    if (!selectedJob) return;

    setInstallationLoading(true);

    try {
      console.log('[MeterSchedule] Completing installation for job:', selectedJob.id);
      
      const installationData = {
        sealNo: formData.actualSealNo,
        meterNo: formData.actualMeterNo,
        accountNumber: selectedJob.accountNumber,
        installationDate: new Date().toISOString().split('T')[0],
        installationTime: formData.installationTime,
        installerName: user?.name || user?.username || 'Current Installer',
        notes: formData.installationNotes,
        customerName: selectedJob.customerName,
        address: selectedJob.address,
        phone: selectedJob.customerPhone
      };

      console.log('[MeterSchedule] Sending installation data:', installationData);
      
      const response = await JEDApiService.completeInstallation(installationData);
      
      if (response.success) {
        console.log('[MeterSchedule] Installation completed successfully');
        
        updateJobStatus(selectedJob.id, {
          status: 'completed',
          completedAt: new Date().toLocaleString(),
          meterNo: formData.actualMeterNo,
          sealNo: formData.actualSealNo,
          installationNotes: formData.installationNotes
        });

        await refetchStats();
        meterInventory.fetchMeters();
        meterQuery.fetchMeters();

        if (onComplete) {
          onComplete({
            ...selectedJob,
            meterNo: formData.actualMeterNo,
            sealNo: formData.actualSealNo,
            status: 'completed',
            installationTime: formData.installationTime,
            installationNotes: formData.installationNotes
          });
        }

        setShowInstallForm(false);
        alert('Installation completed successfully!');
        
      } else {
        throw new Error(response.message || 'Failed to complete installation');
      }

    } catch (error) {
      console.error('[MeterSchedule] Error completing installation:', error);
      
      let errorMessage = 'Failed to complete installation. Please try again.';
      if (error.message?.includes('PERMISSION_ERROR')) {
        errorMessage = 'You do not have permission to complete installations.';
      } else if (error.message?.includes('VALIDATION_ERROR')) {
        errorMessage = 'Invalid installation data. Please check the meter and seal numbers.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setInstallationLoading(false);
    }
  }, [selectedJob, user, onComplete, updateJobStatus, refetchStats, meterInventory, meterQuery]);

  // Handle cancel installation
  const handleCancelInstallation = useCallback(() => {
    setShowInstallForm(false);
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'schedule') {
      setSelectedJob(null);
      setShowInstallForm(false);
    }
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Meter Management</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Manage your installation schedule and meter inventory
          </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {statsCards.map((card, index) => (
          <StatsCard key={index} {...card} />
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Tab Content */}
      {activeTab === 'schedule' && (
        <>
          {/* Search for Schedule */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
              <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
                <button
                  onClick={() => handleTabChange('schedule')}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                    activeTab === 'schedule'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Jobs ({jobStats.total})
                </button>
                <button
                  onClick={() => handleTabChange('schedule')}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                    activeTab === 'schedule'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending ({jobStats.pending})
                </button>
                <button
                  onClick={() => handleTabChange('schedule')}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                    activeTab === 'schedule'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed ({jobStats.completed})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full md:w-64 px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Main Content Area for Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Jobs List */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isSelected={selectedJob?.id === job.id}
                    onClick={() => handleSelectJob(job)}
                  />
                ))
              ) : (
                <EmptyState 
                  hasFilters={searchTerm} 
                  searchTerm={searchTerm}
                />
              )}
            </div>

            {/* Job Details / Installation Form */}
            <div className="lg:col-span-1">
              <JobDetails
                job={selectedJob}
                onStartInstallation={handleStartInstallation}
                showInstallForm={showInstallForm}
                onInstallationSubmit={handleCompleteInstallation}
                onCancelInstallation={handleCancelInstallation}
                installationLoading={installationLoading}
              />
            </div>
          </div>
        </>
      )}

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <MeterInventory meterInventory={meterInventory} />
      )}

      {/* Query Tab Content */}
      {activeTab === 'query' && (
        <MeterQuery meterQuery={meterQuery} />
      )}
    </div>
  );
}

export default MeterSchedule;