import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserInfoPanel from './UserInfoPanel'; // Assuming UserInfoPanel is in the same directory
import RequestInfoPanel from './RequestInfoPanel';
import JEDApiService from '../services/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Hash,
  Search,
  Loader2
} from 'lucide-react';

// Constants for better maintainability
const VALIDATION_RULES = {
  sealNo: { required: true, message: 'Seal Number is required' },
  meterNo: { 
    required: true,
    pattern: /^\d{13}$/, 
    message: 'Meter Number must be exactly 13 digits' 
  },
  accountNumber: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Account Number must be a number' 
  }
};

const INITIAL_FORM_DATA = {
  sealNo: '',
  meterNo: '',
  accountNumber: '',
  installationNotes: ''
};

// Custom hook for form state management
const useInstallationForm = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    show: false,
    type: '', // 'success' or 'error'
    message: '', // This will hold the main message
    installationId: null
  });

  // Validate individual field
  const validateField = useCallback((name, value) => {
    const rules = VALIDATION_RULES[name];
    if (!rules) return '';

    if (rules.required && !value.trim()) {
      return rules.message;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message;
    }

    return '';
  }, []);

  // Validate entire form
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    Object.keys(VALIDATION_RULES).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  // Update form field
  const updateField = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  // Clear form
  const clearForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setSubmitStatus({ show: false, type: '', message: '', installationId: null });
  }, []);

  // Set submit status
  const setStatus = useCallback((status) => {
    setSubmitStatus(status);
  }, []);

  return {
    formData,
    errors,
    isSubmitting,
    submitStatus,
    validateForm,
    updateField,
    clearForm,
    setIsSubmitting,
    setStatus
  };
};

