// src/components/admin/InstallationRequests.jsx
// Admin view of the multi-disco installation flow: every imported request,
// its live status, dispatching jobs to installers, and the response sheet
// exported back to the disco.
//
// This is NOT the JED/Remita screen at /installations — that one lists
// JedCustomerRequest records (accountNumber-keyed, INITIATED/PAID/COMPLETED)
// and is untouched. This page lists InstallationRequest records (integer id,
// disco-scoped, PENDING→…→EXPORTED).
//
// Assigning a job here is the real, backend-persisted installer assignment
// that this app could not offer before (see API_GAP_REPORT.md) — it writes
// through POST /assignments/installations and shows up immediately in that
// installer's My Jobs.
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList, RefreshCw, Search, AlertCircle, Loader2, UserPlus, X,
  Download, Ban, Undo2, Inbox, MapPin, ExternalLink,
} from 'lucide-react';
import jedApi from '../services/api';
import { useDataRefresh } from '../contexts/DataRefreshContext';
import { usePermissions } from '../auth/usePermissions';
import StatusBadge from '../common/StatusBadge';
import ConfirmationModal from '../common/ConfirmationModal';
import InstallerSelect from '../installations/InstallerSelect';
import BatchResultSummary from '../installations/BatchResultSummary';
import { useDiscoOptions } from '../../hooks/useDiscoOptions';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatPlainDate, formatDateTime } from '../../utils/date';
import { downloadBlob } from '../../utils/downloadBlob';
import {
  INSTALLATION_STATUS_ORDER,
  INSTALLATION_STATUS,
  STATS_KEY_BY_STATUS,
  installationStatusLabel,
  getAvailableActions,
  getCoordinates,
} from '../../utils/installationStatus';

function StatTile({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-2 rounded-lg border text-left transition-colors ${
        active
          ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50'
      }`}
    >
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
    </button>
  );
}

function RequestRow({ job, selectable, selected, onToggle, onCancel, onUnassign, busy }) {
  const actions = getAvailableActions(job.status);
  const coords = getCoordinates(job);

  return (
    <div className="p-4 flex items-start gap-3">
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(job)}
          aria-label={`Select account ${job.accountNumber}`}
          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {job.customerName || `Account ${job.accountNumber}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              Acct {job.accountNumber}
              {job.meterType ? ` · ${job.meterType}` : ''}
              {job.discoCode ? ` · ${job.discoCode}` : ''}
            </p>
          </div>
          <StatusBadge status={job.status} label={installationStatusLabel(job.status)} className="shrink-0 text-[11px]" />
        </div>

        {job.customerAddress && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{job.customerAddress}</p>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
          {job.assigneeName && <p>Assigned to {job.assigneeName}{job.assignedAt ? ` · ${formatDateTime(job.assignedAt)}` : ''}</p>}
          {job.meterNumber && (
            <p className="font-mono">
              Meter {job.meterNumber}{job.sealNumber ? ` · seal ${job.sealNumber}` : ''}
            </p>
          )}
          {job.installationDate && <p>Installed {formatPlainDate(job.installationDate)}{job.installerName ? ` by ${job.installerName}` : ''}</p>}
          {job.discoSupervisor && <p>Supervisor {job.discoSupervisor}</p>}
          {job.failureReason && <p className="text-red-700 dark:text-red-400">Failed: {job.failureReason}</p>}
          <div className="flex flex-wrap gap-x-3">
            {coords && (
              <a href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 hover:underline">
                <MapPin className="w-3 h-3" />
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </a>
            )}
            {job.installationPhotoUrl && (
              <a href={job.installationPhotoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 hover:underline">
                Photo <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {(actions.cancel || actions.unassign) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {actions.unassign && (
              <button type="button" onClick={() => onUnassign(job)} disabled={busy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">
                <Undo2 className="w-3.5 h-3.5" /> Unassign
              </button>
            )}
            {actions.cancel && (
              <button type="button" onClick={() => onCancel(job)} disabled={busy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50">
                <Ban className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InstallationRequests() {
  const permissions = usePermissions();
  const { refreshSignal, notifyDataChanged } = useDataRefresh();
  const { discos, loading: discosLoading } = useDiscoOptions();

  const [discoCode, setDiscoCode] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(() => new Map()); // id -> row
  const [assignOpen, setAssignOpen] = useState(false);
  const [installerId, setInstallerId] = useState('');
  const [dispatchRef, setDispatchRef] = useState('');
  const [assignError, setAssignError] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [markExported, setMarkExported] = useState(false);

  const refreshAll = useCallback(() => {
    jedApi.clearCache();
    setRefreshKey((k) => k + 1);
  }, []);

  // Filters are applied server-side — discoCode/status/search are all real
  // query params on GET /installations.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (discoCode) params.discoCode = discoCode;
        if (status) params.status = status;
        if (appliedSearch) params.search = appliedSearch;

        const [list, statsResponse] = await Promise.all([
          fetchAllPages((p) => jedApi.getInstallations(p), params),
          jedApi.getInstallationStatistics(discoCode ? { discoCode } : {}),
        ]);
        if (!cancelled) {
          setRows(list);
          setStats(statsResponse?.data || statsResponse || null);
        }
      } catch (err) {
        console.error('[InstallationRequests] Load failed:', err);
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load installation requests.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [discoCode, status, appliedSearch, refreshKey, refreshSignal]);

  // A selection can't survive a filter change or a reload — the rows behind it
  // may no longer be there, and assigning a stale id would 400.
  useEffect(() => { setSelected(new Map()); }, [discoCode, status, appliedSearch, rows]);

  const selectedRows = useMemo(() => Array.from(selected.values()), [selected]);

  // Assignment is per disco, so a mixed-disco selection can't be dispatched
  // in one call — surfaced as a clear message rather than a 400.
  const selectionDiscos = useMemo(
    () => Array.from(new Set(selectedRows.map((r) => r.discoCode).filter(Boolean))),
    [selectedRows]
  );
  const mixedDiscos = selectionDiscos.length > 1;

  const toggleRow = useCallback((job) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(job.id)) next.delete(job.id);
      else next.set(job.id, job);
      return next;
    });
  }, []);

  const handleAssign = async () => {
    if (assigning) return;
    if (!installerId) { setAssignError('Select an installer.'); return; }
    if (mixedDiscos) { setAssignError('Select jobs from a single disco at a time.'); return; }

    setAssigning(true);
    setAssignError(null);
    setAssignResult(null);
    try {
      // `ids` and `accountNumbers` are mutually exclusive — ids are used
      // because they're unambiguous across discos.
      const payload = {
        discoCode: selectionDiscos[0] || discoCode,
        installerId,
        ids: selectedRows.map((r) => r.id),
      };
      if (dispatchRef.trim()) payload.dispatchRef = dispatchRef.trim();

      const response = await jedApi.assignInstallations(payload);
      setAssignResult(response?.data || response);
      notifyDataChanged();
      refreshAll();
    } catch (err) {
      console.error('[InstallationRequests] Assign failed:', err);
      setAssignError(getErrorMessage(err, 'Could not assign these jobs.'));
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (job) => {
    setActionBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await jedApi.unassignInstallations({ discoCode: job.discoCode, ids: [job.id] });
      setNotice(`Account ${job.accountNumber} returned to the pending pool.`);
      notifyDataChanged();
      refreshAll();
    } catch (err) {
      console.error('[InstallationRequests] Unassign failed:', err);
      setActionError(getErrorMessage(err, 'Could not unassign this job.'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await jedApi.cancelInstallation(cancelTarget.id, 'Cancelled by administrator');
      setNotice(`Account ${cancelTarget.accountNumber} cancelled.`);
      setCancelTarget(null);
      notifyDataChanged();
      refreshAll();
    } catch (err) {
      console.error('[InstallationRequests] Cancel failed:', err);
      setActionError(getErrorMessage(err, 'Could not cancel this request.'));
      setCancelTarget(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleExport = async () => {
    if (!discoCode || exporting) return;
    setExporting(true);
    setActionError(null);
    setNotice(null);
    try {
      const params = markExported ? { markExported: true } : {};
      const { blob, filename } = await jedApi.exportInstallations(discoCode, params);
      downloadBlob(blob, filename || `${discoCode}-installations.xlsx`);
      setNotice(
        markExported
          ? 'Response sheet downloaded. The included rows are now marked EXPORTED.'
          : 'Preview downloaded. Rows are unchanged — tick "Mark as sent" when you deliver the file.'
      );
      if (markExported) { notifyDataChanged(); refreshAll(); }
    } catch (err) {
      console.error('[InstallationRequests] Export failed:', err);
      setActionError(getErrorMessage(err, 'Could not export the response sheet.'));
    } finally {
      setExporting(false);
    }
  };

  if (!permissions.canViewInstallationRequests) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to view installation requests.</p>
      </div>
    );
  }

  const assignableSelected = selectedRows.filter((r) => getAvailableActions(r.status).assign);
  const canAssignSelection = assignableSelected.length > 0 && assignableSelected.length === selectedRows.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg shrink-0">
            <ClipboardList className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Installation Requests</h1>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm truncate">
              Imported jobs, installer dispatch, and the sheet sent back to the disco
            </p>
          </div>
        </div>
        <button type="button" onClick={refreshAll} disabled={loading} aria-label="Refresh"
          className="p-2.5 sm:px-4 sm:py-2 bg-brand-500 text-gray-900 rounded-lg hover:bg-brand-600 disabled:bg-brand-400 shrink-0 flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-sm font-medium">Refresh</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}
      {actionError && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">{actionError}</p>
        </div>
      )}
      {notice && (
        <div role="status" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-300">{notice}</p>
        </div>
      )}

      {/* Statistics — real counts from GET /installations/statistics */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <StatTile label="All" value={stats.total ?? 0} active={status === ''} onClick={() => setStatus('')} />
          {INSTALLATION_STATUS_ORDER.map((s) => (
            <StatTile
              key={s}
              label={installationStatusLabel(s)}
              value={stats[STATS_KEY_BY_STATUS[s]] ?? 0}
              active={status === s}
              onClick={() => setStatus(status === s ? '' : s)}
            />
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={discoCode}
              onChange={(e) => setDiscoCode(e.target.value)}
              disabled={discosLoading}
              aria-label="Filter by disco"
              className="form-input w-full px-3 py-2 text-sm"
            >
              <option value="">All discos</option>
              {discos.map((d) => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
              className="form-input w-full px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {INSTALLATION_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{installationStatusLabel(s)}</option>
              ))}
            </select>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); setAppliedSearch(searchTerm.trim()); }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search account, customer or meter number..."
                aria-label="Search installation requests"
                className="form-input w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <button type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
              Search
            </button>
            {appliedSearch && (
              <button type="button" onClick={() => { setSearchTerm(''); setAppliedSearch(''); }}
                aria-label="Clear search"
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Export — only meaningful for a single disco's response sheet */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={markExported}
                onChange={(e) => setMarkExported(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
              />
              Mark rows as sent (moves them to Exported)
            </label>
            <button
              type="button"
              onClick={handleExport}
              disabled={!discoCode || exporting}
              title={!discoCode ? 'Choose a disco to export its response sheet' : undefined}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 sm:ml-auto"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {markExported ? 'Export & mark sent' : 'Export preview'}
            </button>
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="px-3 sm:px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-200 dark:border-brand-800 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
              {selectedRows.length} selected
              {mixedDiscos && <span className="block text-xs font-normal">Select one disco at a time to dispatch</span>}
              {!mixedDiscos && !canAssignSelection && (
                <span className="block text-xs font-normal">Only pending or failed jobs can be dispatched</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAssignError(null); setAssignResult(null); setAssignOpen(true); }}
                disabled={mixedDiscos || !canAssignSelection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-gray-900 rounded-lg text-xs font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign to installer
              </button>
              <button type="button" onClick={() => setSelected(new Map())} aria-label="Clear selection"
                className="p-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No installation requests match these filters</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Import a disco's customer sheet to create them.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((job) => (
              <RequestRow
                key={job.id}
                job={job}
                selectable={getAvailableActions(job.status).assign}
                selected={selected.has(job.id)}
                onToggle={toggleRow}
                onCancel={setCancelTarget}
                onUnassign={handleUnassign}
                busy={actionBusy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Assign modal */}
      {assignOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="assign-title"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="assign-title" className="text-lg font-semibold text-gray-900 dark:text-white">Assign to installer</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedRows.length} job{selectedRows.length === 1 ? '' : 's'} &middot; {selectionDiscos[0] || discoCode}
                </p>
              </div>
              <button type="button" onClick={() => setAssignOpen(false)} aria-label="Close"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {assignResult ? (
                <BatchResultSummary data={assignResult} acceptedLabel="Jobs assigned" />
              ) : (
                <>
                  <div>
                    <label htmlFor="assign-job-installer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Installer<span className="text-red-600 dark:text-red-400" aria-hidden="true"> *</span>
                    </label>
                    <InstallerSelect
                      id="assign-job-installer"
                      value={installerId}
                      onChange={setInstallerId}
                      disabled={assigning}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="assign-job-ref" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Dispatch reference
                    </label>
                    <input
                      id="assign-job-ref"
                      type="text"
                      value={dispatchRef}
                      onChange={(e) => setDispatchRef(e.target.value)}
                      disabled={assigning}
                      placeholder="Use the same reference as the meter dispatch"
                      className="form-input w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                  {assignError && (
                    <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-800 dark:text-red-300">{assignError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 sm:px-6 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button type="button" onClick={() => setAssignOpen(false)} disabled={assigning}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">
                {assignResult ? 'Close' : 'Cancel'}
              </button>
              {!assignResult && (
                <button type="button" onClick={handleAssign} disabled={assigning}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-500 text-gray-900 hover:bg-brand-600 disabled:opacity-60">
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={actionBusy}
        title="Cancel this installation?"
        message={
          cancelTarget
            ? `Account ${cancelTarget.accountNumber} (${cancelTarget.customerName || 'customer'}) will be cancelled and cannot be dispatched.`
            : ''
        }
        confirmText="Cancel request"
      />
    </div>
  );
}

export default InstallationRequests;
