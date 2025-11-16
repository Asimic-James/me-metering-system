import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { JEDApiService } from '../services/api';
import { AlertCircle, CheckCircle, Send, Loader } from 'lucide-react';

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

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    accountNumber: '',
    complaintText: ''
  });

  // UI state
  const [submissionState, setSubmissionState] = useState(SUBMISSION_STATES.IDLE);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form validation
  const validateForm = () => {
    const errors = [];

    if (!formData.customerName.trim()) {
      errors.push('Customer name is required');
    }

    if (!formData.accountNumber.trim()) {
      errors.push('Account number is required');
    }

    if (!formData.complaintText.trim()) {
      errors.push('Complaint description is required');
    }

    if (formData.complaintText.trim().length < 10) {
      errors.push('Complaint must be at least 10 characters long');
    }

    if (formData.complaintText.trim().length > 2000) {
      errors.push('Complaint cannot exceed 2000 characters');
    }

    return errors;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors on input change
    if (error) setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]); // Show first error
      setSubmissionState(SUBMISSION_STATES.ERROR);
      return;
    }

    try {
      setSubmissionState(SUBMISSION_STATES.LOADING);
      setError(null);

      // Prepare complaint data
      const complaintData = {
        customerName: formData.customerName.trim(),
        accountNumber: formData.accountNumber.trim(),
        complaintText: formData.complaintText.trim(),
        installerName: user?.name || 'Unknown',
        installerEmail: user?.email || null,
        installerPhone: user?.phone || null,
        submittedAt: new Date().toISOString()
      };

      console.log('[ComplaintForm] Submitting complaint:', complaintData);

      // Call API to submit complaint
      // For now, we'll use a generic POST since endpoint may not exist yet
      const response = await apiService.current.makeRequest(
        apiService.current.buildApiUrl('/complaints'),
        {
          method: 'POST',
          body: JSON.stringify(complaintData)
        }
      );

      console.log('[ComplaintForm] Complaint submitted successfully:', response);

      // Show success message
      setSuccessMessage('Your complaint has been submitted successfully. We will review it shortly.');
      setSubmissionState(SUBMISSION_STATES.SUCCESS);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          customerName: '',
          accountNumber: '',
          complaintText: ''
        });
        setSuccessMessage(null);
        setSubmissionState(SUBMISSION_STATES.IDLE);
      }, 2000);

    } catch (err) {
      console.error('[ComplaintForm] Error submitting complaint:', err);
      setError(err.message || 'Failed to submit complaint. Please try again.');
      setSubmissionState(SUBMISSION_STATES.ERROR);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      customerName: '',
      accountNumber: '',
      complaintText: ''
    });
    setError(null);
    setSuccessMessage(null);
    setSubmissionState(SUBMISSION_STATES.IDLE);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Submit a Complaint</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Report any issues or concerns about installations you've carried out
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 sm:p-5 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm sm:text-base font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 sm:p-5 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm sm:text-base font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            
            {/* Customer Name Field */}
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Account Number Field */}
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Complaint Text Field */}
            <div>
              <label htmlFor="complaintText" className="block text-sm font-medium text-gray-700 mb-2">
                Complaint Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mb-2">
                Please provide details about the issue (minimum 10 characters)
              </p>
              <textarea
                id="complaintText"
                name="complaintText"
                value={formData.complaintText}
                onChange={handleInputChange}
                placeholder="Describe the complaint in detail... (What happened? When did it occur? What was the outcome?)"
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                rows={6}
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <div className="mt-2 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {formData.complaintText.length} / 2000 characters
                </p>
                {formData.complaintText.length > 1800 && (
                  <p className="text-xs text-amber-600">Approaching character limit</p>
                )}
              </div>
            </div>

            {/* Installer Info Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs sm:text-sm font-medium text-blue-900 mb-2">
                Submitted by (Auto-filled):
              </p>
              <div className="space-y-1">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Name:</span> {user?.name || 'Not set'}
                </p>
                {user?.email && (
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Email:</span> {user.email}
                  </p>
                )}
                {user?.phone && (
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Phone:</span> {user.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="reset"
                onClick={handleReset}
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={submissionState === SUBMISSION_STATES.LOADING}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {submissionState === SUBMISSION_STATES.LOADING ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Complaint
                  </>
                )}
              </button>
            </div>

            {/* Helper Text */}
            <p className="text-xs sm:text-sm text-gray-500 text-center">
              Your complaint will be reviewed by our management team and appropriate action will be taken.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ComplaintForm;
