# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are planned from the specification and acceptance criteria before implementation begins (Test-Driven Development). Every Acceptance Criterion must map to at least one planned test. Every planned automated test must identify its actual test-file path. The plan covers six levels: unit, API/integration, UI component, UI style, responsive, and end-to-end (E2E).

Tests are written as failing tests first, then the minimum implementation is added to make them pass, then the code is refactored while keeping tests green.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator returns `TK-YYYYMMDD-NNNN` format | String matches regex `^TK-\d{8}-\d{4}$` | `server/tests/lab-02/ticket-number.unit.test.ts` | |
| UNIT-02 | Unit | BR-01 | Two tickets created on the same day have different Ticket Numbers | Numbers differ and both match format | `server/tests/lab-02/ticket-number.unit.test.ts` | |
| UNIT-03 | Unit | BR-07, BR-08 | Validation utility trims whitespace from Summary and Description before checking length | Trimmed values pass min-length; untrimmed spaces do not add to length | `server/tests/lab-02/validation.unit.test.ts` | |
| UNIT-04 | Unit | BR-22 | Filename sanitizer removes path traversal sequences | Output contains no `../`, no absolute path indicators | `server/tests/lab-02/file-sanitizer.unit.test.ts` | |
| API-01 | API | AC-01, FR-04 | POST /api/tickets with valid body | 201; one Ticket saved in DB; official Ticket Number returned | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-02 | API | AC-04, BR-07 | POST /api/tickets with empty Summary | 400; `fields.summary` error present; no Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-03 | API | AC-04, BR-07 | POST /api/tickets with Summary shorter than 5 chars | 400; `fields.summary` error present | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-04 | API | AC-04, BR-08 | POST /api/tickets with Description shorter than 10 chars | 400; `fields.description` error present | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-05 | API | AC-04, BR-11 | POST /api/tickets with invalid `requestedPriority` value | 400; `fields.requestedPriority` error present | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-06 | API | AC-03, BR-06 | GET /api/tickets/:id with wrong requesterId | 403; Ticket data not returned | `server/tests/lab-02/ticket-detail.api.test.ts` | |
| API-07 | API | FR-08 | GET /api/tickets/:id with correct requesterId | 200; full Ticket object returned | `server/tests/lab-02/ticket-detail.api.test.ts` | |
| API-08 | API | FR-06, AC-08 | GET /api/tickets with requesterId=A returns only Requester A's tickets | All tickets in response have `requesterId = A` | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-09 | API | AC-09, FR-07 | GET /api/tickets with search keyword | Only tickets whose Number or Summary contains the keyword are returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-10 | API | AC-10, FR-07 | GET /api/tickets with categoryId filter | Only tickets in the specified Category are returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-11 | API | AC-11, FR-07 | GET /api/tickets with sortBy=createdAt&sortOrder=desc | Tickets are in descending creation-date order | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-12 | API | AC-12, BR-24 | GET /api/tickets with page=2&pageSize=10 | Second page returned; pagination metadata correct | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-13 | API | BR-24 | GET /api/tickets with invalid pageSize (e.g., 7) | 400 returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-14 | API | FR-10, AC-16 | POST /api/tickets/:id/attachments with valid PNG under 5 MB | 201; Attachment record saved with correct metadata | `server/tests/lab-02/attachments.api.test.ts` | |
| API-15 | API | AC-06, BR-15 | POST /api/tickets/:id/attachments with .exe file | 400; `UNSUPPORTED_FILE_TYPE` | `server/tests/lab-02/attachments.api.test.ts` | |
| API-16 | API | AC-06, BR-16 | POST /api/tickets/:id/attachments with file > 5 MB | 400; `FILE_TOO_LARGE` | `server/tests/lab-02/attachments.api.test.ts` | |
| API-17 | API | AC-07, BR-17 | POST /api/tickets/:id/attachments when 5 already active | 400; `ATTACHMENT_LIMIT_REACHED` | `server/tests/lab-02/attachments.api.test.ts` | |
| API-18 | API | AC-17, FR-12 | PATCH /api/attachments/:id/remove with valid reason | 200; `isRemoved = true`; `removalReason` and `removedAt` stored | `server/tests/lab-02/attachments.api.test.ts` | |
| API-19 | API | AC-18, BR-18 | GET /api/attachments/:id/download for a removed attachment | 404 or 403; no file bytes returned | `server/tests/lab-02/attachments.api.test.ts` | |
| API-20 | API | BR-20 | PATCH /api/attachments/:id/remove with empty removalReason | 400; `VALIDATION_ERROR`; attachment not removed | `server/tests/lab-02/attachments.api.test.ts` | |
| API-21 | API | AC-22, BR-04 | GET /api/requesters | Inactive Requester is absent from response | `server/tests/lab-02/create-ticket.api.test.ts` | |
| UI-01 | UI Component | AC-04 | Submit without entering Summary | Field-level error message appears below Summary field; API not called | `client/src/tests/lab-02/CreateTicket.test.tsx` | |
| UI-02 | UI Component | AC-05, BR-14 | Submit button is disabled while request is in flight | Button has `disabled` attribute during submission | `client/src/tests/lab-02/CreateTicket.test.tsx` | |
| UI-03 | UI Component | AC-19, BR-13 | Backend returns 500 during submission | Error callout shown; all form values retained | `client/src/tests/lab-02/CreateTicket.test.tsx` | |
| UI-04 | UI Component | AC-01 | Success state after valid submission | Ticket Number displayed; "View Ticket" and "Create Another" buttons visible | `client/src/tests/lab-02/CreateTicket.test.tsx` | |
| UI-05 | UI Component | AC-08 | My Tickets renders only current Requester's tickets | Rendered list matches mocked API response; no cross-Requester data | `client/src/tests/lab-02/MyTickets.test.tsx` | |
| UI-06 | UI Component | AC-13 | My Tickets empty state | Empty state message and Create Ticket button rendered | `client/src/tests/lab-02/MyTickets.test.tsx` | |
| UI-07 | UI Component | AC-14 | My Tickets API failure | Failure message and Retry button rendered | `client/src/tests/lab-02/MyTickets.test.tsx` | |
| UI-08 | UI Component | AC-15 | Ticket Detail shows read-only ticket header | All ticket header fields are non-editable inputs or plain text | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | |
| UI-09 | UI Component | AC-16 | Attachment upload success in Ticket Detail | New attachment row appears in active list with Download button | `client/src/tests/lab-02/AttachmentSection.test.tsx` | |
| UI-10 | UI Component | AC-17 | Soft-remove attachment with reason | Attachment moves to removed list; Download button absent; reason and date shown | `client/src/tests/lab-02/AttachmentSection.test.tsx` | |
| UI-11 | UI Component | AC-07 | Add Attachment disabled when 5 active | Add Attachment button is disabled and shows tooltip | `client/src/tests/lab-02/AttachmentSection.test.tsx` | |
| UI-12 | UI Component | AC-02 | Redirect to Requester Selection when no Requester context | Navigation to My Tickets redirects to Selection screen | `client/src/tests/lab-02/MyTickets.test.tsx` | |
| UI-13 | UI Component | AC-23, BR-05 | Switch Requester | My Tickets reloads and shows only new Requester's data | `client/src/tests/lab-02/MyTickets.test.tsx` | |
| UI-STYLE-01 | UI Style | ui-spec.md | Primary green `#006B3C` applied to app header and primary buttons | Computed background-color matches `#006B3C` | `client/src/tests/lab-02/MyTickets.test.tsx` | |
| UI-STYLE-02 | UI Style | ui-spec.md sec 5 | Required-field asterisk present on all required fields in Create Ticket | All required field labels contain `*` | `client/src/tests/lab-02/CreateTicket.test.tsx` | |
| UI-STYLE-03 | UI Style | ui-spec.md sec 4 | Read-only fields have visually distinct background | Read-only elements have `--color-field-readonly-bg` applied | `client/src/tests/lab-02/CreateTicket.test.tsx` | |
| UI-STYLE-04 | UI Style | ui-spec.md sec 7 | Status badge NEW renders with correct pale-green background | Badge element has correct background color token | `client/src/tests/lab-02/RequesterTicketDetail.test.tsx` | |
| RESP-01 | Responsive | AC-20 | Desktop 992 px+: no horizontal overflow | `document.body.scrollWidth <= window.innerWidth` | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| RESP-02 | Responsive | AC-21 | Mobile 375 px: fields stack vertically; no horizontal scroll | Single-column layout; `scrollWidth <= innerWidth` | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| RESP-03 | Responsive | AC-21 | Mobile: My Tickets renders as cards, not table | Table element absent; card elements present | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| RESP-04 | Responsive | AC-20 | Tablet 768 px: two-column layout visible; no clipping | Two-column grid present; no overflow | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-01 | E2E | AC-01, AC-05 | Complete ticket creation flow at desktop viewport | Requester selects context, fills form, submits; Ticket Number confirmed from backend | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-02 | E2E | AC-08, AC-23 | Switch Requester; verify ticket isolation | Switch from Requester A to B; Requester A's tickets absent from list | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-03 | E2E | AC-16, AC-17 | Upload and soft-remove attachment | File uploaded, appears in list; remove with reason; file no longer downloadable | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-04 | E2E | AC-03 | Cross-Requester ticket access | Direct URL to Ticket owned by A while B is selected returns error screen | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-05 | E2E | AC-09, AC-10, AC-12 | Search, filter, and paginate My Tickets | Search reduces list; filter reduces list; pagination navigates pages | `e2e/lab-02/requester-ticket-flow.spec.ts` | |

