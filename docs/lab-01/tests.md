# Automated Tests Summary (Lab 01)

This document lists the required automated tests for Lab 1 to verify that the TokTickIT vertical slice functions correctly across all layers.

## Required Test Matrix

| Test ID | Test File (`tests/lab-01/`) | Tool | Test Description
| :--- | :--- | :--- | :--- |
| **API-01** | `server/tests/lab-01/.ts` | Supertest |
| **API-02** | `server/tests/lab-01/.ts` | Supertest |
| **UI-01** | `client/src/tests/lab-01/.tsx` | Vitest |
| **UI-02** | `client/src/tests/lab-01/.tsx` | Vitest |
| **UI-03** | `client/src/tests/lab-01/.tsx` | Vitest |

## Test Execution Commands

```bash
# Run Server API Integration Tests (Supertest)
cd server
npm test

# Run Frontend UI Component Tests (Vitest)
cd client
npm test
```
