# Lab 3 Sprint Engineering Specification — TokTickIT Users, Roles, IT Staff Ticketing, Admin

## 1. Sprint Goal
Replace the temporary Development Requester selector with real email/password
authentication and server-enforced role-based authorization for three roles
(Requester, IT Staff, Administrator), while preserving every Lab 2 Requester capability.
Deliver an operational IT Staff Ticket Queue and Ticket Detail workflow (ownership, IT
Priority, status transitions, Public Comments, Internal Notes) and a minimalist
Administrator User Management screen — all protected server-side, never by hiding UI.

## 2. Stakeholder Request Interpretation
The system needs real users now that the Dev Requester selector has served its
development purpose. Administrators need a simple screen to create and manage user
accounts (one role each) without deletion, bulk operations, or email delivery. Every
user with an initial password must change it before using the app. Requesters keep
using Lab 2's ticket functions under their real authenticated identity, and can now also
post Public Comments and flag a problem as "appears resolved." IT Staff get a shared
Ticket Queue to find, claim, and work tickets — setting IT Priority, updating status
through a defined workflow, and communicating via Public Comments (shared with the
Requester) and Internal Notes (staff-only). Every protected action must be enforced by
the backend regardless of what the UI shows or hides.

## 3. Scope

### Included
- Email/password authentication, mandatory first-login password change, logout
- Server-side role-based authorization (Requester / IT Staff / Administrator)
- Migration of Lab 2 `DevRequester` records into the real `User` model
- Continued Requester ownership protection for Ticket + Attachment functions (BR-06
  pattern from Lab 2, now keyed off the authenticated user, not a client-supplied id)
- IT Staff Ticket Queue: search, filter, sort, pagination
- IT Staff Ticket Detail: claim/reassign ownership, IT Priority, status transitions,
  Public Comments, Internal Notes, existing Attachment continuity
- Requester Ticket Detail additions: Public Comments, "Problem Appears Resolved"
- Minimalist Administrator User Management: list, search, role filter, create, edit,
  activation toggle, set new initial password, safety rules
- Zen Green UI extension: role badge, authenticated app shell, all new screens
  responsive at the same 3-tier breakpoints as Lab 2

### Explicitly Excluded
- Email invitations, password-reset email, MFA, social login, SSO
- Self-registration / Requester-created accounts
- "Actions Taken" by IT Staff (deferred to Lab 4) — including any UI tab for it
- Formal SLA calculation, escalation rules, notification services
- Dashboards/KPI analytics beyond simple queue counts
- Multi-tenant orgs, departments, customer administration
- Production-grade deployment/cloud infrastructure changes
- Multiple roles per user
- User deletion, bulk user operations, import/export, account-history screens
- Department/organization/profile-photo/extended user-profile management
- Email delivery of initial passwords or reset links (see Decision D-2 below)
- Account unlocking, admin-approval workflows, advanced identity management
- Mandatory pagination, multi-column sorting, or multiple simultaneous filters on the
  Administrator user list

## 4. Functional Requirements

**Authentication**
- **FR-01** The system shall authenticate a user by email and password and establish an
  authenticated session on success.
- **FR-02** The system shall reject authentication for inactive accounts with a generic
  message that does not reveal account existence or activation state.
- **FR-03** The system shall reject authentication for invalid credentials with the same
  generic message used for unknown emails (no user enumeration).
- **FR-04** The system shall force a user flagged `mustChangePassword` into a restricted
  session that only permits changing their password, until a valid new password is saved.
- **FR-05** The system shall allow an authenticated user to log out, invalidating their
  session such that subsequent requests (including direct URL navigation) are treated
  as unauthenticated.
- **FR-06** The system shall expose the current authenticated user's identity and role
  to the frontend via a "current user" endpoint.

**Authorization**
- **FR-07** The system shall enforce role-based authorization on every protected
  endpoint server-side, independent of any frontend control state.
- **FR-08** The system shall determine Requester ownership from the authenticated
  session identity, ignoring any client-supplied `requesterId`.
- **FR-09** The system shall reject a Requester's attempt to access Internal Notes
  without revealing note content or existence.

**Requester (regression + additions)**
- **FR-10** The system shall allow an authenticated Requester to create, view, search,
  filter, sort, and paginate only their own Tickets (Lab 2 behavior preserved).
- **FR-11** The system shall allow an authenticated Requester to add, download, and
  soft-remove Attachments only on Tickets they own (Lab 2 behavior preserved).
- **FR-12** The system shall allow a Requester to post a Public Comment on a Ticket they own.
- **FR-13** The system shall allow a Requester to mark a Ticket as "problem appears
  resolved" without changing its formal Current Status.

**IT Staff**
- **FR-14** The system shall provide IT Staff and Administrators a Ticket Queue
  supporting search, filtering, sorting, and pagination across all Tickets.
- **FR-15** The system shall allow IT Staff to claim an unassigned Ticket or reassign an
  owned Ticket to another active IT Staff/Administrator user.
- **FR-16** The system shall allow IT Staff/Administrator to change a Ticket's IT
  Priority independently of Requested Priority.
- **FR-17** The system shall allow IT Staff/Administrator to transition a Ticket's
  Current Status according to the permitted transition matrix (section 5).
- **FR-18** The system shall allow IT Staff/Administrator to post Public Comments and
  create Internal Notes on any Ticket.
- **FR-19** The system shall render Public Comments and Internal Notes in visually
  distinct sections so staff cannot mistake one for the other.

**Administrator**
- **FR-20** The system shall allow an Administrator to view a list of all users
  searchable by name/email with an optional role filter.
- **FR-21** The system shall allow an Administrator to create a user with one role, an
  activation state, and an initial password.
- **FR-22** The system shall allow an Administrator to edit a user's name, email, role,
  and activation state.
- **FR-23** The system shall allow an Administrator to set a new initial password for a
  user, flagging `mustChangePassword` for their next login.
- **FR-24** The system shall prevent an Administrator from deactivating their own
  account or removing the last active Administrator.

## 5. Business Rules

### Authentication & Session
- **BR-01** Only an active user with valid credentials may authenticate.
- **BR-02** A user marked as requiring a password change cannot enter the normal
  application until a new valid password is saved.
- **BR-03** The authenticated user identity, not a `requesterId` supplied by the client,
  determines ownership of Requester operations.
- **BR-04** Public Comments are visible to the Requester, IT Staff, and Administrator.
  Internal Notes are visible only to IT Staff and Administrator.
- **BR-05** A Requester may indicate that the problem appears resolved but cannot
  formally set the Ticket to Resolved or Closed.
- **BR-06** After 5 consecutive failed login attempts for the same email within 15
  minutes, further attempts return the same generic invalid-credentials message but are
  logged server-side; no account lockout UI is required in Lab 3 (lockout mechanics are
  out of scope per §4.2).
- **BR-07** Passwords must be at least 8 characters, include upper and lower case
  letters, at least one number, and at least one special character (matches the mockup's
  displayed password checklist).
- **BR-08** Passwords are hashed with bcrypt before storage; plaintext passwords are
  never persisted, logged, or returned in any API response.
- **BR-09** Logout invalidates the session cookie server-side; a request using a
  logged-out session must be treated as unauthenticated.
- **BR-10** An inactive user cannot authenticate, even with correct credentials; the
  response is identical to an invalid-credentials response (the generic
  *"Invalid email or password"* message defined by FR-02/FR-03).
- **BR-11** Email addresses are unique across all Users regardless of role; creating or
  editing a user to a duplicate email is rejected.
- **BR-12** `GET /api/auth/me` returns 401 for an unauthenticated caller and never
  returns password hash or other credential material for any user.

### Ticket Ownership, Priority, Status
- **BR-13** A Ticket may have zero or one Ticket Owner; only an active IT Staff or
  Administrator user may be assigned as Ticket Owner.
- **BR-14** Claiming an unassigned Ticket sets the claiming user as Ticket Owner.
- **BR-15** Reassigning an owned Ticket requires the acting user to be IT Staff or
  Administrator; the new owner must also be an active IT Staff or Administrator.
- **BR-16** Requested Priority is set once at Ticket creation by the Requester and is
  never editable afterward (Lab 2 behavior unchanged).
