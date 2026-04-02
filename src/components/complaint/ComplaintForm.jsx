import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { JEDApiService } from '../services/api';
import { AlertCircle, CheckCircle, Send, Loader2, MessageSquare } from 'lucide-react';

// Complaint submission states
const SUBMISSION_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

function ComplaintForm() {
  const { user } = useAuth();
  const apiService = useRef(new JEDApiService());

  const [formData, setFormData] = useState({
    customerName: '',
    accountNumber: '',
    complaintText: ''
  });

  const [submissionState, setSubmissionState] = useState(SUBMISSION_STATES.IDLE);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const validateForm = () => {
    if (!formData.customerName.trim()) return 'Customer name is required';
    if (!formData.accountNumber.trim()) return 'Account number is required';
    if (!formData.complaintText.trim()) return 'Complaint description is required';
    if (formData.complaintText.trim().length < 10) return 'Complaint must be at least 10 characters long';
    if (formData.complaintText.trim().length > 2000) return 'Complaint cannot exceed 2000 characters';
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSubmissionState(SUBMISSION_STATES.ERROR);
      return;
    }

    try {
      setSubmissionState(SUBMISSION_STATES.LOADING);
      setError(null);

      const complaintData = {
        customerName: formData.customerName.trim(),
        accountNumber: formData.accountNumber.trim(),
        complaintText: formData.complaintText.trim(),
        installerName: user?.name || 'Unknown',
        installerEmail: user?.email || null,
        installerPhone: user?.phone || null,
        submittedAt: new Date().toISOString()
      };

      const response = await apiService.current.makeRequest(
        apiService.current.buildApiUrl('/complaints'),
        { method: 'POST', body: JSON.stringify(complaintData) }
      );

      console.log('[ComplaintForm] Complaint submitted:', response);
      setSuccessMessage('Your complaint has been submitted successfully. We will review it shortly.');
      setSubmissionState(SUBMISSION_STATES.SUCCESS);

      setTimeout(() => {
        setFormData({ customerName: '', accountNumber: '', complaintText: '' });
        setSuccessMessage(null);
        setSubmissionState(SUBMISSION_STATES.IDLE);
      }, 2000);

    } catch (err) {
      console.error('[ComplaintForm] Error submitting complaint:', err);
      setError(err.message || 'Failed to submit complaint. Please try again.');
      setSubmissionState(SUBMISSION_STATES.ERROR);
    }
  };

  const handleReset = () => {
    setFormData({ customerName: '', accountNumber: '', complaintText: '' });
    setError(null);
    setSuccessMessage(null);
    setSubmissionState(SUBMISSION_STATES.IDLE);
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm sm:text-base bg-white dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit a Complaint</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Report any issues or concerns about installations you've carried out
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

            {/* Customer Name */}
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter customer's full name"
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                className={inputClass}
              />
            </div>

            {/* Account Number */}
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                placeholder="Enter customer's account number"
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                className={inputClass}
              />
            </div>

            {/* Complaint Text */}
            <div>
              <label htmlFor="complaintText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Complaint Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                Please describe the issue in detail (minimum 10 characters)
              </p>
              <textarea
                id="complaintText"
                name="complaintText"
                value={formData.complaintText}
                onChange={handleInputChange}
                placeholder="Describe the problem: What happened? When did it occur? What was the outcome?"
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                rows={6}
                maxLength={2000}
                className={`${inputClass} resize-none`}
              />
              <div className="mt-1.5 flex justify-between items-center">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formData.complaintText.length} / 2000
                </p>
                {formData.complaintText.length > 1800 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Approaching limit</p>
                )}
              </div>
            </div>

            {/* Installer Info */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
                Submitted by (auto-filled):
              </p>
              <div className="space-y-1 text-sm text-indigo-800 dark:text-indigo-300">
                <p><span className="font-medium">Name:</span> {user?.name || 'Not set'}</p>
                {user?.email && <p><span className="font-medium">Email:</span> {user.email}</p>}
                {user?.phone && <p><span className="font-medium">Phone:</span> {user.phone}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="reset"
                onClick={handleReset}
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {submissionState === SUBMISSION_STATES.LOADING ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" />Submit Complaint</>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Your complaint will be reviewed by our management team and appropriate action will be taken.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ComplaintForm;
