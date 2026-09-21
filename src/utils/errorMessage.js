// src/utils/errorMessage.js
// Turns whatever a jedApi call threw into a short, safe, user-facing string.
// jedApi encodes an error's class as a `TYPE:` prefix on the message
// (AUTH_ERROR:, VALIDATION_ERROR:, NETWORK_ERROR:, …). Components previously
// stripped that ad hoc (`message.split(':')[1]` truncated any message that
// itself contained a colon, and several showed the raw prefixed string).
//
// Never returns HTML, stack traces or very long server dumps — a message that
// looks like markup or is unreasonably long falls back to the generic text.
const TYPE_PREFIX_RE = /^(AUTH_ERROR|VALIDATION_ERROR|PERMISSION_ERROR|NOT_FOUND|SERVER_ERROR|NETWORK_ERROR|VERIFICATION_ERROR):\s*/;
const MAX_LENGTH = 300;

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const raw = String(err?.message ?? err ?? '').trim();
  if (!raw) return fallback;

  const match = raw.match(TYPE_PREFIX_RE);
  const type = match ? match[1] : null;
  const body = match ? raw.slice(match[0].length).trim() : raw;

  if (type === 'NETWORK_ERROR') {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  if (type === 'PERMISSION_ERROR') {
    return body || 'You do not have permission to do that.';
  }
  if (type === 'AUTH_ERROR') {
    return body || 'Your session has expired. Please sign in again.';
  }

  if (!body || body.length > MAX_LENGTH || /<\s*\/?\s*[a-z!][^>]*>/i.test(body)) {
    return fallback;
  }
  return body;
}

export default getErrorMessage;
