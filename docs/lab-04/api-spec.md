# TokTickIT — Sprint 4 API Specification
`docs/lab-04/api-spec.md`

## 1. Actions Taken

### 1.1 `GET /api/tickets/:ticketId/actions`
List Actions Taken for a Ticket, newest first.

**Authorization:** Requester — only if they own the Ticket (read-only). IT Staff/Admin — only if
the Ticket is within their accessible scope (per Lab 2/3 Ticket-access rules).

**Response `200`:**
```json
{
  "data": [
    {
      "id": 42,
      "ticketId": 5,
      "actionDateTime": "2026-09-20T10:15:00Z",
      "description": "Replaced network cable, re-tested port.",
      "result": "Connection stable after replacement.",
      "performedBy": { "id": 7, "name": "Somchai P." },
      "followUpRequired": true,
      "followUpNote": "Check again after 24h under load.",
      "attachmentNotes": "See photo IMG_0231.jpg in ticket attachments.",
      "createdAt": "2026-09-20T10:15:00Z",
      "updatedAt": "2026-09-20T10:15:00Z"
    }
  ]
}
```

**Errors:** `401` not authenticated · `403` not authorized for this Ticket · `404` Ticket not
found.

### 1.2 `POST /api/tickets/:ticketId/actions`
Create an Action Taken.

**Authorization:** IT Staff/Admin, on an accessible Ticket. Rejected if the Ticket's status is
`Cancelled` (BR-09, AC-12).

**Request:**
```json
{
  "description": "string, required, 1-4000 chars",
  "result": "string, required, 1-4000 chars",
  "followUpRequired": true,
  "followUpNote": "string, required iff followUpRequired=true, else must be omitted/empty",
  "attachmentNotes": "string, optional, 0-1000 chars"
}
```

Headers: **`Idempotency-Key` (required, BR-17)** — if the same key is replayed for the same
Ticket within the server's de-dup window, the original created record is returned again (`200`,
not `201`) instead of creating a duplicate (FR-15). Requests missing this header are rejected
with `400 VALIDATION_ERROR` (`fields.idempotencyKey`).

As defense in depth against clients that retry with a *different* key on the same logical
request, the server additionally collapses a second creation with identical
`ticketId` + `performedById` (from session) + `description` + `result` received within a
**5-second fallback de-dup window**, returning the original record (`200`) rather than creating a
duplicate.

Server-set fields (never accepted from the client): `id`, `ticketId`, `actionDateTime`,
`performedById`, `createdAt`, `updatedAt`. A client-supplied `actionDateTime` in the request body
is silently ignored (BR-03) — the server always uses its own clock. `ticketId` is a required,
non-nullable foreign key with `onDelete: Restrict` (BR-01) — the schema itself guarantees an
Action Taken cannot be persisted without referencing exactly one existing Ticket, independent of
this endpoint's own validation.

**Response `201`:** the created Action Taken (same shape as §1.1 list item). On an
idempotency-key or fallback-window replay, **`200`** with the same shape (the original record,
unchanged).

**Errors:**
- `400` validation failure, e.g.
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Follow-up note is required.",
    "fields": { "followUpNote": "Required when Follow-Up Required is Yes." } } }
  ```
  or, when the required header is missing:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Idempotency-Key header is required.",
    "fields": { "idempotencyKey": "Required." } } }
  ```
- `401` not authenticated · `403` not IT Staff/Admin or Ticket not accessible.
- `404` Ticket not found.
- `409` Ticket is `Cancelled` (AC-12), e.g.
  ```json
  { "error": { "code": "TICKET_CANCELLED", "message": "Cancelled tickets cannot receive new actions." } }
  ```

### 1.3 `PATCH /api/tickets/:ticketId/actions/:actionId`
Update an Action Taken, within the BR-10 edit rules.

**Authorization:** the Action Taken's creator, only within 15 minutes of `createdAt`; or
Administrator, any time.

**Request:**
```json
{
  "description": "string, optional",
  "result": "string, optional",
  "followUpRequired": true,
  "followUpNote": "string, required iff followUpRequired=true",
  "attachmentNotes": "string, optional",
  "expectedUpdatedAt": "2026-09-20T10:15:00Z"
}
```
`expectedUpdatedAt` must equal the record's current `updatedAt` (BR-14).

**Response `200`:** the updated Action Taken.

**Errors:**
- `400` validation failure (same shape as §1.2).
- `401` / `403` not the creator within window and not Admin, e.g.
  ```json
  { "error": { "code": "EDIT_WINDOW_EXPIRED", "message": "This action can no longer be edited." } }
  ```
- `404` Action Taken or Ticket not found.
- `409` stale `expectedUpdatedAt` (BR-14):
  ```json
  { "error": { "code": "STALE_UPDATE", "message": "This action was changed by someone else.",
    "data": { "current": { "...": "current server record" } } } }
  ```

---

## 2. Ticket Status & Resolution

### 2.1 `PATCH /api/tickets/:ticketId/status`
Change a Ticket's status per the transition matrix in `specification.md` §5.1.

