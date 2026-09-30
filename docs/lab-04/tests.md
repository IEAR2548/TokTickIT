# TokTickIT — Sprint 4 Test Plan & Traceability
`docs/lab-04/tests.md`

## 1. Unit Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-04 | Follow-up-note-required validator, `followUpRequired=true` + empty note | Validation fails | `server/tests/lab-04/actions-taken.validation.test.ts` | Pass |
| UNIT-02 | Unit | BR-04 | Same validator, `followUpRequired=false` + non-empty note | Validation fails (note must be empty) | `server/tests/lab-04/actions-taken.validation.test.ts` | Pass |
| UNIT-03 | Unit | §5.1 matrix | Transition-matrix helper for every (from, to, role) combination | Matches the matrix in `specification.md` §5.1 exactly | `server/tests/lab-04/ticket-transitions.unit.test.ts` | Pass |
| UNIT-04 | Unit | BR-13 | "Recently updated" date-boundary helper at Asia/Bangkok day edges | Correct 7-day window across a UTC/UTC+7 boundary case | `server/tests/lab-04/dashboard-dates.unit.test.ts` | Pass |
| UNIT-05 | Unit | BR-16 | Reopen-transition helper and Requester-edit helper, given a Ticket with `appearsResolved=true` | Both paths reset the flag to `false` as a side effect | `server/tests/lab-04/ticket-transitions.unit.test.ts` | Pass |

## 2. API / Integration Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | FR-06 | `POST .../actions` with a client-supplied `performedById` | Server ignores client value, uses session actor | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API | FR-01, AC-08 | `POST .../actions` by a Requester | 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-01, BR-01 | Create a valid Actions Taken | Created under correct Ticket and actor (exactly one Ticket per Action Taken) | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-04 | API | AC-03 | Create with `followUpRequired=true`, empty `followUpNote` | 400, field-level error, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-05 | API | AC-12 | Create on a `Cancelled` Ticket | 409 `TICKET_CANCELLED`, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-06 | API | BR-10 | `PATCH .../actions/:id` by creator after 16 minutes | 403 `EDIT_WINDOW_EXPIRED` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-07 | API | BR-10 | `PATCH .../actions/:id` by Admin after 16 minutes | 200, edit succeeds | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-08 | API | BR-14 | `PATCH .../actions/:id` with stale `expectedUpdatedAt` | 409 `STALE_UPDATE`, current record returned, no overwrite | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-09 | API | AC-04 | `PATCH .../status` In Progress → Resolved by IT Staff | 200, status updated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-10 | API | AC-05 | `PATCH .../status` New → Resolved (direct), `expectedUpdatedAt` current | 400 `INVALID_TRANSITION`, status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-11 | API | BR-14, AC-07, FR-14 | Two concurrent `PATCH .../status` calls with the same stale `expectedUpdatedAt`, resulting in two genuinely different intended statuses | Second request 409 `STALE_UPDATE`, `data.current.status` differs from what it requested, first change preserved | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-12 | API | BR-15 | Requester cancels own Ticket while `Open` | 200, status → Cancelled | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-13 | API | BR-15 | Requester attempts to cancel own Ticket while `In Progress` | **403** (`FORBIDDEN` — role/ownership checked before the matrix, not `400`), status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-14 | API | AC-06, FR-09 | `PATCH .../appears-resolved` | 200, flag set true, `status` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-15 | API | AC-02 | `GET /api/dashboard/requester` for Requester A | Only Requester A's counts/Tickets returned | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-16 | API | AC-09 | `GET /api/dashboard/staff` with no Tickets in a given card's bucket | Card value `0`, no error | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-17 | API | BR-11, AC-13 | Requester dashboard counts against a known seeded dataset, including a seeded Requester Ticket in `In Progress` | Counts match manual DB query; the `In Progress` Ticket is counted only under "inProgress", **not** under "open" (BR-11 mutual exclusivity) | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-18 | API | AC-10, FR-15, BR-17 | Two identical `POST .../actions` requests with the same `Idempotency-Key` | Only one record created; second response is `200` returning the original record | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-19 | API | AC-08 | Requester requests Actions Taken for a Ticket they don't own | 403/404 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-20 | API | BR-03 | `POST .../actions` with a client-supplied `actionDateTime` | Server ignores client value; stored `actionDateTime` equals server time at creation, not the submitted value | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-21 | API | BR-14, AC-07 | `PATCH .../status` with stale `expectedUpdatedAt`, where the requested transition would otherwise be valid | 409 `STALE_UPDATE` (not `INVALID_TRANSITION`), current record returned | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-22 | API | AC-05 | `PATCH .../status` with current `expectedUpdatedAt` but a matrix-invalid transition | 400 `INVALID_TRANSITION` (not `STALE_UPDATE`), status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-23 | API | BR-17, FR-15 | `POST .../actions` with no `Idempotency-Key` header | 400 `VALIDATION_ERROR`, `fields.idempotencyKey` present, no record created | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-24 | API | BR-16, AC-14 | Requester Ticket with `appearsResolved=true` is Reopened by IT Staff, and separately edited by the Requester | In both cases, `appearsResolved` reads back as `false` on the next fetch | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-25 | API | AC-15 | `GET /api/dashboard/requester` for a seeded Requester account with zero Tickets | All four counts are `0`; `recentTickets` is `[]`, not `null` and not a 4xx/5xx error | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-26 | API | BR-12 | `GET /api/dashboard/staff` against a seeded dataset that includes a Ticket in `Reopened` status | `counts.open` includes that Ticket (i.e., equals the manually-queried count of `Open` + `Reopened` Tickets in scope), not just `Open` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-27 | API | BR-17, AC-10, FR-15 | Two `POST .../actions` requests with identical `ticketId`/`description`/`result` but a **different** `Idempotency-Key`, sent within the 5-second fallback window | Only one record created; second response returns the original record via the fallback de-dup path, not a new one | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-28 | API | BR-14, FR-15, AC-16 | `PATCH .../status` retried with the same `expectedUpdatedAt` and same target `status` immediately after an identical request already succeeded | Second request returns 409 `STALE_UPDATE`, with `data.current.status` **equal to** the requested status (not reapplied); Ticket status changed exactly once | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-29 | API | BR-06, BR-07, §5.2 | `PATCH .../status` to `Resolved` or `Closed` with `resolutionSummary` empty or omitted | 400 `RESOLUTION_SUMMARY_REQUIRED`, status unchanged, no record created | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |

## 3. Authorization Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| AUTH-01 | Authorization | §4 matrix | Every endpoint in `api-spec.md` called by each of Requester/IT Staff/Admin, in and out of scope | Response matches the §4 authorization matrix row-for-row (see §13: dashboard rows deferred to their own issue) | `server/tests/lab-04/authorization.matrix.test.ts` | Pass |
| AUTH-02 | Authorization | FR-08 | `PATCH .../status` to `Resolved`/`Closed` attempted directly by a Requester (client bypass simulation) | 403, no state change | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |

## 4. Workflow Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | §5.1 | Full lifecycle New → Open → In Progress → Resolved → Closed → Reopened | Each transition succeeds only via a valid matrix edge | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-02 | Workflow | BR-09 | `Cancelled` Ticket: attempt any further status change | 400 `INVALID_TRANSITION` (matrix violation, per §5.1/§10.1 — **not** 409; see §13), remains Cancelled | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-03 | Workflow | BR-02 | Action Taken created by an IT Staff member who is not the Ticket Owner | Allowed, `performedBy` ≠ Ticket Owner | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |

## 5. UI Component Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI Component | FR-10 | `StaffDashboard` renders 5 metric cards with fetched values | Card labels/values match mock API response | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-02 | UI Component | AC-09 | `StaffDashboard` with a 0-value card | Card renders `0`, not an empty/error state | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-03 | UI Component | FR-11, AC-15 | `RequesterDashboard` renders 4 metric cards scoped to the current user, including a zero-Tickets mock | Matches mock API response; all-zero mock renders four `0` cards, not an error state | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-04 | UI Component | FR-03 | `ActionsTaken` panel for a Requester | No create/edit affordances rendered anywhere | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-05 | UI Component | FR-05 | `ActionsTaken` create form, toggling Follow-Up Required | Follow-up Note field becomes required/visible only when toggle is on | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-06 | UI Component | §3.3 | `ActionsTaken` create form, server returns 400 validation error | Inline field error shown, entered values preserved, form stays open | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-07 | UI Component | FR-07 | `TicketWorkflow` status control on a Ticket in `New`, rendered for IT Staff vs Requester | Only role/status-valid options appear at all — never a disabled option; for the Requester on a Ticket they cannot cancel, no control renders, only the badge | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-08 | UI Component | §4.1 | `TicketWorkflow` status change success | Ticket summary badge updates from the response, no full reload | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-09 | UI Component | §3.3 | `ActionsTaken` submit button during an in-flight request | Button disabled + spinner shown, prevents a second click submit | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-10 | UI Component | §4.1, AC-07 | `TicketWorkflow` control receiving a `409 STALE_UPDATE` where `data.current.status` **differs** from the status just requested (genuine external conflict) | The reload-conflict banner is shown ("This ticket was changed elsewhere..."); status badge refreshes from the response | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-11 | UI Component | §4.1, AC-16 | `TicketWorkflow` control receiving a `409 STALE_UPDATE` where `data.current.status` **equals** the status just requested (self-retry / duplicate submission) | No conflict banner and no error toast are shown; the status badge silently reflects `data.current` | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |

`ActionsTaken.test.tsx` additionally covers behaviour that has no numbered row of its own, at the
same UI-04/05/06/09/STYLE-02 file path: row expand-to-view for all four detail fields (§3.1),
the per-row edit affordance including the expired-window tooltip and the Admin exception (FR-02,
BR-10), the cancelled-Ticket inline notice (AC-12, §3.2), the loading-skeleton and empty states,
and the 409 `STALE_UPDATE` reload banner that keeps the in-progress edit recoverable (§3.3).
It also pins the documented contract details: the five table columns (§3.4), the string-only
create payload with an `Idempotency-Key` (api-spec §1.2/§1.3, BR-17), and the client-side
Follow-up Note guard (FR-05 — the `followUpRequired = true` half of BR-04).

## 6. UI Style / Visual Consistency Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI Style | §5 (ui-spec) | Status badges reuse existing Zen Green badge component/colors | Visual diff / snapshot matches existing badge tokens | `client/src/tests/lab-04/visual-consistency.test.tsx` | Planned |
| STYLE-02 | UI Style | §5 (ui-spec) | Follow-up badge is not color-only (icon/text present) | Snapshot includes non-color indicator | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| STYLE-03 | UI Style | §7 handout | Manual visual sweep of all Lab 4 screens for leftover/duplicate/placeholder UI from earlier labs | None found (checklist, tracked in the submission PDF) | Manual — `docs/lab-04/reviewer.md` checklist | Planned |

## 7. Responsive Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | §1.4, §2.4 (ui-spec) | Both dashboards at mobile/tablet/desktop widths | No horizontal scroll; card grid reflows as specified | `e2e/lab-04/dashboards.spec.ts` | Planned |
| RESP-02 | Responsive | §3.4 (ui-spec) | Actions Taken table at mobile width | Collapses to stacked card layout, no horizontal scroll | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |

## 8. Accessibility Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| A11Y-01 | Accessibility | §5 (ui-spec) | Keyboard-only pass through both dashboards (cards, list rows, quick actions) | All interactive elements reachable, visible focus, logical tab order | `e2e/lab-04/dashboards.spec.ts` | Planned |
| A11Y-02 | Accessibility | §5 (ui-spec) | Automated a11y scan (axe or equivalent) on Ticket Detail with Actions Taken panel open | No critical/serious violations | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |

## 9. Migration / Regression Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | §9.4 | Apply Lab 4 migration to a copy of the Lab 3 seeded DB | Zero data loss; all Lab 1–3 rows intact; new columns default correctly | `server/tests/lab-04/migration.test.ts` | Pass |
| MIG-02 | Migration | §9.4 | Rollback (down-migration) after apply | `ActionTaken` table and new Ticket columns removed cleanly; Lab 1–3 data untouched | `server/tests/lab-04/migration.test.ts` | Pass |
| MIG-03 | Migration | §9.5 | Re-run seed script twice | Second run makes no duplicate/changed rows (idempotent) | `server/tests/lab-04/migration.test.ts` | Pass |
| MIG-04 | Migration | BR-01 | Schema-level check on `ActionTaken.ticketId`: attempt a direct insert with `ticketId = NULL`, and a direct insert referencing a non-existent Ticket id | Both inserts are rejected by the database (`NOT NULL` / FK constraint violation) — an Action Taken can never exist without referencing exactly one real Ticket | `server/tests/lab-04/migration.test.ts` | Pass |
| REG-01 | Regression | AC-11, FR-13 | Full Lab 1–3 suite (auth, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, Admin user management) re-run after migration | All pass unchanged | existing `server/tests/lab-0{2,3}/**`, `e2e/lab-0{2,3}/**` | Planned |

## 10. Performance Smoke Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Performance Smoke | §Dashboard Contract | `GET /api/dashboard/staff` and `/requester` response time against the seeded dataset | Responds well under a documented threshold (e.g., < 500ms locally); returns summary data only, not full Ticket collections | `server/tests/lab-04/dashboard-perf.smoke.test.ts` | Planned |

## 11. End-to-End Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, FR-04 | IT Staff logs in, opens a Ticket, adds an Action Taken with follow-up, sees it in the list | Full flow succeeds end-to-end | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-03 | IT Staff attempts to submit an Action Taken with Follow-Up Required on and no note | Submission blocked client-side and/or rejected server-side; user sees the error and can correct it | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-04, AC-05 | IT Staff progresses a Ticket New → Open → In Progress → Resolved → Closed; then attempts an invalid transition via a crafted request | Valid path succeeds through the UI; invalid direct request is rejected with `INVALID_TRANSITION` | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-04 | E2E | AC-06 | Requester marks "looks resolved" on an owned Ticket | Flag set, status badge unchanged, IT Staff still sees the Ticket in its prior status on their dashboard | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-05 | E2E | AC-02, AC-08 | Requester A views their dashboard and attempts to open a Ticket owned by Requester B | Requester A's dashboard shows only their data; direct navigation to B's Ticket is forbidden | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-06 | E2E | AC-10 | Double-click "Add Action Taken" submit under a throttled/slow network | Exactly one Action Taken record is created | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-07 | E2E | AC-11 | Smoke pass over the major Lab 1–3 screens (login, My Tickets, Ticket Detail, Attachments, comments, notes, Admin user list) after Lab 4 deploy | All screens load and function without regression | `e2e/lab-04/*.spec.ts` (shared setup) | Planned |
| E2E-08 | E2E | AC-14 | IT Staff Reopens a Closed Ticket that had `appearsResolved=true` | The Requester's "Mark as looks resolved" control shows unchecked on next view | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-09 | E2E | AC-16 | Double-click the Ticket status control (or a network retry) under a throttled/slow network, on a transition that succeeds on the first attempt | Exactly one status transition is applied; the UI shows the resulting status silently (no conflict banner, no error toast) for the duplicate response, matching `data.current.status` equaling the requested status | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-10 | E2E | FR-12 | On the IT Staff Dashboard, click a metric card (e.g. "Waiting for Requester") and a row in "My Recent Tickets"; on the Requester Dashboard, click a metric card (e.g. "Resolved") and a row in "My Recent Tickets" | Each metric card navigates to the Ticket Queue / My Tickets list pre-filtered to that card's status (or ownership, for "My Assigned"); each Recent Tickets row navigates to that Ticket's Detail screen | `e2e/lab-04/dashboards.spec.ts` | Planned |

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
| AC-12 | API-05, `ActionsTaken.test.tsx` (cancelled notice) |
| AC-13 | API-17 |
| AC-14 | API-24, E2E-08 |
| AC-15 | API-25, UI-03 |
| AC-16 | API-28, E2E-09, UI-11 |

Every FR is exercised by at least one test, whether or not it has its own AC:
FR-01 (API-02), FR-02 (API-06/API-07, plus the client edit-window check in `ActionsTaken.test.tsx`, via BR-10), FR-03 (UI-04), FR-04 (E2E-01), FR-05 (UI-05 plus the client-side guard case in `ActionsTaken.test.tsx`,
API-04), FR-06 (API-01), FR-07 (UI-07), FR-08 (AUTH-02), FR-09 (API-14), FR-10 (UI-01), FR-11
(UI-03), FR-12 (E2E-10), FR-13 (REG-01), FR-14 (API-11), FR-15 (API-18/API-23/API-27 for Action
Taken creation, API-28 for status changes).

