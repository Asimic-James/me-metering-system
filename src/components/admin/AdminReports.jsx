import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataRefresh } from '../contexts/DataRefreshContext';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import JEDApiService from '../services/api';
import { 
  AlertCircle, 
  FileText, 
  Filter,
  X,
  Calendar,
  Search,
  RefreshCw,
  BarChart3,
  Eye
} from 'lucide-react';
import { formatDateTime } from '../../utils/date';
import { formatCurrencyNGN } from '../../utils/currency';
import { normalizeStatus } from '../../utils/statusBadge';
import { downloadCsv } from '../../utils/csv';
import InfoModal from '../common/InfoModal';
import StatusBadge from '../common/StatusBadge';

// Export fields — trimmed to only what the real JedCustomerRequest schema
// actually returns (id, accountNumber, custNames, gsm, email, address,
// meterRecommended, discoCode, requestRef, region, rrr, amount, orderId,
// status, meterType, sealNo, meterNo, dateRequested, datePaid,
// dateCompleted). Columns with no backing field on the real API — installer
// name/phone (no installer relationship exists on a request at all), feeder
// name, tariff class, GPS coordinates, meter phase, remarks — were removed
// rather than always rendering blank.
const EXPORT_FIELDS = [
  { key: 'id', label: 'Installation ID', width: 120 },
  { key: 'accountNumber', label: 'Account Number', width: 140 },
  { key: 'meterNumber', label: 'Meter Number', width: 140 },
  { key: 'sealNumber', label: 'Seal Number', width: 120 },
  { key: 'customerName', label: 'Customer Name', width: 200 },
  { key: 'customerAddress', label: 'Customer Address', width: 250 },
  { key: 'area', label: 'Area/Region', width: 150 },
  { key: 'meterType', label: 'Meter Type', width: 120 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'amount', label: 'Amount (₦)', width: 120 },
  { key: 'paymentReference', label: 'Payment Reference (RRR)', width: 180 },
  { key: 'submittedDate', label: 'Submitted Date', width: 160 },
  { key: 'completedDate', label: 'Completed Date', width: 160 },
];

const formatStatusText = (status) => normalizeStatus(status).replace(/_/g, ' ');

// Shared row shape for both the table and the Avg Transaction calculation —
// one normalization function so the two can never quietly drift apart.
const normalizeRequestRow = (r) => ({
  id: r.id ?? '-',
  accountNumber: r.accountNumber || '-',
  meterNumber: r.meterNo || '-',
  sealNumber: r.sealNo || '-',
  customerName: r.custNames || '-',
  customerAddress: r.address || '-',
  area: r.region || '-',
  meterType: r.meterType || r.meterRecommended || '-',
  status: normalizeStatus(r.status || 'unknown'),
  amount: Number(r.amount || 0),
  paymentReference: r.rrr || '-',
  submittedDate: r.dateRequested || null,
  completedDate: r.dateCompleted || null,
  raw: r
});

// Shared filter predicate — the same status/search/date-range rules apply
// to the table (`filtered`) and to which rows count toward Avg Transaction,
// so there is exactly one definition of "matches the admin's current
// filters" rather than two that could drift apart.
const rowMatchesFilters = (row, { query, status, dateFrom, dateTo }) => {
  if (status && normalizeStatus(status) !== normalizeStatus(row.status)) return false;

  const q = query.trim().toLowerCase();
  if (q) {
    const searchFields = [row.accountNumber, row.meterNumber, row.sealNumber, row.customerName, row.area, row.customerAddress].join(' ').toLowerCase();
    if (!searchFields.includes(q)) return false;
  }

  const fromTs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
  const toTs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
  if (fromTs || toTs) {
    const ts = row.submittedDate ? new Date(row.submittedDate).getTime() : null;
    if (fromTs && ts !== null && ts < fromTs) return false;
    if (toTs && ts !== null && ts > toTs) return false;
  }

  return true;
};

