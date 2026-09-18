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
| UNIT-01 | Unit | BR-07 | Password rule validator | Rejects <8 chars, missing case/number/special | `server/tests/lab-03/unit/password.unit.test.ts` | Pass |
| UNIT-02 | Unit | BR-08 | Password hashing | bcryptjs hash never equals plaintext, verifies correctly | `server/tests/lab-03/unit/auth.unit.test.ts` | Pass |
| UNIT-02b | Unit | BR-06 | 5-failed-attempts counter & logging | Tracks failed logins, logs security warning at 5 within 15 min | `server/tests/lab-03/unit/loginAttempts.unit.test.ts` | Pass |
| UNIT-03 | Unit | BR-21 | Status transition matrix | Rejects unlisted transitions, allows listed ones | `server/tests/lab-03/unit/ticketStatus.unit.test.ts` | Pass |
| API-01 | API | AC-01 | Valid login | 200; session cookie set; safe user data returned | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | API | AC-05 | Invalid password | 401 generic message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | API | AC-05 | Unknown email | 401 identical generic message as API-02 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-04 | API | AC-06 | Inactive account login | 401 identical generic message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-05 | API | AC-02 | Restricted session enforcement | Non-change-password endpoints return 403 while mustChangePassword | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-06 | API | AC-02 | Valid password change | 200; mustChangePassword cleared; normal session issued | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-07 | API | AC-07 | Logout | 200; cookie cleared; subsequent request unauthenticated | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-08 | API | AC-04 | Requester requests Internal Notes | 403; no note data returned | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-09 | API | AC-03 | Requester supplies foreign requesterId | Backend uses session identity, not client value | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-10 | API | AC-08 | Claim unassigned ticket | 200; ownerId = caller | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-11 | API | AC-09 | Reassign ticket | 200; ownerId updated to target | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-12 | API | BR-14 | Claim already-claimed ticket | 409 conflict | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-13 | API | AC-11 | Invalid status transition | 400 INVALID_TRANSITION | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-14 | API | AC-12 | Resolve without resolution summary | 400 RESOLUTION_SUMMARY_REQUIRED | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-15 | API | AC-13 | Post Public Comment | 201; visible to Requester and staff | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-16 | API | AC-14 | Create Internal Note | 201; never returned to Requester's ticket-detail response | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-17 | API | AC-15 | Empty comment/note content | 400; nothing persisted | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-18 | API | AC-16 | Mark problem appears-resolved | 200; currentStatus unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-19 | API | AC-23 | Staff queue search/filter/sort/pagination | Correct filtered/sorted/paginated results | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-20 | API | AC-17 | Admin user search | Matches partial name/email | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-21 | API | AC-18 | Duplicate email on create | 409 DUPLICATE_EMAIL | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-22 | API | AC-19 | Set new initial password | mustChangePassword=true for target on next login | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-23 | API | AC-20 | Self-deactivation attempt | 403 CANNOT_DEACTIVATE_SELF | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-24 | API | AC-21 | Deactivate last active Administrator | 403 LAST_ACTIVE_ADMIN | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-25 | API | BR-11/BR-30 | Edit user with duplicate email | 409 DUPLICATE_EMAIL on PATCH user | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-26 | API | AC-21/BR-33 | Role-change last active Admin away from Administrator | 403 LAST_ACTIVE_ADMIN | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-27 | API | AC-28 | Change IT Priority (happy path) | 200; itPriority updated, requestedPriority unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-28 | API | AC-29 | Valid status transition (happy path) | 200; currentStatus updated to target status | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-29 | API | AC-30 | Create user (happy path) | 201; user created with mustChangePassword=true | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-30 | API | AC-31 | Edit user name and role (happy path) | 200; user record updated accordingly | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-31 | API | AC-17/FR-20 | Optional isActive status filter on user list | isActive=true/false return only matching users; combinable with search/role | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| SEC-01 | Security | AC-22 | Non-Admin calls /api/admin/users directly | 403, independent of any UI | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-02 | Security | AC-10 | Requester calls PATCH it-priority directly | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-03 | Security | AC-32 | Requester calls PATCH status directly | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-04 | Security | AC-22 | IT Staff calls /api/admin/users directly | 403 (Admin-only, staff ≠ admin) | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-05 | Security | AC-03 | Unauthenticated request to any protected endpoint | 401 across the board | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-06 | Security | AC-04/FR-09 | Requester calls GET /api/tickets/:id/notes directly | 403; no note data in body | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-07 | Security | AC-33 | Requester calls GET /api/staff/tickets directly | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-08 | Security | AC-03/FR-04 | Unauthenticated POST /api/auth/change-password | 401 UNAUTHENTICATED | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-09 | Security | FR-07 | Authenticated IT_STAFF or ADMINISTRATOR calls POST /api/tickets | 403 FORBIDDEN | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| UI-01 | UI | AC-05 | Login form invalid submission | Generic error shown, field state preserved | `client/src/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | UI | ui-spec §2 | Login busy state | Submit disabled + spinner during request | `client/src/tests/lab-03/Login.test.tsx` | Pass |
| UI-03 | UI | AC-02 | Change Password live checklist | Checklist items toggle as rules are met | `client/src/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-04 | UI | ui-spec §3 | Confirm password mismatch | Field-level error, submit disabled | `client/src/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-05 | UI | AC-27 | Nav hides Create Ticket for IT Staff | Nav item absent in DOM for staff session | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-06 | UI | AC-23 | Staff Queue empty/no-results distinction | Correct state shown for each case | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-07 | UI | BR-21 | Staff Ticket Detail status dropdown options | Only permitted-transition options rendered | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-08 | UI | FR-19 | Internal Notes tab visual distinction | Different background class than Public Comments | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-09 | UI | AC-16 | Requester "appears resolved" indicator | Badge shown after click, status badge unchanged | `client/src/tests/lab-03/RequesterTicketDetail.test.tsx` | Pass |
| UI-10 | UI | AC-18 | Admin create-user duplicate email | Field-level error shown | `client/src/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-11 | UI | AC-20/21 | Deactivate button disabled for self/last-admin | Button disabled + tooltip, not just hidden | `client/src/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-12 | UI | AC-16 | Staff Ticket Detail appears-resolved badge | Badge rendered near status dropdown when appearsResolved is true | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-13 | UI | BR-27 | Comment content XSS-safe rendering | Stored markup renders as plain text — script/img never executed | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-14 | UI | AC-17/FR-20 | Admin status (Active/Inactive) filter | Status dropdown narrows the list server-side; All restores both states | `client/src/tests/lab-03/UserManagement.test.tsx` | Pass |
| STYLE-01 | Style | ui-spec §1 | Role badge class per role | Correct badge-role-* class + visible text | `client/src/tests/lab-03/Badges.style.test.tsx` | Pass |
| STYLE-02 | Style | ui-spec §2 | Login card + submit token classes | Card carries the --color-surface class, submit the --color-primary class | `client/src/tests/lab-03/LabScreensStyle.style.test.tsx` | Pass |
| STYLE-03 | Style | ui-spec §3 | Password rule checklist indicator class | Items carry rule-unmet/rule-met classes that flip as rules are satisfied | `client/src/tests/lab-03/LabScreensStyle.style.test.tsx` | Pass |
| STYLE-04 | Style | ui-spec §6 | Internal Notes panel warning token class | Panel class binds --color-warning-bg, distinct from Public Comments panel | `client/src/tests/lab-03/LabScreensStyle.style.test.tsx` | Pass |
| STYLE-05 | Style | ui-spec §4 | Appears-resolved indicator token class | Indicator class binds --color-pale-green | `client/src/tests/lab-03/LabScreensStyle.style.test.tsx` | Pass |
| STYLE-06 | Style | ui-spec §7 | Admin role filter/badge full-label render | Role filter offers full labels; row badge renders "Administrator" with no truncation classes | `client/src/tests/lab-03/LabScreensStyle.style.test.tsx` | Pass |
| RESP-01 | Responsive | AC-26 | Staff Queue desktop/tablet/mobile | Table→card switch, no overflow | `e2e/lab-03/responsive.spec.ts` | Pass |
| RESP-02 | Responsive | AC-26 | Admin User Management responsive | Two-panel→stacked, no overflow | `e2e/lab-03/responsive.spec.ts` | Pass |
| RESP-03 | Responsive | AC-26 | Login screen responsive | Centered card, fields visible/usable, no overflow at 375/768/1280 | `e2e/lab-03/responsive.spec.ts` | Pass |
| RESP-04 | Responsive | AC-26 | Change Password screen responsive | Checklist items + Continue visible, not clipped, no overflow at 375/768/1280 | `e2e/lab-03/responsive.spec.ts` | Pass |
| RESP-05 | Responsive | AC-26 | Staff Ticket Detail responsive | Header grid 2-col→1-col on mobile, tabs tappable, no overflow at 375/768/1280 | `e2e/lab-03/responsive.spec.ts` | Pass |
| RESP-06 | Responsive | AC-26 | Requester Ticket Detail additions responsive | Comment input + appears-resolved button visible/tappable, no overflow at 375/768/1280 | `e2e/lab-03/responsive.spec.ts` | Pass |
| VISUAL-01 | Visual | ui-spec §10 | Login screenshots | 3 viewports + error state in `artifacts/lab-03/screenshots/login/` | `e2e/lab-03/screenshots.login.spec.ts` | Pass |
| VISUAL-02 | Visual | ui-spec §10 | Change Password screenshots | 3 viewports + checklist-validation state in `artifacts/lab-03/screenshots/change-password/` | `e2e/lab-03/screenshots.change-password.spec.ts` | Pass |
| VISUAL-03 | Visual | ui-spec §10 | Staff Queue screenshots | 3 viewports + filters-open + no-results states in `artifacts/lab-03/screenshots/staff-queue/` | `e2e/lab-03/screenshots.staff-queue.spec.ts` | Pass |
| VISUAL-04 | Visual | ui-spec §10 | Staff Ticket Detail screenshots | 3 viewports + internal-notes-tab + resolution-summary states in `artifacts/lab-03/screenshots/staff-ticket-detail/` | `e2e/lab-03/screenshots.staff-ticket-detail.spec.ts` | Pass |
| VISUAL-05 | Visual | ui-spec §10 | Requester Ticket Detail screenshots | 3 viewports + appears-resolved state in `artifacts/lab-03/screenshots/requester-ticket-detail/` | `e2e/lab-03/screenshots.requester-ticket-detail.spec.ts` | Pass |
| VISUAL-06 | Visual | ui-spec §10 | Admin User Management screenshots | 3 viewports + create-panel-open state in `artifacts/lab-03/screenshots/admin-users/` | `e2e/lab-03/screenshots.admin-users.spec.ts` | Pass |
| VISUAL-CHK-01 | Visual | ui-spec §10 item 1 | Role badge correct token color per role, text visible | Computed background == --color-pale-green / --color-field-readonly-bg / --color-warning-bg for Requester / IT Staff / Administrator | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-CHK-02 | Visual | ui-spec §10 item 2 | Internal Notes visually distinct from Public Comments | Notes panel background == --color-warning-bg and differs from public panel | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-CHK-03 | Visual | ui-spec §10 item 3 | Editable vs read-only field token pair | Editable selects == --color-field-editable-bg, read-only values == --color-field-readonly-bg, and they differ | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-CHK-04 | Visual | ui-spec §10 item 4 | No Create Ticket nav for IT Staff/Administrator | Nav link present for Requester, absent in DOM for IT Staff and Administrator (D-5) | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-CHK-05 | Visual | ui-spec §10 item 5 | No pagination controls in admin user list | Zero pagination controls rendered (D-4) | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-CHK-06 | Visual | ui-spec §10 item 6 | No email-delivery checkbox in Create User form | Only checkbox is the Active toggle; no email-delivery control/text (D-2) | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-CHK-07 | Visual | ui-spec §10 item 7 | All screens usable and non-overflowing at 375/850/1280 | scrollWidth <= clientWidth on all 6 new screens at all 3 widths | `e2e/lab-03/visual-inspection.spec.ts` | Pass |
| VISUAL-07 | Visual | ui-spec §2 | Login show/hide password eye icon | bootstrap-icons glyph font loaded (::before resolves), toggle switches field type, aria-label present | `e2e/lab-03/login-password-toggle.spec.ts` | Pass |
| MIG-01 | Migration/Regression | AC-25 | DevRequester → User migration | Existing Ticket.requesterId still resolves correctly post-migration | `server/tests/lab-03/migration.api.test.ts` | Pass |
| MIG-02 | Migration/Regression | AC-24 | All Lab 2 ticket/attachment tests re-run | Pass unmodified in intent against authenticated backend | `server/tests/lab-02/*` (re-run, not new files) | Pass |
| E2E-01 | E2E | AC-01, AC-02 | Login → forced password change → app access | Normal screens unreachable until change completes | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | AC-07 | Logout → direct URL access blocked | Redirect to /login, no protected content flashes | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-03 | E2E | AC-08, AC-09, AC-28, AC-29 | Claim → set IT Priority → change status → post comment → add note | Full staff workflow succeeds end-to-end | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-04 | E2E | AC-04, AC-14 | Internal Note never visible to Requester | Requester's own Ticket Detail view never renders the note content | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-05 | E2E | AC-17..AC-21, AC-30, AC-31 | Create/edit user, set password, safety rules, filters | Full admin workflow incl. all safety-rule rejections | `e2e/lab-03/user-administration.spec.ts` | Pass |

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
| AC-17 | API-20, API-31, E2E-05 |
| AC-18 | API-21, UI-10 |
| AC-19 | API-22, E2E-05 |
| AC-20 | API-23, UI-11, E2E-05 |
| AC-21 | API-24, API-26, UI-11, E2E-05 |
| AC-22 | SEC-01, SEC-04 |
| AC-23 | API-19, UI-06 |
| AC-24 | MIG-02 |
| AC-25 | MIG-01 |
| AC-26 | RESP-01, RESP-02, RESP-03, RESP-04, RESP-05, RESP-06, VISUAL-CHK-07 |
| AC-27 | UI-05 |
| AC-28 | API-27, E2E-03 |
| AC-29 | API-28, E2E-03 |
| AC-30 | API-29, E2E-05 |
| AC-31 | API-30, E2E-05 |
| AC-32 | SEC-03 |
| AC-33 | SEC-07 |
| FR-07 | SEC-09 |
| FR-20 | API-20, API-31, UI-14, E2E-05 |

## 4. Coverage Gaps (flagged, not silently resolved)
- BR-06 (5-failed-attempts logging) — resolved in #31 with UNIT-02b (`server/tests/lab-03/unit/loginAttempts.unit.test.ts`).
- XSS-safe rendering (BR-27) — resolved in #35 with UI-13 (`client/src/tests/lab-03/StaffTicketDetail.test.tsx`).

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
- ui-spec §10 Visual Inspection Checklist is fully automated (VISUAL-CHK-01..07); screenshot evidence lives in
  `artifacts/lab-03/screenshots/` (VISUAL-01..06) for the human-eye review pass.
- STYLE-02..06 assert the className-to-token contract in jsdom (jsdom cannot compute real CSS); the computed-style
  proof of the same tokens runs in Playwright (VISUAL-CHK-01..03).