Every BR is exercised by at least one test: BR-01 (MIG-04, API-03), BR-02 (WF-03), BR-03
(API-20, plus the no-editable-inputs check in `ActionsTaken.test.tsx`), BR-04 (UNIT-01/UNIT-02 cover
the server-side `else must be empty` clause; the required-if-true half is also covered client-side
by `ActionsTaken.test.tsx`; UNIT-01/UNIT-02 now also cover the server half), BR-05 (a definitional/scope statement with no separate
file-storage code path to exercise — not independently testable beyond confirming Attachment
Notes has no upload affordance, already covered by the absence of such a control in
`ActionsTaken.test.tsx`), BR-06/BR-07/BR-08 (UNIT-03, WF-01, API-29, as part of the full transition
matrix), BR-09 (WF-02), BR-10 (API-06/API-07, plus the client-side window check in `ActionsTaken.test.tsx`), BR-11 (API-17), BR-12 (API-26), BR-13 (UNIT-04),
BR-14 (API-08/API-11/API-21/API-28), BR-15 (API-12/API-13), BR-16 (UNIT-05/API-24), BR-17
(API-18/API-23/API-27, plus the client `Idempotency-Key` check in `ActionsTaken.test.tsx`), and the
full §5.1 matrix by UNIT-03 and WF-01.

---

## 13. Coverage Gaps (flagged, not silently resolved)

- `INVALID_TRANSITION` is `400` (a deliberate departure from REST convention, documented in
  `specification.md` §10.1) for backward compatibility; `STALE_UPDATE` is the separate `409`.
  **Now implemented and covered** by API-10, API-21, API-22, WF-01, WF-02 — do not "fix" the
  `400` back to `409`. `tests.md`'s original WF-02 wording ("409, remains Cancelled") was
  corrected here to `400 INVALID_TRANSITION` to match §5.1/§10.1; the shipped test asserts `400`.
- `resolutionSummary` enforcement (Lab 3 BR-22) was not originally mentioned in Lab 4 spec; now
  explicitly carried forward in `specification.md` §5.2 and BR-06/BR-07, with dedicated test
  coverage in API-29. **Now implemented and covered** (API-29, plus UI-08/UI-10/UI-11 for the
  confirmation-step capture and `RESOLUTION_SUMMARY_REQUIRED` handling).
- `api-spec.md` §2.1's error ordering is followed literally for status changes: `404` → `403`
  role/ownership → `409 STALE_UPDATE` → `400 INVALID_TRANSITION` → `400
  RESOLUTION_SUMMARY_REQUIRED`. In particular, a Requester cancelling their own Ticket once it is
  no longer `New`/`Open` (BR-15) returns **`403`**, not `400`, because authorization is checked
  before the transition matrix (API-13, AUTH-01, AUTH-02).
- `ui-spec.md` §4.1 is **out of date**: it does not yet describe capturing `resolutionSummary`
  or handling `400 RESOLUTION_SUMMARY_REQUIRED` for `Resolved`/`Closed`. The UI implemented in
  `TicketWorkflow` fills that gap; the spec file itself was deliberately left unedited and is
  flagged here for a reviewer to update.
- **AUTH-01 scope:** it exercises every implemented §4 capability for the Ticket workflow surface
  (Actions Taken, status change, appears-resolved). The dashboard rows (api-spec §3) are deferred
  to the dashboard issue and are not asserted yet.
- ~~BR-04's "otherwise it must be empty" clause is not yet enforced~~ — **closed**. The rule now
  lives in a pure validator (`server/src/validators/actionsTaken.validator.ts`, extracted from the
  service to match the Lab 3 `src/validators/*.validator.ts` convention) and is enforced both ways
  by UNIT-01/UNIT-02 (`server/tests/lab-04/actions-taken.validation.test.ts`). A client-supplied
  non-empty `followUpNote` with `followUpRequired=false` is now rejected with
  `400 VALIDATION_ERROR` + `fields.followUpNote` instead of being silently discarded. On an update
  that only flips the flag off, the inherited note is still *cleared* rather than rejected, because
  an omitted field means "unchanged" (`api-spec.md` §1.3) — rejecting that case would have broken a
  plain "turn follow-up off" edit, which the merged code already supported.

## 14. Test Commands

```bash
# Server unit + API tests
cd server && npx vitest run tests/lab-04

# Client component tests
cd client && npx vitest run src/tests/lab-04

# E2E tests
npx playwright test e2e/lab-04
```

## 15. Final Results

