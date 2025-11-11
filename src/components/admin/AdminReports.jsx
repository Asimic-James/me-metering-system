import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import { JEDApiService } from '../services/api';
import { AlertCircle, FileText, Download } from 'lucide-react';

function formatCurrency(value) {
  if (typeof value !== 'number') return value ?? '-';
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function AdminReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({ revenue: 0, avgTicket: 0, transactions: 0 });
  const [rows, setRows] = useState([]);

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
        const resp = await api.getAllCustomerRequests({ page: 1, limit: 1000 });
        const data = resp?.data || resp || [];
        // normalize rows to expected shape
        const normalized = (Array.isArray(data) ? data : []).map((r) => ({
          id: r.id || r.installationId || r.requestId || Math.random().toString(36).slice(2,9),
          accountNumber: r.accountNumber || r.account_no || r.account || '-',
          meterNumber: r.meterNo || r.meterNumber || r.meter_number || '-',
          installer: r.installer?.name || r.installerName || r.installer_name || '-',
          status: (r.status || r.state || 'unknown').toString(),
          amount: Number(r.amount || r.fee || r.paymentAmount || 0),
          date: r.submittedAt || r.createdAt || r.date || null,
          raw: r
        }));

        setRows(normalized);

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
  }, [user]);

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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive analytics and exportable data.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm text-gray-500">Revenue</h4>
          <p className="text-2xl font-bold mt-2">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm text-gray-500">Avg. Ticket</h4>
          <p className="text-2xl font-bold mt-2">{formatCurrency(stats.avgTicket)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm text-gray-500">Transactions</h4>
          <p className="text-2xl font-bold mt-2">{stats.transactions || rows.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-3 items-center">
        <input
          type="text"
          placeholder="Search account, meter or installer..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />

        <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="">All Statuses</option>
          <option value="pending">pending</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">ID</th>
              <th className="py-2">Account</th>
              <th className="py-2">Meter</th>
              <th className="py-2">Installer</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="py-8 text-center text-red-600">{error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center">No records found</td></tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.id}</td>
                  <td className="py-2">{r.accountNumber}</td>
                  <td className="py-2">{r.meterNumber}</td>
                  <td className="py-2">{r.installer}</td>
                  <td className="py-2"><span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100">{r.status}</span></td>
                  <td className="py-2 text-right font-medium">{formatCurrency(r.amount)}</td>
                  <td className="py-2">{r.date ? new Date(r.date).toLocaleString() : '-'}</td>
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
