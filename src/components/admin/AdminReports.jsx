import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  BarChart3
} from 'lucide-react';
import { formatCurrencyNGN } from '../../utils/currency';

// Comprehensive field definitions for export
const EXPORT_FIELDS = [
  { key: 'id', label: 'Installation ID', width: 120 },
  { key: 'accountNumber', label: 'Account Number', width: 140 },
  { key: 'meterNumber', label: 'Meter Number', width: 140 },
  { key: 'sealNumber', label: 'Seal Number', width: 120 },
  { key: 'customerName', label: 'Customer Name', width: 200 },
  { key: 'customerAddress', label: 'Customer Address', width: 250 },
  { key: 'area', label: 'Area/Location', width: 150 },
  { key: 'feederName', label: 'Feeder Name', width: 150 },
  { key: 'meterType', label: 'Meter Type', width: 120 },
  { key: 'meterPhase', label: 'Meter Phase', width: 100 },
  { key: 'tariffClass', label: 'Tariff Class', width: 120 },
  { key: 'installerName', label: 'Installer Name', width: 180 },
  { key: 'installerPhone', label: 'Installer Phone', width: 140 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'amount', label: 'Amount (₦)', width: 120 },
  { key: 'paymentReference', label: 'Payment Reference', width: 180 },
  { key: 'installationDate', label: 'Installation Date', width: 160 },
  { key: 'submittedDate', label: 'Submitted Date', width: 160 },
  { key: 'completedDate', label: 'Completed Date', width: 160 },
  { key: 'gpsCoordinates', label: 'GPS Coordinates', width: 180 },
  { key: 'remarks', label: 'Remarks/Notes', width: 200 }
];

const STATUS_BADGE = (status) => {
  const map = {
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    processing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    initiated: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  };
  return map[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
};

function AdminReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [stats, setStats] = useState({ revenue: 0, avgTicket: 0, transactions: 0 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalCount: 0, hasNext: false, hasPrev: false, limit: 50
  });

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
            avgTicket: payload.avgTicket || payload.averageTicket || prev.avgTicket,
            transactions: payload.transactions || payload.completedRequests || prev.transactions
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

        const normalized = (Array.isArray(data) ? data : []).map((r) => ({
          id: r.id || r.installationId || r.requestId || '-',
          accountNumber: r.accountNumber || r.account_no || r.accountNo || '-',
          meterNumber: r.meterNo || r.meterNumber || r.meter_number || '-',
          sealNumber: r.sealNo || r.sealNumber || r.seal_number || '-',
          customerName: r.custNames || r.customerName || r.applicantName || r.customer_name || '-',
          customerAddress: r.address || r.customerAddress || r.custAddress || r.installation_address || '-',
          area: r.area || r.location || r.region || r.district || '-',
          feederName: r.feederName || r.feeder || r.feeder_name || '-',
          meterType: r.meterType || r.meter_type || r.type || '-',
          meterPhase: r.meterPhase || r.phase || r.meter_phase || '-',
          tariffClass: r.tariffClass || r.tariff || r.tariff_class || '-',
          installerName: r.installer?.name || r.installerName || r.installer_name || '-',
          installerPhone: r.installer?.phone || r.installerPhone || r.installer_phone || '-',
          status: (r.status || r.state || 'unknown').toString().toLowerCase(),
          amount: Number(r.amount || r.fee || r.paymentAmount || 0),
          paymentReference: r.paymentReference || r.payment_ref || r.reference || '-',
          installationDate: r.installationDate || r.installation_date || r.dateInstalled || null,
          submittedDate: r.submittedAt || r.dateRequested || r.submitted_at || r.createdAt || null,
          completedDate: r.completedAt || r.completed_at || r.dateCompleted || null,
          gpsCoordinates: r.gpsCoordinates || r.coordinates || r.location_coords || 
            (r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : '-'),
          remarks: r.remarks || r.notes || r.comments || '-',
          raw: r
        }));

        setRows(normalized);
        setPagination(paginationData);
      } catch (err) {
        console.error('Failed to load reports:', err);
        setError('Failed to load reports.');
      } finally {
        setLoading(false);
      }
    };

    if (hasPermission(user?.role, PERMISSIONS.REPORTS.VIEW)) load();
  }, [user, pagination.currentPage, pagination.limit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).setHours(0,0,0,0) : null;
    const toTs = dateTo ? new Date(dateTo).setHours(23,59,59,999) : null;

    return rows.filter(r => {
      if (status && status !== r.status) return false;
      if (q) {
        const searchFields = [r.accountNumber, r.meterNumber, r.sealNumber, r.customerName, r.installerName, r.area, r.customerAddress].join(' ').toLowerCase();
        if (!searchFields.includes(q)) return false;
      }
      if (fromTs || toTs) {
        const ts = r.submittedDate ? new Date(r.submittedDate).getTime() : null;
        if (fromTs && ts !== null && ts < fromTs) return false;
        if (toTs && ts !== null && ts > toTs) return false;
      }
      return true;
    });
  }, [rows, query, status, dateFrom, dateTo]);

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = EXPORT_FIELDS.map(f => f.label);
      const csvRows = [headers.join(',')];
      for (const record of filtered) {
        const values = EXPORT_FIELDS.map(field => {
          let value = record[field.key] || '';
          if (field.key.includes('Date') && value && value !== '-') {
            try { value = new Date(value).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { /* keep original */ }
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-reports-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => { setQuery(''); setStatus(''); setDateFrom(''); setDateTo(''); };

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

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
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
          { label: 'Total Revenue', value: formatCurrencyNGN(stats.revenue) },
          { label: 'Avg. Transaction', value: formatCurrencyNGN(stats.avgTicket) },
          { label: 'Total Records', value: pagination.totalCount || rows.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-gray-700">
            <h4 className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</h4>
            <p className="text-xl sm:text-2xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
              <option value="pending">Pending</option>
              <option value="initiated">Initiated</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4">
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
              className="px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 sm:px-4 py-3 font-semibold">Account</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Meter No.</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Customer</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Area</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Installer</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Status</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Date</th>
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
                  <td className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300">{r.installerName}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrencyNGN(r.amount)}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {r.submittedDate ? new Date(r.submittedDate).toLocaleDateString() : '-'}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-100 dark:border-gray-700">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-100 dark:border-gray-700">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-100 dark:border-gray-700">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{r.customerName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Account: {r.accountNumber}</p>
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${STATUS_BADGE(r.status)}`}>
                  {r.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Meter No.</p>
                  <p className="text-gray-900 dark:text-white font-mono">{r.meterNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Area</p>
                  <p className="text-gray-900 dark:text-white">{r.area}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Installer</p>
                  <p className="text-gray-900 dark:text-white">{r.installerName}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{formatCurrencyNGN(r.amount)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <span>{r.submittedDate ? new Date(r.submittedDate).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminReports;