import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import { JEDApiService } from '../services/api';
import { AlertCircle, FileText, Download } from 'lucide-react';
import { formatCurrencyNGN } from '../../utils/currency';

function AdminReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({ revenue: 0, avgTicket: 0, transactions: 0 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
    limit: 50
  });

  // Filters
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const api = new JEDApiService();

        // Use dashboard stats if available for revenue/performance
        try {
          const s = await api.getDashboardStats();
          const payload = s?.data || s || {};
          setStats(prev => ({
            revenue: payload.revenue ?? prev.revenue,
            avgTicket: payload.avgTicket ?? prev.avgTicket,
            transactions: payload.transactions ?? prev.transactions
          }));
        } catch (err) {
          // Non-fatal: continue to load rows
          console.debug('Reports: dashboard stats not available', err);
        }

        // Fetch report rows (use customer requests as a general transaction dataset)
        const resp = await api.getAllCustomerRequests({ page: pagination.currentPage, limit: pagination.limit });
        const data = resp?.data || resp || [];
        const paginationData = resp?.pagination || {
          currentPage: pagination.currentPage,
          totalPages: 1,
          totalCount: data.length,
          hasNext: false,
          hasPrev: pagination.currentPage > 1,
          limit: pagination.limit
        };

        // normalize rows to expected shape
        const normalized = (Array.isArray(data) ? data : []).map((r) => ({
          id: r.id || r.installationId || r.requestId || Math.random().toString(36).slice(2,9),
          accountNumber: r.accountNumber || r.account_no || r.account || '-',
          meterNumber: r.meterNo || r.meterNumber || r.meter_number || '-',
          installer: r.installer?.name || r.installerName || r.installer_name || '-',
          status: (r.status || r.state || 'unknown').toString(),
          amount: Number(r.amount || r.fee || r.paymentAmount || 0),
          date: r.submittedAt || r.dateRequested || r.createdAt || r.date || null,
          custNames: r.custNames || r.customerName || r.applicantName || '-',
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

    if (hasPermission(user?.role, PERMISSIONS.VIEW_REPORTS)) {
      load();
    }
  }, [user, pagination.currentPage, pagination.limit]);

  // Real-time filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).setHours(0,0,0,0) : null;
    const toTs = dateTo ? new Date(dateTo).setHours(23,59,59,999) : null;

    return rows.filter(r => {
      if (status && status !== r.status) return false;
      if (q) {
        const hay = `${r.accountNumber} ${r.meterNumber} ${r.installer}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fromTs || toTs) {
        const ts = r.date ? new Date(r.date).getTime() : null;
        if (fromTs && ts !== null && ts < fromTs) return false;
        if (toTs && ts !== null && ts > toTs) return false;
      }
      return true;
    });
  }, [rows, query, status, dateFrom, dateTo]);

  const exportCsv = () => {
    const cols = ['ID','Account','Meter','Installer','Status','Amount','Date'];
    const lines = [cols.join(',')];
    for (const r of filtered) {
      const vals = [
        `"${r.id}"`,
        `"${r.accountNumber}"`,
        `"${r.meterNumber}"`,
        `"${r.installer}"`,
        `"${r.status}"`,
        `${r.amount || 0}`,
        `"${r.date ? new Date(r.date).toISOString() : ''}"`
      ];
      lines.push(vals.join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-reports-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!hasPermission(user?.role, PERMISSIONS.VIEW_REPORTS)) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Reports</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive analytics and exportable data.</p>
        </div>
        <button
          onClick={exportCsv}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <h4 className="text-xs sm:text-sm text-gray-500 font-medium">Revenue</h4>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-gray-900 truncate">{formatCurrencyNGN(stats.revenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <h4 className="text-xs sm:text-sm text-gray-500 font-medium">Avg. Ticket</h4>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-gray-900 truncate">{formatCurrencyNGN(stats.avgTicket)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <h4 className="text-xs sm:text-sm text-gray-500 font-medium">Total Records</h4>
          <p className="text-xl sm:text-2xl font-bold mt-2 text-gray-900">{pagination.totalCount || stats.transactions || rows.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-3">
        <input
          type="text"
          placeholder="Search account, meter or installer..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="pending">pending</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>

          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-3 sm:space-y-0 sm:flex sm:flex-col sm:items-center sm:justify-between">
        <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
          Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> (<strong>{pagination.totalCount}</strong> total)
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={() => pagination.currentPage > 1 && setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
            disabled={!pagination.hasPrev}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <select
            value={pagination.currentPage}
            onChange={(e) => setPagination(p => ({ ...p, currentPage: parseInt(e.target.value) }))}
            className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
              <option key={p} value={p}>Pg {p}</option>
            ))}
          </select>
          <button
            onClick={() => pagination.currentPage < pagination.totalPages && setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
            disabled={!pagination.hasNext}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-gray-600 bg-gray-50 border-b">
              <th className="px-3 sm:px-4 py-3 font-semibold">ID</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Account</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Meter</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Installer</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Status</th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-3 sm:px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-red-600 font-medium">{error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-4 py-3 text-gray-700">{r.id}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700 font-medium">{r.accountNumber}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700">{r.meterNumber}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-700">{r.installer}</td>
                  <td className="px-3 sm:px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{r.status}</span></td>
                  <td className="px-3 sm:px-4 py-3 text-right font-semibold text-gray-900">{formatCurrencyNGN(r.amount)}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs sm:text-sm">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminReports;