The Issue #54/#55 figures below were re-run on 2026-09-29 against the merged Lab 4 backend
(`lab4-staging`, PR #61) plus the Actions Taken panel UI; the Issue #56 figures were re-run on
2026-09-30 on `feature/56-lab4-ticket-workflow`.

### Issue #54 (`feature/54-lab4-actions-taken`) — Actions Taken backend

| Suite | Command | Result |
|---|---|---|
| Actions Taken API | `cd server && npx vitest run tests/lab-04/actions-taken.api.test.ts` | 14/14 Pass |
| Lab 4 migration | `cd server && npx vitest run tests/lab-04/migration.test.ts` | 5/5 Pass |
| Lab 4 (combined) | `cd server && npx vitest run tests/lab-04` | 19/19 Pass |
| Full server regression | `cd server && npx vitest run` | 27 files, 230/230 Pass |
| Typecheck | `cd server && npx tsc --noEmit` | 0 errors |

**Pass in this issue:** API-01..API-08, API-18, API-19, API-20, API-23, API-27, WF-03, MIG-01..MIG-04.

### BR-04 closure (carried on `feature/55-lab4-actions-taken-ui`)

The `server/` changes here close the gap recorded in §13. They ride on this branch at the author's
request rather than a separate backend PR — `server/` was already merged into `lab4-staging` in
PR #61, and nothing else in that work needed to change.

| Suite | Command | Result |
|---|---|---|
| Follow-up note validator | `cd server && npx vitest run tests/lab-04/actions-taken.validation.test.ts` | 8/8 Pass |
| Lab 4 (combined) | `cd server && npx vitest run tests/lab-04` | 27/27 Pass |
| Full server regression | `cd server && npx vitest run` | 28 files, 238/238 Pass |
| Typecheck | `cd server && npx tsc --noEmit` | 0 errors |

**Pass in this section:** UNIT-01, UNIT-02. The pre-existing Lab 4 API tests were re-run unchanged
and still pass, confirming the validator extraction is behaviour-preserving for every documented path.

### Issue #55 (`feature/55-lab4-actions-taken-ui`) — Actions Taken panel UI

| Suite | Command | Result |
|---|---|---|
| Actions Taken component | `cd client && npx vitest run src/tests/lab-04` | 15/15 Pass |
| Full client regression | `cd client && npx vitest run` | 23 files, 101/101 Pass |
| Typecheck | `cd client && npx tsc --noEmit` | 0 errors |
| Lab 4 Actions Taken E2E | `npx playwright test e2e/lab-04/actions-taken-flow.spec.ts` | 9/9 Pass (desktop + tablet + mobile) |

**Pass in this issue:** UI-04, UI-05, UI-06, UI-09, STYLE-02, RESP-02, A11Y-02.

The E2E row above was executed with the config's client `webServer` pointed at a dedicated port,
because port 5173 was already held by an unrelated local dev server on the verification machine;
the command recorded in §14 is unchanged and is the one to run on a clean machine.

The A11Y-02 scan initially surfaced one real, pre-existing defect on the Ticket Detail screen: the
active app-nav pill (`RequesterBadge.css`) rendered white text on a lightened background at 4.28:1,
below the 4.5:1 AA threshold. The hover/active pill now darkens the header background instead of
lightening it; the scan is clean at all three viewports.

A doc-conformance pass then aligned the panel with `ui-spec.md` §3.1/§3.4 and `api-spec.md` §1.2:
the create/edit body now sends strings only (`followUpNote: ""` when Follow-Up Required is off,
never `null`, per "else must be omitted/empty"); the table carries exactly the five documented
columns, with the expand/Edit affordances moved inside the last one; the form reuses the shared
`FieldLabel`/`FieldError` components; edit mode surfaces Action Date/Time and Performed By as
read-only labels; and the client-side Follow-up Note message matches the API's wording so the same
error reads one way on both paths.

Two deliberate adaptations, recorded rather than left divergent:

- The submit control stays a plain primary button (the Ticket Detail screens' own convention)
  rather than the shared `Button`, because §3.3 requires a *spinner* and `Button`'s `.btn-busy`
  state renders only a cursor/label change — reusing it as-is would silently drop a documented state.
- The app has no toast primitive, so §3.3's "403 error toast" is an inline `role="alert"` block,
  matching the existing `AttachmentSection` error pattern.

### Issue #56 (`feature/56-lab4-ticket-workflow`) — Ticket status/resolution workflow

Implemented with strict TDD (RED → GREEN → REFACTOR), backend and UI.

| Suite | Command | Result |
|---|---|---|
| Ticket workflow API | `cd server && npx vitest run tests/lab-04/ticket-workflow.api.test.ts` | 15/15 Pass |
| Authorization matrix | `cd server && npx vitest run tests/lab-04/authorization.matrix.test.ts` | 17/17 Pass |
| Transition matrix + BR-16 helpers | `cd server && npx vitest run tests/lab-04/ticket-transitions.unit.test.ts` | 7/7 Pass |
| Dashboard date window | `cd server && npx vitest run tests/lab-04/dashboard-dates.unit.test.ts` | 4/4 Pass |
| Follow-up note validator | `cd server && npx vitest run tests/lab-04/actions-taken.validation.test.ts` | 8/8 Pass |
| Lab 4 RED set (all of the above, combined) | `cd server && npx vitest run tests/lab-04/ticket-workflow.api.test.ts tests/lab-04/authorization.matrix.test.ts tests/lab-04/ticket-transitions.unit.test.ts tests/lab-04/dashboard-dates.unit.test.ts tests/lab-04/actions-taken.validation.test.ts` | 51/51 Pass |
| Full server regression | `cd server && npx vitest run` | 32 files, 281/281 Pass |
| Ticket status control UI | `cd client && npx vitest run src/tests/lab-04/TicketWorkflow.test.tsx` | 9/9 Pass |
| Full client regression | `cd client && npx vitest run` | 24 files, 110/110 Pass |
| Typecheck (server) | `cd server && npx tsc --noEmit` | 0 errors |
| Typecheck (client) | `cd client && npx tsc --noEmit` | 0 errors |

**Pass in this issue:** UNIT-03, UNIT-04, UNIT-05, API-09..API-14, API-21, API-22, API-28,
API-29, AUTH-01, AUTH-02, WF-01, WF-02, UI-07, UI-08, UI-10, UI-11. UI-10 and UI-11 remain two
separate test cases covering the two `409 STALE_UPDATE` branches (genuine external conflict vs.
self-retry), neither skipped nor merged.

Backend: `PATCH /api/tickets/:ticketId/status` consolidates the Lab 3
`PATCH /api/staff/tickets/:id/status` route (the latter kept as a migration alias), enforcing the
full §5.1 matrix server-side including `Open → Waiting for Requester` and `Resolved → Reopened`;
`PATCH /api/tickets/:ticketId/appears-resolved` now also honours the documented request body
(`appearsResolved` + `expectedUpdatedAt`) and never touches `status`.

UI: a new `TicketWorkflow` control renders **only** the role/status-valid transitions (never a
disabled option) and no control at all when none are valid, with the confirmation + required
`resolutionSummary` step for `Resolved`/`Closed`/`Cancelled` and the §10.1 error-code branching.
The staff select keeps its Lab 3 test id during migration, so existing Lab 3 screen tests and
clients keep working.

**Still Planned** (other Lab 4 issues): API-15..API-17, API-24..API-26, UI-01..UI-03, STYLE-01,
STYLE-03, RESP-01, A11Y-01, REG-01, PERF-01, E2E-01..E2E-10.

## 16. Known Limitations or Deferred Tests

- STYLE-03 (visual sweep) is a manual checklist tracked in `reviewer.md`, not a fully automated
  test.
- PERF-01 threshold is informational, not a hard gate — the seeded dataset is small and local
  response times are not representative of production.
- A11Y-02 uses `@axe-core/playwright` (added as a root devDependency) rather than the "axe or
  equivalent" fallback the plan allowed for. It is the only new dependency this sprint added.
- `ActionsTaken.test.tsx` asserts the edit window against the wall clock at render time, so the
  fixtures are built relative to `Date.now()`; the 15-minute boundary itself is covered by
  API-06/API-07 server-side, where the window is authoritative.
- `e2e/lab-03/screenshots.staff-ticket-detail.spec.ts` still selects the old
  `staff-ticket-resolution-summary` textarea after choosing `RESOLVED`. The status control is now
  `TicketWorkflow`, which captures the summary in its confirmation dialog
  (`ticket-status-resolution-summary-input`) and then renders a read-only summary. That Lab 3 E2E
  selector needs a follow-up update; the Lab 3 vitest suites are unaffected and pass.
- `ui-spec.md` §4.1 does not yet document `resolutionSummary` capture or
  `400 RESOLUTION_SUMMARY_REQUIRED` for `Resolved`/`Closed`. It was deliberately left unedited in
  this issue; see §13.