---

## 3. Acceptance-Criterion Traceability

| AC | Covered By Test IDs |
|---|---|
| AC-01 | API-01, UI-04, E2E-01 |
| AC-02 | UI-12 |
| AC-03 | API-06, E2E-04 |
| AC-04 | API-02, API-03, API-04, API-05, UI-01 |
| AC-05 | UI-02, E2E-01 |
| AC-06 | API-15, API-16 |
| AC-07 | API-17, UI-11 |
| AC-08 | API-08, UI-05, E2E-02 |
| AC-09 | API-09, E2E-05 |
| AC-10 | API-10, E2E-05 |
| AC-11 | API-11 |
| AC-12 | API-12, E2E-05 |
| AC-13 | UI-06 |
| AC-14 | UI-07 |
| AC-15 | UI-08 |
| AC-16 | API-14, UI-09, E2E-03 |
| AC-17 | API-18, UI-10, E2E-03 |
| AC-18 | API-19 |
| AC-19 | UI-03 |
| AC-20 | RESP-01, RESP-04 |
| AC-21 | RESP-02, RESP-03 |
| AC-22 | API-21 |
| AC-23 | UI-13, E2E-02 |

---

## 4. Responsive and Visual Checklist

Complete this checklist after running Playwright screenshot tests and visually inspecting all three viewport sizes.

### Desktop (992 px+)

- [ ] Application shell navigation is fully visible (no hamburger menu required).
- [ ] Create Ticket form shows 2-column system-info section and 2-column classification section.
- [ ] My Tickets renders as a data table with all specified columns.
- [ ] Ticket Detail renders field groups in a structured multi-column layout.
- [ ] No horizontal page scrolling.
- [ ] No clipped labels or overlapping messages.

### Tablet (768-991 px)

- [ ] Create Ticket fields use two-column grid where possible.
- [ ] My Tickets table may reduce visible columns but remains usable.
- [ ] No horizontal page scrolling.
- [ ] Buttons remain accessible and labeled.

### Mobile (under 768 px)

- [ ] All form fields stack vertically (single column).
- [ ] My Tickets renders as card list, not table.
- [ ] Buttons are at least 44 px tall.
- [ ] No horizontal page scrolling.
- [ ] Attachment filenames wrap; no overflow.
- [ ] Navigation collapses to hamburger or bottom bar.

### Color and Theming

- [ ] Primary green `#006B3C` used for header and primary buttons.
- [ ] Secondary green `#0B7A46` used for hover and active states.
- [ ] Pale green `#EAF6EF` used for success and selected states.
- [ ] Editable fields are white with neutral border.
- [ ] Read-only fields have visually distinct gray-green shading.
- [ ] Error states use dark red only.
- [ ] Warning callouts use amber only; not used as decoration.

### Badge Consistency

- [ ] Status `NEW` badge is pale green with primary green text.
- [ ] Priority badges match the specified colors (LOW=gray, MEDIUM=blue, HIGH=amber, CRITICAL=red).
- [ ] Badges are readable at all viewport sizes.

### Attachment States

- [ ] Active attachment shows Download and Remove buttons.
- [ ] Removed attachment shows strikethrough filename, date, and reason. No Download button.
- [ ] "Add Attachment" disabled when 5 active attachments present.

---

## 5. Test Commands

```bash
# Run all unit and API tests (server)
cd server
npx vitest run tests/lab-02

# Run all UI component tests (client)
cd client
npx vitest run src/tests/lab-02

# Run E2E tests
npx playwright test e2e/lab-02

# Run E2E tests with UI for debugging
npx playwright test e2e/lab-02 --ui

# Capture screenshots at all viewports
npx playwright test e2e/lab-02 --reporter=html
```

---

## 6. Final Results

To be completed after implementation. Record the actual test run output below.

| Test ID | Final Status | Notes |
|---|---|---|
| UNIT-01 | | |
| UNIT-02 | | |
| UNIT-03 | | |
| UNIT-04 | | |
| API-01 | | |
| API-02 | | |
| API-03 | | |
| API-04 | | |
| API-05 | | |
| API-06 | | |
| API-07 | | |
| API-08 | | |
| API-09 | | |
| API-10 | | |
| API-11 | | |
| API-12 | | |
| API-13 | | |
| API-14 | | |
| API-15 | | |
| API-16 | | |
| API-17 | | |
| API-18 | | |
| API-19 | | |
| API-20 | | |
| API-21 | | |
| UI-01 | | |
| UI-02 | | |
| UI-03 | | |
| UI-04 | | |
| UI-05 | | |
| UI-06 | | |
| UI-07 | | |
| UI-08 | | |
| UI-09 | | |
| UI-10 | | |
| UI-11 | | |
| UI-12 | | |
| UI-13 | | |
| UI-STYLE-01 | | |
| UI-STYLE-02 | | |
| UI-STYLE-03 | | |
| UI-STYLE-04 | | |
| RESP-01 | | |
| RESP-02 | | |
| RESP-03 | | |
| RESP-04 | | |
| E2E-01 | | |
| E2E-02 | | |
| E2E-03 | | |
| E2E-04 | | |
| E2E-05 | | |

---

## 7. Known Limitations or Deferred Tests

To be completed during implementation if any test scenarios are deferred or blocked. Each entry must explain the reason and the planned resolution timeline.

| Test ID | Reason for Deferral | Planned Resolution |
|---|---|---|
| | | |
