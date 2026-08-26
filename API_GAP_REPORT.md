# API Gap Report

This documents where the desired ME-Metering workflow cannot be fully implemented against the real Pharez API (`https://pharez-api.onrender.com/api-docs`, verified against its OpenAPI spec) — as opposed to places where the frontend was simply calling the API incorrectly (those were fixed directly, not listed here). These are backend feature requests, not frontend bugs.

## Reconfirmed 2026-08-25 (installer assignment / meter assignment / paid-customer import work)

Before implementing installer assignment, meter assignment, and a "paid customer upload" workflow, the live spec was pulled directly from the production server (`GET https://pharez-api.onrender.com/api-docs/json` redirects to the Swagger UI; the actual OpenAPI document is embedded in `.../api-docs/swagger-ui-init.js` — there is no separate `/api-docs.json`/`/openapi.json` route) and diffed against this report. Still exactly **45 endpoints**, same as every prior check:

```
POST /apikeys                                  GET /apikeys                          GET /apikeys/{id}
DELETE /apikeys/{id}                           POST /apikeys/{id}/deactivate         GET /apikeys/{id}/usage
POST /auth/register                            POST /auth/login                      GET /auth/profile
PUT /auth/profile                              PUT /auth/change-password             POST /auth/reset-password
GET /dashboard-stats
POST /external/jed/generate-ref                POST /external/jed/confirm-payment    POST /external/jed/complete-installation
POST /external/jed/remita/webhook              GET /external/jed/requests/{accountNumber}
GET /external/jed/requests/export              GET /external/jed/requests/installer  GET /external/jed/requests
GET /external/jed/requests/status/{status}     GET /external/jed/payments             GET /external/jed/status/rrr/{rrr}
GET /external/jed/status/order/{orderId}       POST /external/jed/confirm-payment/manual/{rrr}
POST /meters/upload                            GET /meters/template                  GET /meters/export
GET /meters                                    GET /meters/statistics                GET /meters/{id}
GET /meters/meter-number/{meterNumber}         DELETE /meters/{meterNumber}          GET /meters/customer-requests/export
POST /settings/meter-type                      GET /settings/meter-type              GET /settings/meter-type/{id}
PATCH /settings/meter-type/{id}                DELETE /settings/meter-type/{id}
POST /uploads/excel                            POST /uploads/excel-first-sheet       POST /uploads/excel-modified
GET /users                                     POST /users                           GET /users/{id}
PUT /users/{id}                                DELETE /users/{id}
POST /verification/send-phone-otp              POST /verification/verify-phone       POST /verification/send-email-otp
POST /verification/verify-email
POST /webhooks/remita/payment                  GET /webhooks/verify-payment/{rrr}
```

The `JedCustomerRequest` schema is unchanged: `id, accountNumber, custNames, gsm, email, address, meterRecommended, discoCode, requestRef, region, rrr, amount, orderId, status(INITIATED|PAID|COMPLETED), meterType, sealNo, meterNo, dateRequested, datePaid, dateCompleted` — still no `installerId`/`assignedTo` field, no meter-reservation field, and no assign/unassign endpoint anywhere in the 45 paths above. Gaps #1–#3 below stand exactly as previously documented. Given this, installer assignment and meter assignment were **not** implemented as working persistence — see "What was implemented instead" under each gap, and the disabled "not yet available" affordances added to the UI (Payments → Requests by Status, and Meter Schedule) that explain the limitation in place rather than faking a working flow. Gap #6 below is new, covering the "Upload Pending Paid Customers" workflow.

## 1. No installer-assignment field or endpoint

**Desired workflow:** Admin assigns an Awaiting Installation to a specific Installer; that installer then sees only their assigned jobs, persisted server-side and visible across devices.

**What the API actually supports:** The `JedCustomerRequest` schema has no `installerId`/`assignedInstaller`/equivalent field anywhere. `GET /external/jed/requests/installer` (the one endpoint gated to the `INSTALLER` role) filters only by `status` — every installer who calls it sees the identical shared list. There is no assign/unassign endpoint.

**Current behavior:** `InstallerDashboard.jsx` shows "Awaiting Installation" (`PAID`) and "Completed" (`COMPLETED`) tabs — a shared queue of paid customer accounts visible to every installer, not a personal assignment list. `INITIATED` (unpaid) requests are excluded entirely, since there's nothing for an installer to act on there.

**Reconfirmed twice:** this was verified against the live OpenAPI spec at the start of the integration work, and re-verified again later in the same engagement when an admin-assigns-to-installer feature was requested a second time — the spec was unchanged both times (45 endpoints, no `installerId` field, no assign endpoint). Building client-side/localStorage-based "fake" assignment was explicitly considered and declined both times, since it would violate the requirement that assignment must be authoritative and cross-device, not browser-local.

**What's needed from the backend:** An `installerId`/`assignedTo` field on the customer-request record, an admin-facing assign/reassign endpoint, and a way to filter `GET /external/jed/requests/installer` by the authenticated installer's own assignments. Once that exists, the frontend changes are straightforward: an "Assign" action in the admin view of PAID requests, and a filter param added to `getMyInstallations()` in `api.js`.

**What was implemented instead:** a consolidated **Installations** page (`AdminInstallations.jsx`, `/installations`, Admin/Super Admin only) with the two real statuses as tabs — Awaiting Installation (`PAID`) and Completed — replacing the old Payments → Requests by Status tab (which duplicated this same PAID/COMPLETED view once this page existed; general all-status browsing/export still lives in `AdminReports.jsx`). Rows are selectable (single or multi-select, real client-side UI state — that part genuinely works), with an "Assign Installer" / "Assign to Installer" action per row or for the current selection. Clicking it opens an info modal explaining exactly this gap rather than pretending to persist an assignment, one call for however many accounts are selected. No installer dropdown, no fake "assigned" state — a half-working mock was deliberately avoided.

## 2. No queue/awaiting-installation status distinct from PAID

**Desired workflow:** Onboarding → Meter Assignment → Queue Serialization → Awaiting Installation → Installer Assignment → Installation → Completion, as separate tracked stages.

**What the API actually supports:** `JedCustomerRequest.status` is a 3-value enum: `INITIATED → PAID → COMPLETED`. There is no queue/serialization/awaiting-installation state.

**Current behavior:** The UI treats `PAID` as "awaiting installation" (the one sensible mapping the 3-state enum supports) and does not invent intermediate statuses that the backend would never return.

**What's needed from the backend:** Either richer status values, or a separate installation-lifecycle resource distinct from payment status.

## 3. No pre-completion meter-assignment step

**Desired workflow:** Associate a specific physical meter with a request before it reaches an installer, as a distinct "Meter Assignment" stage.

**What the API actually supports:** `meterNo` and `sealNo` are submitted together in one shot at `POST /external/jed/complete-installation`, which also requires the request to already be `PAID`. Meters otherwise live in their own inventory (`GET /meters`, now with a real UI — see below) with no field linking a specific meter to a specific request beforehand.

**What's needed from the backend:** A way to reserve/pre-assign a specific meter (by number) to a request prior to installer completion, and to reflect that reservation in the meter inventory's status.

**What was implemented instead:** a disabled "Assign" action on each `AVAILABLE` meter in Meter Schedule → Inventory (`MeterSchedule.jsx`), which opens an info modal explaining this gap. Meters remain linked to a completed installation the one way the real API supports today: the `meterNo`/`sealNo` fields submitted together at `POST /external/jed/complete-installation`.

## 4. No `/complaints` resource

No such tag/path exists in the real OpenAPI spec. The Complaint submission feature (`ComplaintForm.jsx`, the Complaint tab on `/submit`, and the related `COMPLAINTS` permissions) was removed entirely in a later cleanup pass rather than left in the UI pointing at an endpoint that will always 404. If complaint submission is needed, it requires the backend to add a `/complaints` resource; the frontend has no remaining scaffolding for it.

## 5. ApiKeyAuth is a real key, not the logged-in user's JWT

Not a gap, but worth documenting: `POST /external/jed/generate-ref` and `GET /external/jed/status/rrr|order/{id}` authenticate via a real `X-API-Key` (from `/apikeys`), not the session JWT. The app previously sent the JWT under both headers on every request. Fixed by adding an "active app key" mechanism (Settings → API Keys): the plaintext key value is captured once at creation (the only time the backend ever returns it) and stored client-side specifically for these two call sites.

## 6. No bulk "create/import paid customers" endpoint

**Desired workflow ("Upload Pending Paid Customers"):** an admin uploads an Excel file of customers who have already paid, and the system imports them as `PAID` records in one batch.

**What the API actually supports:** there is no endpoint to batch-create `JedCustomerRequest` records at all. A request is created one at a time, per customer, via `POST /external/jed/generate-ref` (which also requires `ApiKeyAuth` and creates it as `INITIATED`, not `PAID`). Marking a request `PAID` happens only via `POST /external/jed/confirm-payment` (by `accountNumber`) or `POST /external/jed/confirm-payment/manual/{rrr}` — both single-record, and both require the request to already exist. `/uploads/excel*` are real but generic (tagged "Uploads", no defined schema tying them to `JedCustomerRequest` at all) — they just turn a spreadsheet into JSON rows server-side; they don't create or mutate any customer-request record themselves.

**What was implemented instead (real, no fabrication):** "Upload Paid Customers" in the Payments hub (`BulkConfirmPaymentsTab.jsx`) composes two genuinely real calls: `POST /uploads/excel` to parse the uploaded file into rows (no client-side spreadsheet library needed), then loops the real `confirmPayment`/`confirmPaymentManually` endpoints once per row (by whichever of `accountNumber`/`rrr` each row provides). This only works for customers whose request was already created earlier (via Generate RRR) and who have genuinely paid — it cannot conjure a `PAID` record for a customer the backend has never heard of, and it never fabricates a payment. Every row is a real mutation against a real backend record with per-row success/failure reporting.

**What's needed from the backend for a true "import already-paid customers from scratch" workflow:** a bulk-create endpoint for `JedCustomerRequest` (accepting an array of the same fields `generate-ref` takes) plus either a way to create them directly as `PAID` or a documented, genuine batch-payment-notification contract distinct from the single-notification `POST /webhooks/remita/payment` shape.

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
- **Installation-workflow consolidation (2026-08-25):** Payments' "Requests by Status" tab (an INITIATED/PAID/COMPLETED browser with an installer-assignment affordance bolted on) was removed as a duplicate once the dedicated **Installations** page (`/installations`) existed to own that exact PAID/COMPLETED workflow with proper multi-select. INITIATED-status browsing is unaffected — `AdminReports.jsx` already covers all statuses with search/filter/export. No functionality was dropped, only relocated to its more natural home.
- **Payments simplification (2026-08-25):** the "RRR / Order Lookup" tab (raw Remita status-by-RRR/order-ID lookups, a "verify via webhook endpoint" check, and a manual-confirm-by-RRR button) and "Webhook Replay" tab (manually resubmitting a Remita webhook payload) were removed — not because their endpoints were fake, but because they exposed backend-integration/debugging mechanics an Admin doesn't need for the normal day-to-day workflow, and no other page needed them (verified via a repo-wide search before deleting anything). This took the API surface exclusive to them with it: `checkRemitaStatusByOrderId()` (`GET /external/jed/status/order/{orderId}`), `verifyPaymentByRRR()` (`GET /webhooks/verify-payment/{rrr}`), and `submitRemitaWebhook()` (`POST /webhooks/remita/payment`), plus the now-fully-dead `WEBHOOKS` endpoint group/config and an already-orphaned `JED.REMITA_WEBHOOK` constant that had zero callers even before this pass. `checkRemitaStatusByRRR()` and `confirmPaymentManually()` were kept — both are still real, still-used dependencies of `ConfirmPaymentTab.jsx` and `BulkConfirmPaymentsTab.jsx` respectively. The Payments list itself was also redesigned to match the real `GET /external/jed/payments` response schema exactly (`custNames`, `accountNumber`, `meterType`, `amount`, `status`, `datePaid`/`dateCompleted`) — it never actually returns an `rrr` field, so the previous RRR column was quietly showing "No RRR" for every row; it's gone now in favor of Customer and Meter Type columns the schema does support.
