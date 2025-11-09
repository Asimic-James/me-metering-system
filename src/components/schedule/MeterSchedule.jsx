import { useState, useMemo } from 'react';
import { Calendar, MapPin, User, Phone, Clock, CheckCircle, AlertCircle, Navigation, FileText } from 'lucide-react';
import JEDApiService from '../services/api';

function MeterSchedule({ onComplete }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock scheduled installations - In production, fetch from API
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

  const [installationForm, setInstallationForm] = useState({
    actualMeterNo: '',
    actualSealNo: '',
    installationTime: '',
    installationNotes: '',
    photosUploaded: false
  });

  const [errors, setErrors] = useState({});

  // Filter jobs by status and search
  const filteredJobs = useMemo(() => {
    return scheduledJobs.filter(job => {
      const matchesTab = activeTab === 'all' || job.status === activeTab;
      const matchesSearch = 
        job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.accountNumber.includes(searchTerm) ||
        job.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.sealNo.includes(searchTerm);
      return matchesTab && matchesSearch;
    });
  }, [scheduledJobs, activeTab, searchTerm]);

  // Stats
  const stats = useMemo(() => ({
    total: scheduledJobs.length,
    pending: scheduledJobs.filter(j => j.status === 'pending').length,
    completed: scheduledJobs.filter(j => j.status === 'completed').length,
    today: scheduledJobs.filter(j => j.scheduledDate === new Date().toISOString().split('T')[0]).length
  }), [scheduledJobs]);

  // Handle job selection
  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setShowInstallForm(false);
  };

  // Handle start installation
  const handleStartInstallation = () => {
    setShowInstallForm(true);
    setInstallationForm({
      actualMeterNo: selectedJob.meterNo,
      actualSealNo: selectedJob.sealNo,
      installationTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      installationNotes: '',
      photosUploaded: false
    });
  };

  // Validate installation form
  const validateInstallation = () => {
    const newErrors = {};

    if (!installationForm.actualMeterNo || installationForm.actualMeterNo.length !== 13) {
      newErrors.actualMeterNo = 'Meter Number must be 13 digits';
    }

    if (!installationForm.actualSealNo.trim()) {
      newErrors.actualSealNo = 'Seal Number is required';
    }

    if (!installationForm.installationTime) {
      newErrors.installationTime = 'Installation time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle complete installation
  const handleCompleteInstallation = async () => {
    if (!validateInstallation()) return;

    setIsSubmitting(true);

    try {
      // Call API to complete installation
      await JEDApiService.completeInstallation({
        sealNo: installationForm.actualSealNo,
        meterNo: installationForm.actualMeterNo,
        accountNumber: selectedJob.accountNumber,
        installationDate: new Date().toISOString(),
        installerName: 'Current Installer', // Get from auth context
        notes: installationForm.installationNotes
      });

      // Update local state
      setScheduledJobs(prev => prev.map(job => 
        job.id === selectedJob.id 
          ? { ...job, status: 'completed', completedAt: new Date().toLocaleString() }
          : job
      ));

      // Call parent callback
      if (onComplete) {
        onComplete(selectedJob);
      }

      // Reset
      setShowInstallForm(false);
      setSelectedJob(null);
      setActiveTab('completed');

    } catch (error) {
      console.error('Error completing installation:', error);
      alert('Failed to complete installation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority) => {
    const config = {
      high: { bg: 'bg-red-100', text: 'text-red-800', label: 'High' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
      low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' }
    };
    const { bg, text, label } = config[priority] || config.medium;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Meter Schedule</h2>
          <p className="text-gray-600">Manage your installation schedule and complete field work</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Today</p>
              <p className="text-3xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs */}
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Jobs
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({stats.completed})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <div
                key={job.id}
                onClick={() => handleSelectJob(job)}
                className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selectedJob?.id === job.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      job.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {job.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{job.customerName}</h3>
                      <p className="text-sm text-gray-500">Account: {job.accountNumber}</p>
                    </div>
                  </div>
                  {getPriorityBadge(job.priority)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="truncate">{job.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{job.customerPhone}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{job.scheduledDate} at {job.scheduledTime}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Seal: {job.sealNo}</span>
                  </div>
                </div>

                {job.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                    <strong>Notes:</strong> {job.notes}
                  </div>
                )}

                {job.status === 'completed' && (
                  <div className="mt-3 flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span>Completed at {job.completedAt}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No jobs found</p>
            </div>
          )}
        </div>

        {/* Job Details / Installation Form */}
        <div className="lg:col-span-1">
          {selectedJob ? (
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>

              {!showInstallForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer</label>
                    <p className="text-gray-900">{selectedJob.customerName}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Account Number</label>
                    <p className="text-gray-900 font-mono">{selectedJob.accountNumber}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">{selectedJob.address}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{selectedJob.customerPhone}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Scheduled</label>
                    <p className="text-gray-900">{selectedJob.scheduledDate} at {selectedJob.scheduledTime}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Meter Number</label>
                    <p className="text-gray-900 font-mono">{selectedJob.meterNo}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Seal Number</label>
                    <p className="text-gray-900">{selectedJob.sealNo}</p>
                  </div>

                  {selectedJob.status === 'pending' && (
                    <button
                      onClick={handleStartInstallation}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mt-6"
                    >
                      Start Installation
                    </button>
                  )}

                  {selectedJob.status === 'completed' && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 font-medium">Installation Completed</p>
                      <p className="text-green-600 text-sm">{selectedJob.completedAt}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Complete Installation</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Meter Number *
                    </label>
                    <input
                      type="text"
                      value={installationForm.actualMeterNo}
                      onChange={(e) => setInstallationForm(prev => ({ ...prev, actualMeterNo: e.target.value }))}
                      maxLength="13"
                      className={`w-full px-3 py-2 border rounded-lg font-mono ${
                        errors.actualMeterNo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="13 digits"
                    />
                    {errors.actualMeterNo && (
                      <p className="mt-1 text-xs text-red-600">{errors.actualMeterNo}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">{installationForm.actualMeterNo.length}/13</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Seal Number *
                    </label>
                    <input
                      type="text"
                      value={installationForm.actualSealNo}
                      onChange={(e) => setInstallationForm(prev => ({ ...prev, actualSealNo: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.actualSealNo ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.actualSealNo && (
                      <p className="mt-1 text-xs text-red-600">{errors.actualSealNo}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Installation Time *
                    </label>
                    <input
                      type="time"
                      value={installationForm.installationTime}
                      onChange={(e) => setInstallationForm(prev => ({ ...prev, installationTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Installation Notes
                    </label>
                    <textarea
                      value={installationForm.installationNotes}
                      onChange={(e) => setInstallationForm(prev => ({ ...prev, installationNotes: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Any notes about the installation..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleCompleteInstallation}
                      disabled={isSubmitting}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-green-400"
                    >
                      {isSubmitting ? 'Completing...' : 'Complete'}
                    </button>
                    <button
                      onClick={() => setShowInstallForm(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Select a job to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MeterSchedule;