# Lab 3 UI Specification — Extending Zen Green Theme

Reuses all tokens from `client/src/styles/theme.css` (Lab 2). No new hex values — the
one new concept, the **role badge**, is built from the existing palette.

## 1. Role Badge (new)

| Role | Class | Background | Text |
|---|---|---|---|
| Requester | `badge-role-requester` | `--color-pale-green` | `--color-primary` |
| IT Staff | `badge-role-it_staff` | `--color-field-readonly-bg` | `--color-text-primary` |
| Administrator | `badge-role-administrator` | `--color-warning-bg` | `--color-warning` |

`data-testid="badge-role"`, following the existing `badge-${kind}` convention from
Lab 2's `Badge.tsx`. Implemented by extending `client/src/components/Badge.tsx`
(expanding `type BadgeKind = "status" | "priority" | "role"` and adding role labels)
rather than introducing a separate component. Tested by `client/src/tests/lab-03/Badges.style.test.tsx` (STYLE-01).

## 2. Login Screen (`/login`)

- Centered Zen Green card (same shell as Lab 2's Requester Selection card).
- Fields: Email (text), Password (password, with show/hide toggle icon).
- Validation: both required; format-check email client-side, backend authoritative.
- Busy state: Sign In button shows spinner + disabled during request.
- Failure state: red inline banner directly under the fields —
  *"Invalid email or password. Please try again."* — identical for wrong password,
  unknown email, and inactive account (BR-06/BR-10, AC-05/AC-06).
- `data-testid`: `login-email`, `login-password`, `login-submit`, `login-error`.

## 3. Change Password Screen (mandatory, `mustChangePassword = true`)

Rendered **instead of** any other screen when the session is restricted — the app
router redirects here unconditionally until the change succeeds (AC-02).

- Fields: Current (temporary) Password, New Password, Confirm New Password.
- Live checklist below New Password (updates as the user types), each item a
  checkmark/plain-circle icon + text:
  - "Be at least 8 characters"
  - "Include upper and lower case letters"
  - "Include a number and a special character"
- Confirm must match New exactly; mismatch shown as a field-level error, not a banner.
- Continue button disabled until all checklist items pass AND Confirm matches.
- On success: navigate into the normal app (My Tickets / Queue / Users, per role).
- `data-testid`: `change-password-current`, `change-password-new`,
  `change-password-confirm`, `change-password-rule-length`,
  `change-password-rule-case`, `change-password-rule-number-special`,
  `change-password-submit`.

## 3.1 Authenticated App Shell

- Replaces Dev Requester display: shows user's name + role badge, top-right.
- "Logout" button replaces "Change Requester" — clears session, redirects to `/login`.
- Nav items filtered by role (Decision D-5):

| Nav item | Requester | IT Staff | Administrator |
|---|---|---|---|
| My Tickets | ✅ | ❌ | ❌ |
| Create Ticket | ✅ | ❌ | ❌ |
| My Queue | ❌ | ✅ | ✅ |
| Users (Admin) | ❌ | ❌ | ✅ |

## 4. Requester Ticket Detail — Additions Only (base layout unchanged from Lab 2)

- **Public Comments panel**: below the existing Attachments section. Textarea + "Post
  Comment" button; list below shows each entry as `{authorName} [{roleBadge}]` +
  timestamp + content, oldest first.
- **"Problem Appears Resolved" button**: secondary-variant button near the header;
  clicking shows a confirmation, then a persistent pale-green indicator
  ("You indicated this problem appears resolved") — visible to Requester and, in IT
  Staff's Ticket Detail, as a small badge near the status dropdown.
- Dev Requester Selection screen/route and "Change Requester" action: **removed**.

`data-testid` additions for Requester Ticket Detail: `requester-ticket-appears-resolved-btn`,
`requester-ticket-appears-resolved-indicator`, `requester-ticket-comment-input`,
`requester-ticket-comment-submit`.

## 5. IT Staff Ticket Queue (`/staff/queue`)

### Desktop (≥992px) — table
Columns: Ticket No. (link), Created Date, Summary, Category, Req. Priority (badge),
IT Priority (badge), Status (badge), Owner (name or "Unassigned" in muted text).
Header row: search box (`placeholder="Search by ticket number or summary…"`) +
"Filters" button (opens a panel: Status, IT Priority, Owner=me/unassigned/anyone) +
result-count line ("Showing 1 to 10 of 87 tickets") + sortable column headers (↕ icon
on Created Date, Req. Priority, IT Priority, Status, Owner) + numbered pagination
(Previous/1/2/…/Next).

### Tablet (768–991px) — compact table
Same table layout as desktop but: Summary column truncated to one line with ellipsis,
Owner column hidden (visible on row expand or tooltip), pagination becomes Previous/
Next only (no numbered page links). The search box remains full-width above the table.

### Mobile (<768px) — cards
Same fields as a stacked card per ticket (same pattern as Lab 2's `TicketList.css`
table→card technique), tap opens Ticket Detail.

### States
Loading skeleton, empty ("No tickets in the queue"), no-results (filtered to zero),
forbidden (non-staff direct nav — redirect, not a visible state), safe failure + retry.

`data-testid`: `staff-queue-search`, `staff-queue-filters-button`,
`staff-queue-row-${ticketId}`, `staff-queue-empty`, `staff-queue-no-results`,
`staff-queue-error`, `staff-queue-loading`.

## 6. IT Staff Ticket Detail (`/staff/tickets/:id`)

### Header grid (2–4 columns desktop, 1 column mobile)
Ticket No. (read-only), Category (read-only), Related System (read-only), Requester
(read-only name), Requested Priority (read-only badge/pill), **Current Status**
(editable dropdown — options limited to permitted transitions from the current status,
per BR-21), **Ticket Owner** (editable dropdown — active IT Staff/Admin + "Unassigned"),
**IT Priority** (editable dropdown).

If the ticket has `appearsResolved === true`, a small indicator badge
("Requester marked: Problem Appears Resolved") is displayed near the Current Status dropdown
with `data-testid="staff-ticket-appears-resolved-badge"`, styled in pale green
(`--color-pale-green` background, `--color-primary` text).

### Summary / Description
Read-only, same styling as Lab 2.

### Resolution Summary
Textarea, placeholder *"Add resolution summary (visible to requester)…"* — required
only when transitioning to Resolved/Closed (BR-22); otherwise optional/hidden until
that transition is attempted, at which point it's revealed with a validation message if
empty.

### Tabbed section
Three tabs only (Decision D-3 — no Service Actions tab):
- **Public Comments (N)** — count badge; textarea + Post button; threaded list, each
  entry `{authorName} [{role badge}]` + timestamp.
- **Internal Notes (N)** — count badge; **visually distinct background**
  (`--color-warning-bg` panel, not `--color-pale-green`) so staff never mistake it for
  the public tab; same textarea+list pattern.
- **Attachments (N)** — reuses Lab 2's `AttachmentSection` component unmodified.

`data-testid`: `staff-ticket-status-select`, `staff-ticket-owner-select`,
`staff-ticket-priority-select`, `staff-ticket-resolution-summary`,
`staff-ticket-appears-resolved-badge`,
`tab-public-comments`, `tab-internal-notes`, `tab-attachments`.

## 7. Administrator User Management (`/admin/users`)

Single screen, two-panel layout on desktop, stacked on mobile:

### Left panel — user table
Columns: Name, Email, Role (badge), Status (Active/Inactive pill), Edit action.
Above the table: search input (name/email) + role filter dropdown (All/Requester/IT
Staff/Administrator). **No pagination controls** (Decision D-4) — all matching users
render. "+ Create User" button top-right.

### Right panel — Create/Edit slide-over
Right panel = slide-over Create/Edit form: Full Name* (text), Email Address* (text),
Role* (dropdown: Requester/IT Staff/Administrator), Active (toggle), **Initial Password**
section — plain text field (no email checkbox, Decision D-2) with an optional "Generate"
button (`data-testid="admin-user-form-generate-password"`) that fills a random
BR-07-compliant password client-side for convenience. Buttons: "Save User",
"Deactivate User" (edit mode only, disabled + tooltip if this is the caller's own
account or the last active Administrator — BR-32/BR-33), "Cancel".

### States
Validation (duplicate email, invalid role), success (toast/banner), forbidden
(non-Admin direct nav — redirect), safe API-failure + retry.
**Empty state:** when search returns no matching users, show a centered message
"No users match your search" with a "Clear filters" link (distinct from the zero-users
global empty state which should not occur given seed data minimums).

`data-testid`: `admin-user-search`, `admin-user-role-filter`,
`admin-user-row-${userId}`, `admin-create-user-button`,
`admin-user-form-name`, `admin-user-form-email`, `admin-user-form-role`,
`admin-user-form-active`, `admin-user-form-password`,
`admin-user-form-generate-password`, `admin-user-form-save`,
`admin-user-form-deactivate`, `admin-user-list-empty`, `admin-user-list-no-results`.

## 8. Screen Modes & Feedback (per §8.6 of the handout)

| Screen | Modes | States covered |
|---|---|---|
| Login | single | initial, validation, submitting, failure |
| Change Password | single | initial, validation (live checklist), submitting, success |
| Requester Ticket Detail | view | + comment-posting (validation, success, failure) |
| Staff Queue | list | loading, empty, no-results, failure |
| Staff Ticket Detail | view/edit (inline field edits) | validation, saving, success, conflict (claim race), forbidden, not-found |
| Admin User Management | list/create/edit | validation, success, conflict (duplicate email), forbidden, not-found, failure |

## 9. Responsive & Accessibility
Same 3-tier breakpoints as Lab 2 (992px+/768–991px/<768px). All new interactive
elements keep visible focus indicators, `aria-label`s on icon-only controls (password
show/hide toggle, sort-arrow buttons), and non-color status indicators (badges always
carry text).

## 10. Visual Inspection Checklist (to complete during Issue #37)
- [ ] Role badge renders with correct color per role, text always visible
- [ ] Internal Notes tab visually distinct from Public Comments tab
- [ ] Editable vs read-only fields on Staff Ticket Detail follow existing token pair
- [ ] No "Create Ticket" nav item visible for IT Staff/Administrator sessions
- [ ] Admin user list has no pagination controls
- [ ] Create User form has no email-delivery checkbox
- [ ] All screens usable and non-overflowing at 375px/850px/1280px