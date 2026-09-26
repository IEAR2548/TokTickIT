# TokTickIT — Sprint 4 Test Plan & Traceability
`docs/lab-04/tests.md`

## 1. Unit Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-04 | Follow-up-note-required validator, `followUpRequired=true` + empty note | Validation fails | `server/tests/lab-04/actions-taken.validation.test.ts` | Pending |
| UNIT-02 | Unit | BR-04 | Same validator, `followUpRequired=false` + non-empty note | Validation fails (note must be empty) | `server/tests/lab-04/actions-taken.validation.test.ts` | Pending |
| UNIT-03 | Unit | §5.1 matrix | Transition-matrix helper for every (from, to, role) combination | Matches the matrix in `specification.md` §5.1 exactly | `server/tests/lab-04/ticket-transitions.unit.test.ts` | Pending |
| UNIT-04 | Unit | BR-13 | "Recently updated" date-boundary helper at Asia/Bangkok day edges | Correct 7-day window across a UTC/UTC+7 boundary case | `server/tests/lab-04/dashboard-dates.unit.test.ts` | Pending |
| UNIT-05 | Unit | BR-16 | Reopen-transition helper and Requester-edit helper, given a Ticket with `requesterConfirmedResolved=true` | Both paths reset the flag to `false` as a side effect | `server/tests/lab-04/ticket-transitions.unit.test.ts` | Pending |

## 2. API / Integration Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | FR-06 | `POST .../actions` with a client-supplied `performedById` | Server ignores client value, uses session actor | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-02 | API | FR-01, AC-08 | `POST .../actions` by a Requester | 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-03 | API | AC-01, BR-01 | Create a valid Actions Taken | Created under correct Ticket and actor (exactly one Ticket per Action Taken) | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-04 | API | AC-03 | Create with `followUpRequired=true`, empty `followUpNote` | 400, field-level error, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-05 | API | AC-12 | Create on a `Cancelled` Ticket | 409 `TICKET_CANCELLED`, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-06 | API | BR-10 | `PATCH .../actions/:id` by creator after 16 minutes | 403 `EDIT_WINDOW_EXPIRED` | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-07 | API | BR-10 | `PATCH .../actions/:id` by Admin after 16 minutes | 200, edit succeeds | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-08 | API | BR-14 | `PATCH .../actions/:id` with stale `expectedUpdatedAt` | 409 `STALE_UPDATE`, current record returned, no overwrite | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-09 | API | AC-04 | `PATCH .../status` In Progress → Resolved by IT Staff | 200, status updated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-10 | API | AC-05 | `PATCH .../status` New → Resolved (direct), `expectedUpdatedAt` current | 409 `INVALID_TRANSITION`, status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-11 | API | BR-14, AC-07, FR-14 | Two concurrent `PATCH .../status` calls with the same stale `expectedUpdatedAt`, resulting in two genuinely different intended statuses | Second request 409 `STALE_UPDATE`, `data.current.status` differs from what it requested, first change preserved | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-12 | API | BR-15 | Requester cancels own Ticket while `Open` | 200, status → Cancelled | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-13 | API | BR-15 | Requester attempts to cancel own Ticket while `In Progress` | 403/409, status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-14 | API | AC-06, FR-09 | `PATCH .../requester-confirmation` | 200, flag set true, `status` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-15 | API | AC-02 | `GET /api/dashboard/requester` for Requester A | Only Requester A's counts/Tickets returned | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| API-16 | API | AC-09 | `GET /api/dashboard/staff` with no Tickets in a given card's bucket | Card value `0`, no error | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| API-17 | API | BR-11, AC-13 | Requester dashboard counts against a known seeded dataset, including a seeded Requester Ticket in `In Progress` | Counts match manual DB query; the `In Progress` Ticket is counted only under "inProgress", **not** under "open" (BR-11 mutual exclusivity) | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| API-18 | API | AC-10, FR-15, BR-17 | Two identical `POST .../actions` requests with the same `Idempotency-Key` | Only one record created; second response is `200` returning the original record | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-19 | API | AC-08 | Requester requests Actions Taken for a Ticket they don't own | 403/404 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-20 | API | BR-03 | `POST .../actions` with a client-supplied `actionDateTime` | Server ignores client value; stored `actionDateTime` equals server time at creation, not the submitted value | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-21 | API | BR-14, AC-07 | `PATCH .../status` with stale `expectedUpdatedAt`, where the requested transition would otherwise be valid | 409 `STALE_UPDATE` (not `INVALID_TRANSITION`), current record returned | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-22 | API | AC-05 | `PATCH .../status` with current `expectedUpdatedAt` but a matrix-invalid transition | 409 `INVALID_TRANSITION` (not `STALE_UPDATE`), status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-23 | API | BR-17, FR-15 | `POST .../actions` with no `Idempotency-Key` header | 400 `VALIDATION_ERROR`, `fields.idempotencyKey` present, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-24 | API | BR-16, AC-14 | Requester Ticket with `requesterConfirmedResolved=true` is Reopened by IT Staff, and separately edited by the Requester | In both cases, `requesterConfirmedResolved` reads back as `false` on the next fetch | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| API-25 | API | AC-15 | `GET /api/dashboard/requester` for a seeded Requester account with zero Tickets | All four counts are `0`; `recentTickets` is `[]`, not `null` and not a 4xx/5xx error | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| API-26 | API | BR-12 | `GET /api/dashboard/staff` against a seeded dataset that includes a Ticket in `Reopened` status | `counts.open` includes that Ticket (i.e., equals the manually-queried count of `Open` + `Reopened` Tickets in scope), not just `Open` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| API-27 | API | BR-17, AC-10, FR-15 | Two `POST .../actions` requests with identical `ticketId`/`description`/`result` but a **different** `Idempotency-Key`, sent within the 5-second fallback window | Only one record created; second response returns the original record via the fallback de-dup path, not a new one | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-28 | API | BR-14, FR-15, AC-16 | `PATCH .../status` retried with the same `expectedUpdatedAt` and same target `status` immediately after an identical request already succeeded | Second request returns 409 `STALE_UPDATE`, with `data.current.status` **equal to** the requested status (not reapplied); Ticket status changed exactly once | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |

## 3. Authorization Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| AUTH-01 | Authorization | §4 matrix | Every endpoint in `api-spec.md` called by each of Requester/IT Staff/Admin, in and out of scope | Response matches the §4 authorization matrix row-for-row | `server/tests/lab-04/authorization.matrix.test.ts` | Pending |
| AUTH-02 | Authorization | FR-08 | `PATCH .../status` to `Resolved`/`Closed` attempted directly by a Requester (client bypass simulation) | 403, no state change | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |

## 4. Workflow Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | §5.1 | Full lifecycle New → Open → In Progress → Resolved → Closed → Reopened | Each transition succeeds only via a valid matrix edge | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-02 | Workflow | BR-09 | `Cancelled` Ticket: attempt any further status change | 409, remains Cancelled | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-03 | Workflow | BR-02 | Action Taken created by an IT Staff member who is not the Ticket Owner | Allowed, `performedBy` ≠ Ticket Owner | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |

## 5. UI Component Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI Component | FR-10 | `StaffDashboard` renders 5 metric cards with fetched values | Card labels/values match mock API response | `client/.../lab-04/StaffDashboard.test.tsx` | Pending |
| UI-02 | UI Component | AC-09 | `StaffDashboard` with a 0-value card | Card renders `0`, not an empty/error state | `client/.../lab-04/StaffDashboard.test.tsx` | Pending |
| UI-03 | UI Component | FR-11, AC-15 | `RequesterDashboard` renders 4 metric cards scoped to the current user, including a zero-Tickets mock | Matches mock API response; all-zero mock renders four `0` cards, not an error state | `client/.../lab-04/RequesterDashboard.test.tsx` | Pending |
| UI-04 | UI Component | FR-03 | `ActionsTaken` panel for a Requester | No create/edit affordances rendered anywhere | `client/.../lab-04/ActionsTaken.test.tsx` | Pending |
| UI-05 | UI Component | FR-05 | `ActionsTaken` create form, toggling Follow-Up Required | Follow-up Note field becomes required/visible only when toggle is on | `client/.../lab-04/ActionsTaken.test.tsx` | Pending |
| UI-06 | UI Component | §3.3 | `ActionsTaken` create form, server returns 400 validation error | Inline field error shown, entered values preserved, form stays open | `client/.../lab-04/ActionsTaken.test.tsx` | Pending |
| UI-07 | UI Component | FR-07 | `TicketWorkflow` status control on a Ticket in `New`, rendered for IT Staff vs Requester | Only role/status-valid options appear at all — never a disabled option; for the Requester on a Ticket they cannot cancel, no control renders, only the badge | `client/.../lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-08 | UI Component | §4.1 | `TicketWorkflow` status change success | Ticket summary badge updates from the response, no full reload | `client/.../lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-09 | UI Component | §3.3 | `ActionsTaken` submit button during an in-flight request | Button disabled + spinner shown, prevents a second click submit | `client/.../lab-04/ActionsTaken.test.tsx` | Pending |
| UI-10 | UI Component | §4.1, AC-07 | `TicketWorkflow` control receiving a `409 STALE_UPDATE` where `data.current.status` **differs** from the status just requested (genuine external conflict) | The reload-conflict banner is shown ("This ticket was changed elsewhere..."); status badge refreshes from the response | `client/.../lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-11 | UI Component | §4.1, AC-16 | `TicketWorkflow` control receiving a `409 STALE_UPDATE` where `data.current.status` **equals** the status just requested (self-retry / duplicate submission) | No conflict banner and no error toast are shown; the status badge silently reflects `data.current` | `client/.../lab-04/TicketWorkflow.test.tsx` | Pending |

## 6. UI Style / Visual Consistency Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI Style | §5 (ui-spec) | Status badges reuse existing Zen Green badge component/colors | Visual diff / snapshot matches existing badge tokens | `client/.../lab-04/visual-consistency.test.tsx` | Pending |
| STYLE-02 | UI Style | §5 (ui-spec) | Follow-up badge is not color-only (icon/text present) | Snapshot includes non-color indicator | `client/.../lab-04/ActionsTaken.test.tsx` | Pending |
| STYLE-03 | UI Style | §7 handout | Manual visual sweep of all Lab 4 screens for leftover/duplicate/placeholder UI from earlier labs | None found (checklist, tracked in the submission PDF) | Manual — `docs/lab-04/reviewer.md` checklist | Pending |

## 7. Responsive Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | §1.4, §2.4 (ui-spec) | Both dashboards at mobile/tablet/desktop widths | No horizontal scroll; card grid reflows as specified | `e2e/lab-04/dashboards.spec.ts` | Pending |
| RESP-02 | Responsive | §3.4 (ui-spec) | Actions Taken table at mobile width | Collapses to stacked card layout, no horizontal scroll | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |

## 8. Accessibility Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| A11Y-01 | Accessibility | §5 (ui-spec) | Keyboard-only pass through both dashboards (cards, list rows, quick actions) | All interactive elements reachable, visible focus, logical tab order | `e2e/lab-04/dashboards.spec.ts` | Pending |
| A11Y-02 | Accessibility | §5 (ui-spec) | Automated a11y scan (axe or equivalent) on Ticket Detail with Actions Taken panel open | No critical/serious violations | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |

## 9. Migration / Regression Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | §9.4 | Apply Lab 4 migration to a copy of the Lab 3 seeded DB | Zero data loss; all Lab 1–3 rows intact; new columns default correctly | `server/tests/lab-04/migration.test.ts` | Pending |
| MIG-02 | Migration | §9.4 | Rollback (down-migration) after apply | `ActionTaken` table and new Ticket columns removed cleanly; Lab 1–3 data untouched | `server/tests/lab-04/migration.test.ts` | Pending |
| MIG-03 | Migration | §9.5 | Re-run seed script twice | Second run makes no duplicate/changed rows (idempotent) | `server/tests/lab-04/seed.test.ts` | Pending |
| MIG-04 | Migration | BR-01 | Schema-level check on `ActionTaken.ticketId`: attempt a direct insert with `ticketId = NULL`, and a direct insert referencing a non-existent Ticket id | Both inserts are rejected by the database (`NOT NULL` / FK constraint violation) — an Action Taken can never exist without referencing exactly one real Ticket | `server/tests/lab-04/migration.test.ts` | Pending |
| REG-01 | Regression | AC-11, FR-13 | Full Lab 1–3 suite (auth, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, Admin user management) re-run after migration | All pass unchanged | existing `server/tests/lab-0{2,3}/**`, `e2e/lab-0{2,3}/**` | Pending |

## 10. Performance Smoke Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Performance Smoke | §Dashboard Contract | `GET /api/dashboard/staff` and `/requester` response time against the seeded dataset | Responds well under a documented threshold (e.g., < 500ms locally); returns summary data only, not full Ticket collections | `server/tests/lab-04/dashboard-perf.smoke.test.ts` | Pending |

## 11. End-to-End Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, FR-04 | IT Staff logs in, opens a Ticket, adds an Action Taken with follow-up, sees it in the list | Full flow succeeds end-to-end | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-03 | IT Staff attempts to submit an Action Taken with Follow-Up Required on and no note | Submission blocked client-side and/or rejected server-side; user sees the error and can correct it | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |
| E2E-03 | E2E | AC-04, AC-05 | IT Staff progresses a Ticket New → Open → In Progress → Resolved → Closed; then attempts an invalid transition via a crafted request | Valid path succeeds through the UI; invalid direct request is rejected with `INVALID_TRANSITION` | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-04 | E2E | AC-06 | Requester marks "looks resolved" on an owned Ticket | Flag set, status badge unchanged, IT Staff still sees the Ticket in its prior status on their dashboard | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-05 | E2E | AC-02, AC-08 | Requester A views their dashboard and attempts to open a Ticket owned by Requester B | Requester A's dashboard shows only their data; direct navigation to B's Ticket is forbidden | `e2e/lab-04/dashboards.spec.ts` | Pending |
| E2E-06 | E2E | AC-10 | Double-click "Add Action Taken" submit under a throttled/slow network | Exactly one Action Taken record is created | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |
| E2E-07 | E2E | AC-11 | Smoke pass over the major Lab 1–3 screens (login, My Tickets, Ticket Detail, Attachments, comments, notes, Admin user list) after Lab 4 deploy | All screens load and function without regression | `e2e/lab-04/*.spec.ts` (shared setup) | Pending |
| E2E-08 | E2E | AC-14 | IT Staff Reopens a Closed Ticket that had `requesterConfirmedResolved=true` | The Requester's "Mark as looks resolved" control shows unchecked on next view | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-09 | E2E | AC-16 | Double-click the Ticket status control (or a network retry) under a throttled/slow network, on a transition that succeeds on the first attempt | Exactly one status transition is applied; the UI shows the resulting status silently (no conflict banner, no error toast) for the duplicate response, matching `data.current.status` equaling the requested status | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-10 | E2E | FR-12 | On the IT Staff Dashboard, click a metric card (e.g. "Waiting for Requester") and a row in "My Recent Tickets"; on the Requester Dashboard, click a metric card (e.g. "Resolved") and a row in "My Recent Tickets" | Each metric card navigates to the Ticket Queue / My Tickets list pre-filtered to that card's status (or ownership, for "My Assigned"); each Recent Tickets row navigates to that Ticket's Detail screen | `e2e/lab-04/dashboards.spec.ts` | Pending |

---

## 12. Traceability Summary

Every AC in `specification.md` §11 is covered:

| AC | Covered by |
|---|---|
| AC-01 | API-03, E2E-01 |
| AC-02 | API-15, E2E-05 |
| AC-03 | API-04, E2E-02 |
| AC-04 | API-09, E2E-03 |
| AC-05 | API-10, API-22, E2E-03 |
| AC-06 | API-14, E2E-04 |
| AC-07 | API-11, API-21, UI-10 |
| AC-08 | API-19, E2E-05 |
| AC-09 | API-16, UI-02 |
| AC-10 | API-18, API-27, E2E-06 |
| AC-11 | REG-01, E2E-07 |
| AC-12 | API-05 |
| AC-13 | API-17 |
| AC-14 | API-24, E2E-08 |
| AC-15 | API-25, UI-03 |
| AC-16 | API-28, E2E-09, UI-11 |

Every FR is exercised by at least one test, whether or not it has its own AC:
FR-01 (API-02), FR-02 (API-06/API-07, via BR-10), FR-03 (UI-04), FR-04 (E2E-01), FR-05 (UI-05,
API-04), FR-06 (API-01), FR-07 (UI-07), FR-08 (AUTH-02), FR-09 (API-14), FR-10 (UI-01), FR-11
(UI-03), FR-12 (E2E-10), FR-13 (REG-01), FR-14 (API-11), FR-15 (API-18/API-23/API-27 for Action
Taken creation, API-28 for status changes).

Every BR is exercised by at least one test: BR-01 (MIG-04, API-03), BR-02 (WF-03), BR-03
(API-20), BR-04 (UNIT-01/UNIT-02), BR-05 (a definitional/scope statement with no separate
file-storage code path to exercise — not independently testable beyond confirming Attachment
Notes has no upload affordance, already covered by the absence of such a control in
`ActionsTaken.test.tsx`), BR-06/BR-07/BR-08 (UNIT-03, WF-01, as part of the full transition
matrix), BR-09 (WF-02), BR-10 (API-06/API-07), BR-11 (API-17), BR-12 (API-26), BR-13 (UNIT-04),
BR-14 (API-08/API-11/API-21/API-28), BR-15 (API-12/API-13), BR-16 (UNIT-05/API-24), BR-17
(API-18/API-23/API-27), and the full §5.1 matrix by UNIT-03 and WF-01.