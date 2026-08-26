// src/utils/csv.js
// Single source of truth for building a CSV file client-side, used by
// every CSV export in the app (AdminReports.jsx, BulkConfirmPaymentsTab.jsx,
// ExcelUpload.jsx) — previously each had its own near-identical, independently
// hand-rolled version, none of which fully escaped their cells.
//
// SECURITY: guards against CSV/formula injection (CWE-1236, OWASP "CSV
// Injection"). Several of these exports include values this app doesn't
// control the origin of — an uploaded file's account number/meter number
// (BulkConfirmPaymentsTab.jsx, ExcelUpload.jsx) or a customer-submitted
// name/address (AdminReports.jsx). If such a value starts with `=`, `+`,
// `-`, or `@`, Excel/Google Sheets/LibreOffice will evaluate it as a
// formula when the exported file is opened — regardless of whether the
// CSV cell was quoted, since CSV quoting only protects against
// delimiter/quote-character corruption, not formula evaluation. A leading
// apostrophe (Excel's own "force text" convention) neutralizes this while
// keeping the value's visible content unchanged. This does not, and
// cannot, guard against anything server-side — it only protects whoever
// opens a CSV this frontend generates.
const FORMULA_TRIGGER_CHARS = /^[=+\-@\t\r]/;

/**
 * Escape a single value for one CSV cell: coerces to string, neutralizes
 * a leading formula-trigger character, escapes embedded double quotes,
 * and wraps in quotes (so embedded commas/newlines can't corrupt the
 * column structure — the second, non-security bug the ad hoc versions
 * of this also had for unquoted fields).
 */
export function sanitizeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  const guarded = FORMULA_TRIGGER_CHARS.test(str) ? `'${str}` : str;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Build a full CSV string from a header row and an array of row arrays.
 * @param {string[]} headers
 * @param {Array<Array<string|number>>} rows
 * @returns {string}
 */
export function buildCsv(headers, rows) {
  const lines = [headers.map(sanitizeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(sanitizeCsvCell).join(','));
  }
  return lines.join('\r\n');
}

/**
 * Build a CSV Blob ready for a download link (`text/csv;charset=utf-8;`).
 */
export function buildCsvBlob(headers, rows) {
  return new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Trigger a browser download of a CSV built from headers/rows — the
 * `Blob → object URL → temporary <a> → click → revoke` dance every one of
 * these export functions repeated by hand.
 */
export function downloadCsv(filename, headers, rows) {
  const blob = buildCsvBlob(headers, rows);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
