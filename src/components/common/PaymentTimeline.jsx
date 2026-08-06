// src/components/common/PaymentTimeline.jsx
// Chronological view of a customer request's payment lifecycle, built
// strictly from the timestamp fields the real API actually returns
// (dateRequested / datePaid / dateCompleted on JedCustomerRequest, per
// GET /external/jed/requests/{accountNumber} and
// GET /webhooks/verify-payment/{rrr}). Deliberately does NOT invent
// intermediate events like "Customer Viewed Payment" or "Webhook
// Received" — the backend has no event log to source those from, so
// fabricating them would show timestamps/state that never happened.
// Any event whose timestamp is missing from the response is simply
// omitted rather than rendered with a guessed date.
import { FileText, Wallet, Wrench } from 'lucide-react';
import { formatDateTime } from '../../utils/date';

const STEPS = [
  {
    key: 'dateRequested',
    label: 'RRR Generated',
    description: 'Payment reference was generated for this request.',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  },
  {
    key: 'datePaid',
    label: 'Payment Received',
    description: 'Customer completed payment via Remita.',
    icon: Wallet,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  },
  {
    key: 'dateCompleted',
    label: 'Installation Completed',
    description: 'Meter installation was completed and confirmed.',
    icon: Wrench,
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  },
];

/**
 * @param {Object} props
 * @param {string|Date|number} [props.dateRequested]
 * @param {string|Date|number} [props.datePaid]
 * @param {string|Date|number} [props.dateCompleted]
 */
function PaymentTimeline({ dateRequested, datePaid, dateCompleted }) {
  const values = { dateRequested, datePaid, dateCompleted };
  const events = STEPS.filter((step) => values[step.key]);

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No timeline data available yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((step, i) => {
        const Icon = step.icon;
        const isLast = i === events.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
            </div>
            <div className={isLast ? 'pb-0' : 'pb-5'}>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{step.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
              <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                {formatDateTime(values[step.key])}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PaymentTimeline;
