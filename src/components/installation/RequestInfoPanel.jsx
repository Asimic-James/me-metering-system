// src/components/installation/RequestInfoPanel.jsx
// Shared, presentation-only panel for displaying a customer request's
// details. Extracted out of InstallationDetail.jsx so it can be reused
// inline inside InstallationForm.jsx (lookup-by-account-number) without
// duplicating markup, and so both surfaces always render identically.
import {
  User,
  Hash,
  Zap,
  ShieldCheck,
  CheckCircle,
  MapPin,
  Phone,
} from 'lucide-react';
import { formatDateTime } from '../../utils/date';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{value}</p>
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object|null} props.data - request/customer object (fields are
 *   best-effort guesses against unconfirmed API response shape: custNames,
 *   applicantName, phone, phoneNumber, address, accountNumber, meterNo,
 *   meterNumber, sealNo, paymentReference, paymentRef, submittedAt)
 * @param {string} [props.title] - optional section heading
 * @param {boolean} [props.compact] - tighter padding when embedded inline
 *   inside another card (e.g. InstallationForm's lookup panel) instead of
 *   as its own full-width page section
 */
function RequestInfoPanel({ data, title = 'Request Details', compact = false }) {
  if (!data) return null;

  return (
    <div
      className={
        compact
          ? 'bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6'
      }
    >
      {title && (
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          {title}
        </h2>
      )}
      <InfoRow icon={User} label="Customer" value={data.custNames || data.applicantName} />
      <InfoRow icon={Phone} label="Phone" value={data.phone || data.phoneNumber} />
      <InfoRow icon={MapPin} label="Address" value={data.address} />
      <InfoRow icon={Hash} label="Account Number" value={data.accountNumber} />
      <InfoRow icon={Zap} label="Meter Number" value={data.meterNo || data.meterNumber} />
      <InfoRow icon={ShieldCheck} label="Seal Number" value={data.sealNo} />
      <InfoRow icon={Phone} label="Email" value={data.email || data.emailAddress} />
      <InfoRow
        icon={CheckCircle}
        label="Payment Reference / RRR"
        value={data.rrr || data.paymentReference || data.paymentRef || data.remitaRef}
      />
      <InfoRow
        icon={User}
        label="Submitted"
        value={formatDateTime(data.submittedAt)}
      />
    </div>
  );
}

export default RequestInfoPanel;