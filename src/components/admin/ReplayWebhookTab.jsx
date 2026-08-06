// src/components/admin/ReplayWebhookTab.jsx
// Manually submit/replay a Remita payment notification through the exact
// endpoint Remita's own webhook uses (POST /webhooks/remita/payment).
// Two purposes: (1) admin recovery when the automatic webhook never
// fired, (2) a possible fix path for confirm-payment failures — this
// full payload carries transaction detail (amount, dates, payer info)
// that the minimal accountNumber-only /confirm-payment call doesn't.
import { useState } from 'react';
import jedApi from '../services/api';
import { getStatusBadgeClass } from '../../utils/statusBadge';
import {
  Send, Copy, CheckCircle, XCircle, AlertCircle, Info, Loader2, Webhook
} from 'lucide-react';

const INITIAL_FORM = {
  rrr: '',
  channel: 'CARDPAYMENT',
  billerName: '',
  amount: '',
  transactiondate: '',
  debitdate: '',
  bank: '',
  serviceTypeId: '',
  orderRef: '',
  orderId: '',
  payerName: '',
  payerPhoneNumber: '',
  payerEmail: '',
  type: 'PY',
  chargeFee: '',
  paymentDescription: 'Payment for Meter',
};

// Documented example format is "YYYY-MM-DD HH:mm:ss", not ISO — left as
// free text rather than auto-formatted, so the admin has exact control
// over what's sent instead of risking a formatting mismatch.
const DATE_PLACEHOLDER = '2024-10-11 00:00:00';

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

