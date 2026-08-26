// src/components/admin/AdminInstallations.jsx
// Consolidated Admin/Super Admin installation workflow: exactly two real
// backend statuses — PAID ("Awaiting Installation") and COMPLETED — no
// invented intermediate states. Supersedes the "Requests by Status" tab
// that used to live in PaymentsPage.jsx (a broader INITIATED/PAID/COMPLETED
// browser that duplicated this same PAID/COMPLETED view once this page
// existed) — general all-status browsing/export still lives in
// AdminReports.jsx, which this page does not duplicate.
//
// Assignment: the real Pharez API has no installerId field or assign
// endpoint on JedCustomerRequest (reconfirmed against the live OpenAPI spec
// — see API_GAP_REPORT.md). Selecting one or many rows and requesting an
// assignment is real, working UI state; the assignment itself cannot be
// persisted, so requesting it opens an explanatory info modal instead of
// silently succeeding or writing to client-only storage.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JEDApiService from '../services/api';
import { useDataRefresh } from '../contexts/DataRefreshContext';
import InfoModal from '../common/InfoModal';
import { getStatusBadgeClass, isCompletedStatus } from '../../utils/statusBadge';
import { formatDateOnly } from '../../utils/date';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  AlertCircle,
  ChevronRight,
  UserPlus,
  X,
} from 'lucide-react';

function JobRow({ job, onClick, selectable, selected, onToggleSelect, onAssignOne }) {
  return (
    <div className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors flex items-start gap-3">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(job.accountNumber); }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 shrink-0"
          aria-label={`Select account ${job.accountNumber}`}
        />
      )}
      {/* A native <button> can't contain another <button> (invalid HTML —
          caused a real hydration warning when the "Assign Installer"
          button lived inside this row's clickable wrapper). This is a
          div with the same click/keyboard-activation behavior instead,
          same pattern already used by AdminDashboard's clickable <tr>. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(job)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(job); } }}
        className="min-w-0 flex-1 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {job.custNames || `Account ${job.accountNumber}`}
          </p>
          <span className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadgeClass(job.status)}`}>
            {isCompletedStatus(job.status) ? 'Completed' : job.status || 'PAID'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          Acct: {job.accountNumber} &middot; Meter: {job.meterNo || 'N/A'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatDateOnly(job.dateRequested)}
        </p>
        {selectable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAssignOne(job); }}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign Installer
          </button>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
    </div>
  );
}

function JobTableRow({ job, onClick, selectable, selected, onToggleSelect, onAssignOne }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      {selectable && (
        <td className="px-4 py-3 w-8">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(job.accountNumber)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            aria-label={`Select account ${job.accountNumber}`}
          />
        </td>
      )}
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white cursor-pointer" onClick={() => onClick(job)}>{job.accountNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => onClick(job)}>{job.custNames || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono cursor-pointer" onClick={() => onClick(job)}>{job.meterNo || 'N/A'}</td>
      <td className="px-4 py-3 cursor-pointer" onClick={() => onClick(job)}>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
          {isCompletedStatus(job.status) ? 'Completed' : job.status || 'PAID'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-pointer" onClick={() => onClick(job)}>{formatDateOnly(job.dateRequested)}</td>
      <td className="px-4 py-3">
        {selectable ? (
          <button
            type="button"
            onClick={() => onAssignOne(job)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign Installer
          </button>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right cursor-pointer" onClick={() => onClick(job)}>
        <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
      </td>
    </tr>
  );
}

function JobList({ jobs, onRowClick, emptyIcon: EmptyIcon, emptyMessage, selectable, selectedSet, onToggleSelect, onAssignOne }) {
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
      <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {jobs.map((job) => (
          <JobRow
            key={job.id || job.accountNumber}
            job={job}
            onClick={onRowClick}
            selectable={selectable}
            selected={selectedSet.has(job.accountNumber)}
            onToggleSelect={onToggleSelect}
            onAssignOne={onAssignOne}
          />
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs">
              {selectable && <th className="px-4 py-3 w-8"></th>}
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Meter No.</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Installer</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {jobs.map((job) => (
              <JobTableRow
                key={job.id || job.accountNumber}
                job={job}
                onClick={onRowClick}
                selectable={selectable}
                selected={selectedSet.has(job.accountNumber)}
                onToggleSelect={onToggleSelect}
                onAssignOne={onAssignOne}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminInstallations() {
  const navigate = useNavigate();
  const { refreshSignal } = useDataRefresh();

  const [awaitingJobs, setAwaitingJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('awaiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState(() => new Set());
  const [assignTarget, setAssignTarget] = useState(null); // { accounts: [...] } for the info modal

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [paidResponse, completedResponse] = await Promise.all([
        JEDApiService.getCustomerRequestsByStatus('PAID'),
        JEDApiService.getCustomerRequestsByStatus('COMPLETED'),
      ]);

      const paidList = Array.isArray(paidResponse) ? paidResponse : (paidResponse?.data || []);
      const completedList = Array.isArray(completedResponse) ? completedResponse : (completedResponse?.data || []);

      setAwaitingJobs(paidList);
      setCompletedJobs(completedList);
    } catch (err) {
      console.error('[AdminInstallations] Failed to load installations:', err);
      setError('Unable to load installations. Tap refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, refreshKey, refreshSignal]);

  // Selection only makes sense for the still-actionable Awaiting tab —
  // clear it whenever the tab, data, or an app-wide refresh changes so a
  // stale selection can't linger against a list that's moved on.
  useEffect(() => {
    setSelected(new Set());
  }, [activeTab, awaitingJobs]);

  const visibleJobs = useMemo(() => {
    const source = activeTab === 'awaiting' ? awaitingJobs : completedJobs;
    if (!searchTerm.trim()) return source;
    const term = searchTerm.toLowerCase();
    return source.filter(
      (j) =>
        j.accountNumber?.toString().toLowerCase().includes(term) ||
        j.custNames?.toLowerCase().includes(term) ||
        j.meterNo?.toString().toLowerCase().includes(term)
    );
  }, [activeTab, awaitingJobs, completedJobs, searchTerm]);

  const handleRowClick = (job) => {
    navigate(`/installations/${job.accountNumber}`);
  };

  const handleToggleSelect = useCallback((accountNumber) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(accountNumber)) next.delete(accountNumber);
      else next.add(accountNumber);
      return next;
    });
  }, []);

  const handleAssignOne = (job) => setAssignTarget({ accounts: [job.accountNumber] });
  const handleAssignSelected = () => setAssignTarget({ accounts: Array.from(selected) });

  if (loading && awaitingJobs.length === 0 && completedJobs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">Loading installations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Installations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm truncate">
              Paid customers awaiting installation, and completed installs
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          aria-label="Refresh"
          className="p-2.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 shrink-0 flex items-center gap-2 transition-all duration-150 active:scale-[0.98]"
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

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('awaiting')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all duration-150 ${
              activeTab === 'awaiting'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 active:scale-[0.98]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Awaiting Installation</span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
              {awaitingJobs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all duration-150 ${
              activeTab === 'completed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 active:scale-[0.98]'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Completed</span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
              {completedJobs.length}
            </span>
          </button>
        </div>

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

        {activeTab === 'awaiting' && selected.size > 0 && (
          <div className="px-3 sm:px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {selected.size} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAssignSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign to Installer
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                aria-label="Clear selection"
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <JobList
          jobs={visibleJobs}
          onRowClick={handleRowClick}
          emptyIcon={activeTab === 'awaiting' ? Clock : CheckCircle}
          emptyMessage={
            activeTab === 'awaiting'
              ? 'No installations awaiting installation — check back after a payment is confirmed'
              : 'No completed installations yet'
          }
          selectable={activeTab === 'awaiting'}
          selectedSet={selected}
          onToggleSelect={handleToggleSelect}
          onAssignOne={handleAssignOne}
        />
      </div>

      <InfoModal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="Installer Assignment Not Yet Available"
      >
        <p>
          Assigning {assignTarget?.accounts.length === 1
            ? <>account <strong className="font-mono">{assignTarget.accounts[0]}</strong></>
            : <><strong>{assignTarget?.accounts.length}</strong> selected accounts</>} to a specific
          installer isn't possible yet — the real Pharez API's <span className="font-mono">JedCustomerRequest</span>{' '}
          record has no <span className="font-mono">installerId</span> field, and there is no assign/reassign
          endpoint (single or bulk). Every installer currently sees the same shared "Awaiting Installation" queue.
        </p>
        <p className="mt-2">
          This requires a backend change first (a field on the request plus assign/bulk-assign endpoints scoped
          to the authenticated installer). See <span className="font-mono">API_GAP_REPORT.md</span> for the
          exact endpoints needed — this action will be wired up to them once they exist.
        </p>
      </InfoModal>
    </div>
  );
}

export default AdminInstallations;
