// src/components/dashboard/InstallerDashboard.jsx
// Installer-facing dashboard: tabbed Pending / Completed installations.
// Mobile-first: card list by default, table layout from sm: breakpoint up.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDataRefresh } from '../contexts/DataRefreshContext';
import JEDApiService from '../services/api';
import { isCompletedStatus, isAwaitingInstallationStatus } from '../../utils/statusBadge';
import { unwrapListResponse } from '../../utils/unwrapListResponse';
import StatusTabs from '../common/StatusTabs';
import StatusBadge from '../common/StatusBadge';
import {
  Wrench,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { formatDateOnly } from '../../utils/date';

// STATUS_STYLES and isCompletedStatus previously lived here as local
// copies that only matched lowercase status strings ('completed',
// 'pending'). The real API returns uppercase ('INITIATED', 'PAID',
// 'COMPLETED'), so every job silently fell into the "pending" bucket and
// every badge fell into the same fallback color. Both are now imported
// from the shared, case-insensitive src/utils/statusBadge.js so this
// dashboard, AdminDashboard, and InstallationDetail can never drift apart
// again.

function JobRow({ job, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(job)}
      className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {job.custNames || job.applicantName || `Account ${job.accountNumber}`}
          </p>
          <StatusBadge
            status={job.status}
            label={isCompletedStatus(job.status) ? 'Paid & Completed' : job.status || 'pending'}
            className="shrink-0 text-[11px]"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          Acct: {job.accountNumber} &middot; Meter: {job.meterNo || job.meterNumber || 'N/A'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatDateOnly(job.dateRequested)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
    </button>
  );
}

// Desktop row (table) — same click behavior, denser layout for larger screens
function JobTableRow({ job, onClick }) {
  return (
    <tr
      onClick={() => onClick(job)}
      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{job.accountNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {job.custNames || job.applicantName || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
        {job.meterNo || job.meterNumber || 'N/A'}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={job.status} label={isCompletedStatus(job.status) ? 'Paid & Completed' : job.status || 'pending'} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {formatDateOnly(job.dateRequested)}
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
      </td>
    </tr>
  );
}

function JobList({ jobs, onRowClick, emptyIcon: EmptyIcon, emptyMessage }) {
  if (jobs.length === 0) {
    return (
      <div className="py-16 text-center">
        <EmptyIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {jobs.map((job) => (
          <JobRow key={job.id || job.accountNumber} job={job} onClick={onRowClick} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs">
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Meter No.</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {jobs.map((job) => (
              <JobTableRow key={job.id || job.accountNumber} job={job} onClick={onRowClick} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InstallerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshSignal } = useDataRefresh();

  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('awaiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchJobs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // GET /external/jed/requests/installer, scoped only by role (auth
      // token) and status — this is the shared queue every installer sees,
      // not a personally-assigned list (the real API has no per-installer
      // assignment field or endpoint; see API_GAP_REPORT.md).
      const response = await JEDApiService.getMyInstallations({ limit: 100 });
      const list = unwrapListResponse(response);
      setAllJobs(list);
    } catch (err) {
      console.error('[InstallerDashboard] Failed to load jobs:', err);
      setError('Unable to load installations. Pull down or tap refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
    // refreshKey: manual refresh button. refreshSignal: app-wide mutation
    // elsewhere (e.g. an admin's bulk payment import) — see DataRefreshContext.
  }, [fetchJobs, refreshKey, refreshSignal]);

  // Awaiting Installation = PAID only (INITIATED requests haven't been
  // paid yet, so there's nothing for an installer to act on there — they
  // don't appear in either tab). Completed = COMPLETED only.
  const awaitingJobs = useMemo(
    () => allJobs.filter((j) => isAwaitingInstallationStatus(j.status)),
    [allJobs]
  );
  const completedJobs = useMemo(
    () => allJobs.filter((j) => isCompletedStatus(j.status)),
    [allJobs]
  );

  const visibleJobs = useMemo(() => {
    const source = activeTab === 'awaiting' ? awaitingJobs : completedJobs;
    if (!searchTerm.trim()) return source;
    const term = searchTerm.toLowerCase();
    return source.filter(
      (j) =>
        j.accountNumber?.toString().toLowerCase().includes(term) ||
        j.custNames?.toLowerCase().includes(term) ||
        j.applicantName?.toLowerCase().includes(term) ||
        j.meterNo?.toString().toLowerCase().includes(term)
    );
  }, [activeTab, awaitingJobs, completedJobs, searchTerm]);

  const handleRowClick = (job) => {
    navigate(`/installations/${job.accountNumber}`);
  };

  if (loading && allJobs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">Loading installation queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg shrink-0">
            <Wrench className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Installation Queue
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm truncate">
              {user?.name ? `Welcome, ${user.name} — paid requests awaiting installation` : 'Paid requests awaiting installation'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          aria-label="Refresh"
          className="p-2.5 sm:px-4 sm:py-2 bg-brand-500 text-gray-900 rounded-lg hover:bg-brand-600 disabled:bg-brand-400 shrink-0 flex items-center gap-2 transition-all duration-150 active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-sm font-medium">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 sm:p-4 rounded-r-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <StatusTabs
          tabs={[
            { id: 'awaiting', label: 'Awaiting Installation', icon: Clock, count: awaitingJobs.length },
            { id: 'completed', label: 'Completed', icon: CheckCircle, count: completedJobs.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account, customer, or meter number..."
              className="form-input w-full pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* List / Table */}
        <JobList
          jobs={visibleJobs}
          onRowClick={handleRowClick}
          emptyIcon={activeTab === 'awaiting' ? Clock : CheckCircle}
          emptyMessage={
            activeTab === 'awaiting'
              ? 'No installations awaiting installation — check back after a payment is confirmed'
              : 'No completed installations yet'
          }
        />
      </div>
    </div>
  );
}

export default InstallerDashboard;