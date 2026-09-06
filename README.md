# TokTickIT - IT Service Desk Application (Lab 02)

TokTickIT is an IT Service Desk web application designed for handling IT support requests (Account & Access, Hardware, Software, Network).

Lab 02 delivers a complete Requester-facing ticketing experience adhering to the **Zen Green Theme** across desktop, tablet, and mobile viewports.

$$\text{React UI (Vite)} \longleftrightarrow \text{Express REST API} \longleftrightarrow \text{Prisma ORM} \longleftrightarrow \text{PostgreSQL Database}$$

---

## 🏗️ Project Architecture & Tech Stack

- **Frontend (`client/`)**: React 18, TypeScript, Vite, `react-router-dom` v7, Bootstrap 5, Zen Green CSS Variables design system
- **Backend (`server/`)**: Node.js, Express, TypeScript, Prisma ORM (v7 with `@prisma/adapter-pg`), Multer (file upload storage)
- **Database**: PostgreSQL
- **Testing**:
  - Unit & Integration: Vitest, React Testing Library, Supertest
  - End-to-End & Responsive: Playwright (`e2e/lab-02/`)

---

## 📁 Directory Structure

```text
toktickit/
├── client/                      # Frontend Application (React + Vite + TS)
│   ├── src/
│   │   ├── api/                 # API client calls (tickets, requesters, referenceData)
│   │   ├── components/          # Reusable UI components (Badge, RequesterBadge, AttachmentSection, etc.)
│   │   ├── context/             # RequesterContext (session-based dev identity)
│   │   ├── pages/               # Screens (RequesterSelection, CreateTicket, MyTickets, RequesterTicketDetail)
│   │   └── tests/lab-02/        # Client unit, component, and style tests
├── server/                      # Backend REST API (Express + Prisma)
│   ├── prisma/                  # Prisma Schema & Database Seeder
│   │   ├── schema.prisma        # PostgreSQL data models
│   │   └── seed.ts              # Idempotent seed data (categories, systems, requesters)
│   ├── storage/attachments/     # UUID-based local file storage
│   ├── src/                     # Express controllers, services, routes, validators
│   └── tests/lab-02/            # Server unit & API integration tests
├── e2e/lab-02/                  # Playwright E2E and responsive test specs
├── docs/lab-02/                 # Engineering specifications, test plan, UI/API specs
└── README.md
```

---

## 🚀 Key API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/requesters` | List active Development Requesters |
| `GET` | `/api/categories` | List active request Categories |
| `GET` | `/api/related-systems` | List active Related Systems |
| `POST` | `/api/tickets` | Create a new Ticket (validates fields, generates `TK-YYYYMMDD-NNNN`) |
| `GET` | `/api/tickets` | Paginated ticket list for `requesterId` with search, filter, and sort |
| `GET` | `/api/tickets/:id` | Retrieve single ticket details (ownership-protected) |
| `POST` | `/api/tickets/:id/attachments` | Upload attachment (JPG/PNG/WEBP/PDF, max 5MB, max 5 active) |
| `GET` | `/api/tickets/:id/attachments` | List attachment metadata for a ticket |
| `GET` | `/api/attachments/:id/download` | Download active attachment file stream (ownership-checked) |
| `PATCH` | `/api/attachments/:id/remove` | Soft-remove attachment with non-empty reason |

---

## ⚙️ Setup & Running Instructions

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** database server running locally

---

### 2. Backend Setup (`server/`)

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Configure environment variables in `server/.env`:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/toktickit?schema=public"
   PORT=5000
   ```

3. Run migrations and seed data:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. Start development server (runs on `http://localhost:5000`):
   ```bash
   npm run dev
   ```

---

### 3. Frontend Setup (`client/`)

1. Install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Start development server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

---

## 🧪 Running Automated Tests

### Server Tests (Unit & API Integration)
```bash
cd server
npm test
```

### Client Tests (Component & Style)
```bash
cd client
npm test
```

### End-to-End & Responsive Tests (Playwright)
```bash
# Run all E2E & responsive tests
npx playwright test e2e/lab-02

# Run with interactive UI
npx playwright test e2e/lab-02 --ui
```