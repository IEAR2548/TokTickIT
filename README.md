# TokTickIT - IT Service Desk Application (Lab 03)

TokTickIT is a full-stack IT Service Desk web application designed for enterprise IT support request workflows (Account & Access, Hardware, Software, Network).

**Lab 03** enhances the system with **Role-Based Access Control (RBAC)**, session authentication, an 8-state ticket lifecycle with IT triage, confidential internal notes isolation, administrator user provisioning with safety invariants, and responsive UX across Desktop, Tablet, and Mobile viewports adhering to the **Zen Green Design System**.

$$\text{React 18 (Vite + TS)} \longleftrightarrow \text{Express REST API (RBAC + Sessions)} \longleftrightarrow \text{Prisma ORM} \longleftrightarrow \text{PostgreSQL}$$

---

## 🏗️ Architecture & Tech Stack

- **Frontend (`client/`)**:
  - React 18, TypeScript, Vite, `react-router-dom` v7
  - Bootstrap 5 & Bootstrap Icons, Zen Green CSS Variables design system
  - Responsive layouts (Desktop $\ge$ 1280px, Tablet 768–850px, Mobile 375px)
- **Backend (`server/`)**:
  - Node.js, Express, TypeScript
  - Prisma ORM v7 (`@prisma/adapter-pg`), PostgreSQL
  - Security: `bcryptjs` password hashing, `jsonwebtoken` (HttpOnly cookies + Bearer token session auth), RBAC middlewares (`requireAuth`, `requireRole`, `gatePasswordChange`)
  - Storage: Multer with UUID-based local file storage for ticket attachments
- **Testing & Quality Assurance**:
  - Unit & Integration: Vitest, React Testing Library, Supertest
  - End-to-End & Responsive: Playwright (`e2e/lab-03/`) across 3 viewports (Desktop, Tablet, Mobile)
  - Visual Regression: Playwright automated visual inspection suite (`artifacts/lab-03/screenshots/`)

---

## 📁 Directory Structure

```text
toktickit/
├── client/                          # React + Vite Frontend
│   ├── src/
│   │   ├── api/                     # Type-safe API client calls (auth, tickets, staff, admin)
│   │   ├── components/              # Reusable UI (AuthGuard, Badges, AttachmentSection, etc.)
│   │   ├── context/                 # AuthContext & RequesterContext
│   │   ├── pages/                   # Application screens (Login, StaffQueue, UserManagement, etc.)
│   │   └── tests/lab-03/            # Client Vitest suites (components, styles, RBAC guards)
├── server/                          # Express + Prisma Backend REST API
│   ├── prisma/
│   │   ├── schema.prisma            # PostgreSQL schema with User, Ticket, Comments, Notes
│   │   ├── migrations/              # Prisma migration history
│   │   └── seed.ts                  # Idempotent database seeder (11 users, 16 tickets, 8 statuses)
│   ├── src/
│   │   ├── controllers/             # Request handlers (auth, tickets, staff, admin)
│   │   ├── middleware/              # Auth parsing, RBAC guards, password change gating
│   │   ├── routes/                  # Express route definitions
│   │   ├── services/                # Business logic & Prisma queries
│   │   └── validators/              # Input & password complexity validators
│   ├── storage/attachments/         # Local attachment storage (UUID filenames)
│   └── tests/lab-03/                # Server Vitest suites (unit, API integration, security)
├── e2e/lab-03/                      # Playwright E2E suites (auth, staff flow, admin, visual)
├── docs/lab-03/                     # Engineering specifications & audit artifacts
│   ├── specification.md             # Functional requirements (FR), Business Rules (BR), Decisions
│   ├── api-spec.md                  # REST API contract (Endpoints 1–29)
│   ├── ui-spec.md                   # Screen specs, tokens, data-testid, visual checklist
│   ├── tests.md                     # Test matrix, traceability, and Pass/Fail results
│   ├── reviewer.md                  # PR review history
│   └── ai-use.md                    # AI interaction logs and reflection
├── artifacts/lab-03/screenshots/    # Visual inspection screenshot evidence across 3 viewports
└── README.md
```

---

## 👥 Seed Baseline Accounts & Credentials

