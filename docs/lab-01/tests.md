# Automated Tests Summary (Lab 01)

This document lists the required automated tests for Lab 1 to verify that the TokTickIT vertical slice functions correctly across all layers.

## Required Test Matrix

| Test ID | Test File (`tests/lab-01/`) | Tool | Test Description
| :--- | :--- | :--- | :--- |
| **API-01** | `server/tests/lab-01/health.test.ts` | Supertest | Health endpoint returns 200 and expected JSON |
| **API-02** | `server/tests/lab-01/categories.test.ts` | Supertest | Categories endpoint returns the four seeded categories |
| **UI-01** | `client/src/tests/lab-01/Heading.test.tsx` | Vitest | TokTickIT heading renders |
| **UI-02** | `client/src/tests/lab-01/CategoryList.test.tsx` | Vitest | Loading state changes to category list |
| **UI-03** | `client/src/tests/lab-01/ErrorHandling.test.tsx` | Vitest | API failure displays a useful error message |
| **UI-04** | `client/src/tests/lab-01/HealthStatus.test.tsx` | Vitest | TokTickIT display system status as Online |

## Test Execution Commands

```bash
# Run Server API Integration Tests (Supertest)
cd server
npm test

# Run Frontend UI Component Tests (Vitest)
cd client
npm test
```
