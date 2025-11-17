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
  AlertTriangle // For faulty meters
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

const TABS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' }
];

// Custom hook for meter statistics
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

  const fetchMeterStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await JEDApiService.getMeterStatistics();
      
      if (response.success) {
        setMeterStats(response.data);
      } else {
        throw new Error('Failed to fetch meter statistics');
      }
    } catch (err) {
      console.error('Error fetching meter statistics:', err);
      setError(err.message || 'Failed to load meter statistics');
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
    refetch: fetchMeterStatistics
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
    },
    {
      id: 2,
      sealNo: '9901',
      meterNo: '0123456789899',
      accountNumber: '477015',
      customerName: 'Jane Doe',
      customerPhone: '08087654321',
      address: '456 Park Avenue, Lagos',
      scheduledDate: '2025-10-15',
      scheduledTime: '02:00 PM',
      priority: 'medium',
      status: 'pending',
      notes: 'Call before arrival'
    },
    {
      id: 3,
      sealNo: '9902',
      meterNo: '0123456789900',
      accountNumber: '477016',
      customerName: 'Mike Johnson',
      customerPhone: '08098765432',
      address: '789 Oak Road, Ikeja',
      scheduledDate: '2025-10-14',
      scheduledTime: '10:30 AM',
      priority: 'high',
      status: 'completed',
      completedAt: '2025-10-14 11:00 AM',
      notes: 'Completed successfully'
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
const StatsCard = ({ title, value, icon: Icon, bgColor, iconColor, loading = false }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-gray-500 text-sm font-medium mb-1 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">
          {loading ? '...' : value}
        </p>
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
    installationTime: new Date().toTimeString().slice(0, 5), // Current time in HH:MM format
    installationNotes: '',
    photosUploaded: false
  });

  const [errors, setErrors] = useState({});

  // Validation rules
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

  // Handle input change
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  // Get input style based on error state
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
const EmptyState = ({ hasFilters, searchTerm }) => (
  <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
    <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
    <p className="text-gray-600 text-sm sm:text-base mb-2">
      {hasFilters ? 'No jobs match your search' : 'No jobs scheduled'}
    </p>
    {hasFilters && (
      <p className="text-gray-400 text-xs sm:text-sm">
        Try adjusting your search criteria
      </p>
    )}
  </div>
);

function MeterSchedule({ onComplete }) {
  const { user } = useAuth();
  const { scheduledJobs, updateJobStatus } = useScheduleData();
  const { meterStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useMeterStatistics();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [installationLoading, setInstallationLoading] = useState(false);

  // Filter jobs by status and search
  const filteredJobs = useMemo(() => {
    return scheduledJobs.filter(job => {
      const matchesTab = activeTab === 'all' || job.status === activeTab;
      const matchesSearch = 
        job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.accountNumber?.includes(searchTerm) ||
        job.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.sealNo?.includes(searchTerm);
      
      return matchesTab && matchesSearch;
    });
  }, [scheduledJobs, activeTab, searchTerm]);

  // Stats calculation for jobs (kept for backward compatibility)
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
  const statsCards = useMemo(() => [
    { 
      title: 'Total Meters', 
      value: meterStats.totalMeters, 
      icon: Battery, 
      bgColor: 'bg-blue-100', 
      iconColor: 'text-blue-600',
      loading: statsLoading
    },
    { 
      title: 'Available', 
      value: meterStats.available, 
      icon: CheckCircle, 
      bgColor: 'bg-green-100', 
      iconColor: 'text-green-600',
      loading: statsLoading
    },
    { 
      title: 'Installed', 
      value: meterStats.installed, 
      icon: Wrench, 
      bgColor: 'bg-purple-100', 
      iconColor: 'text-purple-600',
      loading: statsLoading
    },
    { 
      title: 'Faulty', 
      value: meterStats.faulty, 
      icon: AlertTriangle, 
      bgColor: 'bg-red-100', 
      iconColor: 'text-red-600',
      loading: statsLoading
    },
    { 
      title: 'Single Phase', 
      value: meterStats.singlePhase, 
      icon: Zap, 
      bgColor: 'bg-yellow-100', 
      iconColor: 'text-yellow-600',
      loading: statsLoading
    },
    { 
      title: 'Three Phase', 
      value: meterStats.threePhase, 
      icon: Cpu, 
      bgColor: 'bg-indigo-100', 
      iconColor: 'text-indigo-600',
      loading: statsLoading
    }
  ], [meterStats, statsLoading]);

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
      // Call API to complete installation
      await JEDApiService.completeInstallation({
        sealNo: formData.actualSealNo,
        meterNo: formData.actualMeterNo,
        accountNumber: selectedJob.accountNumber,
        installationDate: new Date().toISOString(),
        installerName: user?.name || 'Current Installer',
        notes: formData.installationNotes
      });

      // Update local state
      updateJobStatus(selectedJob.id, {
        status: 'completed',
        completedAt: new Date().toLocaleString(),
        meterNo: formData.actualMeterNo,
        sealNo: formData.actualSealNo
      });

      // Refresh meter statistics after installation
      await refetchStats();

      // Call parent callback
      if (onComplete) {
        onComplete({
          ...selectedJob,
          meterNo: formData.actualMeterNo,
          sealNo: formData.actualSealNo,
          status: 'completed'
        });
      }

      // Reset form
      setShowInstallForm(false);

    } catch (error) {
      console.error('Error completing installation:', error);
      alert('Failed to complete installation. Please try again.');
    } finally {
      setInstallationLoading(false);
    }
  }, [selectedJob, user, onComplete, updateJobStatus, refetchStats]);

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
    setSelectedJob(null);
    setShowInstallForm(false);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Meter Schedule</h2>
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

      {/* Tabs and Search */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          {/* Tabs */}
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
                {tab.id === 'pending' && ` (${jobStats.pending})`}
                {tab.id === 'completed' && ` (${jobStats.completed})`}
              </button>
            ))}
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

      {/* Main Content Area */}
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
              hasFilters={searchTerm || activeTab !== 'all'} 
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
    </div>
  );
}

export default MeterSchedule;