Per `specification.md` Decision **D-9** and **BR-38**, all seeded accounts share the local development default password:
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
| `/create-ticket` | `REQUESTER` | Create support ticket with category, priority, attachments |
| `/my-tickets` | `REQUESTER` | Requester ticket history, status pills, search & filtering |
| `/tickets/:id` | `REQUESTER` | Ticket details, public comments, attachments, resolution confirmation |
| `/staff/queue` | `IT_STAFF`, `ADMIN` | Staff triage queue (search, status/priority filters, claim case) |
| `/staff/tickets/:id` | `IT_STAFF`, `ADMIN` | Staff ticket operations (status transitions, internal notes, triage) |
| `/admin/users` | `ADMINISTRATOR` | User administration (CRUD users, password resets, active/inactive filters) |

---

## 🚀 Key API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate credentials, set HttpOnly session cookie, return user payload
- `POST /api/auth/logout`: Clear session cookie
- `GET /api/auth/me`: Current session rehydration
- `POST /api/auth/change-password`: Change password with complexity validation (BR-06, BR-07)

### Requester Operations (`/api/tickets`, `/api/attachments`)
- `POST /api/tickets`: Create new ticket (auto-assigns sequence `TK-YYYYMMDD-NNNN`)
- `GET /api/tickets`: List authenticated user's tickets (search, status, priority, sort)
- `GET /api/tickets/:id`: Retrieve ticket details (cross-requester access blocked with `403`)
- `POST /api/tickets/:id/resolve`: Requester confirms resolution (`appearsResolved` badge)
- `POST /api/tickets/:id/attachments`: Upload attachment (max 5MB, allowed MIME types)
- `PATCH /api/attachments/:id/remove`: Soft-remove attachment with non-empty reason

### Staff Operations (`/api/staff/tickets`)
- `GET /api/staff/tickets`: IT staff queue with combined filters and triage views
- `GET /api/staff/tickets/:id`: Full ticket view with public comments and internal notes
- `PATCH /api/staff/tickets/:id/claim`: Claim unassigned ticket (`NEW` $\rightarrow$ `OPEN`)
- `PATCH /api/staff/tickets/:id/assign`: Assign or reassign ticket to an IT Staff member
- `PATCH /api/staff/tickets/:id/it-priority`: Triage IT priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- `PATCH /api/staff/tickets/:id/status`: Transition ticket status according to the 8-state state machine
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

### Server Tests (Unit, Integration & Security)
```bash
cd server
npm test
```

### Client Tests (Components, Context & Responsive Styles)
```bash
cd client
npm test
```

### End-to-End Tests (Playwright)
Playwright tests verify user journeys across **Desktop (1280px)**, **Tablet (820px)**, and **Mobile (Pixel 5 / 375px)**:

```bash
# Run all Lab 3 E2E test suites (auto-starts client & server)
npx playwright test e2e/lab-03

# Run specific E2E suites
npx playwright test e2e/lab-03/authentication.spec.ts
npx playwright test e2e/lab-03/staff-ticket-flow.spec.ts
npx playwright test e2e/lab-03/user-administration.spec.ts
npx playwright test e2e/lab-03/responsive.spec.ts
npx playwright test e2e/lab-03/visual-inspection.spec.ts

# Run with interactive UI mode
npx playwright test e2e/lab-03 --ui
```

---

## 🛡️ Security & Safety Invariants

- **Session Hardening**: Sessions are stored via `HttpOnly`, `SameSite=Lax` cookies with Bearer token fallback.
- **Forced Password Change (BR-02)**: Users with `mustChangePassword=true` are locked down by `gatePasswordChange` middleware and redirected to `/change-password` before accessing protected resources.
- **Internal Note Isolation (SEC-05, SEC-06)**: `InternalNote` records are never returned to Requesters. Calling internal note endpoints as a Requester yields `403 FORBIDDEN` with zero data leakage.
- **Self-Deactivation Protection (BR-32, AC-20)**: Administrators cannot deactivate their own active accounts.
- **Last Active Administrator Protection (BR-33, AC-21)**: The system prevents deactivating or demoting the last remaining active Administrator.
- **XSS Prevention (BR-27)**: Comment and note text areas are strictly sanitized and rendered as text content.