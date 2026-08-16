# TokTickIT - IT Service Desk Application (Lab 01)

TokTickIT is an IT Service Desk web application designed for handling IT support requests such as Account & Access, Hardware, Software, and Network issues.

Lab 01 demonstrates a complete full-stack **vertical slice** proving integration across all layers of the technology stack:
$$\text{React UI (Vite)} \longrightarrow \text{Express REST API} \longrightarrow \text{Prisma ORM} \longrightarrow \text{PostgreSQL Database}$$

---

## 🏗️ Project Architecture & Tech Stack

- **Frontend (`client/`)**: React 18, TypeScript, Vite, Bootstrap 5, `@testing-library/react`, Vitest
- **Backend (`server/`)**: Node.js, Express, TypeScript, Prisma ORM (v7 with `@prisma/adapter-pg`), Supertest, Vitest
- **Database**: PostgreSQL
- **Testing Tools**: Vitest (UI & Integration tests), Supertest (HTTP assertions)

---

## 📁 Project Directory Structure

```text
toktickit/
├── client/                      # Frontend Application (React + TypeScript + Vite)
│   ├── src/
│   │   ├── App.tsx              # Main UI component handling system status & categories
│   │   └── tests/
│   │       └── lab-01/          # UI Component Tests (Vitest + Testing Library)
│   │           ├── CategoryList.test.tsx
│   │           ├── ErrorHandling.test.tsx
│   │           ├── Heading.test.tsx
│   │           └── HealthStatus.test.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                      # Backend REST API (Express + TypeScript + Prisma)
│   ├── prisma/                  # Prisma Schema & Database Seeder
│   │   ├── schema.prisma        # Category model schema
│   │   └── seed.ts              # Idempotent seed script
│   ├── src/
│   │   ├── app.ts               # Express application routes & Prisma client setup
│   │   └── index.ts             # Server entry point
│   ├── tests/
│   │   └── lab-01/              # API Integration Tests (Supertest + Vitest)
│   │       ├── categories.test.ts
│   │       └── health.test.ts
│   ├── prisma.config.ts         # Prisma v7 environment configuration
│   └── package.json
├── docs/
│   └── lab-01/                  # Lab 01 Documentation
│       ├── ai_use.md            # AI prompt reflections & usage logs
│       ├── reviewer.md          # Peer reviewer details & PR links
│       └── tests.md             # Required automated test matrix summary
├── README.md
└── .gitignore
```

---

## 🚀 API Endpoints Summary

| Method | Endpoint | Description | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System health check endpoint | `HTTP 200` — `{ "status": "ok", "service": "TokTickIT API" }` |
| `GET` | `/api/categories` | Retrieve IT request categories | `HTTP 200` — Array of 4 categories: `[{"id": 1, "name": "Account and Access"}, ...]` |

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
   ```

3. Run Prisma migration and seed the database:
   ```bash
   # Apply database migrations
   npx prisma migrate dev --name init

   # Seed initial IT categories
   npx prisma db seed
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The server runs on `http://localhost:5000`.

---

### 3. Frontend Setup (`client/`)

1. Open a new terminal, navigate to the client folder, and install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend runs on `http://localhost:5173`.

---

## 🧪 Running Automated Tests

### Server API Integration Tests (Supertest)
```bash
cd server
npm test
```
Verifies endpoints (`/api/health`, `/api/categories`) returning HTTP 200 and expected payload structure.

### Client UI Component Tests (Vitest + React Testing Library)
```bash
cd client
npm test
```
Verifies UI header rendering, loading states, category list rendering, and API error handling state.