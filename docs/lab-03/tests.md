# Lab 3 Test Plan — TokTickIT Users, Roles, IT Staff, Admin

## 1. Test Strategy
Written before implementation per Test DD. Covers Unit, API, UI, Style, Responsive,
Security (SEC — direct API authorization independent of UI), Migration/Regression, and
E2E. Every AC in `specification.md` maps to at least one row. All rows start as
**Planned** — none may say Pass until the corresponding Issue actually implements and
verifies it.

## 2. Planned Tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-07 | Password rule validator | Rejects <8 chars, missing case/number/special | `server/tests/lab-03/unit/password.unit.test.ts` | Planned |
| UNIT-02 | Unit | BR-08 | Password hashing | bcryptjs hash never equals plaintext, verifies correctly | `server/tests/lab-03/unit/auth.unit.test.ts` | Planned |
| UNIT-03 | Unit | BR-21 | Status transition matrix | Rejects unlisted transitions, allows listed ones | `server/tests/lab-03/unit/ticketStatus.unit.test.ts` | Planned |
| API-01 | API | AC-01 | Valid login | 200; session cookie set; safe user data returned | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-02 | API | AC-05 | Invalid password | 401 generic message | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | API | AC-05 | Unknown email | 401 identical generic message as API-02 | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-04 | API | AC-06 | Inactive account login | 401 identical generic message | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05 | API | AC-02 | Restricted session enforcement | Non-change-password endpoints return 403 while mustChangePassword | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-06 | API | AC-02 | Valid password change | 200; mustChangePassword cleared; normal session issued | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-07 | API | AC-07 | Logout | 200; cookie cleared; subsequent request unauthenticated | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-08 | API | AC-04 | Requester requests Internal Notes | 403; no note data returned | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-09 | API | AC-03 | Requester supplies foreign requesterId | Backend uses session identity, not client value | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-10 | API | AC-08 | Claim unassigned ticket | 200; ownerId = caller | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-11 | API | AC-09 | Reassign ticket | 200; ownerId updated to target | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-12 | API | BR-14 | Claim already-claimed ticket | 409 conflict | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-13 | API | AC-11 | Invalid status transition | 400 INVALID_TRANSITION | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-14 | API | AC-12 | Resolve without resolution summary | 400 RESOLUTION_SUMMARY_REQUIRED | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-15 | API | AC-13 | Post Public Comment | 201; visible to Requester and staff | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-16 | API | AC-14 | Create Internal Note | 201; never returned to Requester's ticket-detail response | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-17 | API | AC-15 | Empty comment/note content | 400; nothing persisted | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-18 | API | AC-16 | Mark problem appears-resolved | 200; currentStatus unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-19 | API | AC-23 | Staff queue search/filter/sort/pagination | Correct filtered/sorted/paginated results | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-20 | API | AC-17 | Admin user search | Matches partial name/email | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-21 | API | AC-18 | Duplicate email on create | 409 DUPLICATE_EMAIL | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-22 | API | AC-19 | Set new initial password | mustChangePassword=true for target on next login | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-23 | API | AC-20 | Self-deactivation attempt | 403 CANNOT_DEACTIVATE_SELF | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-24 | API | AC-21 | Deactivate last active Administrator | 403 LAST_ACTIVE_ADMIN | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-25 | API | BR-11/BR-30 | Edit user with duplicate email | 409 DUPLICATE_EMAIL on PATCH user | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-26 | API | AC-21/BR-33 | Role-change last active Admin away from Administrator | 403 LAST_ACTIVE_ADMIN | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-27 | API | AC-28 | Change IT Priority (happy path) | 200; itPriority updated, requestedPriority unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-28 | API | AC-29 | Valid status transition (happy path) | 200; currentStatus updated to target status | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-29 | API | AC-30 | Create user (happy path) | 201; user created with mustChangePassword=true | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-30 | API | AC-31 | Edit user name and role (happy path) | 200; user record updated accordingly | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| SEC-01 | Security | AC-22 | Non-Admin calls /api/admin/users directly | 403, independent of any UI | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-02 | Security | AC-10 | Requester calls PATCH it-priority directly | 403 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-03 | Security | AC-32 | Requester calls PATCH status directly | 403 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-04 | Security | AC-22 | IT Staff calls /api/admin/users directly | 403 (Admin-only, staff ≠ admin) | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-05 | Security | AC-03 | Unauthenticated request to any protected endpoint | 401 across the board | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-06 | Security | AC-04/FR-09 | Requester calls GET /api/tickets/:id/notes directly | 403; no note data in body | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-07 | Security | AC-33 | Requester calls GET /api/staff/tickets directly | 403 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| SEC-08 | Security | AC-03/FR-04 | Unauthenticated POST /api/auth/change-password | 401 UNAUTHENTICATED | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| UI-01 | UI | AC-05 | Login form invalid submission | Generic error shown, field state preserved | `client/src/tests/lab-03/Login.test.tsx` | Planned |
| UI-02 | UI | ui-spec §2 | Login busy state | Submit disabled + spinner during request | `client/src/tests/lab-03/Login.test.tsx` | Planned |
| UI-03 | UI | AC-02 | Change Password live checklist | Checklist items toggle as rules are met | `client/src/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-04 | UI | ui-spec §3 | Confirm password mismatch | Field-level error, submit disabled | `client/src/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-05 | UI | AC-27 | Nav hides Create Ticket for IT Staff | Nav item absent in DOM for staff session | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-06 | UI | AC-23 | Staff Queue empty/no-results distinction | Correct state shown for each case | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-07 | UI | BR-21 | Staff Ticket Detail status dropdown options | Only permitted-transition options rendered | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-08 | UI | FR-19 | Internal Notes tab visual distinction | Different background class than Public Comments | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-09 | UI | AC-16 | Requester "appears resolved" indicator | Badge shown after click, status badge unchanged | `client/src/tests/lab-03/RequesterTicketDetail.test.tsx` | Planned |
| UI-10 | UI | AC-18 | Admin create-user duplicate email | Field-level error shown | `client/src/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-11 | UI | AC-20/21 | Deactivate button disabled for self/last-admin | Button disabled + tooltip, not just hidden | `client/src/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-12 | UI | AC-16 | Staff Ticket Detail appears-resolved badge | Badge rendered near status dropdown when appearsResolved is true | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| STYLE-01 | Style | ui-spec §1 | Role badge class per role | Correct badge-role-* class + visible text | `client/src/tests/lab-03/Badges.style.test.tsx` | Planned |
| RESP-01 | Responsive | AC-26 | Staff Queue desktop/tablet/mobile | Table→card switch, no overflow | `e2e/lab-03/responsive.spec.ts` | Planned |
| RESP-02 | Responsive | AC-26 | Admin User Management responsive | Two-panel→stacked, no overflow | `e2e/lab-03/responsive.spec.ts` | Planned |
| MIG-01 | Migration/Regression | AC-25 | DevRequester → User migration | Existing Ticket.requesterId still resolves correctly post-migration | `server/tests/lab-03/migration.api.test.ts` | Pass |
| MIG-02 | Migration/Regression | AC-24 | All Lab 2 ticket/attachment tests re-run | Pass unmodified in intent against authenticated backend | `server/tests/lab-02/*` (re-run, not new files) | Planned |
| E2E-01 | E2E | AC-01, AC-02 | Login → forced password change → app access | Normal screens unreachable until change completes | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | E2E | AC-07 | Logout → direct URL access blocked | Redirect to /login, no protected content flashes | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-03 | E2E | AC-08, AC-09, AC-28, AC-29 | Claim → set IT Priority → change status → post comment → add note | Full staff workflow succeeds end-to-end | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-04 | E2E | AC-04, AC-14 | Internal Note never visible to Requester | Requester's own Ticket Detail view never renders the note content | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-05 | E2E | AC-17..AC-21, AC-30, AC-31 | Create/edit user, set password, safety rules | Full admin workflow incl. all safety-rule rejections | `e2e/lab-03/user-administration.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

| AC | Covered by |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | API-05, API-06, UI-03, E2E-01 |
| AC-03 | API-09, SEC-05, SEC-08 |
| AC-04 | API-08, SEC-06, E2E-04 |
| AC-05 | API-02, API-03, UI-01 |
| AC-06 | API-04 |
| AC-07 | API-07, E2E-02 |
| AC-08 | API-10, E2E-03 |
| AC-09 | API-11, E2E-03 |
| AC-10 | SEC-02 |
| AC-11 | API-13 |
| AC-12 | API-14 |
| AC-13 | API-15 |
| AC-14 | API-16, E2E-04 |
| AC-15 | API-17 |
| AC-16 | API-18, UI-09, UI-12 |
| AC-17 | API-20 |
| AC-18 | API-21, UI-10 |
| AC-19 | API-22 |
| AC-20 | API-23, UI-11 |
| AC-21 | API-24, API-26, UI-11 |
| AC-22 | SEC-01, SEC-04 |
| AC-23 | API-19, UI-06 |
| AC-24 | MIG-02 |
| AC-25 | MIG-01 |
| AC-26 | RESP-01, RESP-02 |
| AC-27 | UI-05 |
| AC-28 | API-27, E2E-03 |
| AC-29 | API-28, E2E-03 |
| AC-30 | API-29, E2E-05 |
| AC-31 | API-30, E2E-05 |
| AC-32 | SEC-03 |
| AC-33 | SEC-07 |

## 4. Coverage Gaps (flagged, not silently resolved)
- No dedicated test yet for BR-06 (5-failed-attempts logging) — logging-only behavior
  with no user-visible effect in Lab 3 scope; propose a UNIT test on the login-attempt
  counter service once #31 (Authentication Foundation) defines its exact interface.
- No dedicated test yet for XSS-safe rendering (BR-27) — needs a concrete test once the
  comment-rendering component exists; add as UI-13 during Issue #35.

## 5. Test Commands (to be finalized once test runners are wired up in #31+)
```bash
cd server && npx vitest run tests/lab-03
cd client && npx vitest run src/tests/lab-03
npx playwright test e2e/lab-03
```

## 6. Final Results
_Not applicable yet — no implementation exists. To be filled in during Issue #39
(Release Integration), mirroring the Lab 2 Issue #28 pattern._

## 7. Known Limitations or Deferred Tests
_None yet — will be populated as implementation Issues (#30–#38) surface any._