function ResultRow({ result }) {
  return (
    <div className={`rounded-lg border p-3 ${
      result.success
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span className="text-sm font-mono text-gray-900 dark:text-white">{result.rrr}</span>
        </div>
        {result.status && <StatusBadge status={result.status} />}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{result.message}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
        {result.accountNumber && <span>Account: <span className="font-mono">{result.accountNumber}</span></span>}
        <span>JED Confirmed: <strong className={result.jedConfirmed ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
          {result.jedConfirmed ? 'Yes' : 'No'}
        </strong></span>
      </div>
    </div>
  );
}

function ReplayWebhookTab() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = jedApi.utils.buildUrl(jedApi.endpoints.WEBHOOKS.REMITA_PAYMENT, 'WEBHOOKS');

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[ReplayWebhook] Clipboard copy failed:', err);
    }
  };

  const handleSubmit = async () => {
    if (!form.rrr.trim() || !form.amount) {
      setSubmitError('RRR and Amount are required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    // Build the notification object exactly matching the documented
    // schema. Empty optional fields are omitted rather than sent as
    // empty strings, in case the backend validates field presence.
    const notification = {
      rrr: form.rrr.trim(),
      amount: Number(form.amount),
      type: form.type.trim() || 'PY',
    };
    if (form.channel.trim()) notification.channel = form.channel.trim();
    if (form.billerName.trim()) notification.billerName = form.billerName.trim();
    if (form.transactiondate.trim()) notification.transactiondate = form.transactiondate.trim();
    if (form.debitdate.trim()) notification.debitdate = form.debitdate.trim();
    if (form.bank.trim()) notification.bank = form.bank.trim();
    if (form.serviceTypeId.trim()) notification.serviceTypeId = form.serviceTypeId.trim();
    if (form.orderRef.trim()) notification.orderRef = form.orderRef.trim();
    if (form.orderId.trim()) notification.orderId = form.orderId.trim();
    if (form.payerName.trim()) notification.payerName = form.payerName.trim();
    if (form.payerPhoneNumber.trim()) notification.payerPhoneNumber = form.payerPhoneNumber.trim();
    if (form.payerEmail.trim()) notification.payerEmail = form.payerEmail.trim();
    if (form.chargeFee) notification.chargeFee = Number(form.chargeFee);
    if (form.paymentDescription.trim()) notification.paymentDescription = form.paymentDescription.trim();

    try {
      const response = await jedApi.submitRemitaWebhook(notification);
      setSubmitResult(response);
    } catch (err) {
      console.error('[ReplayWebhook] Submission failed:', err);
      setSubmitError(String(err?.message || 'Failed to submit webhook notification'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setForm(INITIAL_FORM);
    setSubmitResult(null);
    setSubmitError(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 text-sm text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p>
            Use this when Remita's automatic webhook never fired for a transaction, or as an
            alternate path if <strong>Confirm Payment</strong> fails — this sends the full
            transaction payload rather than just an account number.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            Webhook URL (configure in Remita merchant dashboard)
          </p>
          <p className="text-xs sm:text-sm font-mono text-gray-900 dark:text-white truncate">{webhookUrl}</p>
        </div>
        <button
          onClick={handleCopyUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 shrink-0"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Replay Payment Notification</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">RRR *</label>
            <input
              type="text"
              value={form.rrr}
              onChange={(e) => updateField('rrr', e.target.value)}
              placeholder="110002071256"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₦) *</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              placeholder="10000"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Channel</label>
            <input
              type="text"
              value={form.channel}
              onChange={(e) => updateField('channel', e.target.value)}
              placeholder="CARDPAYMENT"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              placeholder="PY"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Biller Name</label>
            <input
              type="text"
              value={form.billerName}
              onChange={(e) => updateField('billerName', e.target.value)}
              placeholder="SYSTEMSPECS"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bank Code</label>
            <input
              type="text"
              value={form.bank}
              onChange={(e) => updateField('bank', e.target.value)}
              placeholder="232"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Transaction Date</label>
            <input
              type="text"
              value={form.transactiondate}
              onChange={(e) => updateField('transactiondate', e.target.value)}
              placeholder={DATE_PLACEHOLDER}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Debit Date</label>
            <input
              type="text"
              value={form.debitdate}
              onChange={(e) => updateField('debitdate', e.target.value)}
              placeholder="2024-10-11 11:17:03"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order Ref</label>
            <input
              type="text"
              value={form.orderRef}
              onChange={(e) => updateField('orderRef', e.target.value)}
              placeholder="1728648000000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order ID</label>
            <input
              type="text"
              value={form.orderId}
              onChange={(e) => updateField('orderId', e.target.value)}
              placeholder="1728648000000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Service Type ID</label>
            <input
              type="text"
              value={form.serviceTypeId}
              onChange={(e) => updateField('serviceTypeId', e.target.value)}
              placeholder="4430731"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Charge Fee (₦)</label>
            <input
              type="number"
              value={form.chargeFee}
              onChange={(e) => updateField('chargeFee', e.target.value)}
              placeholder="150"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payer Name</label>
            <input
              type="text"
              value={form.payerName}
              onChange={(e) => updateField('payerName', e.target.value)}
              placeholder="ABUTU AUGUSTINE"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payer Phone</label>
            <input
              type="text"
              value={form.payerPhoneNumber}
              onChange={(e) => updateField('payerPhoneNumber', e.target.value)}
              placeholder="08036233685"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payer Email</label>
            <input
              type="email"
              value={form.payerEmail}
              onChange={(e) => updateField('payerEmail', e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Description</label>
            <input
              type="text"
              value={form.paymentDescription}
              onChange={(e) => updateField('paymentDescription', e.target.value)}
              placeholder="Payment for Meter"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {submitError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.rrr.trim() || !form.amount}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Notification'}
          </button>
          <button
            onClick={handleClear}
            disabled={submitting}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 disabled:opacity-50"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Parsed response — the real documented shape, not a guess:
          { success, message, totalNotifications, processed, failed, results[] } */}
      {submitResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            {submitResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <p className="text-sm font-medium text-gray-900 dark:text-white">{submitResult.message}</p>
          </div>

          {typeof submitResult.totalNotifications === 'number' && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{submitResult.totalNotifications}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{submitResult.processed}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Processed</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-lg font-bold text-red-700 dark:text-red-400">{submitResult.failed}</p>
                <p className="text-xs text-red-600 dark:text-red-500">Failed</p>
              </div>
            </div>
          )}

          {Array.isArray(submitResult.results) && submitResult.results.length > 0 && (
            <div className="space-y-2">
              {submitResult.results.map((r, i) => (
                <ResultRow key={r.rrr || i} result={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReplayWebhookTab;