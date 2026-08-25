# Project Context: JEDC Meter Management

## 1. Project Overview

**jedc-meter-management** ("ME Metering Integration", branded on the Login screen as **Masters Energy**) is an internal Progressive Web App used by **JEDC** (a Nigerian power distribution company) and its partner installers to manage meter installations end-to-end: customer meter requests, payment collection via Remita, and installer job fulfillment.

This is **not** a customer self-service portal. There are three roles, matching the real API's `User.role` enum exactly (uppercase):
- **SUPERADMIN** — everything ADMIN has, plus the only role permitted to create/edit ADMIN or SUPERADMIN accounts (enforced both client-side and by the backend).
- **ADMIN** — manages users (except privileged roles), generates/confirms payments, runs reports, configures meter types/settings/API keys, manages meter inventory.
- **INSTALLER** — sees a shared "Awaiting Installation" (paid) / "Completed" queue, submits new installation requests, completes installs.

There is no backend code in this repository — it is a frontend-only client that talks to an external REST API.

## 2. Architecture Decisions

- **Frontend-only SPA.** All persistence, business logic enforcement, and auth happen on a remote API (`https://pharez-api.onrender.com/api/v1`, configurable via `VITE_API_BASE_URL`). This repo has no database, ORM, or server code.
- **Context API over Redux/Zustand.** Global state (auth session, theme) is handled with React Context (`AuthContext.jsx`, `ThemeContext.jsx`) rather than a state-management library.
- **Hand-rolled API client instead of axios/react-query.** `src/components/services/api.js` implements a `JEDApiService` class wrapping `fetch` with retry/backoff, `AbortController`-based timeouts, and in-memory response caching. Endpoint paths and shared config live in `src/components/services/api.config.js`.
- **Mobile-first sidebar navigation.** A single `Navigation.jsx` sidebar renders as an off-canvas drawer below the `lg` breakpoint and a persistent, collapsible column (icon-only rail or full-width) at `lg`+ — there is no separate desktop top-bar or mobile bottom-tab navigation.
- **PWA via `vite-plugin-pwa`**, with an explicit `NetworkOnly` Workbox rule for all `/api/` routes — financial/installation data is never served stale.
- **Route-level code splitting** via `React.lazy`/`Suspense`, with role-based route gating (`src/App.jsx`, `src/components/auth/permissions.js`).
- **Deployment:** Vercel, static SPA hosting with a rewrite-to-`index.html` fallback (`vercel.json`) and long-cache headers for `/assets/`.

## 3. Technologies Used

| Category | Technology |
|---|---|
| Framework | React 19.1.1 |
| Build tool | Vite 7.1.7 |
| Routing | react-router-dom 7.9.6 |
| Styling | Tailwind CSS 3.4.18 + PostCSS/autoprefixer |
| Icons | lucide-react 0.548.0 |
| PWA | vite-plugin-pwa 1.3.0 (Workbox service worker) |
| Linting | ESLint 9.36.0 (flat config, React Hooks/Refresh plugins) |
| Image processing (dev) | sharp 0.35.3 (used by PWA icon generation script) |

No TypeScript (plain JSX), no UI component library, no state-management library, no test framework currently present.

## 4. Folder Structure

```
jedc-meter-management/
├── public/                    # Static assets, PWA icons, favicon, logo.svg
├── scripts/                   # generate-pwa-icons.mjs, pwa-icon-master.svg — icon generation tooling
├── src/
│   ├── App.jsx, main.jsx      # Entry point, route table, role-gated routing
│   ├── index.css              # Tailwind entry
│   ├── .env.example           # Template — src/.env itself is gitignored (no longer tracked)
│   ├── assets/                 # Images/static assets used by components
│   ├── hooks/                  # useNavigation.js
│   ├── utils/                  # currency.js, date.js, rrrPayload.js, statusBadge.js, trendAggregation.js
│   └── components/
│       ├── admin/              # AdminDashboard, AdminReports, PaymentsPage, ConfirmPaymentTab, ReplayWebhookTab, TrendChart, UserManagement
│       ├── auth/                # Login, VerificationModal, permissions.js/.jsx, usePermissions.jsx
│       ├── common/              # Header, Navigation (sidebar), Footer, GenerateRRRModal, PaymentTimeline, ErrorBoundary, modals
│       ├── contexts/             # AuthContext, ThemeContext
│       ├── dashboard/            # InstallerDashboard (Awaiting Installation / Completed queue)
│       ├── installation/          # InstallationDetail, InstallationForm, RequestInfoPanel, UserInfoPanel
│       ├── schedule/               # MeterSchedule — the single entry point for meter inventory (list/filter/search/export/stats/delete)
│       ├── services/                # api.js (main API client), api.config.js (endpoints/config)
│       ├── settings/                # ApiKeySettings, MeterTypeSettings, SettingsPage
│       ├── uploads/                  # ExcelUpload
│       └── SubmissionPage.jsx        # Installation request submission
```

## 5. Completed Features

- **Auth & RBAC:** JWT login (`{phone, password}`, token in `localStorage`), profile/password management, OTP-based phone/email verification, three-tier role-based route and UI gating (SUPERADMIN/ADMIN/INSTALLER).
- **Meter management:** inventory CRUD via **Meter Schedule** (list/filter/search/export/statistics/delete — the single entry point, no duplicate "Meters" page), bulk Excel upload, meter-number template download, meter-type/tariff settings CRUD.
- **Installation lifecycle:** request submission → RRR generation (from `InstallationDetail.jsx`) → customer pays via Remita → webhook/manual confirmation → installer sees it in the shared "Awaiting Installation" queue → installer completes the job.
- **Admin Dashboard:** stat cards (pending/completed/installers/revenue, from real `/dashboard-stats` only — no fabricated trend percentages), revenue & installation trend charts (`TrendChart.jsx`, 7/30/90-day ranges, from real payment records), recent installations table, quick actions, data export modal.
- **Payments Page** (tabbed hub): Payments list, Confirm Payment, RRR/Order Lookup (status check, webhook verify, manual confirm fallback), Requests by Status, Webhook Replay. (Generate RRR was removed as a standalone tab — it's only available per-installation from `InstallationDetail.jsx`, which is the natural place to generate a reference for a specific job.)
- **User management:** full CRUD, SUPERADMIN-only gating on assigning ADMIN/SUPERADMIN roles, password field on create (previously missing — user creation was silently broken against the real `UserCreate` schema's required password field).
- **Active API key mechanism:** Settings → API Keys lets an admin designate an "active app key," captured once at creation, used for the two endpoints that require `ApiKeyAuth` (Generate RRR, Remita status lookups) instead of the session JWT.
- **Reports (`AdminReports.jsx`):** searchable/filterable listing of real customer requests with CSV export, backed by `GET /external/jed/requests` and `GET /dashboard-stats` — trimmed to only fields that actually exist on the API response (no installer name/phone, feeder, tariff class, GPS, or remarks columns, since none of those exist on the real schema).
- **Mobile-first collapsible sidebar** and a redesigned split-screen dark Login page (dot-grid + glow-orb brand panel, "Masters Energy" branding).
- **PWA conversion:** installable app shell, standalone display, network-only caching for API calls.

## 6. Pending / Incomplete Features

- **No installer-assignment mechanism.** The real API has no `installerId` field on a customer request and no assign/unassign endpoint — `GET /external/jed/requests/installer` only filters by status, not by installer. Every installer sees the same shared "Awaiting Installation" queue. Building this requires backend work; a client-side/localStorage-only version was explicitly considered and declined twice (violates the requirement that assignment be authoritative and cross-device). See `API_GAP_REPORT.md`.
- **No queue/awaiting-installation status distinct from `PAID`.** The real `JedCustomerRequest.status` enum is only `INITIATED / PAID / COMPLETED` — there's no richer installation-lifecycle state machine on the backend.
- **No pre-completion meter-assignment step.** `meterNo`/`sealNo` are only submitted together, in one shot, at `POST /external/jed/complete-installation`.
- **No `/complaints` endpoint.** The Complaint submission feature was removed entirely (not left broken in the UI) — see `API_GAP_REPORT.md`.
- **No customer self-service portal.** Intentional scope boundary (staff-only tool), not a gap.

## 7. API Integrations

Base URL: `https://pharez-api.onrender.com/api/v1` (override via `VITE_API_BASE_URL`), docs at `/api-docs`. Client: `src/components/services/api.js` (`JEDApiService`), endpoint map: `src/components/services/api.config.js`. 45 real endpoints total — every invented endpoint the frontend previously called (`/auth/logout`, `/auth/refresh-token`, `/auth/forgot-password`, per-installer stats/performance/dashboard routes, `/auth/users`, `SYSTEM_*`/`REPORTS`/`COMPLAINTS` groups) has been removed from `api.config.js`.

**Endpoint groups actually used:**
- **Auth:** login, register, profile (get/update), change-password, reset-password (admin resets another user's password to default).
- **Verification:** send/verify phone OTP, send/verify email OTP.
- **Meters:** list (paginated, filter by status/phaseType), upload (Excel), template, export, statistics, lookup by meter number/id, delete, customer-requests export.
- **Uploads:** generic Excel processing (`/uploads/excel[-first-sheet|-modified]`), distinct from `/meters/upload`.
- **Settings:** meter-type CRUD, API key management (create/list/deactivate/usage — full secret shown once at creation).
- **Users:** CRUD with role-based filtering (`GET/POST /users`, `GET/PUT/DELETE /users/{id}`).
- **Dashboard:** `GET /dashboard-stats` — exactly `{pendingRequests, completedRequests, activeInstallers, totalRevenue}`, no deltas.
- **JED requests:** list/lookup by account number/status/installer, export.
- **Remita (payments/RRR):**
  - `POST /external/jed/generate-ref` — generate a Remita RRR (requires `ApiKeyAuth`, not the session JWT).
  - `POST /external/jed/confirm-payment` — confirm a completed Remita payment.
  - `POST /external/jed/confirm-payment/manual/{rrr}` — admin fallback when the webhook is missed.
  - `POST /webhooks/remita/payment` — server-to-server Remita webhook (also used for manual replay/testing via the admin UI).
  - `GET /webhooks/verify-payment/{rrr}`, `GET /external/jed/status/rrr/{rrr}`, `GET /external/jed/status/order/{orderId}` — status lookups (the latter two also require `ApiKeyAuth`).
  - `GET /external/jed/payments` — payments listing.

**Auth pattern for API calls:** JWT sent as `Authorization: Bearer <token>` by default. Two endpoints (Generate RRR, Remita status lookups) instead require a real `X-API-Key` from `/apikeys` — see the "active app key" mechanism above.

## 8. Business Rules

- **Meter number:** exactly 13 digits (`/^\d{13}$/`).
- **Account number:** numeric only (`/^\d+$/`). Seal number is required on installation.
- **Currency:** NGN only (`src/utils/currency.js`, `formatCurrencyNGN`).
- **Request status enum (real, only these three):** `INITIATED → PAID → COMPLETED`. Payment/status badges are case-insensitively normalized in `src/utils/statusBadge.js`; `isAwaitingInstallationStatus` (`PAID`) and `isCompletedStatus` (`COMPLETED`) drive the installer queue's two tabs.
- **User role enum:** `SUPERADMIN / ADMIN / INSTALLER`, uppercase, used as-is throughout (no case translation). Only `SUPERADMIN` may create/edit `ADMIN`/`SUPERADMIN` accounts.
- **Meter inventory status:** `AVAILABLE / INSTALLED / FAULTY / RETIRED`. Phase type: `SINGLE PHASE / THREE PHASE`.
- **Request retry/timeout policy:** 30s default timeout (60s for export/upload endpoints), max 2 retries with exponential backoff.
- **Installation lifecycle order is enforced by workflow, not just UI:** request → RRR generated → payment → confirmation (webhook or manual) → installer picks it up from the shared queue → completion.

## 9. Important Implementation Notes

- **`src/.env` is now gitignored** (previously tracked) — `src/.env.example` is the committed template.
- **No SMS/email provider in the frontend.** OTP delivery for phone/email verification is entirely delegated to the backend.
- **README.md may still be stale relative to `package.json`** (previously found stating React 18 vs. the actual React 19.1.1) — worth a final check if not already fixed.
- **Payment actually happens off-app.** This SPA only generates Remita RRR references and reconciles status afterward (via webhook or manual admin action) — it never hosts a payment form itself.
- **`ApiDiagnostics.jsx` (a hidden `/debug` route) was removed** — it tested speculative login-payload shapes that are now known to be wrong (the confirmed real contract is exactly `{phone, password}`), and was never linked from the sidebar.
