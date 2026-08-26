// src/utils/statusBadge.js
// Single source of truth for status → badge color mapping, used by
// AdminDashboard, InstallerDashboard, and InstallationDetail. Consolidated
// here after each of those three previously had their own copy of this
// logic, and each copy only matched lowercase status strings ('completed',
// 'pending') while the real API returns uppercase ('INITIATED', 'PAID',
// 'COMPLETED') — meaning every status silently fell through to the same
// fallback color. Comparisons here are case-insensitive so this can't
// happen again regardless of casing drift from the backend.

// Deliberately NOT blue — blue is this app's brand/primary-action colour
// (see tailwind.config.js), so a status badge never uses it, to avoid a
// status looking like an interactive/primary element. INITIATED uses a
// neutral slate instead (real status enum is INITIATED/PAID/COMPLETED —
// no PROCESSING value the backend actually returns, so it isn't a real
// status entry here; a bare `getStatusBadgeClass` call with any other
// string still falls back to the same neutral gray below).
export const STATUS_BADGE_STYLES = {
  INITIATED: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-yellow-100 text-yellow-800',        // payment confirmed, ready to install
  COMPLETED: 'bg-green-100 text-green-800',
  PAID_COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

/**
 * Uppercase + trim a status value for case-insensitive comparison.
 */
export const normalizeStatus = (status) => String(status || '').toUpperCase().trim();

/**
 * Tailwind classes for a status badge. Falls back to neutral gray for any
 * status not in the map above, rather than silently reusing a color that
 * implies success/failure.
 */
export const getStatusBadgeClass = (status) =>
  STATUS_BADGE_STYLES[normalizeStatus(status)] || 'bg-gray-100 text-gray-800';

/**
 * Whether a status represents a finished installation. Used to split
 * Awaiting Installation vs Completed tabs (InstallerDashboard) and to
 * decide whether to show the complete-installation form or a read-only
 * summary (InstallationDetail).
 */
export const isCompletedStatus = (status) =>
  ['COMPLETED', 'PAID_COMPLETED'].includes(normalizeStatus(status));

/**
 * Whether a status represents a paid request that's ready for an installer
 * to act on. Deliberately excludes INITIATED (not yet paid — nothing for
 * an installer to do) so the installer's "Awaiting Installation" tab only
 * ever shows real, actionable, paid customer accounts.
 */
export const isAwaitingInstallationStatus = (status) =>
  normalizeStatus(status) === 'PAID';