// Avg Transaction data source: GET /external/jed/requests, the same
// endpoint the table already uses (so amounts/statuses/dates are guaranteed
// consistent with what's on screen) — NOT GET /dashboard-stats, which the
// previous implementation read an `avgTicket`/`averageTicket` field from
// that doesn't exist anywhere in the real, documented response shape
// (confirmed against the live OpenAPI spec: dashboard-stats returns exactly
// `pendingRequests`, `completedRequests`, `activeInstallers`, `totalRevenue`
// — nothing average-related), so it silently never updated from its 0
// initial value. See the business-definition note above `AdminReports`
// below for what counts as a qualifying transaction.
//
// The real endpoint supports server-side `status` filtering (confirmed:
// enum exactly INITIATED/PAID/COMPLETED, max `limit` 100) but no date
// filter — so date-range filtering still has to happen client-side, but
// fetching only PAID/COMPLETED server-side (never INITIATED, which isn't a
// qualifying transaction — see below) avoids pulling records that could
// never count toward the average in the first place.
const TRANSACTION_STATS_PAGE_LIMIT = 100; // the API's documented maximum
const TRANSACTION_STATS_MAX_PAGES = 20; // safety cap (~2000 records per status) against an unbounded loop on a very large dataset

async function fetchAllRequestsByStatus(status) {
  const all = [];
  let page = 1;
  while (page <= TRANSACTION_STATS_MAX_PAGES) {
    const resp = await JEDApiService.getAllCustomerRequests({ page, limit: TRANSACTION_STATS_PAGE_LIMIT, status });
    const data = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
    if (data.length === 0) break;
    all.push(...data);
    if (!resp?.pagination?.hasNext) break;
    page += 1;
  }
  return all;
}

function AdminReports() {
  const { user } = useAuth();
  const { refreshSignal } = useDataRefresh();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [stats, setStats] = useState({ revenue: 0 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalCount: 0, hasNext: false, hasPrev: false, limit: 50
  });

  // Backing dataset for Avg Transaction — every PAID/COMPLETED request
  // across every page (not just the table's currently-displayed page), so
  // the metric reflects the whole qualifying dataset. Loaded independently
  // of the table's own (still server-paginated, unchanged) `rows`/`pagination`.
  const [transactionRows, setTransactionRows] = useState([]);
  const [transactionStatsLoading, setTransactionStatsLoading] = useState(true);
  const [transactionStatsError, setTransactionStatsError] = useState(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        try {
          const s = await JEDApiService.getDashboardStats();
          const payload = s?.data || s || {};
          setStats(prev => ({
            revenue: payload.revenue || payload.totalRevenue || prev.revenue,
          }));
        } catch (err) {
          console.debug('Reports: dashboard stats not available', err);
        }

        const resp = await JEDApiService.getAllCustomerRequests({
          page: pagination.currentPage, limit: Number(pagination.limit) || 50
        });
        const data = resp?.data || resp || [];
        const paginationData = resp?.pagination || {
          currentPage: pagination.currentPage, totalPages: 1, totalCount: data.length,
          hasNext: false, hasPrev: pagination.currentPage > 1, limit: pagination.limit
        };

        setRows((Array.isArray(data) ? data : []).map(normalizeRequestRow));
        setPagination(paginationData);
      } catch (err) {
        console.error('Failed to load reports:', err);
        setError('Failed to load reports.');
      } finally {
        setLoading(false);
      }
    };

    if (hasPermission(user?.role, PERMISSIONS.REPORTS.VIEW)) load();
    // refreshSignal: re-run after an app-wide data mutation elsewhere (e.g.
    // a bulk payment import) so newly-paid/completed requests show up here
    // without the user needing to manually reload — see DataRefreshContext.
  }, [user, pagination.currentPage, pagination.limit, refreshSignal]);

  // Avg Transaction's own data load — independent of the table's paginated
  // fetch above (different page range entirely: every PAID/COMPLETED
  // record, not one page of everything). Business definition: a
  // "qualifying transaction" is a request that has genuinely been paid —
  // status PAID or COMPLETED. INITIATED is explicitly excluded (an RRR
  // was generated but the customer hasn't paid — there is no transaction
  // yet), matching this app's existing PAID/COMPLETED-only conventions
  // elsewhere (see isAwaitingInstallationStatus/isCompletedStatus in
  // statusBadge.js and the revenue fallback calculation in
  // AdminDashboard.jsx, both of which already treat INITIATED as
  // non-revenue-bearing).
  useEffect(() => {
    const loadTransactions = async () => {
      if (!hasPermission(user?.role, PERMISSIONS.REPORTS.VIEW)) return;
      try {
        setTransactionStatsLoading(true);
        setTransactionStatsError(null);
        const [paid, completed] = await Promise.all([
          fetchAllRequestsByStatus('PAID'),
          fetchAllRequestsByStatus('COMPLETED'),
        ]);
        setTransactionRows([...paid, ...completed].map(normalizeRequestRow));
      } catch (err) {
        console.error('Failed to load transaction data for Avg Transaction:', err);
        setTransactionStatsError('Unavailable');
      } finally {
        setTransactionStatsLoading(false);
      }
    };

    loadTransactions();
    // refreshSignal: a payment confirmation or bulk import elsewhere in the
    // app changes which requests are PAID/COMPLETED — refetch so the
    // average doesn't go stale, same trigger the table's own fetch uses.
  }, [user, refreshSignal]);

  const filtered = useMemo(
    () => rows.filter((r) => rowMatchesFilters(r, { query, status, dateFrom, dateTo })),
    [rows, query, status, dateFrom, dateTo]
  );

  // transactionRows already only ever contains PAID/COMPLETED rows (fetched
  // with a server-side status filter) — applying the same filter predicate
  // used by the table naturally handles every case: no status filter counts
  // both, picking PAID or COMPLETED narrows to just that one, and picking
  // any other status (e.g. INITIATED) correctly yields zero qualifying
  // transactions, since none of those rows would ever be in this array.
  const avgTransactionStats = useMemo(() => {
    const qualifying = transactionRows.filter((r) => rowMatchesFilters(r, { query, status, dateFrom, dateTo }));
    const total = qualifying.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    const count = qualifying.length;
    return { total, count, average: count > 0 ? total / count : 0 };
  }, [transactionRows, query, status, dateFrom, dateTo]);

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = EXPORT_FIELDS.map(f => f.label);
      const rows = filtered.map((record) =>
        EXPORT_FIELDS.map((field) => {
          let value = record[field.key] || '';
          if (field.key.includes('Date') && value && value !== '-') {
            try { value = formatDateTime(value); } catch { /* keep original */ }
          }
          return value;
        })
      );
      downloadCsv(`admin-reports-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => { setQuery(''); setStatus(''); setDateFrom(''); setDateTo(''); };

  const openRecordDetails = (record) => setSelectedRecord(record);
  const closeRecordDetails = () => setSelectedRecord(null);

  const formatDetailValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatFieldLabel = (key) => {
    const cleaned = String(key || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim();

    // Real JedCustomerRequest field names only — see EXPORT_FIELDS comment.
    const labelMap = {
      accountNumber: 'Account Number',
      custNames: 'Customer Name',
      gsm: 'Phone (GSM)',
      email: 'Email',
      address: 'Customer Address',
      meterRecommended: 'Meter Type Recommended',
      discoCode: 'Disco Code',
      requestRef: 'Request Reference',
      region: 'Region',
      rrr: 'Payment Reference (RRR)',
      amount: 'Amount',
      orderId: 'Order ID',
      status: 'Status',
      meterType: 'Meter Type',
      sealNo: 'Seal Number',
      meterNo: 'Meter Number',
      dateRequested: 'Submitted Date',
      datePaid: 'Paid Date',
      dateCompleted: 'Completed Date',
      id: 'ID',
    };

    return labelMap[cleaned.toLowerCase()] || cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const detailFields = useMemo(() => {
    if (!selectedRecord) return [];

    const baseFields = [
      { label: 'Account Number', value: selectedRecord.accountNumber },
      { label: 'Meter Number', value: selectedRecord.meterNumber },
      { label: 'Seal Number', value: selectedRecord.sealNumber },
      { label: 'Customer Name', value: selectedRecord.customerName },
      { label: 'Customer Address', value: selectedRecord.customerAddress },
      { label: 'Region', value: selectedRecord.area },
      { label: 'Meter Type', value: selectedRecord.meterType },
      { label: 'Status', value: selectedRecord.status },
      { label: 'Amount', value: formatCurrencyNGN(selectedRecord.amount) },
      { label: 'Payment Reference (RRR)', value: selectedRecord.paymentReference },
      { label: 'Submitted Date', value: formatDateTime(selectedRecord.submittedDate) },
      { label: 'Completed Date', value: formatDateTime(selectedRecord.completedDate) },
    ];

    const rawEntries = Object.entries(selectedRecord.raw || {}).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'function') return false;
      return true;
    });

    return { baseFields, rawEntries };
  }, [selectedRecord]);

  const inputClass = "form-input w-full px-4 py-2.5 text-sm";

  if (!user || !hasPermission(user.role, PERMISSIONS.REPORTS.VIEW)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Admin Reports</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive analytics and exportable installation data
            </p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          disabled={exporting || filtered.length === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {exporting
            ? <><RefreshCw className="w-4 h-4 animate-spin" />Exporting...</>
            : <><FileText className="w-4 h-4" />Export CSV</>}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrencyNGN(stats.revenue), loading: false, error: null },
          {
            label: 'Avg. Transaction',
            value: formatCurrencyNGN(avgTransactionStats.average),
            caption: `${avgTransactionStats.count.toLocaleString()} qualifying transaction${avgTransactionStats.count === 1 ? '' : 's'}`,
            loading: transactionStatsLoading,
            error: transactionStatsError,
          },
          { label: 'Total Records', value: pagination.totalCount || rows.length, loading: false, error: null },
        ].map(({ label, value, caption, loading: cardLoading, error: cardError }) => (
          <div key={label} className="card p-4 sm:p-5">
            <h4 className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</h4>
            {cardLoading ? (
              <div
                className="mt-2 h-7 sm:h-8 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
                role="status"
                aria-label={`Loading ${label}`}
              />
            ) : cardError ? (
              <p className="text-sm font-medium mt-2.5 text-red-600 dark:text-red-400">{cardError}</p>
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
                {caption && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{caption}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="card overflow-hidden">
        {/* Mobile Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <Filter className="w-4 h-4" />
            Filters {(query || status || dateFrom || dateTo) && <span className="text-indigo-600 dark:text-indigo-400">(Active)</span>}
          </span>
          {showFilters ? <X className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
        </button>

        <div className={`p-4 space-y-3 border-t border-gray-100 dark:border-gray-700 lg:border-t-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search account, meter, customer, installer..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="INITIATED">Initiated</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="PROCESSING">Processing</option>
            </select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${inputClass} pl-10`} />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${inputClass} pl-10`} />
            </div>

            <button
              onClick={clearFilters}
              disabled={!query && !status && !dateFrom && !dateTo}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear Filters
            </button>
          </div>

          {(query || status || dateFrom || dateTo) && (
            <div className="text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-3 py-2 rounded-lg">
              Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> records
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Page <strong className="text-gray-900 dark:text-white">{pagination.currentPage}</strong> of <strong className="text-gray-900 dark:text-white">{pagination.totalPages}</strong>{' '}
            (<strong className="text-gray-900 dark:text-white">{pagination.totalCount}</strong> total)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
              disabled={!pagination.hasPrev}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <select
              value={pagination.currentPage}
              onChange={(e) => setPagination(p => ({ ...p, currentPage: parseInt(e.target.value) }))}
              className="form-input px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>Page {p}</option>
              ))}
            </select>
            <button
              onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
              disabled={!pagination.hasNext}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full min-w-[1000px] text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 sm:px-4 py-3 font-semibold">Account</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Meter No.</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Customer</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Region</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Status</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Date</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-center">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading reports...
              </td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-red-600 dark:text-red-400">{error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />No records found
              </td></tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{r.accountNumber}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{r.meterNumber}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300">{r.customerName}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{r.area}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <StatusBadge status={r.status} label={formatStatusText(r.status)} className="uppercase" />
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrencyNGN(r.amount)}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {formatDateTime(r.submittedDate)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRecordDetails(r);
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={`View details for ${r.customerName}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="card p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{r.customerName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Account: {r.accountNumber}</p>
                </div>
                <StatusBadge status={r.status} label={formatStatusText(r.status)} className="ml-2 uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Meter No.</p>
                  <p className="text-gray-900 dark:text-white font-mono">{r.meterNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Region</p>
                  <p className="text-gray-900 dark:text-white">{r.area}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{formatCurrencyNGN(r.amount)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDateTime(r.submittedDate)}</span>
                <button
                  type="button"
                  onClick={() => openRecordDetails(r)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <InfoModal
        isOpen={Boolean(selectedRecord)}
        onClose={closeRecordDetails}
        title={selectedRecord ? `${selectedRecord.customerName || 'Customer'} Details` : 'Customer Details'}
      >
        {selectedRecord && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Primary Details</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {detailFields.baseFields.map((field) => (
                  <div key={field.label} className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{field.label}</p>
                    <p className="break-words text-gray-900 dark:text-gray-100 font-medium">{formatDetailValue(field.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {detailFields.rawEntries.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">All Available Fields</p>
                <div className="mt-2 space-y-2 text-sm">
                  {detailFields.rawEntries.map(([key, value]) => (
                    <div key={key} className="border-b border-gray-100 dark:border-gray-800 pb-2 last:border-b-0 last:pb-0">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formatFieldLabel(key)}</p>
                      <p className="mt-1 break-words whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                        {formatDetailValue(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </InfoModal>
    </div>
  );
}

export default AdminReports;