- **BR-17** IT Priority defaults to the Requested Priority value at Ticket creation and
  may only be changed afterward by IT Staff or Administrator.
- **BR-18** Permitted Ticket statuses are exactly: New, Open, In Progress, Waiting for
  Requester, Resolved, Closed, Reopened, Cancelled.
- **BR-19** A new Ticket begins in status New (Lab 2 behavior unchanged).
- **BR-20** Only IT Staff/Administrator may change Current Status; a Requester's
  "problem appears resolved" action never changes Current Status directly.
- **BR-21** Permitted status transitions (see table below) are enforced server-side;
  an unlisted transition is rejected with 400.

| From | Permitted To |
|---|---|
| New | Open, Cancelled |
| Open | In Progress, Waiting for Requester, Cancelled |
| In Progress | Waiting for Requester, Resolved, Cancelled |
| Waiting for Requester | In Progress, Resolved, Cancelled |
| Resolved | Closed, Reopened |
| Closed | Reopened |
| Reopened | In Progress, Waiting for Requester, Cancelled |
| Cancelled | *(terminal — no further transitions)* |

- **BR-22** Transitioning to Resolved or Closed requires a non-empty Resolution
  Summary; the field is retained and visible to the Requester afterward.

### Public Comments & Internal Notes
- **BR-23** Public Comments and Internal Notes are append-only in Lab 3 — no editing or
  deletion of existing entries.
- **BR-24** Each Comment/Note record stores its author (from the authenticated session)
  and creation timestamp from the backend; neither is client-supplied.
- **BR-25** Empty or whitespace-only Comment/Note content is rejected (400).
- **BR-26** Comment/Note content is limited to 1–2000 characters after trimming.
- **BR-27** Comment/Note content is escaped/sanitized before storage and rendered as
  plain text on the client (no raw HTML execution) to prevent stored XSS.
- **BR-28** A Requester requesting Internal Notes for any Ticket (owned or not) receives
  403 with no note data in the response body.

### Administrator
- **BR-29** An Administrator may create a user with exactly one role: Requester, IT
  Staff, or Administrator.
- **BR-30** An Administrator may update a user's name, email, role, and activation
  state; email changes are still subject to BR-11's uniqueness rule.
- **BR-31** An Administrator may set a new initial password for any user, which flags
  that user `mustChangePassword = true` for their next login.
- **BR-32** An Administrator cannot deactivate their own account.
- **BR-33** The system must always retain at least one active Administrator; an attempt
  to deactivate or edit-away-from-Administrator the last active Administrator is rejected.
- **BR-34** Deactivation is used instead of deletion; no user record is ever hard-deleted
  via the Administrator UI.
- **BR-35** An inactive user (of any role) cannot authenticate, per BR-10.

### Regression & Migration
- **BR-36** All Lab 2 Ticket/Attachment business rules (BR-01 through BR-37 in
  `docs/lab-02/specification.md`) remain in force, re-scoped from `requesterId` to the
  authenticated user's id.
- **BR-37** Every existing Lab 2 `DevRequester` row is migrated into a `User` row with
  role `REQUESTER`, preserving its original id so existing `Ticket.requesterId` foreign
  keys remain valid without a data rewrite.
- **BR-38** Migrated Requester accounts receive a seeded local-dev initial password
  (documented in `ai-use.md`/README, never a real secret) and `mustChangePassword = true`.

## 6. UI Specification Summary
See `docs/lab-03/ui-spec.md` for full detail. Summary per screen:
- **Login**: email/password fields, validation, busy state, generic safe failure message.
- **Change Password** (mandatory, shown instead of the app when `mustChangePassword`):
  current/new/confirm fields, live password-rule checklist (BR-07).
- **Requester screens**: unchanged Lab 2 layout minus the Dev Requester selector and
  "Change Requester" action; Ticket Detail gains a Public Comments panel and a
  "Problem Appears Resolved" button.
- **IT Staff Ticket Queue**: desktop table / mobile card list, search, filters, sort,
  pagination, status/priority badges, owner column.
- **IT Staff Ticket Detail**: read-only Requester-submitted fields, editable Current
  Status / Ticket Owner / IT Priority dropdowns, Resolution Summary field, tabbed
  Public Comments / Internal Notes / Attachments (Service Actions tab omitted — see
  Decision D-3).
