# TokTickIT - IT Service Desk Application

TokTickIT is an enterprise full-stack IT Service Desk web application designed for IT support request workflows (Account & Access, Hardware, Software, Network).

**Lab 04** extends the platform with **Actions Taken resolution auditing**, a **formal 8-state transition matrix with resolution gates**, **optimistic concurrency control (OCC)** against conflicting concurrent edits, **role-based summary dashboards** (`/dashboard`), **advisory resolution flags**, and hardened responsive UX across Desktop, Tablet, and Mobile viewports adhering to the **Zen Green Design System**.

$$\text{React 18 (Vite + TS)} \longleftrightarrow \text{Express REST API (RBAC + OCC + Auditing)} \longleftrightarrow \text{Prisma ORM} \longleftrightarrow \text{PostgreSQL}$$

---

## 🏗️ Architecture & Tech Stack

- **Frontend (`client/`)**:
  - React 18, TypeScript, Vite, `react-router-dom` v7
  - Bootstrap 5 & Bootstrap Icons, Zen Green CSS Variables design system
  - Responsive layouts (Desktop $\ge$ 1280px, Tablet 768–1024px, Mobile 375px)
  - Components: `ActionsTaken` panel & timeline, `TicketWorkflow` transition & resolution modal, `StaffDashboard`, `RequesterDashboard`, `MetricCard`
- **Backend (`server/`)**:
  - Node.js, Express, TypeScript
  - Prisma ORM v7 (`@prisma/adapter-pg`), PostgreSQL
  - Security & Governance: `bcryptjs` password hashing, `jsonwebtoken` (HttpOnly cookies + Bearer token session auth), RBAC middlewares (`requireAuth`, `requireRole`, `gatePasswordChange`)
  - Concurrency & Reliability: Optimistic Concurrency Control (`expectedUpdatedAt` / `STALE_UPDATE`), client-supplied `Idempotency-Key` headers with 5-second in-memory deduplication fallback (BR-17)
  - Storage: Multer with UUID-based local file storage for ticket attachments
- **Testing & Quality Assurance**:
  - Unit & Integration: Vitest, React Testing Library, Supertest (35 server test files / 291 tests, 26 client test files / 115 tests — 100% passing)
  - End-to-End & Responsive: Playwright (`e2e/lab-04/`) across 3 viewports (Desktop 1280px, Tablet 820px, Mobile 375px)
  - Visual Evidence: Automated screenshot capture suite (`artifacts/lab-04/screenshots/`)

---

## 📁 Directory Structure

```text
toktickit/
├── client/                          # React + Vite Frontend
│   ├── src/
│   │   ├── api/                     # Type-safe API clients (auth, tickets, staff, admin, dashboard, actions)
│   │   ├── components/              # Reusable UI (AuthGuard, Badges, ActionsTaken, TicketWorkflow, etc.)
│   │   │   └── dashboard/           # DashboardShared, MetricCard, RecentTicketsPanel, useDashboardResource
│   │   ├── context/                 # AuthContext & RequesterContext
│   │   ├── pages/                   # Application screens (Login, StaffQueue, RequesterDashboard, StaffDashboard, etc.)
│   │   └── tests/lab-04/            # Client Vitest suites (ActionsTaken, TicketWorkflow, Dashboards)
│   └── package.json
├── server/                          # Express + Prisma Backend REST API
│   ├── prisma/
│   │   ├── schema.prisma            # PostgreSQL schema (User, Ticket, ActionTaken, Comments, Notes)
│   │   ├── migrations/              # Prisma migration history (including ActionTaken & index optimizations)
│   │   └── seed.ts                  # Idempotent database seeder (11 users, 16 tickets, actions taken fixtures)
│   ├── src/
│   │   ├── controllers/             # Request handlers (auth, tickets, staff, admin, dashboard, actions)
│   │   ├── middleware/              # Auth parsing, RBAC guards, password change gating
│   │   ├── routes/                  # Express route definitions
│   │   ├── services/                # Business logic & Prisma queries (dashboard, actions, tickets)
│   │   └── validators/              # Input, transition matrix, and actions-taken validators
│   ├── storage/attachments/         # Local attachment storage (UUID filenames)
│   └── tests/lab-04/                # Server Vitest suites (unit, API integration, workflow, perf smoke)
├── e2e/                             # Playwright E2E suites
│   ├── lab-02/                      # Requester workflow regression
│   ├── lab-03/                      # Authentication, staff queue, and user administration regression
│   └── lab-04/                      # Actions Taken, dashboards, ticket resolution, and screenshot specs
├── docs/lab-04/                     # Engineering specifications & audit artifacts
│   ├── specification.md             # Functional requirements (FR), Business Rules (BR), Assumptions
│   ├── api-spec.md                  # REST API contract (Actions Taken, Ticket Status, Dashboards)
│   ├── ui-spec.md                   # Screen specs, tokens, data-testid, visual checklist
│   ├── tests.md                     # Test matrix, traceability, and 100% Pass/Fail execution logs
│   ├── reviewer.md                  # PR peer review history
│   └── ai-use.md                    # AI interaction logs and reflection
├── artifacts/lab-04/screenshots/    # Multi-viewport screenshot evidence (desktop, tablet, mobile)
└── README.md
```

