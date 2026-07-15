// src/components/installation/InstallationDetail.jsx
// Detail view reached by clicking a row in InstallerDashboard (or Admin's
// recent installations). Pending jobs show the Complete Installation form;
// completed jobs show a read-only "Paid & Completed" summary.
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import JEDApiService from '../services/api';
import RequestInfoPanel from './RequestInfoPanel';
import { getStatusBadgeClass, isCompletedStatus } from '../../utils/statusBadge';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// isCompletedStatus previously lived here as a local, lowercase-only copy.
// Now imported from the shared, case-insensitive src/utils/statusBadge.js
// so this stays consistent with AdminDashboard and InstallerDashboard.

function InstallationDetail() {
  const { accountNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Complete-installation form state
  const [formData, setFormData] = useState({ actualMeterNo: '', actualSealNo: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await JEDApiService.getCustomerRequest(accountNumber);
      const data = response?.data || response;
      setJob(data);
      setFormData({
        actualMeterNo: data?.meterNo || data?.meterNumber || '',
        actualSealNo: data?.sealNo || '',
        notes: '',
      });
    } catch (err) {
      console.error('[InstallationDetail] Failed to load request:', err);
      setError('Unable to load this installation. It may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
    if (submitError) setSubmitError(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.actualMeterNo || String(formData.actualMeterNo).length !== 13) {
      errs.actualMeterNo = 'Meter Number must be exactly 13 digits';
    }
    if (!formData.actualSealNo || !String(formData.actualSealNo).trim()) {
      errs.actualSealNo = 'Seal Number is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleComplete = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      await JEDApiService.completeInstallation({
        sealNo: formData.actualSealNo,
        meterNo: formData.actualMeterNo,
        accountNumber,
        installationDate: new Date().toISOString(),
        installerName: user?.name,
        installerEmployeeId: user?.employeeId || user?.staffId || user?.id,
        notes: formData.notes || 'Installation completed via installer app',
      });

      setSubmitted(true);
      setJob((prev) => (prev ? { ...prev, status: 'completed' } : prev));

      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('[InstallationDetail] Failed to complete installation:', err);
      setSubmitError(err.message || 'Failed to submit installation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading installation details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white mb-4">{error || 'Installation not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const completed = isCompletedStatus(job.status);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Sticky-feeling back header — important on mobile so the action is always reachable */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            Account {job.accountNumber}
          </h1>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusBadgeClass(job.status)}`}
          >
            {completed ? 'Paid & Completed' : job.status || 'Pending'}
          </span>
        </div>
      </div>

      {/* Customer / request info — shared panel, also used inline in InstallationForm */}
      <RequestInfoPanel data={job} />

      {completed ? (
        // ---- Completed: read-only summary, no form ----
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 dark:text-green-300 font-semibold">Installation Completed</p>
          <p className="text-green-700 dark:text-green-400 text-sm mt-1">
            This job has been marked as paid and completed. No further action needed.
          </p>
        </div>
      ) : submitted ? (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 dark:text-green-300 font-semibold">Installation submitted!</p>
          <p className="text-green-700 dark:text-green-400 text-sm mt-1">Redirecting to your dashboard...</p>
        </div>
      ) : (
        // ---- Pending: the actual "execute and mark complete" form ----
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Complete Installation
          </h2>

          {submitError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-300">{submitError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Actual Meter Number *
              </label>
              <input
                type="text"
                name="actualMeterNo"
                value={formData.actualMeterNo}
                onChange={handleChange}
                maxLength={13}
                disabled={submitting}
                className={`w-full px-3 py-2.5 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:bg-gray-900 ${
                  formErrors.actualMeterNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="13 digits"
              />
              <div className="flex justify-between mt-1">
                {formErrors.actualMeterNo && (
                  <p className="text-xs text-red-600">{formErrors.actualMeterNo}</p>
                )}
                <p className="text-xs text-gray-500 ml-auto">{formData.actualMeterNo.length}/13</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Actual Seal Number *
              </label>
              <input
                type="text"
                name="actualSealNo"
                value={formData.actualSealNo}
                onChange={handleChange}
                disabled={submitting}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:bg-gray-900 ${
                  formErrors.actualSealNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {formErrors.actualSealNo && (
                <p className="mt-1 text-xs text-red-600">{formErrors.actualSealNo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={submitting}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Any observations from the field..."
              />
            </div>

            {/* Sticky action bar on mobile keeps the primary action reachable
                without scrolling back up on small screens */}
            <div className="sticky bottom-0 -mx-4 sm:mx-0 sm:static bg-white dark:bg-gray-800 sm:bg-transparent px-4 sm:px-0 pt-3 pb-1 border-t sm:border-0 border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-green-400 transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Mark as Complete'
                )}
              </button>
              <button
                onClick={() => navigate(-1)}
                disabled={submitting}
                className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstallationDetail;