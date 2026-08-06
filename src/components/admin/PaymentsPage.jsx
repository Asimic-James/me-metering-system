// src/components/admin/PaymentsPage.jsx
// Consolidates 5 previously-dormant API methods that existed in api.js
// with zero UI callers: getPayments, checkRemitaStatusByRRR,
// checkRemitaStatusByOrderId, confirmPaymentManually, verifyPaymentByRRR,
// plus getCustomerRequestsByStatus (also dormant). Grouped into one page
// with tabs since they're all part of the same payment-reconciliation
// workflow, following the tab pattern already established in
// MeterSchedule.jsx and SettingsPage.jsx.
import { useState, useCallback } from 'react';
import jedApi from '../services/api';
import { getStatusBadgeClass } from '../../utils/statusBadge';
import { formatCurrencyNGN } from '../../utils/currency';
import ConfirmationModal from '../common/ConfirmationModal';
import ConfirmPaymentTab from './ConfirmPaymentTab';
import ReplayWebhookTab from './ReplayWebhookTab';
import PaymentTimeline from '../common/PaymentTimeline';
import GenerateRRRModal from '../common/GenerateRRRModal';
import RequestInfoPanel from '../installation/RequestInfoPanel';
import { buildRrrPayload } from '../../utils/rrrPayload';
import {
  CreditCard, Search, RefreshCw, CheckCircle, AlertCircle, ShieldCheck,
  Loader2, Calendar, Filter, ArrowRight, ExternalLink, Info, Receipt
} from 'lucide-react';
import { formatDateTime, parseTimestamp } from '../../utils/date';

// Order matters here: "Generate RRR" is the first step in the payment
// lifecycle (before a customer can pay at all), so it leads. "Confirm
// Payment" is the routine, everyday action after that (an admin
// confirming a customer's payment), placed ahead of "RRR / Order Lookup"
// which is more of a diagnostic/fallback tool (checking Remita directly,
// or manually confirming a payment whose webhook was missed).
const TABS = [
  { id: 'payments', label: 'Payments' },
  { id: 'generateRRR', label: 'Generate RRR' },
  { id: 'confirm', label: 'Confirm Payment' },
  { id: 'lookup', label: 'RRR / Order Lookup' },
  { id: 'byStatus', label: 'Requests by Status' },
  { id: 'webhook', label: 'Webhook Replay' },
];

const DATE_PRESETS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

const STATUS_OPTIONS = ['INITIATED', 'PAID', 'COMPLETED', 'FAILED', 'CANCELLED'];

const unwrapPaymentsPayload = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.payments)) return response.payments;
  if (Array.isArray(response?.transactions)) return response.transactions;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.payments)) return response.data.payments;
  if (Array.isArray(response?.data?.transactions)) return response.data.transactions;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

// Same defensive field-name handling pattern used throughout this
// project's admin views — the real payment/request object shape is
// unconfirmed, so these check the most plausible variants rather than
// assuming one.
const getAmount = (p) => p?.amount ?? p?.amountPaid ?? p?.amount_paid ?? p?.totalAmount ?? p?.total_amount ?? 0;
const getRRR = (p) => p?.rrr || p?.RRR || p?.paymentReference || p?.reference || p?.payment_reference || null;
const getAccount = (p) => p?.accountNumber || p?.account_number || p?.account || p?.customerAccount || 'N/A';
const getPaymentStatus = (p) => p?.status || p?.paymentStatus || p?.transactionStatus || p?.state || 'UNKNOWN';
const getPaymentDate = (p) => {
  const candidates = [
    p?.transactionDate,
    p?.transactiondate,
    p?.transactionDateTime,
    p?.paymentDate,
    p?.payment_date,
    p?.paymentDateTime,
    p?.paidAt,
    p?.paid_at,
    p?.createdAt,
    p?.created_at,
    p?.date,
    p?.dateCreated,
    p?.updatedAt,
    p?.timestamp,
    p?.timeStamp,
    p?.datetime,
    p?.dateTime,
    p?.payment?.transactionDate,
    p?.payment?.createdAt,
    p?.payment?.date,
    p?.data?.transactionDate,
    p?.data?.createdAt,
    p?.data?.date,
    p?.transaction?.date,
    p?.transaction?.timestamp,
    p?.transaction?.createdAt,
  ];

  return candidates.find((value) => value !== null && value !== undefined && value !== '') || null;
};

// use robust formatter from utils/date

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

// The real backend only ever returns INITIATED/PAID/COMPLETED for a
// request's status (confirmed against the JedCustomerRequest schema) —
// there is no FAILED/EXPIRED/CANCELLED state today. This maps those
// three real values to the friendlier verification language, and falls
// back to "Unknown" for anything else rather than guessing a bucket for
// a status the backend doesn't currently emit.
const VERIFY_STATUS_LABELS = { INITIATED: 'Pending', PAID: 'Successful', COMPLETED: 'Successful' };
const verifyStatusLabel = (status) => VERIFY_STATUS_LABELS[String(status || '').toUpperCase()] || 'Unknown';

function VerificationStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(status)}`}>
      {verifyStatusLabel(status)}
    </span>
  );
}

function VerifyField({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${mono ? 'font-mono' : ''}`}>
        {value || value === 0 ? value : '-'}
      </p>
    </div>
  );
}

// ---- Tab: Payments ----
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState('30');
  const [hasFetched, setHasFetched] = useState(false);

  const fetchPayments = useCallback(async (days = preset) => {
    setLoading(true);
    setError(null);
    try {
      const response = await jedApi.getPayments({ days: Number(days) });
      const list = unwrapPaymentsPayload(response);
      setPayments(list);
      setHasFetched(true);
    } catch (err) {
      console.error('[Payments] Failed to fetch:', err);
      setError(String(err?.message || 'Failed to load payments'));
    } finally {
      setLoading(false);
    }
  }, [preset]);

  const handlePresetChange = (id) => {
    setPreset(id);
    fetchPayments(id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchPayments()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {hasFetched ? 'Refresh' : 'Load Payments'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-2 text-sm text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!hasFetched && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-10 text-center text-gray-500 dark:text-gray-400 text-sm">
          Choose a date range above to load payments
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && hasFetched && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {payments.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No payments in this range</div>
            ) : (
              payments.map((p, i) => {
                const paymentDate = getPaymentDate(p);
                return (
                  <div key={getRRR(p) || i} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{getAccount(p)}</p>
                      <StatusBadge status={getPaymentStatus(p)} />
                    </div>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{getRRR(p) || 'No RRR'}</p>
                    <div className="flex justify-between items-center mt-2 gap-2">
                      <span
                        className="text-xs text-gray-500 dark:text-gray-400"
                        title={parseTimestamp(paymentDate)?.toISOString() ?? ''}
                      >
                        {formatDateTime(paymentDate)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrencyNGN(getAmount(p))}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-4 py-3">RRR</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date/Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No payments in this range</td></tr>
                ) : (
                  payments.map((p, i) => {
                    const paymentDate = getPaymentDate(p);
                    return (
                      <tr key={getRRR(p) || i} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{getRRR(p) || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{getAccount(p)}</td>
                        <td className="px-4 py-3"><StatusBadge status={getPaymentStatus(p)} /></td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{formatCurrencyNGN(getAmount(p))}</td>
                        <td
                          className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                          title={parseTimestamp(paymentDate)?.toISOString() ?? ''}
                        >
                          {formatDateTime(paymentDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Tab: Generate RRR ----
// Looks a request up by account number (GET /external/jed/requests/{accountNumber},
// the same endpoint InstallationDetail.jsx uses), then reuses the shared
// GenerateRRRModal/buildRrrPayload — the identical Preview -> Confirm ->
// Success flow available from an installation's detail page, just
// reachable directly from the Payments hub without navigating to a
// specific job first.
function GenerateRRRTab() {
  const [accountNumber, setAccountNumber] = useState('');
  const [job, setJob] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [genResult, setGenResult] = useState(null);
  const [genGeneratedAt, setGenGeneratedAt] = useState(null);

  const rrrPayload = buildRrrPayload(job);

  const handleLookup = async () => {
    if (!accountNumber.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setJob(null);
    try {
      const response = await jedApi.getCustomerRequest(accountNumber.trim());
      setJob(response?.data || response);
    } catch (err) {
      console.error('[GenerateRRR] Lookup failed:', err);
      setLookupError(String(err?.message || 'No request found for this account number'));
    } finally {
      setLookupLoading(false);
    }
  };

  const openGenerateModal = () => {
    setGenError(null);
    setGenResult(null);
    setGenModalOpen(true);
  };

  const handleGenerateReference = async () => {
    if (!rrrPayload) return;
    setGenLoading(true);
    setGenError(null);

    try {
      const response = await jedApi.generatePaymentReference(rrrPayload);
      const data = response?.data || response;
      setGenResult(data);
      setGenGeneratedAt(new Date());

      const rrr = data?.RRR || data?.rrr || data?.reference || data?.paymentReference || null;
      if (rrr) {
        setJob((prev) => (prev ? { ...prev, rrr, paymentReference: rrr } : prev));
      }
    } catch (err) {
      console.error('[GenerateRRR] generate payment reference failed:', err);
      setGenError(err.message || 'Failed to generate payment reference');
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate RRR</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Look up a customer request by account number, then generate a Remita payment reference (RRR) for it.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => { setAccountNumber(e.target.value); setLookupError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="e.g., 477014"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !accountNumber.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium shrink-0"
          >
            {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Look Up</span>
          </button>
        </div>

        {lookupError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {lookupError}
          </div>
        )}
      </div>

      {job && (
        <>
          <RequestInfoPanel data={job} title="Request Found" compact />

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
              <p className="font-mono text-sm text-gray-900 dark:text-white">
                {job.rrr || job.paymentReference || job.paymentRef || 'No reference generated'}
              </p>
            </div>
            <button
              type="button"
              onClick={openGenerateModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <Receipt className="w-4 h-4" />
              {job.rrr || job.paymentReference ? 'Regenerate Reference' : 'Generate Reference'}
            </button>
          </div>
        </>
      )}

      <GenerateRRRModal
        isOpen={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        payload={rrrPayload}
        loading={genLoading}
        error={genError}
        result={genResult}
        generatedAt={genGeneratedAt}
        onConfirm={handleGenerateReference}
      />
    </div>
  );
}

// ---- Tab: RRR / Order Lookup + Verify + Manual Confirm (fallback tool) ----
function LookupTab() {
  const [mode, setMode] = useState('rrr'); // 'rrr' | 'orderId'
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);

  const handleCheckStatus = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = mode === 'rrr'
        ? await jedApi.checkRemitaStatusByRRR(query.trim())
        : await jedApi.checkRemitaStatusByOrderId(query.trim());
      setResult(response?.data || response);
    } catch (err) {
      console.error('[Lookup] Status check failed:', err);
      setError(String(err?.message || 'Status check failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!query.trim() || mode !== 'rrr') return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const response = await jedApi.verifyPaymentByRRR(query.trim());
      setVerifyResult(response?.data || response);
    } catch (err) {
      console.error('[Lookup] Verify failed:', err);
      setVerifyError(String(err?.message || 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  };

  const handleManualConfirm = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const response = await jedApi.confirmPaymentManually(query.trim());
      setConfirmResult(response?.data || response);
      setConfirmOpen(false);
    } catch (err) {
      console.error('[Lookup] Manual confirm failed:', err);
      setConfirmError(String(err?.message || 'Manual confirmation failed'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 text-sm text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          This tab is for diagnostics and the missed-webhook fallback. For a normal payment
          confirmation, use the <strong>Confirm Payment</strong> tab instead — "Manually Confirm
          Payment" below should only be used when the standard flow won't work because Remita's
          webhook never fired.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('rrr'); setResult(null); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'rrr' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            By RRR
          </button>
          <button
            onClick={() => { setMode('orderId'); setResult(null); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'orderId' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            By Order ID
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'rrr' ? 'e.g., 120799142825' : 'e.g., 1728648000000'}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
          <button
            onClick={handleCheckStatus}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm font-medium shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Check Status</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Remita Status</p>
            <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-48">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {mode === 'rrr' && query.trim() && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 disabled:opacity-50 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify via Webhook Endpoint
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={confirming}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Manually Confirm Payment
              </button>
            </div>

            {verifyError && <p className="text-sm text-red-600 dark:text-red-400">{verifyError}</p>}
            {verifyResult && (
              <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Payment Verification</p>
                  <div className="flex items-center gap-2">
                    <VerificationStatusBadge status={verifyResult.status} />
                    <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">({verifyResult.status || 'no status returned'})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <VerifyField label="RRR" value={verifyResult.rrr} mono />
                  <VerifyField label="Account Number" value={verifyResult.accountNumber} mono />
                  <VerifyField label="Customer" value={verifyResult.custNames} />
                  <VerifyField label="Amount" value={formatCurrencyNGN(verifyResult.amount)} />
                  <VerifyField label="Order Ref" value={verifyResult.orderRef} mono />
                </div>

                {(verifyResult.dateRequested || verifyResult.datePaid) && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <PaymentTimeline dateRequested={verifyResult.dateRequested} datePaid={verifyResult.datePaid} />
                  </div>
                )}
              </div>
            )}

            {confirmError && <p className="text-sm text-red-600 dark:text-red-400">{confirmError}</p>}
            {confirmResult && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Payment manually confirmed successfully
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleManualConfirm}
        loading={confirming}
        title="Manually Confirm Payment"
        message={`This is the admin fallback for a missed Remita webhook. Manually confirm payment for RRR "${query.trim()}"? This will mark it as paid and hand off installation details to JEED as if the webhook had fired normally.`}
      />
    </div>
  );
}

// ---- Tab: Requests by Status ----
function ByStatusTab() {
  const [status, setStatus] = useState('PAID');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchByStatus = useCallback(async (s = status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await jedApi.getCustomerRequestsByStatus(s);
      const list = Array.isArray(response) ? response : (response?.data || []);
      setRequests(list);
      setHasFetched(true);
    } catch (err) {
      console.error('[ByStatus] Failed to fetch:', err);
      setError(String(err?.message || 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  const handleStatusChange = (s) => {
    setStatus(s);
    fetchByStatus(s);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 shrink-0">
          <Filter className="w-4 h-4" />
          Status
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => fetchByStatus()}
          disabled={loading}
          className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {hasFetched ? 'Refresh' : 'Load'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {!loading && hasFetched && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {requests.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No requests with status "{status}"</div>
            ) : (
              requests.map((r, i) => (
                <div key={r.accountNumber || i} className="p-4">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.accountNumber}</p>
                    <StatusBadge status={r.status || status} />
                  </div>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                    Meter: {r.meterNo || r.meterNumber || 'N/A'}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Meter No.</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {requests.length === 0 ? (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No requests with status "{status}"</td></tr>
                ) : (
                  requests.map((r, i) => (
                    <tr key={r.accountNumber || i} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{r.accountNumber}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{r.meterNo || r.meterNumber || 'N/A'}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status || status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('payments');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
          <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Payment reconciliation, Remita status lookups, and manual confirmation
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'generateRRR' && <GenerateRRRTab />}
      {activeTab === 'confirm' && <ConfirmPaymentTab />}
      {activeTab === 'lookup' && <LookupTab />}
      {activeTab === 'byStatus' && <ByStatusTab />}
      {activeTab === 'webhook' && <ReplayWebhookTab />}
    </div>
  );
}

export default PaymentsPage;