# TokTickIT — Sprint 4 Engineering Specification
`docs/lab-04/specification.md`

## 1. Sprint Goal

Sprint 4 completes the TokTickIT service-desk lifecycle by adding an auditable **Actions Taken**
record under every Ticket, enforcing a backend-authoritative **Ticket resolution workflow**,
delivering concise **role-appropriate dashboards** for Requesters and IT Staff, and hardening the
full application (regression, accessibility, responsiveness, visual consistency) so it is ready
for final demonstration.

## 2. Stakeholder Request (interpreted)

IT Staff need a structured, auditable way to record the actual work performed on a Ticket —
separate from public comments and internal notes — including whether follow-up is required. The
Ticket Owner still owns overall coordination, but any IT Staff member may log an Action Taken.
Requesters may flag that a problem looks resolved, but only IT Staff/Admin can formally close the
loop by changing Ticket status. Both Requesters and IT Staff want a short "landing page" that
surfaces what needs attention right now, linking into the existing detailed lists rather than
replacing them.

## 3. Scope

### 3.1 Included
- `ActionTaken` data model, one Ticket → many Actions Taken.
- Create/list/view Actions Taken on the Ticket Detail screen (IT Staff/Admin write, Requester
  read-only).
- Final Ticket status transition matrix, backend-enforced, including the resolution gate.
- Requester Dashboard and IT Staff Dashboard (Admin reuses IT Staff Dashboard).
- Prisma migration + idempotent seed covering Lab 1–3 data plus Lab 4 fixtures.
- REST endpoints for Actions Taken CRUD (create/update), the requester-confirmation flag, Ticket
  status changes, and both dashboards.
- Optimistic-concurrency (stale-update) protection on Ticket status changes and Actions Taken
  edits.
- Full regression pass and accessibility/responsive hardening of all Lab 1–3 screens.

### 3.2 Explicitly Excluded
- Automatic SLA clocks, escalation engines, on-call scheduling, breach notifications.
- Any external notification channel (email/SMS/LINE/push).
- Inventory/spare-parts, purchasing, cost accounting, timesheets, payroll.
- Multi-level approvals, e-signatures.
- BI tooling, custom report builders, data warehouses/exports.
- Multi-tenant organizations, production-scale cloud operations.
- Any feature not listed above or not separately approved via a Sprint 4 Issue.

## 4. Roles & Authorization Matrix

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| View Actions Taken on **own** Tickets | ✅ read-only | — | — |
| View Actions Taken on **any accessible** Ticket | ❌ | ✅ | ✅ |
| Create Action Taken | ❌ | ✅ (accessible Tickets, Ticket not `Cancelled`) | ✅ |
| Edit Action Taken | ❌ | ✅ own record, within 15 min (BR-10) | ✅ any record, any time |
| Set Ticket status to `Resolved` / `Closed` | ❌ | ✅ | ✅ |
| Set advisory "looks resolved" flag | ✅ own Ticket only | ❌ (not their role) | ❌ (not their role) |
| Reopen a `Closed` Ticket | ❌ (comment-only request) | ✅ | ✅ |
| View Requester Dashboard | ✅ own data only | ❌ | ❌ |
| View IT Staff Dashboard | ❌ | ✅ | ✅ |

Every row above is enforced **server-side**. Hiding a control in the UI is never treated as
authorization; every mutating endpoint independently re-checks role + ownership/accessibility.

## 5. Ticket Status & Resolution Rules

### 5.1 Status Transition Matrix

Statuses: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`,
`Reopened`, `Cancelled`.

| From ↓ / To → | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| **New** | IT Staff/Admin | — | — | — | — | — | IT Staff/Admin, or Requester (own Ticket) |
| **Open** | — | IT Staff/Admin | — | — | — | — | IT Staff/Admin, or Requester (own Ticket) |
| **In Progress** | — | — | IT Staff/Admin | IT Staff/Admin (BR-06) | — | — | IT Staff/Admin |
| **Waiting for Requester** | — | IT Staff/Admin | — | IT Staff/Admin (BR-06) | — | — | IT Staff/Admin |
| **Resolved** | — | — | — | — | IT Staff/Admin (BR-07) | — | — |
| **Closed** | — | — | — | — | — | IT Staff/Admin (BR-08) | — |
| **Reopened** | — | IT Staff/Admin | — | — | — | — | IT Staff/Admin |
| **Cancelled** | — | — | — | — | — | — | terminal (BR-09) |

Blank cells are forbidden transitions and are rejected by the backend with `409 Conflict`
regardless of which UI path (or direct API call) attempted them. A Requester may only trigger the
`Cancelled` transition on their own Ticket while it is still `New` or `Open` (consistent with the
Lab 2/3 self-service cancellation convention); once IT Staff has begun work (`In Progress` or
later) only IT Staff/Admin may cancel.

### 5.2 Resolution Gate
- The backend enforces BR-06/BR-07 even if a client bypasses the normal screen (AC-05).
- A Requester's "looks resolved" flag (`requesterConfirmedResolved`) is **advisory only**; it
  never auto-changes `status` (FR-09, AC-06), and is reset to `false` per BR-16 whenever the
  Ticket is Reopened or the Requester edits the Ticket again.

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | IT Staff and Administrators can create an Action Taken on any Ticket they are authorized to access, provided the Ticket is not `Cancelled`. |
| FR-02 | IT Staff and Administrators can edit an Action Taken they created, or any Action Taken if Administrator, within the allowed edit window (see BR-10). |
| FR-03 | Requesters can view all Actions Taken belonging to their own Tickets, read-only. |
| FR-04 | The Ticket Detail screen shows an Actions Taken list/table ordered by Action Date/Time descending, with a "create" affordance for IT Staff/Admin. |
| FR-05 | Creating an Action Taken with Follow-Up Required = Yes requires a non-empty Follow-up Note; the API rejects the request otherwise. |
| FR-06 | "Performed by" is always the authenticated actor's identity, set by the server — never client-supplied. |
| FR-07 | The Ticket status control displays **only** the transitions permitted from the current status for the current role (§5.1); invalid options are never shown, not even disabled. If zero transitions are valid for the current role/status, no control is rendered at all — only the status badge. |
| FR-08 | Changing a Ticket to `Resolved` or `Closed` is permitted only for IT Staff/Admin, and only via the authoritative backend endpoint, regardless of UI path. |
| FR-09 | A Requester "looks resolved" flag updates a separate advisory field (`requesterConfirmedResolved`) and never automatically transitions Ticket status. |
| FR-10 | The IT Staff Dashboard returns counts for New, Open (including `Reopened`, see BR-12), In Progress, Waiting for Requester, and "My Assigned" (current user as Owner), plus a short "recent Tickets" list. |
| FR-11 | The Requester Dashboard returns counts for the authenticated Requester's Open, In Progress, Resolved, and Closed Tickets, plus a short "recent Tickets" list, scoped strictly to that Requester. The four counts are mutually exclusive by current status (see BR-11) — no Ticket is counted on more than one card. |
| FR-12 | Every dashboard metric and list item links to the corresponding filtered Ticket Queue or Ticket Detail screen. |
| FR-13 | All Lab 2/3 endpoints and screens (auth, Tickets, comments, internal notes, attachments, user management) continue to function without regression. |
| FR-14 | Concurrent edits to the same Ticket's status or the same Action Taken are detected and rejected with a safe `409 Conflict` rather than silently overwritten. |
| FR-15 | Duplicate submissions caused by double-click or network retry on Action Taken creation or status change do not create duplicate records or reapply an already-applied effect. Action Taken creation requires the `Idempotency-Key` header (BR-17), with a server-side fallback de-dup window as defense in depth. Ticket status changes get the same guarantee for free from the existing `expectedUpdatedAt` optimistic-concurrency check (BR-14) rather than a second, separate mechanism — see Assumption #14 and `api-spec.md` §2.1. |

## 7. Business Rules

| ID | Rule |
|---|---|
| BR-01 | An Action Taken belongs to exactly one Ticket. Enforced at the database layer via a required, non-nullable `ticketId` foreign key with `onDelete: Restrict` — an Action Taken can never be created, or persist, without referencing exactly one existing Ticket (see §9.1, `MIG-04`). |
| BR-02 | The Ticket Owner coordinates the Ticket, but an Action Taken may be recorded by a different IT Staff member. |
| BR-03 | Action Date/Time defaults to server time at creation and is not client-editable after save. |
| BR-04 | Follow-up Note is required if and only if Follow-Up Required = Yes; otherwise it must be empty. |
| BR-05 | Attachment Notes is free text describing where to find related evidence (e.g., filenames); it does not itself store files (Lab 3 Attachments remain the file-storage mechanism). |
| BR-06 | A Ticket may only move to `Resolved` from `In Progress` or `Waiting for Requester`, and only by IT Staff/Admin. |
| BR-07 | A Ticket may only move to `Closed` from `Resolved`, by IT Staff/Admin. No auto-close in Lab 4 (excluded scope). |
| BR-08 | A `Closed` Ticket may be moved to `Reopened` by IT Staff/Admin only (Requester may request reopen via comment, but cannot change status). |
| BR-09 | A `Cancelled` Ticket is terminal; no further status transitions or new Actions Taken are permitted (existing Actions Taken remain visible). |
| BR-10 | An Action Taken can be edited by its creator within 15 minutes of creation, or by an Administrator at any time; edits are recorded with an `updatedAt` timestamp (append-only audit trail is preserved). |
| BR-11 | The Requester Dashboard's four status counts are **mutually exclusive by current status**: "My Open Tickets" = {New, Open, Waiting for Requester, Reopened}; "In Progress" = {In Progress} only; "Resolved" = {Resolved} only; "Closed" = {Closed} only. `In Progress` is explicitly excluded from "My Open Tickets" because it has its own dedicated card — a Ticket is counted on exactly one of the four cards, never two. `Cancelled` Tickets appear on none of the four cards. |
| BR-12 | The IT Staff Dashboard status counts are computed across all Tickets the role is authorized to see (IT Staff/Admin see all Tickets; the Requester dashboard never includes other Requesters' Tickets). The `open` count includes both `Open` and `Reopened` status Tickets, so that Reopened work is never uncounted on any card (see Assumption #13). `myAssigned` is an ownership dimension, not a status dimension, and intentionally overlaps with the status-based cards (a Ticket can be both, e.g., "Open" and "My Assigned"). |
| BR-13 | "Recently updated" / "recently resolved" on any dashboard means within the last 7 days, ordered by `updatedAt` descending, limited to 5 items, based on Asia/Bangkok (UTC+7) calendar days. |
| BR-14 | Optimistic concurrency: every Ticket status change and Action Taken update requires the client to send the last-known `updatedAt`; a mismatch returns `409 Conflict` with code `STALE_UPDATE` and the current server state, distinct from `INVALID_TRANSITION` (see §10.1). This same check also gives Ticket status changes their FR-15 duplicate-submission protection at no extra cost (see Assumption #14). |
| BR-15 | A Requester may cancel their own Ticket only while it is `New` or `Open`; once IT Staff has begun work (`In Progress` or later), only IT Staff/Admin may cancel it. |
| BR-16 | `requesterConfirmedResolved` is automatically reset to `false` whenever the Ticket transitions to `Reopened`, or whenever the Requester edits the Ticket. This is a derived side effect, not a client-settable value. |
| BR-17 | `Idempotency-Key` is a required header on `POST /api/tickets/:ticketId/actions`; a request that omits it is rejected outright with `400 VALIDATION_ERROR` and never reaches the de-dup logic below. If the same key is replayed for the same Ticket within the server's de-dup window, the original created record is returned again (200, not 201) instead of creating a duplicate. As defense in depth against a client that retries with a **different** key for what is logically the same submission (e.g., a UI that generates a fresh key per attempt), the server also collapses a second identical creation (same `ticketId` + `performedById` + `description` + `result`) received within a 5-second window, returning the original record rather than creating a duplicate. |

## 8. UI Specification Summary

Full detail in `ui-spec.md`. Summary:
- **IT Staff Dashboard** (`/dashboard`, IT Staff/Admin): 5 metric cards (New, Open, In Progress,
  Waiting for Requester, My Assigned), "My Recent Tickets" list (View all), Quick Actions
  (Create Ticket, Search Tickets, My Queue).
- **Requester Dashboard** (`/dashboard`, Requester): 4 metric cards (My Open, In Progress,
  Resolved, Closed), "My Recent Tickets" list (View all), Quick Actions (Create Ticket, View My
  Tickets).
- **Actions Taken panel** on Ticket Detail: table/list (newest first), "Add Action Taken" button
  (IT Staff/Admin only) opening a create form; each row expandable to view full detail; edit
  affordance limited per BR-10.
- **Ticket status control**: dropdown/segmented control showing **only** the transitions
  permitted from the current status for the current role (§5.1, FR-07) — invalid options are
  omitted entirely, never shown-but-disabled. If a role has zero valid transitions on a Ticket
  (e.g., a Requester who cannot cancel), no control renders at all; only the status badge is
  shown. On a `409 STALE_UPDATE`, the client compares the server's returned current status to
  the status it just tried to set (§10.1) — a double-click or retry that lands after its own
  submission already succeeded is resynced silently, with no conflict banner; only a genuinely
  different current status shows the conflict banner.
- Role-based navigation with active-page highlighting; reuse of existing badge/card/table/
  loading/empty/error/responsive conventions under Zen Green.

## 9. Data Changes

### 9.1 New Model — `ActionTaken`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | server-generated |
| `ticketId` | UUID (FK → Ticket.id), **NOT NULL** | indexed, `onDelete: Restrict` — enforces BR-01 at the schema level; an Action Taken cannot exist without referencing exactly one Ticket |
| `actionDateTime` | DateTime | server-set at creation (BR-03) |
| `description` | Text | required |
| `result` | Text | required |
| `performedById` | UUID (FK → User.id) | server-set from session (FR-06), indexed |
| `followUpRequired` | Boolean | default `false` |
| `followUpNote` | Text, nullable | required iff `followUpRequired = true` (BR-04) — enforced at API layer, not DB constraint alone |
| `attachmentNotes` | Text, nullable | free text |
| `createdAt` | DateTime | default now() |
| `updatedAt` | DateTime | `@updatedAt`, used for optimistic concurrency (BR-14) |

Indexes: `(ticketId, actionDateTime DESC)` for list queries; `(performedById)` for "my actions"
queries.

### 9.2 Ticket Model Additions

| Field | Type | Notes |
|---|---|---|
| `requesterConfirmedResolved` | Boolean, default `false` | advisory flag (FR-09), reset to `false` per BR-16 on any subsequent Requester edit or Reopen |
| `updatedAt` | reused | used as the optimistic-concurrency token for status changes (BR-14), and doubles as the FR-15 duplicate-submission guard for that endpoint (Assumption #14) |

### 9.3 Design Decisions (justification)

1. **Soft foreign key with `Restrict` delete, not cascade.** Actions Taken are audit records; a
   Ticket must not be deletable while Actions Taken exist, preventing accidental loss of work
   history. This also directly enforces BR-01: a `NOT NULL` FK means an orphaned Action Taken
   (belonging to zero Tickets) is impossible by construction, not merely by convention.
2. **`updatedAt` reused as the concurrency token instead of a separate integer `version` column.**
   Prisma already maintains `updatedAt` automatically; reusing it avoids an extra migration field
   and keeps the "last known state" the client must echo back identical to what it already
   displays.
3. **`followUpNote` conditional-requirement enforced in the API layer, not a DB CHECK
   constraint**, so validation messages stay consistent with the rest of the API's validation
   pipeline and remain testable without touching the database layer.
4. **Legacy Tickets with zero Actions Taken** render an explicit "No actions recorded yet" empty
   state; dashboard metrics that depend on Actions Taken existence treat an empty set as `0`,
   never `null`/error.

### 9.4 Migration & Backfill
- New Prisma migration adds the `ActionTaken` table and the two `Ticket` columns above with safe
  defaults (`false` for booleans), so existing rows require no backfill logic.
- Rollback: standard Prisma down-migration dropping the new table and columns; documented and
  dry-run tested against a copy of the Lab 3 seeded database before merging.
- The `ticketId` foreign key is created `NOT NULL` with no default, since every Action Taken must
  be created through the API (which always supplies a `ticketId` from the route) — there is no
  legacy `ActionTaken` data to backfill, so no nullable-then-backfill-then-tighten migration
  sequence is needed.

### 9.5 Seed Data
- Idempotent seed script (upsert by natural key, e.g., Ticket number), safe to re-run.
- Tickets covering every status, both priorities, assigned and unassigned ownership.
- At least one Ticket each with **zero**, **one**, and **multiple (3+)** Actions Taken, including
  at least one Action Taken with `followUpRequired = true`.
- Enough spread of `updatedAt`/`actionDateTime` values to produce both non-zero and zero results
  for every dashboard metric (e.g., one Requester with no Tickets to exercise the empty state).
- At least one seeded Requester Ticket in `In Progress` status, to make BR-11's mutual-exclusion
  behavior (excluded from "My Open Tickets", counted only under "In Progress") independently
  verifiable against a manual DB query (API-17).
- At least one seeded Ticket in `Reopened` status, to make BR-12's inclusion of `Reopened` under
  the IT Staff Dashboard's "Open" card independently verifiable against a manual DB query
  (API-26).
- Both priorities (per handout §5.3) represented across seeded Tickets, and both assigned and
  unassigned ownership on IT Staff-visible Tickets, so `myAssigned` (BR-12) and priority-based
  filters have real non-trivial data to exercise, not just status variety.
- **At least one Requester account with zero Tickets**, to independently exercise the
  Requester Dashboard's all-four-cards-at-`0` empty state at the API level (AC-15), not only
  as a UI mock in `UI-03`.

## 10. API Contract

Full detail in `api-spec.md`. Summary of new/changed endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tickets/:ticketId/actions` | List Actions Taken for a Ticket |
| POST | `/api/tickets/:ticketId/actions` | Create an Action Taken |
| PATCH | `/api/tickets/:ticketId/actions/:actionId` | Update an Action Taken (BR-10 window) |
| PATCH | `/api/tickets/:ticketId/status` | Change Ticket status (concurrency-checked) |
| PATCH | `/api/tickets/:ticketId/requester-confirmation` | Set the Requester's advisory "looks resolved" flag |
| GET | `/api/dashboard/requester` | Requester dashboard metrics + recent Tickets |
| GET | `/api/dashboard/staff` | IT Staff/Admin dashboard metrics + recent Tickets |

All endpoints require authentication; authorization enforced per §4; all mutating endpoints
validate input and return RFC-consistent error shapes (see `api-spec.md` §Errors).

### 10.1 Status-Change Conflict vs. Invalid-Transition Codes

`PATCH /api/tickets/:ticketId/status` returns `409 Conflict` for two distinct situations, which
**must** be distinguished by error code so the client knows whether to resync (stale data) or
present a different choice (matrix violation):

- **`STALE_UPDATE`** — the submitted `expectedUpdatedAt` does not match the record's current
  `updatedAt`, regardless of whether the requested transition would otherwise have been valid.
  Checked first. This is also the code returned when a double-click or network retry resubmits a
  request that already succeeded (FR-15, Assumption #14).

  **Client handling is not one-size-fits-all for this code.** The `409` body's
  `data.current.status` tells the client what the server actually holds. The client compares
  this to the status it just tried to set:
  - **Same status** (`data.current.status` equals the requested `status`) — the server now
    holds exactly the status this client just asked for. This is treated as "already applied"
    and handled the same way regardless of *why* it matches: most often it is this client's own
    earlier attempt landing (a double-click, or a network retry that actually succeeded, AC-16);
    less commonly, it could instead be a **different** actor who, independently and
    coincidentally, chose the identical target status for this Ticket at nearly the same moment
    — the status comparison alone **cannot** tell these two cases apart (see Assumption #15).
    Either way, this is **not** a hard error: resync the badge from `data.current` silently (at
    most a brief, neutral confirmation), and do **not** show the "changed elsewhere" conflict
    banner — that message would be misleading in the common (self-retry) case, and in the rarer
    coincidental case the Ticket is already in the state this client wanted, so no corrective
    action is available or needed from them either way.
  - **Different status** (`data.current.status` differs from the requested `status`) — a
    genuine external conflict: someone else changed the Ticket to something the client did *not*
    ask for (AC-07). Show the standard conflict banner ("This ticket was changed elsewhere.
    Reload to see the latest version.") and let the user decide how to proceed.

  These two cases are distinguishable via the comparison above. Note that the comparison proves
  matching *state*, not matching *requester* — see Assumption #15 for why that narrower, more
  honest claim doesn't change the resulting client behavior.
- **`INVALID_TRANSITION`** — `expectedUpdatedAt` matched (data was current), but the requested
  `(from status, to status, role)` combination is not permitted by §5.1.

Both return the current server state in `data.current` so the client can resync either way.

## 11. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a permitted IT Staff user and valid data, when an Actions Taken is created, then it is saved under the correct Ticket with the authenticated creator recorded as `performedBy`. |
| AC-02 | Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. |
| AC-03 | Given an Action Taken create request with `followUpRequired = true` and empty `followUpNote`, when submitted, then the API returns 400 with a field-level validation error and no record is created. |
| AC-04 | Given a Ticket in `In Progress`, when IT Staff changes status to `Resolved`, then the change succeeds and the Ticket Detail summary refreshes to show `Resolved`. |
| AC-05 | Given a Ticket in `New`, when a client attempts to set status directly to `Resolved` (bypassing the normal screen), then the backend rejects the request with 409 `INVALID_TRANSITION` and the status is unchanged. |
| AC-06 | Given a Requester marks "looks resolved" on their Ticket, when the flag is saved, then `requesterConfirmedResolved` becomes `true` and the Ticket `status` is unchanged. |
| AC-07 | Given two clients loaded the same Ticket, when both submit a status change using the same stale `updatedAt` **and the second request's resulting `data.current.status` differs from what it requested**, then the second request receives 409 `STALE_UPDATE`, does not overwrite the first change, and the UI shows the genuine-conflict banner (§10.1). |
| AC-08 | Given a Requester, when they view a Ticket they do not own, then Actions Taken and dashboard data for that Ticket are not returned (403/404 per existing Lab 2/3 convention). |
| AC-09 | Given the IT Staff Dashboard is requested with no Tickets matching a given card, then that card renders `0` with an empty-state affordance rather than an error. |
| AC-10 | Given a double-click or repeated submit on "Add Action Taken", when the network retries the request — whether with the same `Idempotency-Key` or, per BR-17's fallback window, a different one — then only one Action Taken record is created. |
| AC-11 | Given all Lab 1–3 regression scenarios (auth, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, Admin user management), when re-run after the Lab 4 migration, then all pass unchanged. |
| AC-12 | Given a Ticket that is `Cancelled`, when IT Staff attempts to create a new Action Taken on it, then the API rejects the request with 409 and no record is created. |
| AC-13 | Given a seeded Requester with one Ticket in `In Progress`, when the Requester dashboard is retrieved, then that Ticket is counted under "In Progress" and **not** under "My Open Tickets" (BR-11). |
| AC-14 | Given a Ticket is `Reopened`, or a Requester edits a Ticket that previously had `requesterConfirmedResolved = true`, then the flag is reset to `false` (BR-16). |
| AC-15 | Given a Requester with zero Tickets, when their dashboard is requested, then all four counts return `0` and `recentTickets` returns an empty array — never `null` or an error. |
| AC-16 | Given a status-change request that already succeeded, when the identical request (same `expectedUpdatedAt`, same target `status`) is retried due to a double-click or network retry, then the retry receives `409 STALE_UPDATE` with `data.current.status` equal to the originally-requested status, the transition is **not** reapplied, and the client resyncs silently **without** showing the genuine-conflict banner (§10.1, distinct from AC-07). |

## 12. Definition of Done (Product Completion)

- [ ] All FR-01…FR-15 implemented and covered by ≥1 automated test each (see `tests.md`'s
      traceability note for FR-13/FR-14's explicit tags, previously implicit).
- [ ] All BR-01…BR-17 enforced server-side (not only in UI) and covered by tests, including BR-01
      (`MIG-04`, previously untested).
- [ ] Prisma migration applies cleanly to the Lab 3 database with zero data loss; rollback
      verified.
- [ ] Seed script is idempotent and produces zero/one/multiple-Actions-Taken Tickets and
      zero/non-zero dashboard states, including an `In Progress` Requester Ticket for BR-11
      verification and a `Reopened` Ticket for BR-12 verification.
- [ ] Both dashboards return only role-authorized data (AC-02, AC-08) and link to detail views.
- [ ] Requester dashboard's four cards are verified mutually exclusive against a seeded dataset
      (AC-13).
- [ ] IT Staff Dashboard's "Open" card is verified to include `Reopened` Tickets against a seeded
      dataset (BR-12).
- [ ] Ticket resolution gate is backend-enforced even when bypassed client-side (AC-05).
- [ ] Optimistic-concurrency conflict handling implemented and tested, with `STALE_UPDATE` and
      `INVALID_TRANSITION` distinguished (AC-07, AC-05), **and** with the two `STALE_UPDATE`
      sub-cases (genuine conflict vs. self-retry) correctly distinguished in the UI by comparing
      `data.current.status` to the requested status (AC-07 vs. AC-16, §10.1).
- [ ] Duplicate-submission protection implemented and tested for **both** endpoints covered by
      FR-15: Action Taken creation (required `Idempotency-Key` header, missing-header rejection,
      and the server-side fallback window for a varied key — AC-10) and Ticket status changes
      (a retried, already-applied request correctly returns `STALE_UPDATE` and is resynced
      silently rather than reapplying the transition or showing a misleading conflict banner —
      AC-16).
- [ ] `requesterConfirmedResolved` reset-on-Reopen/edit behavior implemented and tested (AC-14).
- [ ] Full Labs 1–3 regression suite passes on `main` (AC-11).
- [ ] Zen Green visual/accessibility checklist completed for all new and modified screens.
- [ ] Desktop/tablet/mobile screenshots captured for all Lab 4 screens; no horizontal scroll,
      clipping, or overlap.
- [ ] README setup/seed/migration/test/demo instructions updated and verified from a clean
      clone.
- [ ] No console errors, broken links, placeholder text, or unfinished controls remain.
- [ ] `reviewer.md` and `ai-use.md` completed with real PR links, comments, and prompts.

## 13. Assumptions and Decisions

1. **Edit window for Actions Taken** (BR-10) is fixed at 15 minutes for the creator; the handout
   does not specify a value, so this is a documented team decision to keep the audit trail close
   to append-only while allowing correction of typos.
2. **"Recently updated/resolved" window** (BR-13) is fixed at 7 days / top 5 items; not specified
   in the handout, chosen to keep dashboard cards concise per the Dashboard Rules.
3. **Time zone for date boundaries** is Asia/Bangkok (UTC+7), matching the deployment locale.
4. **Concurrency token** reuses `updatedAt` rather than introducing a separate `version` integer
   column (see §9.3, Decision #2).
5. **Attachment Notes is text-only**, not a second file-upload mechanism; Lab 3's Attachments
   feature remains the sole file-storage path.
6. **Administrator dashboard reuses the IT Staff dashboard** verbatim rather than shipping a
   third dashboard variant in Lab 4.
7. **The IT Staff Dashboard intentionally omits a separate "Unassigned" card** in favor of the
   five cards shown in the reference mock (New, Open, In Progress, Waiting for Requester, My
   Assigned); "unassigned" work is still reachable via the linked Ticket Queue's filters, so no
   detail is lost, only consolidated.
8. **The full status-transition matrix (§5.1)** fills in the New/Open/In Progress/Waiting-for-
   Requester progression and the Requester's own-Ticket cancellation right, neither of which the
   handout states explicitly; both are treated as continuations of Lab 2/3 conventions rather
   than new Lab 4 scope.
9. **The Requester dashboard's four status cards are mutually exclusive by current status**
   (BR-11), rather than the aggregate reading a literal handout phrase like "total open Tickets"
   might suggest, so that the reference mock's numbers (3/2/5/12) are each independently
   reproducible from a single, non-overlapping DB query per card — an aggregate reading would
   double-count `In Progress` Tickets across two cards.
10. **`requesterConfirmedResolved` reset on Reopen/Requester-edit** (BR-16) is a derived
    side-effect the handout implies but does not name as a numbered rule; it is called out here
    explicitly so it has independent test coverage rather than being an unstated behavior of the
    Reopen/edit code paths.
11. **`Idempotency-Key` is required, not optional**, on Action Taken creation (BR-17), with a
    server-side fallback de-dup window for defense in depth. The fallback exists specifically
    for a client that generates a *fresh* key on each retry attempt (so the required-key check
    alone wouldn't catch the duplicate) — it is not a substitute path for clients that omit the
    header altogether, since those are already rejected at `400` before de-dup logic runs (see
    BR-17). This trades a small, accepted false-positive risk — two genuinely distinct Actions
    Taken by the same actor on the same Ticket, with identical `description`/`result` text,
    submitted within the same 5-second window would be collapsed into one — for closing the
    retry-with-a-fresh-key gap; this is judged acceptable given how rare truly identical-text
    distinct actions are in practice, and a creator can always adjust the wording slightly if
    they genuinely need to log two such actions in rapid succession.
12. **The Requester Dashboard has no separate "Waiting for Requester" card**, even though the
    handout's §4.6 example list names "Tickets waiting for the Requester" as a possible
    Requester-dashboard metric. The reference mock (handout §8.2) shows exactly four cards —
    My Open Tickets, In Progress, Resolved, Closed — with no fifth card for this status. This
    is treated the same way as Assumption #7 (the IT Staff Dashboard's omitted "Unassigned"
    card): `Waiting for Requester` Tickets are still counted, just folded into "My Open
    Tickets" under BR-11 rather than broken out separately, and remain fully visible via the
    linked My Tickets filter — no data is hidden, only consolidated to match the four-card mock.
13. **The IT Staff Dashboard's "Open" card includes `Reopened` Tickets** (BR-12), rather than
    leaving `Reopened` uncounted on any card. The five-card mock (New, Open, In Progress,
    Waiting for Requester, My Assigned) does not name a sixth "Reopened" card, so — consistent
    with how Assumption #7 folds "Unassigned" into the existing Ticket Queue filters and
    Assumption #12 folds "Waiting for Requester" into the Requester Dashboard's "My Open
    Tickets" — `Reopened` Tickets are folded into "Open" here rather than silently dropped from
    every card. This also keeps the IT Staff Dashboard's treatment consistent with the
    Requester Dashboard, which already counts `Reopened` under its own "My Open Tickets" card
    (BR-11). `Reopened` Tickets remain independently reachable via the linked Ticket Queue's
    status filter, so no detail is lost.
14. **Status-change duplicate-submission protection (FR-15) reuses `expectedUpdatedAt` (BR-14)
    rather than adding a second idempotency mechanism.** Because every status change is gated by
    the client's last-known `updatedAt`, a retried request (double-click, flaky network) that
    reaches the server after an identical earlier request already succeeded will carry a
    now-stale `expectedUpdatedAt` and is rejected with `409 STALE_UPDATE` instead of reapplying
    the transition. Unlike a genuine two-different-users conflict, this specific case is
    distinguishable **by resulting state** and must be presented differently: the client
    compares the error's `data.current.status` to the status it originally requested — a match
    means the Ticket already reflects what this client wanted (handled silently, no conflict
    banner — see Assumption #15 for the precise, narrower claim this comparison actually
    supports), while a mismatch means a real external conflict and gets the standard banner (see
    §10.1). This is deliberately asymmetric with Action Taken creation: a `POST`
    has no pre-existing `updatedAt` to echo back, so it needs the explicit `Idempotency-Key` +
    fallback window instead (BR-17); a status-change `PATCH` already carries that token for
    concurrency purposes, so reusing it for duplicate-submission protection is free — the only
    addition needed is the client-side comparison described above, not a new server-side
    mechanism.
15. **The `STALE_UPDATE` same-status comparison (§10.1, Assumption #14) proves matching state,
    not matching requester, and Lab 4 deliberately does not try to close that gap.** Comparing
    `data.current.status` to the status a client just requested only tells the client that the
    server now holds that status — it says nothing about *who* put it there. In the
    overwhelming majority of cases this is the same client's own request landing (a delayed
    response, or a genuine double-click/retry). But consider a real edge case: IT Staff member A
    sets a Ticket to `Resolved`; moments later, IT Staff member B — independently, not as a
    retry of anything, simply making the same call on the same Ticket at nearly the same time —
    submits the identical transition. B's request hits `STALE_UPDATE` with `data.current.status`
    equal to what B requested, purely because A already got there first with the same target
    status, not because B's own earlier request succeeded. By the rule in §10.1, B's client
    silently resyncs with no conflict banner — exactly as if it had been B's own retry, even
    though it demonstrably was not. This is an accepted trade-off, not an oversight: the
    resulting behavior is correct either way (the Ticket ends up `Resolved`, which is what B
    wanted, regardless of who actually performed the transition), and reliably distinguishing
    "my own retry" from "someone else's coincidental identical choice" would require a mechanism
    beyond comparing final state — e.g., a client-generated request identifier that the server
    echoes back, so the client can check it against its own last request rather than inferring
    intent from status alone. Building that mechanism is judged unnecessary complexity for Lab
    4's scope, in the same spirit as Assumption #11's accepted false-positive risk on the BR-17
    fallback window: both trade a small, well-understood imprecision for a materially simpler
    implementation, because the user-visible outcome is correct in every case that matters.