- **Administrator User Management**: single screen, table + slide-over create/edit form,
  no pagination (Decision D-4).
- **App shell**: authenticated user's name + role badge replaces the Dev Requester
  display; Logout replaces "Change Requester"; nav items are role-filtered (Decision D-5).

## 7. Data Changes

### Models (Prisma) — additions/changes to the Lab 2 schema

```
User
  id                 Int      @id @default(autoincrement())
  name               String
  email              String   @unique
  passwordHash       String
  role               UserRole            // REQUESTER | IT_STAFF | ADMINISTRATOR
  isActive           Boolean  @default(true)
  mustChangePassword Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

Ticket (additions to the Lab 2 model)
  ownerId            Int?                // FK -> User.id, nullable (unassigned)
  itPriority         RequestedPriority?  // LOW | MEDIUM | HIGH | CRITICAL (reuses RequestedPriority enum; defaults to requestedPriority per BR-17)
  currentStatus      TicketStatus @default(NEW)  // enum expanded, see below
  resolutionSummary  String?
  appearsResolved    Boolean  @default(false)  // set by Requester via PATCH /appears-resolved; does NOT change currentStatus (BR-05)

PublicComment
  id          Int      @id @default(autoincrement())
  ticketId    Int                        // FK -> Ticket.id
  authorId    Int                        // FK -> User.id
  content     String
  createdAt   DateTime @default(now())

InternalNote
  id          Int      @id @default(autoincrement())
  ticketId    Int                        // FK -> Ticket.id
  authorId    Int                        // FK -> User.id
  content     String
  createdAt   DateTime @default(now())
```