// Success Message Component
const SuccessMessage = ({ message, installationId, onDismiss }) => (
  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <CheckCircle className="h-5 w-5 text-green-400" />
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-green-800">{message}</p>
        {installationId && (
          <div className="mt-2 text-sm text-green-700 space-y-1">
            <p><strong>Meter No:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded text-xs">{installationId}</span></p>
            <p><strong>Account:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded text-xs">{installationId}</span></p>
            <p><strong>Status:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded text-xs">COMPLETED</span></p>
            
            <div className="pt-1">
              <p className="text-xs mt-1">Redirecting to dashboard...</p>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto pl-3 flex-shrink-0"
      >
        <XCircle className="h-4 w-4 text-green-400 hover:text-green-600 transition-colors" />
      </button>
    </div>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onDismiss }) => (
  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-red-800">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto pl-3 flex-shrink-0"
      >
        <XCircle className="h-4 w-4 text-red-400 hover:text-red-600 transition-colors" />
      </button>
    </div>
  </div>
);

// Form Field Component
const FormField = ({ 
  label, 
  name, 
  value, 
  error, 
  onChange, 
  disabled, 
  placeholder, 
  type = 'text',
  maxLength,
  showCharacterCount = false,
  monospace = false
}) => {
  const handleChange = useCallback((e) => {
    onChange(name, e.target.value);
  }, [name, onChange]);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        disabled={disabled}
        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-800/80 disabled:cursor-not-allowed transition-colors ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        } ${monospace ? 'font-mono' : ''}`}
        placeholder={placeholder}
      />
      <div className="flex justify-between items-center mt-1">
        {error && (
          <p className="text-sm text-red-600 flex-1">{error}</p>
        )}
        {showCharacterCount && maxLength && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-right flex-shrink-0 ml-2">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};

// Information Panel Component
const InformationPanel = () => (
  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h3 className="font-medium text-blue-900 mb-2 flex items-center">
      <FileText className="w-4 h-4 mr-2" />
      Installation Guidelines
    </h3>
    <ul className="text-sm text-blue-800 space-y-1">
      <li className="flex items-start">
        <span className="mr-2">•</span>
        <span>Verify meter seal number matches physical installation</span>
      </li>
      <li className="flex items-start">
        <span className="mr-2">•</span>
        <span>Ensure meter number is exactly 13 digits</span>
      </li>
      <li className="flex items-start">
        <span className="mr-2">•</span>
        <span>Account number must be valid and active</span>
      </li>
      <li className="flex items-start">
        <span className="mr-2">•</span>
        <span>Installation will be logged with your authenticated user details</span>
      </li>
      <li className="flex items-start">
        <span className="mr-2">•</span>
        <span>This action completes the installation process</span>
      </li>
    </ul>
  </div>
);

function InstallationForm({ onSuccess }) {
  const { user } = useAuth();
  const {
    formData,
    errors,
    isSubmitting,
    submitStatus,
    validateForm,
    updateField,
    clearForm,
    setIsSubmitting,
    setStatus
  } = useInstallationForm();

  // ---- NEW: inline lookup state (kept local to this component, does not
  // touch useInstallationForm's contract so nothing else consuming that
  // hook is affected). This is entirely additive. ----
  const [lookupData, setLookupData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [lastLookedUpAccount, setLastLookedUpAccount] = useState(null);

  // Looks up the request for the currently typed Account Number and shows
  // it inline via RequestInfoPanel — WITHOUT navigating away and WITHOUT
  // resetting any of the form's own input. sealNo/meterNo are prefilled
  // from the fetched record only if the installer hasn't already typed
  // something into them.
  const handleLookup = useCallback(async () => {
    const accountNumber = formData.accountNumber?.trim();
    if (!accountNumber) {
      setLookupError('Enter an Account Number first');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);

    try {
      const response = await JEDApiService.getCustomerRequest(accountNumber);
      const data = response?.data || response;
      setLookupData(data);
      setLastLookedUpAccount(accountNumber);

      // Prefill ONLY empty fields — never overwrite what the installer
      // has already typed, per requirement.
      if (!formData.sealNo && data?.sealNo) {
        updateField('sealNo', data.sealNo);
      }
      if (!formData.meterNo && (data?.meterNo || data?.meterNumber)) {
        updateField('meterNo', String(data.meterNo || data.meterNumber));
      }
    } catch (err) {
      console.error('[InstallationForm] Lookup failed:', err);
      setLookupData(null);
      setLookupError(err.message || 'Could not find a request for this account number');
    } finally {
      setLookupLoading(false);
    }
  }, [formData.accountNumber, formData.sealNo, formData.meterNo, updateField]);

  // Account Number field's own change handler — wraps updateField but also
  // invalidates a stale lookup panel if the number changes after a lookup
  // was already performed, so a mismatched customer is never shown.
  // Does NOT touch sealNo/meterNo/installationNotes.
  const handleAccountNumberChange = useCallback((name, value) => {
    updateField(name, value);
    if (lastLookedUpAccount && value !== lastLookedUpAccount) {
      setLookupData(null);
      setLookupError(null);
    }
  }, [updateField, lastLookedUpAccount]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setStatus({ show: false, type: '', message: '', installationId: null });

    if (!user) {
      setStatus({
        show: true,
        type: 'error',
        message: 'Authentication required. Please log in again.'
      });
      setIsSubmitting(false);
      return;
    }

    // Prepare payload
    const payload = {
      sealNo: formData.sealNo,
      meterNo: formData.meterNo,
      accountNumber: formData.accountNumber,
      installationDate: new Date().toISOString(),
      installerName: user.name,
      installerEmployeeId: user.employeeId || user.staffId || user.id,
      installerPhone: user.phone,
      installerEmail: user.email,
      notes: formData.installationNotes || 'Installation completed via web portal'
    };

    try {
      const response = await JEDApiService.completeInstallation(payload);

      console.log('✅ Installation API Response:', response);

      // Use the meter number from the successful response as the identifier
      const installationId = response?.data?.meterNo || formData.meterNo;

      // Show success message
      setStatus({
        show: true,
        type: 'success',
        message: response.message || 'Installation completed successfully!',
        installationId
      });

      // Clear form after successful submission
      clearForm();
      setLookupData(null);
      setLookupError(null);
      setLastLookedUpAccount(null);

      // Call the onSuccess callback and then redirect after 3 seconds
      setTimeout(() => {
        setStatus({ show: false, type: '', message: '', installationId: null });
        if (onSuccess) {
          // Pass the successful response data to the parent
          onSuccess(response.data);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error completing installation:', error);
      
      setStatus({
        show: true,
        type: 'error',
        message: error.message || 'Failed to complete installation. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, user, validateForm, onSuccess, setIsSubmitting, setStatus, clearForm]);

  // Handle clear form
  const handleClear = useCallback(() => {
    clearForm();
    setLookupData(null);
    setLookupError(null);
    setLastLookedUpAccount(null);
  }, [clearForm]);

  // Handle dismiss message
  const handleDismissMessage = useCallback(() => {
    setStatus({ show: false, type: '', message: '', installationId: null });
  }, [setStatus]);

  // Form fields configuration — meterNo/sealNo unchanged; accountNumber is
  // rendered separately below (bespoke layout with the lookup button) so
  // the shared FormField component stays untouched for every other use.
  const formFields = useMemo(() => [
    {
      name: 'sealNo',
      label: 'Seal Number',
      placeholder: 'e.g., 9900',
      type: 'text'
    },
    {
      name: 'meterNo',
      label: 'Meter Number (13 digits)',
      placeholder: 'e.g., 0123456789898',
      type: 'text',
      maxLength: 13,
      showCharacterCount: true,
      monospace: true
    }
  ], []);

  return (
    <div>
      {/* User Information */}
      <UserInfoPanel user={user} />

      {/* Status Messages */}
      {submitStatus.show && submitStatus.type === 'success' && (
        <SuccessMessage 
          message={submitStatus.message}
          installationId={submitStatus.installationId}
          onDismiss={handleDismissMessage}
        />
      )}

      {submitStatus.show && submitStatus.type === 'error' && (
        <ErrorMessage 
          message={submitStatus.message}
          onDismiss={handleDismissMessage}
        />
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Meter Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b flex items-center">
              <Hash className="w-5 h-5 mr-2" />
              Meter Information
            </h3>
            <div className="space-y-4 sm:space-y-6">
              {/* Account Number — bespoke layout with inline lookup action.
                  Kept separate from FormField so the trailing button never
                  affects sealNo/meterNo rendering. */}
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleAccountNumberChange('accountNumber', e.target.value)}
                    disabled={isSubmitting}
                    className={`flex-1 min-w-0 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-800/80 disabled:cursor-not-allowed transition-colors ${
                      errors.accountNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., 477014"
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={isSubmitting || lookupLoading || !formData.accountNumber.trim()}
                    className="shrink-0 flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Look up request details"
                  >
                    {lookupLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Look up</span>
                  </button>
                </div>
                {errors.accountNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
                )}
                {lookupError && (
                  <p className="mt-1 text-sm text-amber-600">{lookupError}</p>
                )}
              </div>

              {/* Inline request details — same component used on the full
                  InstallationDetail page, so both surfaces stay consistent.
                  Purely additive: appears only after a successful lookup,
                  never clears sealNo/meterNo/notes. */}
              {lookupData && (
                <RequestInfoPanel data={lookupData} title="Found Request" compact />
              )}

              {formFields.map((field) => (
                <FormField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formData[field.name]}
                  error={errors[field.name]}
                  onChange={updateField}
                  disabled={isSubmitting}
                  placeholder={field.placeholder}
                  type={field.type}
                  maxLength={field.maxLength}
                  showCharacterCount={field.showCharacterCount}
                  monospace={field.monospace}
                />
              ))}
            </div>
          </div>

          {/* Installation Notes Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b">
              Additional Information
            </h3>
            <div>
              <label htmlFor="installationNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Installation Notes (Optional)
              </label>
              <textarea
                id="installationNotes"
                name="installationNotes"
                value={formData.installationNotes}
                onChange={(e) => updateField('installationNotes', e.target.value)}
                disabled={isSubmitting}
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-800/80 disabled:cursor-not-allowed transition-colors resize-none"
                placeholder="Add any additional notes about this installation..."
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.sealNo || !formData.meterNo || !formData.accountNumber}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Completing Installation...
                </>
              ) : (
                'Complete Installation'
              )}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Clear Form
            </button>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <InformationPanel />
    </div>
  );
}

export default InstallationForm;