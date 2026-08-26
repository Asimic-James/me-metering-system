# Security.md

A security-focused review of jedc-meter-management as it actually exists, grounded in the current codebase (not a generic checklist). OWASP categories are used as a lens where they apply; every finding below was verified by reading the relevant code or by running non-destructive, read-only checks (`npm audit`, grep searches, live-login checks against the app's own test credentials). No exploitation, fuzzing, or destructive testing was performed against the live backend.

## Authentication

- **Login:** `POST /auth/login`, body `{ phone, password }` over HTTPS (the real API is served at `https://pharez-api.onrender.com`). No client-side password policy is enforced (no minimum length/complexity check before submit) — whatever the backend accepts is the only gate. This is a deliberate, documented product choice (per `PROJECT_CONTEXT.md`/`API_GAP_REPORT.md` history), not an oversight, but is worth knowing if a stronger policy is ever wanted — it would need to be added both here and matched server-side.
- **Session/token handling:** JWT stored in `localStorage` (`jedAuthToken`), not an `HttpOnly` cookie — standard for a JWT-bearer-token SPA architecture (the alternative, cookie-based sessions, isn't how this backend's auth is designed, so this isn't a "should have used cookies instead" finding, just the inherent tradeoff of the chosen auth scheme; see "Sensitive Data" below for its implication).
- **Logout:** purely local (clears `jedAuthToken`/`jedUser`/the idle-session deadline) — there is no server-side session/token invalidation endpoint (`/auth/logout` doesn't exist on the real API), so a token logged-out client-side remains valid server-side until its own expiry. This is a backend-architecture constraint, not something the frontend can fix.
- **Session expiry:** no client-side JWT expiry check/proactive-refresh — a call simply fails with 401 once the token lapses, which correctly triggers a forced re-login (`clearTokens()` runs automatically on any 401).
- **Idle timeout:** a real, working 3-minute inactivity timeout for Admin/Super Admin sessions (`src/hooks/useAdminIdleTimeout.js`) — persisted deadline in `localStorage`, survives a refresh, correctly cleared on manual logout or expiry. Verified end-to-end this session (mouse/keyboard/scroll/touch all extend it; a forced-past deadline correctly triggers logout + redirect + clears all persisted auth state). **This is a client-side control and does not, and should not, substitute for the backend's own JWT expiry** — it reduces the window an unattended, logged-in admin browser tab is exploitable, nothing more.
- **Protected routes:** every admin/installer-restricted route in `App.jsx` is gated; a role mismatch renders `AccessDenied` in place. Verified against all 10 routes.

## Authorization

- **Admin functionality:** gated behind `permissions.isAdmin` at the route level (`/installations`, `/users`, `/reports`, `/payments`, `/settings`) — verified each route individually.
- **Super Admin functionality:** the one privileged-user-management action (creating/editing `ADMIN`/`SUPERADMIN` accounts) is gated behind `permissions.isSuperAdmin` in `UserManagement.jsx`, both in which roles are *selectable* in the form and again in the submit handlers (defense in depth at the UI layer) — and per the real API's own documented `UserCreate` rule ("SUPERADMIN only" for privileged roles), the backend enforces the same restriction independently. This is the correct posture: **the UI restriction is a convenience, not the actual security boundary** — verified that the boundary genuinely exists server-side too, not just assumed.
- **Installer restriction:** Installer cannot reach any admin-tier route (verified via the same route-gate check) and is explicitly exempted from the idle-timeout hook (by design — see `PROJECT_CONTEXT.md`).
- **General posture:** every gated route/button/nav-item goes through the same `usePermissions()` hook — no instance was found of a role check re-derived ad hoc from `user.role` string comparison outside that hook, which would be a common place for a gating rule to silently drift.

## API Security

- **Authorization headers:** Bearer JWT attached automatically for session-authenticated calls; a real `X-API-Key` (never the JWT) for the two endpoints that require it. No case was found of a JWT being sent where an API key was required or vice versa.
- **Sensitive information in requests/responses:** see the fix below — this session's audit found and corrected a real issue here.
- **Error responses:** the API layer's error handling (`handleErrorResponse`) surfaces the backend's own message/field-level validation errors to the UI. No case was found of a raw stack trace or internal server detail being displayed to the user (the backend's error payloads are themselves the only source, and they're treated as user-facing text, not logged verbatim to a UI surface beyond what the backend chose to send).
- **Token exposure:** the JWT and the "active API key" (a real, privileged backend credential used for RRR generation and Remita status lookups) are both stored in plaintext in `localStorage`. This is the standard tradeoff of a JWT-bearer SPA with no backend-for-frontend layer — see "Sensitive Data" below.
- **Client-side secrets:** none found. A repo-wide search for hardcoded API keys/tokens/credentials (common prefixes like `sk_`, `AKIA`, PEM headers, inline `apiKey: "..."` literals) returned no matches. The one API-key-shaped value anywhere in this app's reach is captured from the backend's own one-time-reveal response at key-creation time, not embedded in source.
- **Environment variables:** `VITE_API_BASE_URL` is the only env var read by the app, and it's a public API base URL, not a secret — appropriate for a `VITE_`-prefixed (client-bundle-visible) variable. No secret-looking value was found configured via an env var that would then be baked into the public JS bundle (Vite inlines all `VITE_*` vars at build time, so nothing should ever go through this mechanism that isn't meant to be public).

### Fixed during this review: password logged to the browser console

**Finding (HIGH, now fixed):** `JEDApiService.makeRequest()`'s generic request logging printed the *raw* JSON-stringified request body to the browser console on every call, unconditionally, in every environment (a `FEATURES.LOG_REQUESTS` dev-only flag existed in `api.config.js` but was never actually checked by any of these `console.log` calls). Because `login()`'s request body is exactly `{ phone, password }`, **every login attempt printed the user's plaintext password to devtools**, in production as well as development. The same code path would also have logged `changePassword`/`resetPassword`/`createUser` payloads (which include password fields per the real `UserCreate`/`ChangePassword` schemas) and any successful response body (e.g. a newly-created API key's one-time plaintext secret, via a separate `console.log('[API] Success Response:', data)`).

- **Location:** `src/components/services/api.js`, `makeRequest()` and `handleResponse()`.
- **Risk:** password/secret material persists in the browser's devtools console history for that session, could be inadvertently captured in a screen share, a browser extension with console access, or a session-replay/monitoring tool; on a shared or kiosk-style machine, console history can outlive the user's own session.
- **Attack scenario:** a shared support/demo machine, a browser extension that reads `console.log` output, or a screen-recording tool capturing devtools during a support call would all have captured a real user's password in plaintext.
- **Remediation applied:** added `redactSensitiveFields()`, which recursively replaces `password`/`oldPassword`/`newPassword`/`currentPassword`/`confirmPassword`/`token`/`apiKey`/`secret` (case-insensitive key match) with `'[REDACTED]'` before anything is logged, and gated all of the verbose request/response console output behind the pre-existing (previously unused) `FEATURES.LOG_REQUESTS` flag (`import.meta.env.DEV` — so none of it fires in a production build at all, redacted or not). Verified with `npm run build` afterward — no regressions.
- **Current mitigation:** fully addressed as of this pass. No further action needed unless a future endpoint's request/response shape reintroduces a sensitive field name not covered by `SENSITIVE_BODY_KEYS` — that set should be extended if so.

## Input Validation

- **Forms:** account numbers (`/^\d+$/`), meter numbers (`/^\d{13}$/`), and required-field checks (seal number, etc.) are validated client-side before submission (`InstallationDetail.jsx`). Real-world enforcement still depends on the backend re-validating the same rules (confirmed it does, per the documented `ValidationError` response shape the app already handles) — client-side validation here is a UX convenience, correctly not the only gate.
- **Uploads:** `ExcelUpload.jsx` and `BulkConfirmPaymentsTab.jsx` restrict the file picker to `.xlsx`/`.xls`/`.csv` via the `accept` attribute only — this is a browser *hint*, not enforcement; a user (or a modified request) can submit any file type, and the real validation happens server-side (the backend rejects non-Excel content). **No client-side file size limit exists anywhere in the upload flow** — a user can select an arbitrarily large file before any rejection happens. Given this is an internal staff tool (not public-facing), the practical severity is low, but it's a cheap, worthwhile fix (add a client-side size check matching whatever cap the backend enforces, to fail fast with a clear message instead of a slow, doomed upload).
- **Numeric fields:** amount/currency fields are always formatted, never accepted as free-form user input for a mutating call (payments are confirmed by account number/RRR, not by typing an amount) — no injection surface here.

## XSS (Cross-Site Scripting)

- **`dangerouslySetInnerHTML`:** zero occurrences anywhere in `src/` (verified via repo-wide search).
- **Other raw-HTML rendering:** none found — every dynamic value rendered in JSX goes through React's default text-escaping; no `innerHTML`/`outerHTML`/`document.write` assignment was found anywhere in the app's own code.
- **User-controlled content:** customer names, addresses, notes fields, etc. (all sourced from the real API, ultimately customer-entered data relayed by JED/Remita) are rendered as plain React children throughout — never interpolated into a template string that's then rendered as HTML.
- **Conclusion:** no known XSS vector exists in this codebase today. This matters more than it might otherwise because of the next finding.

## CSRF

**Not applicable to this app's own authentication in any meaningful way**, and this is worth stating explicitly rather than skipping: CSRF exploits the browser's automatic attachment of cookies/session state to cross-origin requests. This app never sets or relies on a cookie for auth — the JWT is read from `localStorage` and attached manually as an `Authorization` header by application code, which a cross-origin attacker page cannot do on the victim's behalf (it has no access to another origin's `localStorage`, and can't force the browser to add a custom header to a request it forges). A CSRF token would add no real protection here and isn't needed. (The tradeoff this auth scheme *does* have — `localStorage` being readable by any script that runs on the page — is exactly why the "no known XSS vector" finding above matters so much: XSS, not CSRF, is the realistic attack path against this auth model.)

## Sensitive Data

- **`localStorage` contents (all under app-owned keys):** `jedAuthToken` (JWT — sensitive), `jedUser` (name/phone/email/role — PII, moderately sensitive), `jedActiveApiKey` (a real, privileged backend credential used for RRR generation and Remita status lookups — **the single most sensitive value stored client-side**), `jedActiveApiKeyName`, `jedAdminSessionDeadline` (a timestamp, not sensitive), `jedSidebarCollapsed`/`theme` (pure UI preference, not sensitive). Given the confirmed absence of any XSS vector today, this is a documented architectural tradeoff rather than an active vulnerability — but it means **if an XSS bug is ever introduced, the blast radius includes a live JWT and a live, reusable API key**, not just UI state. Any future PR that adds a new way to render user-controlled content (a new rich-text field, a new "paste HTML" feature, a new third-party widget) should be reviewed against this specifically.
- **`sessionStorage`:** unused — nothing to report.
- **URLs:** no token, password, or API key was found passed as a query parameter or URL path segment anywhere in the app. Account numbers/RRRs do appear in URLs (`/installations/:accountNumber`) — these are business identifiers, not secrets, and matches how the real API itself paths these lookups.
- **Console logs:** addressed above (the password-logging fix). After that fix, no remaining `console.log`/`console.warn`/`console.error` call in the app logs a raw password, token, or API-key value — verified by re-checking every `console.*` call site that takes a request/response/credentials object as an argument.
- **Error messages:** surfaced error text originates from the backend's own `message`/`errors[]` fields, not from a raw exception `.stack` or similar internal detail — no stack traces or internal paths are shown to the user.
- **Frontend source:** the production build (`dist/`) is plain, unencrypted static JS — normal for any SPA. No secret was found embedded in it (confirmed via the same hardcoded-secret search above, which covers the source that gets bundled).

## Dependency Security

`npm audit --omit=dev` (production dependencies only — this deliberately excludes `devDependencies`, which includes a `playwright` install added *ad hoc, locally, with `--no-save`* purely for this session's manual verification and is not part of the shipped app or `package.json`):

```
react-router  6.0.0 - 7.17.0   (installed: 7.9.6, via react-router-dom 7.9.6)
Severity: HIGH
- XSS via Open Redirects
- SSR XSS in ScrollRestoration
- Vendored turbo-stream v2 allows arbitrary constructor invocation via
  TYPE_ERROR deserialization → unauthenticated RCE path
- XSS in unstable RSC redirect handling via javascript: redirect targets
- Stored XSS via unescaped Location header in prerendered redirect HTML
- DoS via unbounded path expansion in __manifest endpoint
- DoS via reflected user input in single-fetch
- CSRF in Action/Server Action Request Processing
- Open redirect via backslash in <Link>/useNavigate
- Open redirect leading to XSS
- Arbitrary Constructor Injection via deserializeErrors() in SSR Hydration
- Unauthenticated DoS via inefficient route matching
- Same-origin redirect with path starting // → open redirect via
  protocol-relative URL reinterpretation

fix available (non-breaking, within the installed major version)
```

- **Finding:** the installed `react-router`/`react-router-dom` version (7.9.6) has multiple published HIGH-severity advisories. Several of these (SSR-specific XSS/RSC/redirect-handling issues) target server-rendering features this app doesn't use (this is a client-only SPA, no SSR) — but others (open-redirect-to-XSS via `<Link>`/`useNavigate`, the CSRF advisory) are relevant regardless of SSR usage, since this app does use client-side routing/navigation.
- **Do not assume "we don't use SSR" fully neutralizes this** — the advisory list wasn't individually re-verified against this app's exact usage pattern for every entry (that would require exploitation-style testing, which this review deliberately avoided); the honest position is "several plausibly apply, treat the whole set as needing the fix" rather than picking and choosing.
- **Remediation:** `npm audit fix` (a fix is available within the installed major version — not a breaking upgrade) — **not applied during this pass**, since a dependency version bump is a change with its own blast radius (any subtle behavior change in routing) that deserves its own explicit confirmation and a full manual re-test pass, rather than being a side effect of a documentation/audit task. Recommended as the top follow-up action from this review.
- **Dev-only dependencies:** not audited for production risk (they never ship), but `npm audit` (unfiltered) was also run informally during this session and separately showed vulnerabilities attributable to the ad hoc local Playwright install, not to anything in `package.json` — no action needed there since that install was never persisted.

## Security Findings Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Raw request/response bodies (including plaintext passwords and API-key secrets) logged to the browser console unconditionally, in every environment | HIGH | **Fixed this pass** — redacted + gated behind dev-only flag |
| 2 | `react-router`/`react-router-dom` 7.9.6 has multiple published HIGH-severity advisories; non-breaking fix available | HIGH | Open — recommend `npm audit fix` + full re-test as the next action |
| 3 | `vercel.json` sets no security response headers (no CSP, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, HSTS) | MEDIUM | Open |
| 4 | No client-side file-size limit on Excel/CSV uploads (type is only hinted via `accept`, not enforced) | MEDIUM | Open |
| 5 | JWT and a privileged API-key secret are both stored in plaintext `localStorage` — no current exploit path (no XSS found), but this is the blast radius if one is ever introduced | INFORMATIONAL | Open — architectural, monitor rather than "fix" |
| 6 | No client-side password complexity policy on login/change-password forms | INFORMATIONAL | Open — documented product decision, not an oversight |
| 7 | No server-side session/token revocation on logout (no `/auth/logout` endpoint exists) | INFORMATIONAL | Open — backend constraint, not fixable from this repo |

## What This Review Did Not Do

No destructive testing, no attempt to authenticate against the real backend with anything other than the credentials the user explicitly provided for functional verification, no fuzzing, no attempt to exploit any of the `npm audit` advisories against this app's actual deployed instance, and no unauthorized access attempt of any kind. Findings above are based on static code review, dependency metadata, and observed (not inferred) application behavior only.
