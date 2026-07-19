// Robust date parsing and formatting helpers used across the app.
// Handles strings, numbers (seconds or milliseconds), Date objects,
// Firestore-like timestamp objects ({ seconds, nanoseconds }), and
// objects exposing a `toDate()` method.
export function parseTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;

  // Date instance
  if (value instanceof Date) return value;

  // If object exposes toDate (e.g. Firestore Timestamp)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try { return value.toDate(); } catch { /* fall through */ }
  }

  // Firestore-like fields
  if (typeof value === 'object') {
    const sec = value.seconds ?? value._seconds ?? value.secondsValue;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? value.nanos ?? 0;
    if (typeof sec === 'number' || typeof sec === 'string') {
      const ms = Number(sec) * 1000 + Math.floor(Number(nanos || 0) / 1e6);
      return new Date(ms);
    }
  }

  // Numbers: seconds (10 digits) or milliseconds (13+ digits)
  if (typeof value === 'number') {
    // heuristic: if < 1e12 treat as seconds
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }

  // Strings: attempt Date.parse
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // ISO / numeric string
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed);

    // Try numeric string
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum)) return parseTimestamp(asNum);
  }

  return null;
}

export function formatDateTime(value, options = {}) {
  const d = parseTimestamp(value);
  if (!d) return '-';

  const opts = Object.assign({
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }, options);

  try {
    return d.toLocaleString(undefined, opts);
  } catch (e) {
    return d.toString();
  }
}

export function formatDateOnly(value, localeOptions = {}) {
  const d = parseTimestamp(value);
  if (!d) return '-';
  try {
    return d.toLocaleDateString(undefined, localeOptions);
  } catch (e) {
    return d.toDateString();
  }
}

export default { parseTimestamp, formatDateTime, formatDateOnly };