### Enums
- `UserRole`: REQUESTER, IT_STAFF, ADMINISTRATOR
- `TicketStatus` (expanded from Lab 2's NEW-only): NEW, OPEN, IN_PROGRESS,
  WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED

### Indexes / Constraints
- `User.email` unique
- `Ticket.ownerId` indexed (queue filtering by owner)
- `Ticket.currentStatus` indexed (queue filtering by status)
- `PublicComment.ticketId`, `InternalNote.ticketId` indexed
- FK: `Ticket.ownerId → User.id`, `PublicComment.ticketId → Ticket.id`,
  `PublicComment.authorId → User.id`, `InternalNote.ticketId → Ticket.id`,
  `InternalNote.authorId → User.id`

### Migration Strategy
`DevRequester` rows are migrated in place into `User` rows sharing the same primary key
(`role = REQUESTER`, `passwordHash` seeded, `mustChangePassword = true`), so existing
`Ticket.requesterId` foreign keys require no data rewrite — only a foreign-key target
change from `DevRequester` to `User` (BR-37). The `DevRequester` table and the
Development Requester Selection screen/route are removed entirely after migration.

## 8. API Contract
See `docs/lab-03/api-spec.md` for full endpoint-by-endpoint detail (methods, request/
response shapes, status codes, authorization per endpoint).

### Endpoint Summary
| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/me` | Authenticated |
| POST | `/api/auth/change-password` | Authenticated (incl. must-change state) |
| POST/GET | `/api/tickets` *(Lab 2, re-scoped to session identity)* | Requester |
| GET | `/api/tickets/:id` *(Lab 2, re-scoped to session + returns `appearsResolved`)* | Requester |
| GET | `/api/staff/tickets` | IT Staff, Administrator |
| GET | `/api/staff/tickets/:id` | IT Staff, Administrator |
| PATCH | `/api/staff/tickets/:id/claim` | IT Staff, Administrator |
| PATCH | `/api/staff/tickets/:id/assign` | IT Staff, Administrator |
| PATCH | `/api/staff/tickets/:id/it-priority` | IT Staff, Administrator |
| PATCH | `/api/staff/tickets/:id/status` | IT Staff, Administrator |
| POST/GET | `/api/tickets/:id/comments` | Owning Requester, IT Staff, Administrator |
| POST/GET | `/api/tickets/:id/notes` | IT Staff, Administrator |
| PATCH | `/api/tickets/:id/appears-resolved` | Owning Requester |
| GET | `/api/admin/users` | Administrator |
| POST | `/api/admin/users` | Administrator |
| PATCH | `/api/admin/users/:id` | Administrator |
| PATCH | `/api/admin/users/:id/password` | Administrator |

### Authorization Matrix

Legend: ✅ Permitted · ❌ Forbidden · 🔒 Own tickets only

| Endpoint / Action | Requester | IT Staff | Administrator |
|---|---|---|---|
| POST `/api/auth/login` | ✅ | ✅ | ✅ |
| POST `/api/auth/logout` | ✅ | ✅ | ✅ |
| GET `/api/auth/me` | ✅ | ✅ | ✅ |
| POST `/api/auth/change-password` | ✅ | ✅ | ✅ |
| POST `/api/tickets` (create) | ✅ | ❌ | ❌ |
| GET `/api/tickets` (own list) | 🔒 | ❌ | ❌ |
| GET `/api/tickets/:id` | 🔒 | ❌ | ❌ |
| POST `/api/tickets/:id/attachments` | 🔒 | ❌ | ❌ |
| GET/PATCH `/api/attachments/:id/*` | 🔒 | ❌ | ❌ |
| POST `/api/tickets/:id/comments` | 🔒 | ✅ | ✅ |
| GET `/api/tickets/:id/comments` | 🔒 | ✅ | ✅ |
| POST `/api/tickets/:id/notes` | ❌ | ✅ | ✅ |
| GET `/api/tickets/:id/notes` | ❌ | ✅ | ✅ |
| PATCH `/api/tickets/:id/appears-resolved` | 🔒 | ❌ | ❌ |
| GET `/api/staff/tickets` (queue) | ❌ | ✅ | ✅ |
| GET `/api/staff/tickets/:id` | ❌ | ✅ | ✅ |
| PATCH `/api/staff/tickets/:id/claim` | ❌ | ✅ | ✅ |
| PATCH `/api/staff/tickets/:id/assign` | ❌ | ✅ | ✅ |
| PATCH `/api/staff/tickets/:id/it-priority` | ❌ | ✅ | ✅ |
| PATCH `/api/staff/tickets/:id/status` | ❌ | ✅ | ✅ |
| GET `/api/admin/users` | ❌ | ❌ | ✅ |
| POST `/api/admin/users` | ❌ | ❌ | ✅ |
| PATCH `/api/admin/users/:id` | ❌ | ❌ | ✅ |
| PATCH `/api/admin/users/:id/password` | ❌ | ❌ | ✅ |

> **Note:** 🔒 = Requester may access only Tickets/Attachments they own (authenticated session identity, BR-03). An unauthenticated request to any row above returns 401; an authenticated-but-wrong-role request returns 403.

## 9. Acceptance Criteria

- **AC-01** Given an active user with valid credentials, when the user logs in, then the
  backend establishes authenticated access and returns the permitted user identity and role.
- **AC-02** Given a user who must change the initial password, when login succeeds,
  then normal application screens remain unavailable until a valid new password is saved.
- **AC-03** Given an authenticated Requester, when the client supplies another
  `requesterId`, then the backend still applies the authenticated identity and does not
  return another Requester's data.
- **AC-04** Given a Requester account, when an Internal Note endpoint is requested,
  then the operation is rejected without exposing note content.
- **AC-05** Given invalid credentials, when a user attempts login, then a generic
  "Invalid email or password" message is shown, identical whether the email exists or not.
- **AC-06** Given an inactive account with correct credentials, when login is attempted,
  then the same generic invalid-credentials message is shown (no extra account info).
- **AC-07** Given a logged-in user, when they log out, then subsequent direct
  navigation to a protected route redirects to Login (not the protected content).
- **AC-08** Given an unassigned Ticket, when IT Staff clicks Claim, then that IT Staff
  user becomes the Ticket Owner.
- **AC-09** Given an owned Ticket, when IT Staff/Administrator reassigns it to another
  active IT Staff/Administrator, then the Ticket Owner updates accordingly.
- **AC-10** Given a Requester attempts to change IT Priority via a direct API call, then
  the request is rejected with 403.
- **AC-11** Given a Ticket in status New, when IT Staff attempts to transition it
  directly to Closed, then the transition is rejected as not permitted (BR-21).
- **AC-12** Given a Ticket transitioned to Resolved without a Resolution Summary, then
  the transition is rejected with a validation error.
- **AC-13** Given a Requester posts a Public Comment on their own Ticket, then it
  appears in the Ticket's Public Comments list attributed to that Requester.
- **AC-14** Given IT Staff creates an Internal Note, then it is visible to IT
  Staff/Administrator but never returned to the owning Requester.
- **AC-15** Given empty or whitespace-only Comment/Note content, then the submission is
  rejected with a validation error and nothing is persisted.
- **AC-16** Given a Requester clicks "Problem Appears Resolved," then the Ticket's
  Current Status is unchanged, and an indicator is visible to IT Staff.
- **AC-17** Given an Administrator views the user list, when they search by partial name
  or email, then only matching users are shown.
- **AC-18** Given an Administrator creates a user with an email already in use, then the
  creation is rejected with a duplicate-email error.
- **AC-19** Given an Administrator sets a new initial password for a user, when that
  user next logs in, then they are forced into the Change Password flow.
- **AC-20** Given an Administrator attempts to deactivate their own account, then the
  request is rejected.
- **AC-21** Given exactly one active Administrator exists, when an attempt is made to
  deactivate or role-change that Administrator, then the request is rejected.
- **AC-22** Given a non-Administrator user, when they call any `/api/admin/*` endpoint
  directly, then the request is rejected with 403.
- **AC-23** Given the IT Staff Ticket Queue, when searched/filtered/sorted/paginated,
  then only matching results and correct pagination metadata are returned.
- **AC-24** Given all Lab 2 Requester Ticket/Attachment automated tests, when re-run
  against the Lab 3 authenticated backend, then they still pass (regression).
- **AC-25** Given a migrated former-DevRequester account, when they log in with their
  seeded initial password, then they are forced to change it and afterward see exactly
  their own pre-existing Lab 2 Tickets.
- **AC-26** Given any screen at mobile width (<768px), then no horizontal scrolling
  occurs and role-appropriate content remains fully usable.
- **AC-27** Given an IT Staff user, when viewing the app shell navigation, then no
  "Create Ticket" link is shown (Decision D-5).
- **AC-28** Given a Ticket with IT Priority LOW, when IT Staff changes it to HIGH, then
  the Ticket's IT Priority is updated to HIGH and the Requested Priority remains
  unchanged (FR-16/BR-17).
- **AC-29** Given a Ticket in status Open, when IT Staff transitions it to In Progress,
  then the Ticket's Current Status is updated to In Progress (FR-17/BR-21).
- **AC-30** Given an Administrator fills in valid user details (name, email, role,
  initial password), when they submit the Create User form, then a new user is created
  with `mustChangePassword = true` and appears in the user list (FR-21/BR-29).
- **AC-31** Given an Administrator edits a user's name and role, when they save, then the
  user record is updated accordingly and the change is reflected in the user list
  (FR-22/BR-30).
- **AC-32** Given a Requester attempts to change a Ticket's Current Status via a direct API
  call (`PATCH /api/staff/tickets/:id/status`), then the request is rejected with 403
  (FR-17/BR-20).
- **AC-33** Given a Requester calls the IT Staff Ticket Queue (`GET /api/staff/tickets`)
  directly, then the request is rejected with 403 (FR-07/FR-14).

## 10. Definition of Done

### Product Completion Checklist
- [ ] All FR-01…FR-24 implemented and demonstrable
- [ ] All BR-01…BR-38 enforced server-side (not just UI) with test evidence
- [ ] All AC-01…AC-33 pass with linked automated test evidence in `tests.md`
- [ ] No test skipped, disabled, or commented out on `main`
- [ ] Every protected endpoint has a `SEC-NN` test proving server-side enforcement
      independent of any UI state
- [ ] All Lab 2 regression tests pass unmodified in intent (only identity source changed)
- [ ] Migration from `DevRequester` → `User` verified: existing Ticket ownership intact
- [ ] Seed data meets §5.3 minimums (4+1 Requesters, 3+1 IT Staff, 1+ Administrator)
- [ ] No plaintext passwords anywhere in code, logs, or repository
- [ ] Responsive layout verified at desktop/tablet/mobile for every new screen
- [ ] Peer review completed and recorded in `reviewer.md` for every merged PR

## 11. Assumptions and Decisions

- **D-1 (App name):** Use "TokTickIT" everywhere in the implementation. The Login/Queue/
  Ticket Detail/Admin mockups show "TikTockIT," which is treated as a mockup typo per
  the handout's own cross-cutting note — the written spec's consistent naming wins.
- **D-2 (No email delivery):** The Create User form's "Initial Password" section is a
  plain text field the Administrator sets directly (or a "Generate" helper button that
  fills it client-side for convenience) — no "Send password reset email" checkbox, no
  email is ever sent. Communicating the password to the new user is an out-of-band,
  local-lab concern outside this system's scope.
- **D-3 (Service Actions tab):** Omitted entirely from the IT Staff Ticket Detail tab
  set in Lab 3. The mockup's "Service Actions (1)" tab corresponds to "Actions Taken,"
  explicitly deferred to Lab 4 (§4.2). Only three tabs ship in Lab 3: Public Comments,
  Internal Notes, Attachments.
- **D-4 (No user-list pagination):** The Administrator user list renders all matching
  users without pagination controls, per the written "not required" list overriding the
  mockup. Seed data minimums (≥9 users) are well within a single unpaginated render.
- **D-5 (IT Staff nav — new decision, not in the original brief):** "Create Ticket" is
  hidden from the app-shell navigation for IT Staff and Administrator roles. No FR/BR
  grants ticket-creation ability to those roles; the mockup's shared nav bar showing it
  for Staff is treated as an oversight, not a requirement.
- **D-6 (Session mechanism):** Authenticated sessions use a signed, `httpOnly`,
  `SameSite=Lax` cookie containing a short-lived JWT (4-hour expiry) — stateless, no new
  sessions table required. Logout clears the cookie server-side via `Set-Cookie` with an
  expired date. **Known limitation, accepted for course scope:** a JWT issued before
  logout remains cryptographically valid until its own expiry if somehow replayed
  outside the browser (e.g., manually resent); this is mitigated by the short 4-hour
  expiry and is not a concern for the browser-based direct-URL-access tests this sprint
  requires (AC-07). CSRF: not applicable in the traditional sense since the API is
  same-origin JSON-only (no cookie-triggered state-changing GET requests, all mutating
  endpoints require `Content-Type: application/json` which browsers cannot trigger
  cross-site without CORS preflight, which our CORS config rejects for foreign origins).
- **D-7 (Password hashing library):** `bcryptjs` (pure JavaScript), not native `bcrypt`
  — avoids native-module build-tool requirements (node-gyp/Visual Studio Build Tools on
  Windows dev machines), trading a small performance cost that's irrelevant at this
  course's scale.
- **D-8 (Comments/Notes as two tables):** `PublicComment` and `InternalNote` are
  separate Prisma models rather than one polymorphic table with a `visibility` flag —
  this makes it structurally impossible for a query bug to leak an Internal Note through
  the Public Comments endpoint, since they're different tables entirely (defense in
  depth for BR-04/BR-28).
- **D-9 (Migrated Requester passwords):** All migrated `DevRequester` → `User` accounts
  share one documented local-dev-only seed password (see `ai-use.md`), with
  `mustChangePassword = true`, so no per-user secret needs to be invented or leaked.
- **D-10 (Administrator gets IT Staff ticket-operation permissions):** The handout §4.3
  warns that "Admin does not automatically get IT Staff ticket-operation permissions
  unless the approved authorization matrix explicitly says so." However, §4.5 explicitly
  includes Administrator in ticket ownership ("an active IT Staff or Administrator user")
  and IT Priority changes ("may later be changed only by IT Staff or Administrator"),
  and §4.6 grants Administrator visibility of Internal Notes. Since these §4.5/§4.6
  permissions require queue access and ticket detail access to be usable, the
  authorization matrix grants Administrator the same staff ticket endpoints (queue,
  detail, claim, assign, IT Priority, status, comments, notes). This is a deliberate
  decision based on the brief's own requirements, not an accidental copy of the IT Staff
  permission set.