**Authorization:** IT Staff/Admin only. A Requester's only permitted self-service transition
(`Cancelled`, from `New`/`Open`, BR-15) also goes through this endpoint but is authorized for the
Requester specifically when they own the Ticket and the current status is `New` or `Open`.

**Backward compatibility:** this endpoint consolidates the Lab 3
`PATCH /api/staff/tickets/:id/status` route (see `specification.md` Assumption #16).
The Lab 3 route may be retained as an alias during migration.

**Request:**
```json
{ "status": "Resolved", "resolutionSummary": "Replaced faulty cable, confirmed stable.", "expectedUpdatedAt": "2026-09-20T09:00:00Z" }
```

**Response `200`:**
```json
{ "data": { "id": 5, "status": "Resolved", "updatedAt": "2026-09-20T10:20:00Z" } }
```

**Duplicate submissions (FR-15):** this endpoint uses no separate idempotency key. A retried
request (double-click, network retry) that reaches the server after an identical earlier request
already applied the change will carry the same, now-stale `expectedUpdatedAt` and is rejected
with `409 STALE_UPDATE` rather than reapplying the transition — see `specification.md`
Assumption #14.

**This is not the same UI treatment as a genuine conflict, and the two are distinguishable by
resulting state — though not by who caused it.** The client already knows the `status` it just
requested; the `409` body's `data.current.status` tells it what the server actually holds now.
Compare the two:
- **`data.current.status` equals the requested `status`** → the server now holds exactly the
  status this request asked for. Treat this as "already applied," handled the same way whether
  it is, most commonly, this client's own earlier attempt landing (AC-16) or, rarely, a
  **different** actor independently choosing the identical target status at nearly the same
  time — the comparison cannot distinguish the two (see `specification.md` Assumption #15).
  Resync the UI from `data.current` silently — no conflict banner, no hard-failure toast. Showing
  the standard "changed elsewhere" message would be misleading in the common case, and in the
  rare coincidental case the Ticket is already in the state this client wanted, so no corrective
  action is needed either way.
- **`data.current.status` differs from the requested `status`** → a genuine external conflict;
  someone else changed the Ticket to something this client did not ask for. This is the ordinary
  case covered by `specification.md` §10.1 and AC-07: show the conflict banner and let the user
  resync/retry deliberately.

**Errors:**
- `401` not authenticated.
- `403` role not permitted to perform this transition (e.g., IT Staff attempting an
  Admin-only action — none currently reserved to Admin-only beyond general IT Staff behavior;
  reserved for future use) or Requester attempting anything other than their own `Cancelled`
  self-service case.
- `404` Ticket not found.
- `409` / `400` — **two distinct error codes (see `specification.md` §10.1);
  `expectedUpdatedAt` is checked first:**
  - **`STALE_UPDATE`** — the submitted `expectedUpdatedAt` does not match the Ticket's current
    `updatedAt`. Returned regardless of whether the requested status change would otherwise have
    been a valid transition (AC-07), and also the code returned for a duplicate/retried request
    that already succeeded (AC-16) — see the client-handling comparison above to tell the two
    apart.
    ```json
    { "error": { "code": "STALE_UPDATE", "message": "This ticket was changed by someone else.",
      "data": { "current": { "status": "In Progress", "updatedAt": "2026-09-20T10:20:05Z" } } } }
    ```
    Note: this same JSON shape is returned in both the AC-07 (genuine conflict) and AC-16
    (self-retry) cases — the server does not attempt to tell them apart itself, since it has no
    reliable way to know whether two requests came from "the same click, retried" vs. "two
    different people independently agreeing." Neither does the client-side comparison above,
    for the same reason — it distinguishes by *resulting state*, not by request origin, and that
    is an intentional, accepted limit on precision (`specification.md` Assumption #15), not a gap
    to close. The distinguishing comparison is still a client-side responsibility, using data the
    client already has (the status it requested).
  - **`INVALID_TRANSITION`** (400 Bad Request) — `expectedUpdatedAt` matched current data, but the requested
    `(from, to, role)` combination is not permitted by §5.1 (AC-05).
    ```json
    { "error": { "code": "INVALID_TRANSITION", "message": "Cannot move from New directly to Resolved.",
      "data": { "current": { "status": "New", "updatedAt": "2026-09-20T09:00:00Z" } } } }
    ```

- `400` **`RESOLUTION_SUMMARY_REQUIRED`** — status is `Resolved` or `Closed` but
  `resolutionSummary` is missing or blank (carried forward from Lab 3 BR-22):
  ```json
  { "error": { "code": "RESOLUTION_SUMMARY_REQUIRED", "message": "A resolution summary is required when changing status to Resolved or Closed." } }
  ```

### 2.2 `PATCH /api/tickets/:ticketId/appears-resolved`
Set the Requester's advisory "looks resolved" flag. Never changes `status` (FR-09, AC-06).

**Authorization:** the Requester who owns the Ticket, only.

**Request:**
```json
{ "appearsResolved": true, "expectedUpdatedAt": "2026-09-20T09:00:00Z" }
```

**Response `200`:**
```json
{ "data": { "id": 5, "appearsResolved": true, "status": "In Progress",
  "updatedAt": "2026-09-20T10:21:00Z" } }
```

Note (BR-16): this endpoint only ever *sets* the flag to the client-supplied boolean; the server
independently *resets* it to `false` as a side effect of the Reopen transition (§2.1) or of a
Requester Ticket edit (Lab 2/3 Ticket-update endpoint), never in response to this endpoint's own
call.

**Errors:** `401` · `403` not the owning Requester · `404` · `409` stale `expectedUpdatedAt`
(`STALE_UPDATE`).

---

## 3. Dashboards

Both endpoints return **summary data only** — never a full Ticket collection (§Dashboard Rules).
"Recent" lists are capped at 5 items per BR-13.

### 3.1 `GET /api/dashboard/requester`
**Authorization:** Requester only; scoped to the authenticated user — the response never accepts
or exposes another Requester's data.

**Response `200`:**
```json
{
  "data": {
    "counts": { "open": 3, "inProgress": 2, "resolved": 5, "closed": 12 },
    "recentTickets": [
      { "id": 12, "ticketNumber": "TKT-2025-001234", "summary": "Laptop battery drains quickly",
        "status": "In Progress", "updatedAt": "2026-09-20T09:00:00Z" }
    ]
  }
}
```
- `counts.open`, `counts.inProgress`, `counts.resolved`, `counts.closed` are **mutually
  exclusive by current status** per BR-11: `open` = {New, Open, Waiting for Requester, Reopened},
  `inProgress` = {In Progress} only, `resolved` = {Resolved} only, `closed` = {Closed} only. A
  Ticket contributes to exactly one of the four counts; `Cancelled` Tickets contribute to none.
- `recentTickets` = this Requester's Tickets with `updatedAt` within the last 7 days
  (Asia/Bangkok calendar days), ordered `updatedAt` desc, limit 5 (BR-13). Empty array if none —
  never `null` or an error.

**Errors:** `401` · `403` (non-Requester role hitting this route).

### 3.2 `GET /api/dashboard/staff`
**Authorization:** IT Staff/Admin.

**Response `200`:**
```json
{
  "data": {
    "counts": { "new": 14, "open": 23, "inProgress": 18, "waitingForRequester": 7,
      "myAssigned": 16 },
    "recentTickets": [
      { "id": 8, "ticketNumber": "TKT-2025-000234", "summary": "Laptop battery drains quickly",
        "status": "In Progress", "updatedAt": "2026-09-20T09:14:00Z" }
    ]
  }
}
```
- `counts.new/open/inProgress/waitingForRequester` are computed across **all** Tickets the caller
  is authorized to see (BR-12). `counts.open` includes both `Open`- and `Reopened`-status
  Tickets (BR-12), so `Reopened` is always reflected on this dashboard. `counts.myAssigned` =
  Tickets where the caller is Ticket Owner, regardless of status. `myAssigned` is an ownership
  dimension and is **expected** to overlap with the status-based counts (unlike the Requester
  dashboard's BR-11 counts, which are status-exclusive) — a Ticket can legitimately be counted
  under both e.g. `open` and `myAssigned`.
- `recentTickets` = Tickets updated within the last 7 days across the caller's authorized scope,
  ordered `updatedAt` desc, limit 5.
- Administrator calling this endpoint receives the same shape (`specification.md` Assumption #6 —
  Admin reuses the IT Staff dashboard).

**Errors:** `401` · `403` (Requester hitting this route).

---

## 4. Error Code Reference (new in Sprint 4)

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed field-level validation (includes a missing required `Idempotency-Key` header on Action Taken creation). |
| `TICKET_CANCELLED` | 409 | Write attempted on a Ticket in the terminal `Cancelled` state. |
| `EDIT_WINDOW_EXPIRED` | 403 | Action Taken edit attempted outside the BR-10 window by a non-Admin. |
| `STALE_UPDATE` | 409 | `expectedUpdatedAt` did not match the current record. Applies uniformly to Action Taken updates (§1.3) **and** Ticket status changes (§2.1, §2.2) — not limited to Actions Taken. On §2.1 specifically, this code doubles as the FR-15 duplicate-submission signal for a retried, already-applied status change; the client must compare `data.current.status` to its requested `status` to tell that case apart from a genuine conflict (see §2.1, `specification.md` §10.1/Assumption #14). |
| `INVALID_TRANSITION` | 400 | Requested status change is not permitted from the current status/role, with `expectedUpdatedAt` otherwise current. Distinct from `STALE_UPDATE` (see §2.1). This remains `400` for backward compatibility with Lab 3. |
| `RESOLUTION_SUMMARY_REQUIRED` | 400 | Transition to `Resolved` or `Closed` submitted without a non-empty `resolutionSummary` (carried forward from Lab 3 BR-22). |

All other error codes (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, etc.) reuse the Lab 2/3
conventions unchanged.