---

## 👥 Seed Baseline Accounts & Credentials

All seeded accounts share the local development default password:
- **Default Password:** `DevPass@2026!` *(meets BR-07: $\ge$8 chars, uppercase, lowercase, number, special char)*

| Role | Name | Email | Initial Status | First-Time Password Change |
| :--- | :--- | :--- | :--- | :--- |
| **`ADMINISTRATOR`** | Alex Morgan | `alex.morgan@example.com` | Active | Required (`mustChangePassword=true`) |
| **`IT_STAFF`** | Samira Chen | `samira.chen@example.com` | Active | Not required (`mustChangePassword=false`) |
| **`IT_STAFF`** | Marcus Vance | `marcus.vance@example.com` | Active | Required (`mustChangePassword=true`) |
| **`IT_STAFF`** | Liam O'Connor | `liam.oconnor@example.com` | Active | Required (`mustChangePassword=true`) |
| **`IT_STAFF`** | Dana Scully | `dana.scully@example.com` | Inactive | - |
| **`REQUESTER`** | Alice Tanaka | `alice.tanaka@example.com` | Active | Required (`mustChangePassword=true`) |
| **`REQUESTER`** | Bob Chavez | `bob.chavez@example.com` | Active | Required (`mustChangePassword=true`) |
| **`REQUESTER`** | Eve Former | `eve.former@example.com` | Inactive | - |

---

## 🌐 Application Pages & Routes

| URL Route | Allowed Roles | Description |
| :--- | :--- | :--- |
| `/login` | Public | Sign in with email and password |
| `/change-password` | Authenticated | Mandatory password change screen (enforced on first-time login) |
| `/dashboard` | Authenticated | Role-aware dashboard (renders `RequesterDashboard` or `StaffDashboard`) |
| `/create-ticket` | `REQUESTER` | Create support ticket with category, priority, attachments |
| `/my-tickets` | `REQUESTER` | Requester ticket history, status pills, search & filtering (supports `?status=...`) |
| `/tickets/:id` | `REQUESTER` | Ticket details, public comments, attachments, Actions Taken (read-only), advisory looks-resolved toggle |
| `/staff/queue` | `IT_STAFF`, `ADMIN` | Staff triage queue (search, status/priority filters, claim case, supports pre-filters `?status=...&owner=me`) |
| `/staff/tickets/:id` | `IT_STAFF`, `ADMIN` | Staff ticket operations (status transitions with confirmation dialogs, Actions Taken CRUD, internal notes) |
| `/admin/users` | `ADMINISTRATOR` | User administration (CRUD users, password resets, active/inactive filters) |

---

## 🚀 Key API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate credentials, set HttpOnly session cookie, return user payload
- `POST /api/auth/logout`: Clear session cookie
- `GET /api/auth/me`: Current session rehydration
- `POST /api/auth/change-password`: Change password with complexity validation

### Role Dashboards (`/api/dashboard`) *(New in Lab 4)*
- `GET /api/dashboard/requester`: Summary metrics for authenticated Requester (`open`, `inProgress`, `resolved`, `closed` mutually exclusive per BR-11) + 5 recent tickets (BR-13)
- `GET /api/dashboard/staff`: Summary metrics for IT Staff/Admin (`new`, `open` including `Reopened` per BR-12, `inProgress`, `waitingForRequester`, and overlapping `myAssigned`) + 5 recent tickets

### Actions Taken (`/api/tickets/:ticketId/actions`) *(New in Lab 4)*
- `GET /api/tickets/:ticketId/actions`: List audit history for a ticket (read-only for Requester owner; full access for IT Staff/Admin)
- `POST /api/tickets/:ticketId/actions`: Create action taken (requires `Idempotency-Key` header, enforces 5s deduplication fallback, rejects if ticket is `Cancelled`)
- `PATCH /api/tickets/:ticketId/actions/:actionId`: Update action taken (enforces 15-minute edit window for creator per BR-10; Administrator bypass; checks `expectedUpdatedAt` for OCC)

### Ticket Workflow & Lifecycle (`/api/tickets/:id`) *(New in Lab 4)*
- `PATCH /api/tickets/:id/status`: Transition ticket status according to §5.1 state matrix (enforces Resolution Gate BR-06/07 requiring non-empty resolution summary and $\ge 1$ Action Taken; Optimistic Concurrency Control checks `expectedUpdatedAt` returning `409 STALE_UPDATE`)
- `PATCH /api/tickets/:id/appears-resolved`: Requester advisory toggle (does not alter ticket status; automatically resets to `false` when reopened or edited per BR-16)

### Requester Operations (`/api/tickets`, `/api/attachments`)
- `POST /api/tickets`: Create new ticket (auto-assigns sequence `TK-YYYYMMDD-NNNN`)
- `GET /api/tickets`: List authenticated user's tickets (search, status, priority, sort)
- `GET /api/tickets/:id`: Retrieve ticket details (cross-requester access blocked with `403`)
- `POST /api/tickets/:id/attachments`: Upload attachment (max 5MB, allowed MIME types)
- `PATCH /api/attachments/:id/remove`: Soft-remove attachment with non-empty reason

### Staff Operations (`/api/staff/tickets`)
- `GET /api/staff/tickets`: IT staff queue with combined filters and triage views
- `GET /api/staff/tickets/:id`: Full ticket view with public comments and internal notes
- `PATCH /api/staff/tickets/:id/claim`: Claim unassigned ticket (`NEW` $\rightarrow$ `OPEN`, returns fresh `updatedAt`)
- `PATCH /api/staff/tickets/:id/assign`: Assign or reassign ticket to an IT Staff member (returns fresh `updatedAt`)
- `PATCH /api/staff/tickets/:id/it-priority`: Triage IT priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, returns fresh `updatedAt`)
- `POST /api/staff/tickets/:id/notes`: Post confidential internal note (strictly isolated from Requesters)
- `POST /api/staff/tickets/:id/comments`: Post staff comment visible to Requester

### Admin User Management (`/api/admin/users`)
- `GET /api/admin/users`: List users with substring search, role filter, and `isActive` status filter
- `POST /api/admin/users`: Provision new user with random/temp password and `mustChangePassword=true`
- `PATCH /api/admin/users/:id`: Edit user name, role, and active status (enforces safety invariants)
- `POST /api/admin/users/:id/reset-password`: Reset user password (forces change on next login)

---

## ⚙️ Setup & Running Instructions

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** database server running locally

---

### 2. Backend Setup (`server/`)

1. Navigate to the server folder and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Configure environment variables in `server/.env`:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/toktickit?schema=public"
   PORT=5000
   JWT_SECRET="your-super-secret-jwt-key"
   NODE_ENV="development"
   ```

3. Run migrations and seed baseline data:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. Start development API server (runs on `http://localhost:5000`):
   ```bash
   npm run dev
   ```

---

### 3. Frontend Setup (`client/`)

1. Navigate to the client folder and install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Start development Vite server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

---

## 🧪 Running Automated Tests

### Server Tests (Unit, Integration, Workflow & Performance Smoke)
```bash
cd server
npm test
```
*Executes 35 test suites (291 tests) covering transition matrices, actions taken validation, dashboard metrics, authorization matrices, seed idempotency, and database performance.*

### Client Tests (Components, Context, Dashboards & Transitions)
```bash
cd client
npm test
```
*Executes 26 test suites (115 tests) covering `RequesterDashboard`, `StaffDashboard`, `ActionsTaken`, `TicketWorkflow`, badges, and auth guards.*

### End-to-End Tests (Playwright)
Playwright tests verify complete workflows across **Desktop (1280px)**, **Tablet (820px)**, and **Mobile (Pixel 5 / 375px)**:

```bash
# Run all Lab 4 E2E test suites (auto-starts client & server)
npx playwright test e2e/lab-04

# Run specific Lab 4 test suites
npx playwright test e2e/lab-04/dashboards.spec.ts           # Responsive reflow and a11y focus rings
npx playwright test e2e/lab-04/actions-taken-flow.spec.ts   # Actions Taken creation, validation, deduplication
npx playwright test e2e/lab-04/ticket-resolution.spec.ts   # Status transitions, OCC conflict banners, resolution gate
npx playwright test e2e/lab-04/screenshots.lab4.spec.ts    # Multi-viewport screenshot generation

# Run regression tests for earlier labs
npx playwright test e2e/lab-02
npx playwright test e2e/lab-03

# Run with interactive UI mode
npx playwright test --ui
```

---

## 🛡️ Security, Concurrency & Governance Invariants

- **Optimistic Concurrency Control (OCC / BR-14)**: Ticket and Action Taken updates require `expectedUpdatedAt`. Stale tokens trigger `409 STALE_UPDATE`. The client distinguishes between actual external conflicts (warning banner) and self-retry duplicate submissions (silent sync) per §10.1 and AC-16.
- **Idempotency & Deduplication (BR-17, FR-15)**: `POST /actions` mandates an `Idempotency-Key` header with automatic replay return, supplemented by a 5-second fallback deduplication window.
- **Resolution Gate (BR-06, BR-07)**: Tickets cannot move to `Resolved` or `Closed` without a non-empty `resolutionSummary` and at least one logged Action Taken.
- **Action Edit Time-Window (BR-10)**: Creators may edit an Action Taken only within 15 minutes of creation. Administrators retain permanent edit privilege.
- **Session Hardening & Isolation**: Sessions use `HttpOnly`, `SameSite=Lax` cookies. Internal notes are strictly isolated from Requesters (`403 FORBIDDEN` with zero leakage).
- **Administrative Safety Invariants**: Self-deactivation and demotion/deactivation of the last remaining active Administrator are strictly blocked.
- **XSS & Content Sanitization**: All rich user inputs, notes, summaries, and descriptions are strictly sanitized before rendering.