# API Gap Report

This documents where the desired ME-Metering workflow cannot be fully implemented against the real Pharez API (`https://pharez-api.onrender.com/api-docs`, verified against its OpenAPI spec) — as opposed to places where the frontend was simply calling the API incorrectly (those were fixed directly, not listed here). These are backend feature requests, not frontend bugs.

## 1. No installer-assignment field or endpoint

**Desired workflow:** Admin assigns an Awaiting Installation to a specific Installer; that installer then sees only their assigned jobs, persisted server-side and visible across devices.

**What the API actually supports:** The `JedCustomerRequest` schema has no `installerId`/`assignedInstaller`/equivalent field anywhere. `GET /external/jed/requests/installer` (the one endpoint gated to the `INSTALLER` role) filters only by `status` — every installer who calls it sees the identical shared list. There is no assign/unassign endpoint.

**Current behavior:** `InstallerDashboard.jsx` shows "Awaiting Installation" (`PAID`) and "Completed" (`COMPLETED`) tabs — a shared queue of paid customer accounts visible to every installer, not a personal assignment list. `INITIATED` (unpaid) requests are excluded entirely, since there's nothing for an installer to act on there.

**Reconfirmed twice:** this was verified against the live OpenAPI spec at the start of the integration work, and re-verified again later in the same engagement when an admin-assigns-to-installer feature was requested a second time — the spec was unchanged both times (45 endpoints, no `installerId` field, no assign endpoint). Building client-side/localStorage-based "fake" assignment was explicitly considered and declined both times, since it would violate the requirement that assignment must be authoritative and cross-device, not browser-local.

**What's needed from the backend:** An `installerId`/`assignedTo` field on the customer-request record, an admin-facing assign/reassign endpoint, and a way to filter `GET /external/jed/requests/installer` by the authenticated installer's own assignments. Once that exists, the frontend changes are straightforward: an "Assign" action in the admin view of PAID requests, and a filter param added to `getMyInstallations()` in `api.js`.

## 2. No queue/awaiting-installation status distinct from PAID

**Desired workflow:** Onboarding → Meter Assignment → Queue Serialization → Awaiting Installation → Installer Assignment → Installation → Completion, as separate tracked stages.

**What the API actually supports:** `JedCustomerRequest.status` is a 3-value enum: `INITIATED → PAID → COMPLETED`. There is no queue/serialization/awaiting-installation state.

**Current behavior:** The UI treats `PAID` as "awaiting installation" (the one sensible mapping the 3-state enum supports) and does not invent intermediate statuses that the backend would never return.

**What's needed from the backend:** Either richer status values, or a separate installation-lifecycle resource distinct from payment status.

## 3. No pre-completion meter-assignment step

**Desired workflow:** Associate a specific physical meter with a request before it reaches an installer, as a distinct "Meter Assignment" stage.

**What the API actually supports:** `meterNo` and `sealNo` are submitted together in one shot at `POST /external/jed/complete-installation`, which also requires the request to already be `PAID`. Meters otherwise live in their own inventory (`GET /meters`, now with a real UI — see below) with no field linking a specific meter to a specific request beforehand.

**What's needed from the backend:** A way to reserve/pre-assign a specific meter (by number) to a request prior to installer completion, and to reflect that reservation in the meter inventory's status.

## 4. No `/complaints` resource

No such tag/path exists in the real OpenAPI spec. The Complaint submission feature (`ComplaintForm.jsx`, the Complaint tab on `/submit`, and the related `COMPLAINTS` permissions) was removed entirely in a later cleanup pass rather than left in the UI pointing at an endpoint that will always 404. If complaint submission is needed, it requires the backend to add a `/complaints` resource; the frontend has no remaining scaffolding for it.

## 5. ApiKeyAuth is a real key, not the logged-in user's JWT

Not a gap, but worth documenting: `POST /external/jed/generate-ref` and `GET /external/jed/status/rrr|order/{id}` authenticate via a real `X-API-Key` (from `/apikeys`), not the session JWT. The app previously sent the JWT under both headers on every request. Fixed by adding an "active app key" mechanism (Settings → API Keys): the plaintext key value is captured once at creation (the only time the backend ever returns it) and stored client-side specifically for these two call sites.

## Cleaned up (not backend gaps — these were frontend bugs against an already-real API)

For transparency, these were **not** backend gaps — the endpoints either already existed correctly or never existed and the frontend was calling something invented. All were fixed directly in this pass:
- Removed non-existent endpoints the frontend was calling: `/auth/logout`, `/auth/refresh-token`, `/auth/forgot-password`, per-installer stats/performance/dashboard/profile routes, `/auth/users` (real path is `/users`), and invented `SYSTEM_*`/`AUDIT_TRAIL`/`REPORTS` endpoint groups.
- Fixed role casing: the frontend lowercased roles (`admin`/`installer`) while the real API uses uppercase (`SUPERADMIN`/`ADMIN`/`INSTALLER`); any real `SUPERADMIN` user previously fell through every permission check.
- Added the `SUPERADMIN` role throughout (RBAC, user management, routing) — it exists on the real API but had zero frontend support.
- User creation was silently broken: the create-user form never rendered a password input despite `password` being required (min 6 chars) by the real `UserCreate` schema — every create attempt sent an empty password and would have failed validation.

## Navigation/feature audit (later cleanup pass)

A follow-up pass audited every sidebar tab and major section against the real API to remove duplication and dead UI:
- A standalone "Meters" page/route was briefly added, then removed as a duplicate — **Meter Schedule** (`/schedule`) already covers the full real meter-inventory surface (`GET /meters`, `GET /meters/statistics`, `DELETE /meters/{meterNumber}`, export) via its Inventory/Query tabs, so it remains the single entry point.
- The standalone "Generate RRR" tab in the Payments hub was removed — `POST /external/jed/generate-ref` is real, but the identical Preview → Confirm → Success flow already exists per-installation on `InstallationDetail.jsx`, which is the natural place to generate a reference for a job you're already viewing.
- The Complaint feature was removed (see gap #4 above) — no backend endpoint exists for it.
- `ApiDiagnostics.jsx` (the hidden `/debug` route, never linked from the sidebar) was removed — it tested speculative login-payload shapes that are now known to be wrong (the real contract is confirmed as exactly `{ phone, password }`), so it was stale dev scaffolding rather than a real workflow.
- `AdminReports.jsx` had several export/detail columns with no backing field on the real `JedCustomerRequest` schema (installer name/phone — there is no installer relationship on a request at all — feeder name, tariff class, GPS coordinates, meter phase, remarks) that could only ever render blank. Trimmed to the fields the API actually returns; the page itself (real request listing, search, CSV export, dashboard stats) remains, since its core function is genuinely backed by `GET /external/jed/requests` and `GET /dashboard-stats`.
