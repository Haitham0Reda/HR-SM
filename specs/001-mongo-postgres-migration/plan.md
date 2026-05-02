# HR-SM — Spec-Kit Implementation Plan

> Structured task specifications for cheaper-model execution (Haiku / GPT-3.5 / local models).  
> This document is the output of a Sonnet-class deep review of [github.com/Haitham0Reda/HR-SM](https://github.com/Haitham0Reda/HR-SM).

---

## Project overview

| Property | Value |
|---|---|
| Stack | Node.js 18+ / Express 4 / React 19 / Redux Toolkit / PostgreSQL / Redis |
| Architecture | Multi-tenant SaaS, modular monolith, dual-namespace API |
| Modules | 14+ independent business modules |
| Total specs | 24 across 5 phases |
| Estimated effort | 240–300 hours (6–7.5 weeks) |
| Test coverage target | 85% maintained throughout |

---

## Architecture findings

| Severity | Finding |
|---|---|
| 🔴 Critical | **`.env` committed to repo.** A real `.env` file (not just `.env.example`) exists in the root, containing JWT secrets, DB credentials, and API keys. Must be rotated and purged from git history before any other work begins. |
| 🟡 Warning | **Database badge mismatch.** README badges say MongoDB 8.19.2 but `package.json` has `pg`, `sequelize`, and 20+ migration docs tracking Mongo→Postgres. Migration is in progress. All specs target Postgres exclusively. |
| 🟡 Warning | **License server not yet microserviced.** `hrsm-license-server/` exists but is started via `concurrently` in the monorepo — not a fully independent container. Phase 4 addresses this. |
| 🟡 Warning | **Frontend Redux migration incomplete.** Redux Toolkit is in deps but most components still use local state / Context API. Phase 1 breaks this into atomic tasks. |
| 🔵 Info | **E2E tests are stubs.** Cypress 15.8 and `e2e/` folder with spec subfolders exist, but most spec files are empty. Phase 3 fills them. |
| 🟢 OK | **Strong modular foundation.** 14+ modules with clear boundaries, dual-namespace API, repository pattern started, Winston logging, prom-client, PM2, and Docker Compose all present. |

### Completion by domain

| Domain | Progress |
|---|---|
| DB migration (Mongo → Postgres) | ~75% |
| Backend modules | ~80% |
| Frontend (Redux) | ~45% |
| E2E tests | ~20% |
| License microservice | ~35% |
| Security / hardening | ~60% |

---

## Pre-work — Security & cleanup (~4h, do first)

### P0-1 — Rotate and gitignore committed secrets (1h)

**Context**
- File `.env` in repo root contains real secrets (JWT_SECRET, DB creds, API keys).
- Multi-tenant SaaS — a leaked JWT_SECRET can forge tokens for all tenants.

**Tasks for model**
- Run `git filter-repo --path .env --invert-paths` to purge from history.
- Add `.env` to `.gitignore` (verify it is not already there).
- Regenerate: JWT_SECRET (256-bit), PLATFORM_JWT_SECRET, DB password, Redis password, session secret.
- Update `.env.example` with all required keys and placeholder values only.
- Verify `keys/` folder — if RSA private keys are committed, move to secrets manager.

**Acceptance criteria**
- `git log --all --full-history -- .env` returns no commits after cleanup.
- `.env` appears in `.gitignore`.
- All services start successfully with new secrets in local `.env`.

---

### P0-2 — Fix README badge mismatch and update docs (1h)

**Tasks for model**
- Replace MongoDB badge with PostgreSQL 16 in `README.md`.
- Update architecture diagrams in README to show Postgres instead of MongoDB.
- Archive or delete the 20+ `MIGRATION_*.md` files into a `docs/archive/` folder.
- Update `DOCUMENTATION_INDEX.md` to remove stale migration links.

**Files to touch**
```
README.md
DOCUMENTATION_INDEX.md
docs/ARCHITECTURE.md

→ move to docs/archive/:
  MIGRATION_*.md, CONVERSION_*.md, LEGACY_*.md, MODEL_CONVERSION_*.md
```

---

## Phase 1 — Frontend Redux Toolkit migration (46–56h)

### 1-1 — Configure Redux store for hr-app (3h)

**Context**
- `client/hr-app` — React 19, MUI 7, Axios, react-router. Redux Toolkit already in deps.
- Currently uses a mix of local state + Context API (no centralized store).

**Tasks for model**
- Create `client/hr-app/src/store/index.js` with `configureStore`.
- Add redux-persist config (localStorage) for `auth` + `user` slices only.
- Wrap `App.jsx` in `<Provider>` and `<PersistGate>`.
- Configure RTK Query base API at `client/hr-app/src/store/api.js` pointing to `/api/v1`.
- Add devtools middleware only in development.

**File structure**
```
client/hr-app/src/store/
  index.js          ← configureStore + persistor
  api.js            ← createApi base (RTK Query)
  slices/
    authSlice.js
    uiSlice.js      ← loading, notifications, sidebar state
```

**Acceptance criteria**
- Redux DevTools shows state tree in browser.
- Auth token persists across hard refresh.
- No existing component broken (snapshot tests pass).

---

### 1-2 — Migrate auth flow to authSlice (5h)

**Tasks for model**
- Create `authSlice` with state shape: `{ user, token, tenantId, role, isAuthenticated, loading, error }`.
- Add async thunks: `loginUser`, `logoutUser`, `refreshToken`.
- Wire Axios interceptor to read token from Redux store (not localStorage directly).
- Replace all `useContext(AuthContext)` calls in components with `useSelector(state => state.auth)`.
- Delete `AuthContext.jsx` once migration verified.
- Update `PrivateRoute` to read from Redux `isAuthenticated`.

**Key files to update**
```
client/hr-app/src/
  context/AuthContext.jsx       ← delete after migration
  utils/axiosInstance.js        ← update interceptor
  components/PrivateRoute.jsx   ← use Redux
  pages/Login.jsx               ← dispatch loginUser thunk
```

---

### 1-3 — RTK Query endpoints for hr-app modules (12h)

**Priority order (by usage frequency)**
1. `employeesApi` — getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee
2. `attendanceApi` — getAttendance, checkIn, checkOut, getAttendanceReport
3. `leaveApi` — getLeaves, applyLeave, approveLeave, rejectLeave
4. `payrollApi` — getPayroll, processPayroll, getPayslip
5. `tasksApi` — getTasks, createTask, updateTask, assignTask
6. `documentsApi` — getDocuments, uploadDocument, deleteDocument

**Pattern to follow for each endpoint file**
```js
// client/hr-app/src/store/api/employeesApi.js
import { baseApi } from '../api';

export const employeesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: (params) => ({ url: '/users', params }),
      providesTags: ['Employees'],
    }),
    createEmployee: builder.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['Employees'],
    }),
    // ...
  }),
});

export const { useGetEmployeesQuery, useCreateEmployeeMutation } = employeesApi;
```

---

### 1-4 — Redux store for platform-admin app (8h)

**Differences from hr-app**
- Uses `/api/platform/*` base URL (separate from tenant API).
- Auth uses `platformAuthSlice` — separate JWT namespace.
- Endpoints: `tenantsApi`, `subscriptionsApi`, `modulesApi`, `licensesApi`, `analyticsApi`.
- Role: only platform admins — simpler RBAC than hr-app.

**Tasks for model**
- Copy store structure from spec 1-1 but configure for platform-admin path.
- Create `platformAuthSlice` (mirrors authSlice but with `platformToken`).
- Generate RTK Query endpoints for all 5 platform API resource groups.
- Replace all platform-admin axios calls.

---

## Phase 2 — Repository pattern completion (58–68h)

### 2-1 — Audit current data access patterns (4h)

**Tasks for model**
- Search `server/` for direct `sequelize.query`, `Model.findAll`, raw `pg` pool queries outside repository files.
- Output a CSV: filename, line number, operation type (SELECT/INSERT/UPDATE/DELETE), module name.
- Flag any controller files doing multi-model joins (N+1 risk).
- Identify which modules already have repositories vs which have none.

**Output artifact**
```
docs/audit-data-access.csv
Columns: module, file, line, operation, has_repo, risk_level
```

---

### 2-2 — Harden BaseRepository with tenant scoping (6h)

**Context**
- Tenant data isolation is the core security guarantee of the platform.
- Any query that forgets `WHERE tenant_id = ?` leaks cross-tenant data.

**Tasks for model**
- Update `server/repositories/BaseRepository.js` — constructor receives `tenantId`.
- All `find*`, `create`, `update`, `delete` methods append `WHERE company_id = this.tenantId`.
- Add `assertTenantId()` guard that throws if `tenantId` is null/undefined.
- Add `withTenant(tenantId)` factory method used by middleware.
- Write unit tests: verify query SQL includes `tenant_id` in WHERE clause.

**Pattern**
```js
class BaseRepository {
  constructor(model, tenantId) {
    this.model = model;
    this.tenantId = tenantId;
    this.assertTenantId();
  }

  assertTenantId() {
    if (!this.tenantId) throw new Error('tenantId is required');
  }

  findAll(where = {}) {
    return this.model.findAll({
      where: { ...where, company_id: this.tenantId }
    });
  }

  findById(id) {
    return this.model.findOne({
      where: { id, company_id: this.tenantId }
    });
  }
}
```

---

### 2-3 — Implement repositories for all 14 modules (24h)

**Modules to cover (priority order)**
1. `UserRepository` (hr-core) — most used, highest risk if wrong
2. `AttendanceRepository` — complex queries, date ranges, device sync
3. `LeaveRepository` — approval workflow state machine
4. `PayrollRepository` — financial data, must be transactional
5. `TaskRepository`, `DocumentRepository`, `NotificationRepository`
6. `MissionRepository`, `OvertimeRepository`, `HolidayRepository`
7. `SurveyRepository`, `EventRepository`, `ClinicRepository`
8. `InsuranceRepository`, `RequestRepository`

**File naming convention**
```
server/repositories/
  BaseRepository.js
  UserRepository.js
  AttendanceRepository.js
  LeaveRepository.js
  PayrollRepository.js
  TaskRepository.js
  DocumentRepository.js
  ... (one per module)
```

**Each file must include**
- Extends `BaseRepository`.
- Module-specific query methods (e.g., `findByEmployeeAndDateRange` for attendance).
- Transaction-aware methods (Sequelize `transaction` option) for financial ops.
- JSDoc comments with param types and return types.

---

### 2-4 — Refactor controllers to use repositories only (16h)

**Rules for model**
- Controllers may ONLY call service methods or repository methods — never Sequelize directly.
- Instantiate repository via `new UserRepository(req.tenantId)` — never pass raw model.
- Remove all `require('../models/...')` from controller files.
- Services may use repositories but must not do raw SQL.
- Run existing unit tests after each module refactor — must stay green.

---

## Phase 3 — E2E test coverage (61–74h)

### 3-1 — E2E test fixtures and helpers (8h)

**Tasks for model**
- Create `e2e/fixtures/users.json` — one user per role (admin, hr_manager, manager, employee).
- Create `e2e/fixtures/tenants.json` — 2 test tenants for isolation testing.
- Add `cy.loginAs(role)` custom command using API login (not UI) for speed.
- Add `cy.seedTenant(tenantId)` command that hits test-only `/api/v1/test/seed` endpoint.
- Add `cy.cleanupTenant(tenantId)` for teardown.
- Configure `cypress.env.json` with `HR_APP_URL` and `PLATFORM_APP_URL`.

---

### 3-2 — Auth E2E specs (6h)

**Spec file:** `e2e/specs/auth/login.cy.js`

**Test cases**
- Valid credentials → redirects to dashboard with correct role menu.
- Invalid credentials → shows error message, no redirect.
- JWT expiry → redirects to login, session message shown.
- Employee cannot access `/admin` routes → 403 redirect.
- Platform login (`/platform/login`) uses separate token namespace.
- Logout clears Redux state and redirects to `/login`.

---

### 3-3 — HR workflow E2E specs (18h)

**Attendance flow**
- Employee checks in → status shows "Present" in attendance list.
- HR Manager views attendance report filtered by department and date range.
- Manual attendance correction by HR → audit log entry created.

**Leave flow**
- Employee submits annual leave request → status "Pending".
- Manager approves → employee receives notification → status "Approved".
- HR Manager rejects with reason → reason visible to employee.
- Leave balance decrements correctly after approval.

**Payroll flow**
- HR runs payroll for current month → payslips generated for all active employees.
- Employee views and downloads own payslip PDF.
- Payroll locked after processing — no edits allowed.

---

### 3-4 — Multi-tenant isolation E2E specs (10h)

**Critical test cases**
- Seed Employee A in Tenant-1 and Employee B in Tenant-2.
- Login as Tenant-1 admin → employee list must NOT contain Employee B.
- Direct API call with Tenant-1 JWT to `/api/v1/users/<tenant2_employee_id>` → 404.
- Tenant-1 admin cannot view Tenant-2's payroll, documents, or attendance.
- Platform admin CAN see both tenants' data via `/api/platform/*`.

> **Note for spec-kit:** A cheaper model executing specs 2-2 and 2-3 MUST have these E2E tests as regression gates. Run this suite after every repository refactor in Phase 2.

---

### 3-5 — Platform admin E2E specs (8h)

**Test cases**
- Super Admin creates new tenant → tenant appears in list, default modules enabled.
- Super Admin disables payroll module for tenant → tenant HR user cannot access payroll routes.
- Super Admin changes subscription tier → rate limits update accordingly.
- License expiry → tenant users see "subscription expired" screen.
- Platform admin views usage analytics dashboard → charts render with real data.

---

## Phase 4 — License server microservization (51–62h)

### 4-1 — Extract license server as standalone service (16h)

**Current state**
- `hrsm-license-server/` has its own folder but is started as part of monorepo `npm run dev`.
- No independent Docker container or deployment pipeline.
- License validation called directly by main server (tight coupling).

**Target state**
- Standalone Express app on port 4000 with its own Postgres database.
- Main server calls license service via HTTP: `GET /validate/{licenseKey}`.
- License service issues and validates RSA-signed JWT license tokens.
- Independent Dockerfile: `hrsm-license-server/Dockerfile`.
- Added as service to `docker-compose.production.yml`.

**API contract**
```
POST   /licenses                 → generate license
GET    /licenses/:key/validate   → validate + return features
PUT    /licenses/:key/revoke     → revoke license
GET    /health                   → liveness probe
```

---

### 4-2 — License validation middleware in main server (8h)

**Tasks for model**
- Create `server/middleware/licenseMiddleware.js`.
- On each tenant request: check Redis cache first (TTL 5min), else call license service.
- Cache schema: `license:{tenantId}` → `{ valid: true, features: [...], expiresAt }`.
- If license invalid → 402 Payment Required with JSON error body.
- If license service unreachable → fail-open with warning log (don't block users).
- Circuit breaker: after 5 failures, skip license checks for 60s.

---

### 4-3 — Module feature-flag enforcement via license (10h)

**Tasks for model**
- Add `moduleGuard(moduleName)` middleware factory.
- Each optional module's router prefixed with `moduleGuard('payroll')` etc.
- Module list synced from license server features array.
- Frontend: RTK Query `useGetLicenseQuery` → conditionally render nav items.
- Add E2E test: disable payroll module → `/payroll` routes return 403.

**Module guard pattern**
```js
// server/middleware/moduleGuard.js
export const moduleGuard = (module) => (req, res, next) => {
  const features = req.licenseFeatures; // set by licenseMiddleware
  if (!features.includes(module)) {
    return res.status(403).json({ error: `Module '${module}' not enabled` });
  }
  next();
};
```

---

### 4-4 — Production Docker Compose with all services (8h)

**Services in `docker-compose.production.yml`**
- `postgres` — official `postgres:16-alpine`, volume mapped, env vars from secrets.
- `redis` — official `redis:7-alpine` with password auth.
- `license-server` — builds from `hrsm-license-server/Dockerfile`, port 4000.
- `api-server` — builds from root `Dockerfile`, port 5000, `depends_on` postgres + redis + license-server.
- `hr-app` — nginx serving built React app, port 3000.
- `platform-admin` — nginx serving built React app, port 3001.
- `nginx-proxy` — reverse proxy with SSL termination.

**Health check pattern for each service**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Phase 5 — Performance & observability (bonus, ~20h)

### 5-1 — Wire prom-client metrics to Grafana (8h)

`prom-client` is already in `dependencies` — needs wiring only.

**Tasks for model**
- Add `GET /metrics` endpoint (prom-client default registry).
- Custom metrics: `http_request_duration_ms` (histogram), `tenant_active_users` (gauge), `license_validation_errors_total` (counter).
- Add Prometheus + Grafana services to `docker-compose.production.yml`.
- Import pre-built Node.js dashboard (Grafana ID 11159).
- Create alert: p95 latency > 500ms for any `/api/v1/*` endpoint.

---

### 5-2 — Database query optimization (12h)

**Tasks for model**
- Run `EXPLAIN ANALYZE` on all queries flagged in spec 2-1 audit.
- Create migration file adding composite indexes: `(company_id, created_at)` on `attendance`, `leave`, `tasks` tables.
- Fix N+1 in attendance report: replace loop queries with single JOIN.
- Add connection pool config: max 20 connections, idle timeout 10s.
- Enable `pg_stat_statements` extension for slow query logging.

---

## Timeline

| Week | Focus | Specs |
|---|---|---|
| 1 | Security + pre-work | P0-1, P0-2 |
| 2 | Redux foundation | 1-1, 1-2, start 1-3 |
| 3 | Redux complete | 1-3 (finish), 1-4 |
| 4 | Repository layer | 2-1, 2-2, start 2-3 |
| 5 | Repository + E2E start | 2-3 (finish), 2-4, 3-1 |
| 6 | E2E coverage | 3-2, 3-3, 3-4, 3-5 |
| 7 | License microservice | 4-1, 4-2, 4-3, 4-4 |
| 8+ | Performance (optional) | 5-1, 5-2 |

---

## Model routing guide

The point of the spec-kit is that this Sonnet-class review only happens once. Every spec is scoped so a cheap model can execute it without architecture judgment.

| Spec(s) | Recommended model | Why it fits | Prompt tip |
|---|---|---|---|
| P0-1 (secrets) | Any + human review | Shell commands + git — trivial execution, but human must verify before push | Give it the exact file list and commands to run |
| P0-2 (docs) | Haiku / GPT-3.5 | Pure text editing — find/replace content in markdown files | Give it the list of files and the exact replacements |
| 1-1, 1-4 (store setup) | Haiku | Boilerplate — well-known RTK pattern, exact file paths in spec | Paste the "File structure" section directly as context |
| 1-2 (auth migration) | Haiku | Mechanical search-and-replace of Context → Redux | Provide authSlice template; model fills in component-level `useSelector` calls |
| 1-3 (RTK endpoints) | Haiku | Repetitive — one pattern applied to 6 resource types | Give it the code template and the list of endpoints per resource |
| 2-1 (audit) | Haiku / grep scripts | Text search task — model reads files and outputs a CSV | "Scan server/ for these patterns, output CSV with columns: …" |
| 2-2 (BaseRepository) | Haiku | Single file, clear pattern provided in spec | Paste the code-block from the spec as the starting template |
| 2-3 (14 repos) | Haiku × 14 | Run one model call per module — give it BaseRepository + module's Sequelize model | "Generate a UserRepository extending BaseRepository for these methods: …" |
| 2-4 (controllers) | Haiku | Mechanical refactor — remove model imports, replace with `new XRepository(req.tenantId)` | One controller at a time; provide the corresponding repo interface |
| 3-1 (fixtures) | Haiku | JSON fixtures and simple Cypress custom commands — templatable | Provide the fixture schema and command signatures |
| 3-2 to 3-5 (E2E specs) | Haiku | Cypress spec writing — test cases are fully enumerated in the spec | Give it the fixture helpers + the bulleted test cases from each spec |
| 4-1 (extract service) | **Sonnet** | Architecture change — requires understanding coupling in existing code | Only this spec needs a smarter model |
| 4-2, 4-3 (middleware) | Haiku | Clear pattern in spec, single responsibility middleware functions | Paste the code block from each spec as the starting scaffold |
| 4-4 (Docker Compose) | Haiku | YAML generation — highly templatable | Give it the service list and health check pattern from the spec |
| 5-1, 5-2 (perf) | Haiku / SQL tools | Metrics wiring is boilerplate; SQL optimization needs EXPLAIN output as context | Paste EXPLAIN ANALYZE output as context for index recommendations |

### Universal prompt template

Copy this template when delegating any spec to a cheaper model:

```
You are a senior Node.js developer.

Task: [paste spec title]

Context:
[paste spec Context section]

Files to create/edit:
[paste spec file structure]

Pattern to follow:
[paste spec code-block]

Acceptance criteria:
[paste spec AC]

Rules:
- Do not modify any files outside the listed scope.
- Run existing tests after changes — do not break them.
- Follow the pattern exactly; do not invent architecture.
```

---

*Generated by deep review of HR-SM · May 2026*