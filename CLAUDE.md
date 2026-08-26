# CLAUDE.md

Primary development guide for Claude Code (or any AI assistant) working on this repository. `PROJECT_CONTEXT.md` is the day-to-day living reference for what's implemented; this file is the standing set of rules for *how* to work on it. Read both before making changes — `PROJECT_CONTEXT.md` first.

## Project identity

- **Name:** jedc-meter-management ("ME Metering Integration" internally; branded on the Login screen as **Masters Energy**).
- **Purpose:** manage the meter-installation lifecycle for **JEDC** (a Nigerian power distribution company) and its partner installers — customer meter requests, Remita payment collection, and installer job fulfillment.
- **Business domain:** utility/metering operations. This is an **internal staff tool** (Admin/Super Admin/Installer), not a customer self-service portal — there is no customer-facing login anywhere in this app.
- **Core workflow:** Customer request → RRR (Remita payment reference) generated → customer pays → payment confirmed → installer completes the physical install. See "Business workflow" below for the exact statuses.

## Technology

Versions below are read directly from `package.json` — verify there before assuming a version has changed.

| Concern | Choice |
|---|---|
| Framework | React 19.1.1 |
| Language | JavaScript (plain JSX, no TypeScript — `@types/react`/`@types/react-dom` are present only for editor intellisense, not a type-checked build) |
| Build tool | Vite 7.1.7, via `@vitejs/plugin-react` |
| Routing | react-router-dom 7.9.6 |
| Styling | Tailwind CSS 3.4.18 + PostCSS/autoprefixer. Design tokens live in `tailwind.config.js` (`theme.extend.colors.brand`) — see "UI/design system" below |
| State management | No library. Global state is React Context (`AuthContext`, `ThemeContext`, `DataRefreshContext`); everything else is local `useState`/`useEffect` |
| API approach | Hand-rolled `fetch` wrapper (`src/components/services/api.js`, class `JEDApiService`) — no axios, no react-query, no SWR |
| Icons | lucide-react 0.548.0 |
| PWA | vite-plugin-pwa 1.3.0 (Workbox-generated service worker) |
| Linting | ESLint 9.36.0, flat config (`eslint.config.js`), React Hooks + React Refresh plugins |
| Testing | **None.** No test runner, no test files, anywhere in this repo. See `CodeBaseAudit.md` for the risk this creates |
| Other | `sharp` (dev-only, PWA icon generation script) |

## Architecture

- **Application structure:** `src/App.jsx` owns the route table and top-level layout (Header + Navigation sidebar + `<Suspense>`-wrapped route content). Every route component is `React.lazy`-loaded. Pages are organized by role/feature under `src/components/{admin,auth,common,contexts,dashboard,installation,schedule,services,settings,uploads}/` plus one root-level page (none currently — `SubmissionPage.jsx` was the only one and has been removed).
- **Routing:** `react-router-dom` v7 `<Routes>`/`<Route>` (not `createBrowserRouter`). Every protected route is gated **inline** in `App.jsx` with a ternary against `usePermissions()` output (e.g. `permissions.isAdmin ? <AdminInstallations /> : <AccessDenied />>`), not a wrapper `<ProtectedRoute>` component. `AccessDenied` renders in place at the same URL rather than redirecting.
- **Authentication:** JWT login (`POST /auth/login`, body exactly `{ phone, password }`). Token + user object persisted in `localStorage` (`jedAuthToken`, `jedUser`) via `jedApi`'s own storage methods (`storeTokens`/`storeUser`/`getAuthToken`/`getStoredUser`/`clearTokens`); `AuthContext.jsx` wraps this in React state and normalizes the role to uppercase. A 401 from any API call clears tokens automatically (`handleErrorResponse` in `api.js`). There is no `/auth/refresh-token` endpoint on the real API — a lapsed JWT just requires a fresh login.
- **Authorization:** three real roles from the API's `User.role` enum — `SUPERADMIN`, `ADMIN`, `INSTALLER` — used uppercase, as-is, throughout (no case translation, no role renaming). `src/components/auth/permissions.js` defines the permission model (`PERMISSIONS`, `ROLE_PERMISSIONS`, `PAGE_ACCESS`); `usePermissions.jsx` is the hook every component actually consumes (`isAdmin`, `isSuperAdmin`, `isInstaller`, `canViewInstallations`, etc.). **Client-side checks are a UX convenience, not the security boundary** — the real API enforces the same rules server-side (e.g. only `SUPERADMIN` can create `ADMIN`/`SUPERADMIN` accounts, per the documented `UserCreate` rule) and must continue to.
- **State management:** Context API for cross-cutting concerns (`AuthContext` — session; `ThemeContext` — light/dark, persisted to `localStorage` under `theme`; `DataRefreshContext` — a lightweight `refreshSignal` counter that mutations bump via `notifyDataChanged()` so other mounted pages re-fetch without a full reload). Everything else — form state, tab state, fetched-list state — is local to the component that needs it. There is no Redux/Zustand/Jotai and none should be introduced without a real, demonstrated need.
- **API/service layer:** `src/components/services/api.js` exports a singleton `JEDApiService` instance (`jedApi`). It owns retry/backoff, `AbortController` timeouts, in-memory response caching (`Map`, 30s TTL), auth-header attachment, and localStorage-backed token/session-deadline storage. `api.config.js` holds the endpoint path map (`ENDPOINTS`) and shared config (`API_CONFIG`, `API_UTILS`). **This is the only place that talks to the network** — components never call `fetch` directly.
- **Component architecture:** mostly one file per page/feature, each managing its own fetch/loading/error state (no shared data-fetching hook layer, no query cache beyond `jedApi`'s own 30s in-memory cache). Some files (`MeterSchedule.jsx`, `Header.jsx`) bundle several concerns into one large file — see `CodeBaseAudit.md` for specifics before assuming a refactor is risk-free.
- **Shared UI:** `src/components/common/` — `Navigation.jsx` (the single sidebar, mobile-first: off-canvas drawer below `lg`, persistent collapsible column at `lg`+), `Header.jsx` (top bar + user menu + theme toggle + profile/password modal), `ConfirmationModal.jsx` / `InfoModal.jsx` (the two modal patterns reused everywhere — Confirm/Cancel vs. single OK), `PaymentTimeline.jsx`, `GenerateRRRModal.jsx`, `ErrorBoundary.jsx`, `ErrorNotification.jsx`.
- **Data flow:** UI event → local handler → `jedApi.<method>()` → `fetch` (with retry/timeout/cache) → `handleResponse`/`handleErrorResponse` normalizes the envelope and errors → component's own `useState` holds the result → re-render. Cross-page consistency after a mutation goes through `DataRefreshContext.notifyDataChanged()`, not a shared cache invalidation library.

## UI / design system

- **Design tokens live in `tailwind.config.js`** (`theme.extend.colors.brand`, a blue scale matching `index.html`'s `theme-color` meta tag and the app's existing primary colour — 600 = primary action colour, 700 = hover/active). Semantic roles (background/surface/border/text/muted/success/warning/error) are the corresponding standard Tailwind gray/green/amber/red shades, used directly — not redefined. **Use `brand-*` for primary/interactive elements; never reintroduce a gradient for page chrome, and never give a status badge the same hue as `brand` (see `src/utils/statusBadge.js` — `INITIATED` is deliberately slate, not blue, so a status pill can't be mistaken for a clickable brand-coloured element).**
- No gradients remain in the app's chrome (sidebar, header, login, dashboard quick actions) as of the last redesign pass — if you're tempted to add one, don't; use a solid `brand-*` surface instead.
- Reuse `ConfirmationModal`/`InfoModal` for new modals rather than hand-rolling another modal shell. Reuse the existing tab pattern (see `PaymentsPage.jsx`, `MeterSchedule.jsx`, `AdminInstallations.jsx`) for any new tabbed page.

## Business workflow

Only these statuses exist on the real backend — do not invent intermediate ones:

- **Customer request status** (`JedCustomerRequest.status`): `INITIATED → PAID → COMPLETED`. That's it — no `CONFIRMED`, no `PROCESSING`, no `CANCELLED`. `INITIATED` = JED generated an RRR, not yet paid. `PAID` = Remita confirmed payment (webhook or manual admin confirm). `COMPLETED` = an installer submitted `accountNumber`/`sealNo`/`meterNo` via `POST /external/jed/complete-installation`, which also notifies JED synchronously — there is no separate "report to JED" step.
- **"Awaiting Installation" is a UI label for `PAID`, not a real backend status.** `src/utils/statusBadge.js`'s `isAwaitingInstallationStatus()`/`isCompletedStatus()` are the single source of truth for this mapping — reuse them, don't re-derive the logic elsewhere.
- **Meter inventory status:** `AVAILABLE / INSTALLED / FAULTY / RETIRED`. **Phase type:** `SINGLE PHASE / THREE PHASE`.
- **Full lifecycle:** JED submits a request (server-to-server, API key) → `POST /external/jed/generate-ref` creates the RRR (`INITIATED`) → customer pays via Remita → webhook or manual admin confirm marks it `PAID` → it appears in every installer's shared "Awaiting Installation" queue (there is no per-installer assignment — see below) → an installer opens the job and submits the completion form → `COMPLETED`.
- **There is no installer-assignment field or endpoint on the real API.** Every installer sees the identical shared queue. The Installations page (`/installations`) has real, working multi-select UI, but clicking "Assign Installer" opens an explanatory modal, not a working assignment — see `API_GAP_REPORT.md` before changing this.

## Roles

Exactly three, matching the real API's `User.role` enum (uppercase, used as-is):

- **SUPERADMIN** — everything `ADMIN` has, plus the only role permitted to create/edit `ADMIN` or `SUPERADMIN` accounts (enforced client-side in `UserManagement.jsx` **and** by the real backend).
- **ADMIN** — manages users (except privileged roles), confirms/reconciles payments, runs reports, configures meter types/settings/API keys, manages meter inventory, manages installations.
- **INSTALLER** — sees the shared "Awaiting Installation"/"Completed" queue (`InstallerDashboard.jsx`, mounted at `/dashboard` for this role), completes installs, uploads Excel files. Cannot reach `/installations`, `/users`, `/reports`, `/payments`, `/settings` — those routes are gated to `permissions.isAdmin` in `App.jsx`. The Admin/Super Admin 3-minute idle-session timeout (`src/hooks/useAdminIdleTimeout.js`) explicitly does **not** apply to Installer.

## Development rules

1. **Read `PROJECT_CONTEXT.md` before starting any non-trivial task.** It documents what's actually implemented, what's a real API gap vs. a frontend bug already fixed, and why specific design decisions were made.
2. **Inspect existing code before creating a new component, hook, or service method.** This app has already had multiple duplicate-removal passes (see `API_GAP_REPORT.md`'s "Cleaned up" sections) — check `Grep` for an existing implementation before writing a new one.
3. **Reuse existing components** — `ConfirmationModal`/`InfoModal` for modals, the shared tab pattern, `statusBadge.js` for any status-to-color mapping, `currency.js`/`date.js` for formatting. Don't reinvent formatting or badge logic per-page.
4. **Do not invent API endpoints.** Every endpoint this app calls is listed in `src/components/services/api.config.js` and cross-referenced against the live OpenAPI spec (`https://pharez-api.onrender.com/api-docs`, embedded JSON at `/api-docs/swagger-ui-init.js` — there's no separate `/api-docs.json`). If a feature needs an endpoint that doesn't exist, that's an API gap — document it in `API_GAP_REPORT.md`, don't fabricate a plausible-looking path.
5. **Do not fabricate API data.** Every stat, badge, or field shown must trace back to a real API response field. If a field the UI wants doesn't exist on the real schema, either drop it or clearly mark it as unavailable — don't compute a fake percentage or invent a plausible-looking value.
6. **Do not duplicate business logic.** Status-to-label mapping lives in `statusBadge.js`. Currency formatting lives in `utils/currency.js`. Role/permission checks go through `usePermissions()`, never a re-derived `user.role === 'ADMIN'` check scattered across components.
7. **The API is the source of truth.** Don't cache mutable business state (payment status, installation status, user list) beyond `jedApi`'s existing short-TTL in-memory cache and `DataRefreshContext`'s refetch signal. Never treat a client-computed value as authoritative if the backend disagrees.
8. **Do not use browser storage as a replacement for backend persistence.** `localStorage` here is used only for session/preference state that's legitimately client-side (JWT, active API key, theme, sidebar-collapsed, idle-session deadline) — never for business data that needs to be authoritative or cross-device (installer assignment was explicitly *not* implemented this way, twice, for exactly this reason — see `API_GAP_REPORT.md`).
9. **Preserve role-based access control.** Any new route needs an inline permission gate in `App.jsx` matching the existing pattern; any new nav item needs an `accessible(userRole)` check in `Navigation.jsx`'s `NAVIGATION_CONFIG`.
10. **Remove obsolete code when functionality is intentionally retired** — the route, the nav item, the component file(s), the now-unused permission constants, and any now-dead API method/endpoint config exclusive to that feature. Verify with a repo-wide search first; keep anything still used elsewhere (see the several "was X used elsewhere before deleting?" passes documented in `API_GAP_REPORT.md` and `PROJECT_CONTEXT.md`).
11. **Run lint and build after any non-trivial change** (`npm run lint`, `npm run build`) — there is no test suite or type checker to catch regressions otherwise, so these two commands are the only automated safety net this repo has.
12. **When adding a feature the real API doesn't support**, follow the pattern already established for installer/meter assignment: build the real, working parts (selection UI, forms, validation), and make the unsupported action open a clear explanatory modal instead of a fake success state or a `localStorage`-backed simulation.

## Where to look next

- `PROJECT_CONTEXT.md` — current feature inventory, folder structure, business rules.
- `API_GAP_REPORT.md` — every place the desired workflow can't be fully implemented against the real API, why, and what backend change would be needed.
- `CodeBaseAudit.md`, `Security.md`, `Architecture.md` — deeper structural/security/architectural review (see each for specifics; keep all of these and this file describing the *same* current system — update the relevant one(s) whenever you add, remove, or materially change a feature).
