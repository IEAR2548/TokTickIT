# Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens
## Full Requirements Brief (for AI Spec Agent / Coding Agent context — no PDF needed)

Course: CPE 334 Introduction to Software Engineering in the Age of AI Agents.
This is Sprint 3, building directly on the completed Lab 2 increment (Create Ticket,
My Tickets, Ticket Detail, Attachment lifecycle — all currently gated by a temporary
"Development Requester" selector that Lab 3 removes entirely).

---

## 1. Product Increment Goal

Lab 3 replaces the temporary Development Requester selector with **real authentication
and role-based authorization**, and introduces the first operational **IT Staff** workflow
and **Administrator** user management. By the end of this sprint the app supports three
roles: **Requester**, **IT Staff**, **Administrator**.

Required behaviors:
- Users authenticate with email + password.
- Users with an initial password must change it at first login before using the app.
- Each authenticated user sees only the navigation/actions permitted for their role.
- A Requester continues to create/manage only their own Tickets, now via their
  authenticated identity (not a client-supplied `requesterId`).
- IT Staff: shared Ticket Queue, open Ticket Detail, claim/reassign ownership, set IT
  Priority, update permitted status values, post Public Comments, write Internal Notes.
- A Requester can post Public Comments and indicate a problem "appears resolved" — but
  cannot formally set status to Resolved/Closed themselves.
- An Administrator can view users, create a user, update basic account info, assign one
  role, activate/deactivate an account, set a new initial password.
- All Lab 2 Requester functions keep working, with the Development Requester selector
  and "Change Requester" action fully removed.

## 2. Learning Outcomes (context for rigor expected)

- Secure authentication + mandatory first-login password change.
- Server-side role-based authorization + ownership checks — **never rely on hidden UI
  controls as a security boundary**.
- Evolve the existing data model/API without breaking the completed Lab 2 increment
  (migration, not rewrite).
- Operational IT Staff list + Ticket Detail workflows using reusable Zen Green components.
- Distinguish Public Comments (everyone) from Internal Notes (staff/admin only).
- Define/test ticket ownership, IT Priority, and permitted status-transition rules.
- Apply Spec DD, Test DD, and TDD to auth, authorization, workflow, and admin features.
- GitHub Issues, feature branches, PRs, peer review, staged integration.
- Evaluate completion using traceable evidence from the final `main` branch.

## 3. Stakeholder Request (verbatim intent)

> "The temporary Requester selector was useful for development, but the system now needs
> real users. Replace it with secure login. Administrators need a simple User Management
> screen where they can view users, create an account, assign one role, update basic
> account information, activate or deactivate an account, and set a new initial password.
> A user signing in with an initial password must choose a new password before entering
> the application.
>
> Requesters must continue using the ticket functions built in Lab 2, but the current
> Requester must now come from the authenticated account. IT Staff need a professional
> Ticket Queue where they can find work, open Ticket Detail, claim or reassign a Ticket,
> set IT Priority, communicate with the Requester through Public Comments, record private
> Internal Notes, and update the Ticket through its permitted workflow. Requesters may
> indicate that a problem appears resolved, but IT Staff remain responsible for formally
> resolving or closing the Ticket.
>
> Protect every API and screen according to role and ownership. Hiding a button is not
> authorization. Continue using the Zen Green design language and reusable components
> established in Lab 2."

## 4. Engineering Contract — Required Coverage

Must be prepared and maintained **before** implementation (extends the Lab 2 contract).
The coding agent may only report completion once the approved contract + Product DoD
are satisfied.

### 4.1 Must cover
- Authentication, logout, current-user retrieval, mandatory first-login password change.
- Role-based navigation + server-side authorization for Requester / IT Staff / Administrator.
- Migration from Development Requester identity → authenticated User model.
- Continued Requester ownership protection for all Lab 2 Ticket + Attachment functions.
- IT Staff Ticket Queue, Ticket Detail, ownership, IT Priority, Public Comments, Internal
  Notes, status workflow.
- Minimalist Administrator user management: listing, account creation, basic editing,
  one-role assignment, activation/deactivation, setting a new initial password.
- Data model + REST API changes.
- Zen Green UI extensions + reusable component rules.
- Acceptance criteria, planned tests, migration/regression evidence, Product DoD.

### 4.2 Explicitly EXCLUDED from Lab 3
- Email invitations, password-reset email, MFA, social login, SSO.
- Self-registration / Requester-created accounts.
- "Actions Taken" by IT Staff (deferred to Lab 4).
- Formal SLA calculation, escalation rules, notification services.
- Dashboards/KPI analytics beyond simple queue counts.
- Multi-tenant orgs, departments, customer administration.
- Production-grade deployment / cloud infra changes.
- Multiple roles per user.
- User deletion, bulk user ops, import/export, account-history screens.
- Department/organization/profile-photo/extended user-profile management.
- Email delivery of initial passwords or reset links.
- Account unlocking, admin-approval workflows, advanced identity management.
- Mandatory pagination / multi-column sorting / multiple simultaneous filters on the user list.

### 4.3 Required Roles & Minimum Permitted Behavior

| Role | Minimum permitted behavior |
|---|---|
| **Requester** | Use authenticated identity; create Tickets; view/manage only owned Tickets + permitted Attachments; post Public Comments; indicate a problem "appears resolved". |
| **IT Staff** | View IT Staff Ticket Queue; open Tickets; claim/reassign ownership; set IT Priority; perform permitted status changes; post Public Comments; create Internal Notes. |
| **Administrator** | Manage user accounts via the minimalist User Management screen: view users, create a user, edit basic account info, assign one permitted role, activate/deactivate, set a new initial password. |

Admin and IT Staff responsibilities stay conceptually separate — Admin does **not**
automatically get IT Staff ticket-operation permissions unless the approved
authorization matrix explicitly says so. **Every protected operation must be enforced
server-side.** A hidden/disabled frontend control is UX feedback, not a security control.

### 4.4 Required Business Rules

These are EXAMPLES only — students/agent must number the complete set as BR-01, BR-02, ...
in `docs/lab-03/specification.md`.

| BR ID | Example rule |
|---|---|
| BR-01 | Only an active user with valid credentials may authenticate. |
| BR-02 | A user marked as requiring a password change cannot enter the normal application until a new valid password is saved. |
| BR-03 | The authenticated user identity, not a client-supplied `requesterId`, determines ownership of Requester operations. |
| BR-04 | Public Comments are visible to Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator. |
| BR-05 | A Requester may indicate a problem "appears resolved" but cannot formally set the Ticket to Resolved or Closed. |

Must also define rules for: login attempts, password handling, logout, inactive users,
duplicate email addresses, current-user behavior, Ticket ownership, IT Staff assignment,
IT Priority, Public Comments, Internal Notes, status transitions, validation, failures,
and regression behavior.

**Administrator rules must stay limited to:**
- Creating a user with one permitted role.
- Updating name, email, role, activation state.
- Preventing duplicate email addresses.
- Setting a new initial password that must be changed at next login.
- Preventing an Administrator from deactivating their **own** account.
- Preventing removal/deactivation of the **last active Administrator**.
- Using deactivation instead of deletion.

### 4.5 Ticket Ownership, Priority, Status

- Each Ticket may have **one primary Ticket Owner** (an active IT Staff or Administrator
  user). A Ticket may start unassigned.
- **Requested Priority** = value the Requester submitted (unchanged, Lab 2 behavior).
- **IT Priority** initially copies Requested Priority; may later be changed only by
  IT Staff or Administrator.
- Required Ticket statuses: **New, Open, In Progress, Waiting for Requester, Resolved,
  Closed, Reopened, Cancelled.**
- Must define: a clear transition matrix, permitted roles per transition, required
  confirmations, validation behavior.
- Lab 3 does NOT include "Actions Taken" — the later rule blocking resolution while
  Actions Taken remain incomplete is deferred to Lab 4.

### 4.6 Public Comments & Internal Notes

- **Public Comments**: shared communication on a Ticket, visible to Requester + IT Staff
  + Administrator.
- **Internal Notes**: operational notes, visible ONLY to IT Staff + Administrator.
- Both are **append-only** in Lab 3 — no editing or deletion.
- Each entry records its author + creation time from the backend (not client-supplied).
- Empty/whitespace-only content rejected; must define justified length limits and safe
  rendering (XSS-safe display).

## 5. Required Database Increment

Evolve the Lab 2 PostgreSQL/Prisma design **without discarding existing Ticket/Attachment
data.** Must support real users, credentials, roles, ticket ownership, IT Priority,
Public Comments, Internal Notes, plus the additional workflow fields the approved spec
requires.

### 5.1 Required concepts & relationships
- One User has exactly one permitted role in Lab 3: Requester, IT Staff, or Administrator.
- One Requester user may own many submitted Tickets.
- One Ticket may have zero or one primary Ticket Owner.
- One Ticket may contain many Public Comments.
- One Ticket may contain many Internal Notes.
- Each Comment/Note has one author.
- Existing Categories, Related Systems, Tickets, Attachments remain valid post-migration.

Must determine: fields, data types, foreign keys, indexes, enums/reference tables,
timestamps, activation state, password-change-required state, migration strategy.
**Passwords must never be stored in plaintext.**

Explicitly NOT needed in Lab 3: departments, multiple roles, profile images, role
history, account audit history on the User model.

### 5.2 Required Migration from Lab 2
Lab 2 Development Requester records must be evolved/migrated into the real User model.
Existing Ticket ownership must remain correct. Must document + test how existing
Requesters receive initial passwords, and how the temporary selector + its client-side
state are removed.

### 5.3 Required Seed Data
- Idempotent seed behavior, safe to run repeatedly.
- ≥4 active Requester accounts + 1 inactive Requester account.
- ≥3 active IT Staff accounts + 1 inactive IT Staff account.
- ≥1 active Administrator account (for testing User Management).
- Realistic Tickets distributed across Requesters, statuses, priorities, assigned/
  unassigned ownership.
- Example Public Comments + Internal Notes that don't expose sensitive info.
- Seeded credentials are local-dev-only, must be clearly documented. **No real personal
  passwords/secrets in the repo.**

## 6. Required REST API Contract

Exact endpoint paths, methods, request/response shapes, cookie/token behavior,
validation, safe errors, and status codes go in `docs/lab-03/api-spec.md`. Must support:

- Login, logout, current authenticated user, mandatory password change.
- Authenticated continuation of ALL Lab 2 Requester Ticket + Attachment APIs.
- IT Staff Ticket Queue retrieval: search, filters, sorting, pagination.
- Retrieve one Ticket for IT Staff operations.
- Claim / assign / reassign Ticket ownership.
- Update IT Priority and permitted Ticket status.
- Create + retrieve Public Comments.
- Create + retrieve Internal Notes (permitted roles only).
- Retrieve user list as Administrator: search by name/email + optional role filter.
- Create a user with one permitted role.
- Update user's name, email, role, activation state.
- Set a new initial password (must-change-at-next-login).
- Issue/reset an initial password using the approved local-lab approach.

NOT needed: user deletion, bulk ops, import/export, role history, multi-role assignment,
email delivery, advanced account workflows.

### 6.1 Authentication & Session Decisions
Must choose + justify (with the AI spec agent) a secure approach fitting this course
stack: password hashing, credential validation, session/token storage, expiration,
logout invalidation, CSRF considerations where applicable, safe error messages.
**Authentication secrets must never be exposed to client code or committed to source
control.**

### 6.2 Authorization & Safe Errors
Every protected endpoint must distinguish: unauthenticated, authenticated-but-forbidden,
invalid input, missing resource, conflict, unexpected server error. **Must not leak
whether another user's protected Ticket/Attachment/Internal Note exists** (this mirrors
Lab 2's BR-06 ownership-before-existence-disclosure pattern already implemented for
Tickets/Attachments — extend the same discipline to Internal Notes).

### 6.3 Queue Query Behavior
IT Staff Ticket Queue API must support search, suitable filters, sorting, pagination.
Must decide + document: searchable fields, filterable fields, sortable fields, default
ordering, page sizes, pagination metadata, behavior for invalid query params.

## 7. Zen Green Theme & Application Shell — Continuity Requirements

Reuse the Zen Green design language from Lab 2 (tokens now centralized in
`client/src/styles/theme.css`). New screens must look like the same application, not a
second visual system.

- Replace the Development Requester display with the authenticated user's name + role.
- Provide Logout + permitted profile/password actions.
- Show role-specific navigation, never presenting unauthorized destinations.
- Consistent badges for Ticket status, Requested Priority, IT Priority, and **role**
  (new badge kind needed).
- Preserve clear editable-vs-read-only field styling (established: `--color-field-
  editable-bg` / `--color-field-readonly-bg` tokens).
- Visible loading, saving, success, validation, empty, no-results, forbidden, safe
  failure feedback where meaningful.
- Usable on desktop / tablet / mobile (same 3-tier breakpoints as Lab 2: 992px+ desktop,
  768–991px tablet, <768px mobile).

## 8. Required User Interfaces

### 8.1 Login & Mandatory Password Change
From the mockup: app renamed "TikTockIT" in the mockup header (note: possibly a mockup
typo vs "TokTickIT" used elsewhere — flag with the team, don't silently pick one).
- Login screen: email, password, validation, busy state, safe failure feedback
  ("Invalid email or password. Please try again." — generic, no user-enumeration).
- Clear response for inactive accounts WITHOUT exposing unnecessary account info.
- Mandatory Change Password screen for users with an initial/temporary password:
  fields for current (temporary) password, new password, confirm new password.
  Password rules shown as a live checklist (mockup shows: "Be at least 8 characters",
  "Include upper and lower case letters", "Include a number and a special character").
- Password rules, confirmation, validation, successful continuation into the app.
- Authenticated application shell showing current user + role.
- Logout action that removes authenticated access (verify direct-URL access is blocked
  after logout).

### 8.2 Requester Regression & Public Comments
Lab 2 Requester screens must keep working using the authenticated Requester identity.
**Remove**: Development Requester selector, "Change Requester" action. The Requester
Ticket Detail screen must ADD: Public Comments, and the approved "Problem Appears
Resolved" action — while preserving existing Ticket/Attachment ownership protection
(BR-06 pattern from Lab 2).

### 8.3 IT Staff Ticket Queue
Must help IT Staff locate/prioritize work: search, suitable filters, sorting,
pagination, clear ownership + status info, an action to open Ticket Detail, and
meaningful loading/empty/no-results/forbidden/failure feedback. Design the final
desktop table AND smaller-screen representation in `ui-spec.md`.

Example fields from mockup (justify final set, avoid an unreadable mega-grid):
Ticket No., Created Date, Summary, Category, Req. Priority, IT Priority, Status,
Owner. Mockup shows: search box ("Search by ticket number or summary…"), a "Filters"
button, a result-count line ("Showing 1 to 10 of 87 tickets"), sortable column headers
(↕ icons on Created Date, Req. Priority, IT Priority, Status, Owner), colored priority/
status pills, numbered pagination with Previous/Next.

### 8.4 IT Staff Ticket Detail
Extends the Lab 2 Ticket Detail screen. Ticket info stays clearly grouped; only
permitted operational fields are editable. Must provide: Ticket ownership, IT Priority,
permitted status changes, Public Comments, Internal Notes, existing Attachments, clear
role-specific actions. **Public Comments and Internal Notes must be visually distinct**
so private info isn't accidentally posted publicly.

Mockup layout: header grid (Ticket No. / Category / Related System / Requester /
Requested Priority [read-only pill] / Current Status [editable dropdown] / Ticket Owner
[editable dropdown] / IT Priority [editable dropdown]), Summary/Description (read-only),
a "Resolution Summary" field (placeholder: "Add resolution summary (visible to
requester)…"), then a **tabbed section**: "Public Comments (3)", "Internal Notes (2)",
"Attachments (2)", "Service Actions (1)" — each tab shows a count badge. Public Comments
tab has an "Add Public Comment" input + Post button, and a threaded list showing
author name + role badge (e.g. "Jennifer Anderson [Requester]", "Michael Brown [IT
Support]") + timestamp per entry.

Note: "Service Actions" tab appears in the mockup but Actions Taken is explicitly
excluded from Lab 3 scope (§4.2) — clarify with the team whether this tab is a Lab 4
placeholder that should be hidden/omitted in Lab 3, or renamed to something in-scope.

### 8.5 Administrator User Management
Must stay **intentionally simple** — ONE User Management screen.

**Required functionality:**
- Display user list: Name, Email, Role, Status, Edit action.
- Search users by name or email.
- Optional role filter.
- Create user: name, email, one permitted role, activation state, initial password.
- Edit user's name, email, role, activation state.
- Set a new initial password (must-change-at-next-login).
- Prevent duplicate email addresses + invalid role values.
- Prevent an Administrator from deactivating their own account.
- Prevent the system from having zero active Administrators.
- Clear validation, success, forbidden, safe API-failure feedback.

**Explicitly NOT required:** user deletion, pagination, multi-column sorting, multiple
simultaneous filters, multiple roles/user, departments, bulk ops, import/export, role/
audit history, email invitations or password-reset email, advanced account-recovery
workflows.

Mockup layout: left panel = user table (Name/Role/Status columns, pagination shown in
mockup but NOT required per spec above — mockup shows more than the minimum, follow
the written requirement list, not the mockup's pagination), "+ Create User" button
top-right. Right panel = "Create New User" slide-over form: Full Name*, Email Address*,
Role* (dropdown, e.g. "IT Staff"), Active (toggle), "Initial Password" section (mockup
shows a "Send password reset email" checkbox — **this contradicts §4.2's explicit
exclusion of email delivery of initial passwords**; do NOT implement email delivery,
flag this mockup/spec conflict and resolve via the local-lab-only initial-password
approach instead), "Save User" / "Deactivate User" / "Cancel" buttons.

### 8.6 Required Screen Modes & User Feedback
Identify main create/view/edit modes per screen. Don't need a separate formal state for
every error, but must provide clear feedback for: meaningful processing, validation,
success, empty/no-results, forbidden, not-found, conflict, safe API-failure — and cover
these with tests.

### 8.7 Responsive & Accessibility
Same as Lab 2 (3-tier breakpoints, WCAG-reasonable practices already established).

## 9. Spec DD Deliverable

**Required files:** `docs/lab-03/specification.md`, `docs/lab-03/ui-spec.md`,
`docs/lab-03/api-spec.md`.

Transform this handout into a concise, internally consistent Sprint 3 spec — **do not
copy the handout verbatim.** Resolve implementation choices, name assumptions, describe
how the Lab 2 increment is migrated/preserved.

| Section | Must provide |
|---|---|
| 1. Sprint Goal | One short paragraph of delivered value. |
| 2. Stakeholder Request | Concise interpretation in own words. |
| 3. Scope | Included + explicitly excluded work. |
| 4. Functional Requirements | Numbered FR statements: auth, authorization, IT Staff ops, comments/notes, minimalist admin user mgmt. |
| 5. Business Rules | Numbered BR statements: roles, ownership, passwords, assignment, priority, status, comments, notes, account activation, one-role assignment, admin safety rules. |
| 6. UI Specification Summary | Screen structure, modes, controls, feedback, role behavior, responsive rules, ref to ui-spec.md. |
| 7. Data Changes | Models, fields, relationships, indexes, migration, seed decisions. |
| 8. API Contract | Endpoints, auth mechanism, request/response shapes, statuses, authorization, safe errors. |
| 9. Acceptance Criteria | Observable/testable criteria (AC-01, AC-02, ...). |
| 10. Definition of Done | Product-completion checklist for the coding agent. |
| 11. Assumptions & Decisions | Only meaningful choices not fixed by the handout. |

### 9.1 Example Acceptance Criteria (must add enough to cover full approved scope; every AC → at least one planned test)

| ID | Example criterion |
|---|---|
| AC-01 | Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role. |
| AC-02 | Given a user who must change the initial password, when login succeeds, then normal application screens remain unavailable until a valid new password is saved. |
| AC-03 | Given an authenticated Requester, when the client supplies another `requesterId`, then the backend still applies the authenticated identity and does not return another Requester's data. |
| AC-04 | Given a Requester account, when an Internal Note endpoint is requested, then the operation is rejected without exposing note content. |

## 10. Test DD & TDD Deliverable

**Required file:** `docs/lab-03/tests.md` — created BEFORE or ALONGSIDE implementation,
never reconstructed afterward from whatever the coding agent happened to generate.

Must cover: unit, API/integration, UI component, UI style, responsive, security/
authorization, migration/regression, and end-to-end coverage.

**Table format (example rows):**

| Test ID | Type | Requirement/AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login | Authenticated response; safe user data | `server/tests/lab03/auth.api.test.ts` | Pass |
| API-08 | API | AC-04 | Requester requests Internal Notes | Forbidden; no note data returned | `server/tests/lab03/notes.api.test.ts` | Pass |
| E2E-02 | E2E | AC-02 | Initial password login + change | Normal app opens only after valid change | `e2e/lab-03/first-login.spec.ts` | Pass |

Must identify remaining tests for: valid/invalid login, inactive accounts, password
boundaries, logout, role navigation, direct API authorization, Requester regression,
queue queries, ownership, IT Priority, status transitions, comments, notes, minimalist
user administration, migration, responsive behavior, accessibility, safe failures.

**Administrator tests specifically must cover:** user listing, search, optional role
filtering, user creation, duplicate-email rejection, basic editing, one-role assignment,
activation/deactivation, new-initial-password behavior, prevention of self-deactivation,
prevention of removing the last active Administrator, forbidden access by non-Admins.

## 11. GitHub Issues & Workflow

Same Kanban statuses as Lab 2. Before coding, decompose Sprint 3 into GitHub Issues
covering: specification, tests, migration, authentication, authorization, Requester
regression, IT Staff interfaces, user administration, E2E testing, visual inspection,
release integration.

**Example issues from the handout (non-exhaustive):**

| Example Issue | Possible scope |
|---|---|
| Sprint 3 engineering contract | specification.md, tests.md, ui-spec.md, api-spec.md |
| Authentication foundation | User migration, password hashing, login/logout/current-user API, tests |
| IT Staff Ticket Queue | Queue API, responsive UI, search/filter/sort/pagination, tests |
| IT Staff Ticket operations | Ownership, IT Priority, status, Public Comments, Internal Notes, tests |
| Administrator user management | Minimalist screen: list, name/email search, optional role filter, create/edit, one-role assignment, activation/deactivation, new initial password, safety rules, tests |

**Branch flow:** same pattern as Lab 2 (feature branches → `lab3-staging` → `main`
after review).
**AI agent rules:** same as Lab 2 (spec agent drafts docs before implementation;
coding agent may only claim completion once approved contract + Product DoD are met).

## 12. Required Repository Increment (exact structure)

```
docs/lab-03/
├── specification.md
├── tests.md
├── ui-spec.md
├── api-spec.md
├── reviewer.md
└── ai-use.md

server/tests/lab-03/
├── auth.api.test.ts
├── authorization.api.test.ts
├── staff-queue.api.test.ts
├── staff-ticket-detail.api.test.ts
├── comments-notes.api.test.ts
└── users-admin.api.test.ts

client/.../lab-03 tests/
├── Login.test.tsx
├── ChangePassword.test.tsx
├── StaffTicketQueue.test.tsx
├── StaffTicketDetail.test.tsx
└── UserManagement.test.tsx

e2e/lab-03/
├── authentication.spec.ts
├── staff-ticket-flow.spec.ts
└── user-administration.spec.ts

artifacts/lab-03/screenshots/
├── authentication/
├── staff-queue/
├── staff-ticket-detail/
└── user-management/
```

## 13. Definition of Done

Similar rigor to Lab 2 — finalize the exact Product DoD checklist together with an LLM
(spec agent), covering all FR/BR/AC traceability, test-suite green status, docs current,
migrations committed, and no skipped/disabled tests — same shape as the Lab 2 Issue #19
release-integration checklist.

## 14. Submission Format — ONE PDF, exact structure

Headings **"Answer Part 1"** through **"Answer Part 9"**, in this exact order, with
working links; screenshots readable without extreme zoom. Repo + final `main` branch
remain the source of truth.

| Part | Points | Required evidence |
|---|---|---|
| 1. Git Use with Engineering Workflow | 10 | Commit history: feature branches → `lab3-staging` → `main`; final Kanban with all Issues Done; rendered `reviewer.md` (reviewer identity, PR links, comments, responses, approvals); README + `.gitignore` evidence; repo directory structure. |
| 2. Spec DD | 5 | Link + rendered `docs/lab-03/specification.md`: numbered FR/BR, authorization matrix, ACs, migration decisions, Product DoD. Evidence the spec existed BEFORE main implementation PRs completed. |
| 3. Test DD & Traceability | 10 | Link + rendered `docs/lab-03/tests.md`: planned tests, AC traceability, actual file paths, final status. Full passing test output (unit/API/UI/authorization/regression/E2E) from `main`. |
| 4. AI Use with Reflection | 5 | Rendered `docs/lab-03/ai-use.md` naming the LLM(s) used, 6–10 selected key prompts, brief "My Reflection" on spec-agent and coding-agent use. |
| 5. Working Login + Password Change UI | 5 | Valid/invalid login, inactive-account handling, busy/safe-failure feedback, mandatory first-password-change, authenticated user/role display, logout, direct access blocked after logout. |
| 6. Working IT Staff Ticket Queue UI | 5 | Realistic queue data, search, filters, sorting, pagination, assigned/unassigned ownership, status/priority badges, open-detail action, empty/no-results/failure feedback, responsive behavior. |
| 7. Working IT Staff Ticket Detail UI | 10 | Claim/reassign, IT Priority, permitted status changes, Public Comments, Internal Notes, Attachment continuity, Requester resolution indication, role restrictions, validation, safe failure. Direct API authorization evidence. |
| 8. Working Administrator User Management UI | 5 | List (Name/Email/Role/Status/Edit), search, optional role filter, create with role+initial password, duplicate-email/invalid-input validation, edit name/email/role/activation, set new initial password + demonstrate forced change at next login, prevent self-deactivation, prevent removing last active Admin, forbidden for non-Admins, responsive Zen Green + safe failure. |
| 9. Zen Green UI + Responsive Evidence | 5 | Rendered `ui-spec.md` + desktop/tablet/mobile screenshots for all major Lab 3 screens. Completed visual checklist: design consistency, role navigation, badges, editable/read-only fields, validation placement, focus, clipping, overlap, horizontal overflow. |

**Total: 60 points.**

---

## Cross-cutting notes for whoever (human or agent) works from this brief

1. **Mockup vs written-spec conflicts found while summarizing — resolve explicitly,
   don't silently pick one:**
   - App name shown as "TikTockIT" in the Login mockup vs "TokTickIT" used everywhere
     else (Lab 2 + rest of the Lab 3 handout).
   - Create-User mockup shows a "Send password reset email" checkbox, but §4.2
     explicitly excludes "email delivery of initial passwords or reset links." The
     written requirement wins — no email delivery; use the local-lab-only initial-
     password approach instead.
   - IT Staff Ticket Detail mockup shows a "Service Actions (1)" tab, but "Actions
     Taken by IT Staff" is explicitly excluded from Lab 3 (§4.2, deferred to Lab 4).
     Needs a decision: omit the tab entirely in Lab 3, or repurpose/rename it for
     something actually in scope.
   - Admin user-list mockup shows pagination controls, but the written requirement
     list explicitly says pagination is NOT required for Lab 3's user list. Follow
     the written requirement.
2. **This brief is a condensation, not a replacement for judgment** — the actual
   `docs/lab-03/*.md` files must still resolve every open assumption listed in the
   handout's own §9 ("Assumptions and Decisions") column, not just restate this file.
3. Everything in this brief traces back to the original Lab 3 handout PDF ("Lab 3.
   TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens", CPE 334, Semester
   1/2026). If anything here seems to contradict a future clarification from the
   instructors/TAs, the clarification wins.