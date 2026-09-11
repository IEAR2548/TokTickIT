# Lab 3 API Contract — TokTickIT Users, Roles, IT Staff, Admin

## Authentication & Session Mechanism (see specification.md Decision D-6/D-7)

- **Password hashing:** `bcryptjs`, 10 salt rounds.
- **Session:** signed `httpOnly`, `SameSite=Lax` cookie (`toktickit_session`) containing
  a JWT with `{ userId, role, mustChangePassword }`, 4-hour expiry, signed with
  `process.env.JWT_SECRET` (never committed, never exposed to client code).
- **Logout:** server responds with `Set-Cookie: toktickit_session=; Max-Age=0`.
- **Restricted session:** while `mustChangePassword = true`, all endpoints except
  `POST /api/auth/change-password`, `POST /api/auth/logout`, and `GET /api/auth/me`
  return 403 with `{ "error": "PASSWORD_CHANGE_REQUIRED" }`.

## Standard Error Shape (unchanged from Lab 2 convention)
```json
{ "error": "SOME_CODE", "message": "Human-readable description" }
```

### Blanket Authentication & Authorization Rules
- **401 UNAUTHENTICATED**: Any request to a protected endpoint without a valid, non-expired `toktickit_session` cookie returns `{ "error": "UNAUTHENTICATED", "message": "Authentication required" }` (tested by SEC-05, SEC-08).
- **403 FORBIDDEN**: Any authenticated request by a user whose role or ownership status does not satisfy the endpoint authorization matrix returns `{ "error": "FORBIDDEN", "message": "Access denied" }` (tested by SEC-01..SEC-04, SEC-06, SEC-07).
- **403 PASSWORD_CHANGE_REQUIRED**: Any authenticated request while `mustChangePassword = true` to an endpoint other than `POST /api/auth/change-password`, `POST /api/auth/logout`, or `GET /api/auth/me` returns `{ "error": "PASSWORD_CHANGE_REQUIRED", "message": "Password change required" }`.

---

## 1. POST /api/auth/login
**Auth:** Public

**Request:** `{ "email": "string", "password": "string" }`

**Response 200:**
```json
{ "data": { "id": 1, "name": "Jennifer Anderson", "email": "...", "role": "REQUESTER", "mustChangePassword": false } }
```
Sets `toktickit_session` cookie.

**Errors:**
| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing email/password |
| 401 | `INVALID_CREDENTIALS` | Wrong password, unknown email, OR inactive account (BR-06/BR-10 — identical response for all three) |
| 500 | `INTERNAL_ERROR` | Unexpected error |

## 2. POST /api/auth/logout
**Auth:** Authenticated (any role, including restricted must-change-password session)

**Response 200:** `{ "data": { "loggedOut": true } }`, clears session cookie.

## 3. GET /api/auth/me
**Auth:** Authenticated (works in both normal and restricted `mustChangePassword` sessions)

**Response 200:**
```json
{ "data": { "id": 1, "name": "...", "email": "...", "role": "IT_STAFF", "mustChangePassword": false } }
```
**Errors:** `401 UNAUTHENTICATED` if no valid session.

## 4. POST /api/auth/change-password
**Auth:** Authenticated (works even in restricted must-change-password session — this is
the one endpoint that session type may always call)

**Request:** `{ "currentPassword": "string", "newPassword": "string" }`

**Response 200:** `{ "data": { "changed": true } }`, clears `mustChangePassword`, issues
a fresh (non-restricted) session cookie.

**Errors:**
| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `newPassword` fails BR-07 rules |
| 401 | `UNAUTHENTICATED` | Missing or invalid session cookie (SEC-08) |
| 401 | `INVALID_CREDENTIALS` | `currentPassword` incorrect |

---

## 5–14. Lab 2 Requester Ticket/Attachment Endpoints — Diff from Lab 2

All ten Lab 2 endpoints (`POST/GET /api/tickets`, `GET /api/tickets/:id`,
`POST/GET /api/tickets/:id/attachments`, `GET/PATCH /api/attachments/:id/*`) remain at
the **same paths** with this single change:

| Aspect | Lab 2 | Lab 3 |
|---|---|---|
| Identity source | `X-Dev-Requester-Id` header | Authenticated session (`req.user.id`) — header removed entirely |
| Auth requirement | None | `Authenticated`, role `REQUESTER` |
| Ownership check | `ticket.requesterId === headerRequesterId` | `ticket.requesterId === req.user.id` |
| 400 "context required" | Missing header | Replaced by `401 UNAUTHENTICATED` (no session) |

Everything else — request/response shapes, validation (BR-18…BR-24 in Lab 2 spec),
attachment rules, pagination — is unchanged (AC-24 regression requirement), with one
targeted response shape addition:

- **`GET /api/tickets/:id`**: Response includes `"appearsResolved": boolean` (defaults to `false`) on the ticket data object. This enables the Requester Ticket Detail view to persist the "You indicated this problem appears resolved" indicator on page reload (matching IT Staff's view in endpoint 21).

## 15. POST /api/tickets/:id/comments
**Auth:** Owning Requester, IT Staff, Administrator

**Request:** `{ "content": "string" }`

**Response 201:** `{ "data": { "id": 1, "ticketId": 5, "authorId": 3, "authorName": "...", "authorRole": "REQUESTER", "content": "...", "createdAt": "..." } }`

**Errors:** `400 VALIDATION_ERROR` (empty/too long, BR-25/BR-26), `403 FORBIDDEN`
(Requester requesting a Ticket they don't own — same non-revealing pattern as Lab 2 BR-06),
`404 NOT_FOUND` if ticket does not exist.

## 16. GET /api/tickets/:id/comments
**Auth:** Owning Requester, IT Staff, Administrator
**Response 200:** `{ "data": [ { ...comment }, ... ] }` ordered oldest→newest.
**Errors:** `403 FORBIDDEN` (Requester requesting a Ticket they don't own),
`404 NOT_FOUND` if ticket does not exist.

## 17. POST /api/tickets/:id/notes
**Auth:** IT Staff, Administrator only

**Request:** `{ "content": "string" }`
**Response 201:** same shape as comments.
**Errors:** `400 VALIDATION_ERROR` (empty/too long, BR-25/BR-26), `403 FORBIDDEN` for a
Requester caller — **response body contains no note data whatsoever** (AC-04/BR-28),
`404 NOT_FOUND` if ticket does not exist.

## 18. GET /api/tickets/:id/notes
**Auth:** IT Staff, Administrator only
**Response 200:** `{ "data": [ { ...note }, ... ] }`.
**Errors:** `403 FORBIDDEN` for Requester (AC-04) — identical empty-body pattern as endpoint 17,
`404 NOT_FOUND` if ticket does not exist.

## 19. PATCH /api/tickets/:id/appears-resolved
**Auth:** Owning Requester

**Response 200:** `{ "data": { "id": 5, "appearsResolved": true } }` — does NOT change
`currentStatus` (BR-05/BR-20/AC-16).

**Errors:** `403 FORBIDDEN` (Requester requesting a Ticket they don't own),
`404 NOT_FOUND` if ticket does not exist.

---

## 20. GET /api/staff/tickets
**Auth:** IT Staff, Administrator

**Query parameters:**
| Param | Type | Notes |
|---|---|---|
| `search` | string | matches Ticket Number or Summary |
| `status` | string | filter by currentStatus |
| `itPriority` | LOW\|MEDIUM\|HIGH\|CRITICAL | filter |
| `ownerId` | int \| `unassigned` | filter by Ticket Owner |
| `sortBy` | `createdAt`\|`updatedAt`\|`itPriority` | default `createdAt` |
| `sortDir` | `asc`\|`desc` | default `desc` |
| `page`, `pageSize` | int | same pagination convention as Lab 2 (default 10, allowed 10/25/50) |

**Response 200:** `{ "data": [ {...ticket, owner: {...}|null} ], "meta": {...} }`
**Errors:** `401 UNAUTHENTICATED`, `403 FORBIDDEN` for Requester caller (SEC-07).

## 21. GET /api/staff/tickets/:id
**Auth:** IT Staff, Administrator — no ownership restriction (any Ticket).

**Response 200:**
```json
{
  "data": {
    "id": 5,
    "ticketNumber": "TKT-0005",
    "summary": "...",
    "description": "...",
    "category": { "id": 1, "name": "..." },
    "relatedSystem": { "id": 2, "name": "..." },
    "requester": { "id": 3, "name": "Jennifer Anderson" },
    "requestedPriority": "HIGH",
    "itPriority": "MEDIUM",
    "currentStatus": "IN_PROGRESS",
    "appearsResolved": false,
    "resolutionSummary": null,
    "owner": { "id": 7, "name": "Michael Brown", "role": "IT_STAFF" },
    "commentsCount": 3,
    "notesCount": 2,
    "attachmentsCount": 1,
    "createdAt": "2026-09-01T10:00:00Z",
    "updatedAt": "2026-09-09T14:00:00Z"
  }
}
```
**Errors:** `401 UNAUTHENTICATED`, `403 FORBIDDEN` for Requester caller, `404 NOT_FOUND` if ticket does not exist (staff may access any existing ticket — no ownership filter, so 404 is safe to return here).

## 22. PATCH /api/staff/tickets/:id/claim
**Auth:** IT Staff, Administrator

**Response 200:**
```json
{ "data": { "id": 5, "ownerId": 7, "owner": { "id": 7, "name": "Michael Brown", "role": "IT_STAFF" } } }
```
**Errors:** `401 UNAUTHENTICATED`, `403 FORBIDDEN` for Requester caller, `409 CONFLICT` if already claimed by someone else (BR-14); `404 NOT_FOUND` if ticket does not exist.

## 23. PATCH /api/staff/tickets/:id/assign
**Auth:** IT Staff, Administrator
**Request:** `{ "ownerId": number }` — target must be active IT_STAFF or ADMINISTRATOR.

**Response 200:**
```json
{ "data": { "id": 5, "ownerId": 8, "owner": { "id": 8, "name": "Alice Chen", "role": "IT_STAFF" } } }
```
**Errors:** `400 VALIDATION_ERROR` if target invalid/inactive/wrong role (BR-15),
`401 UNAUTHENTICATED`, `403 FORBIDDEN` for Requester caller,
`404 NOT_FOUND` if ticket does not exist.

## 24. PATCH /api/staff/tickets/:id/it-priority
**Auth:** IT Staff, Administrator
**Request:** `{ "itPriority": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL" }`

**Response 200:**
```json
{ "data": { "id": 5, "itPriority": "HIGH" } }
```
**Errors:** `400 VALIDATION_ERROR` if value not in enum (LOW/MEDIUM/HIGH/CRITICAL),
`401 UNAUTHENTICATED`, `403 FORBIDDEN` for Requester caller (AC-10),
`404 NOT_FOUND` if ticket does not exist.

## 25. PATCH /api/staff/tickets/:id/status
**Auth:** IT Staff, Administrator
**Request:** `{ "status": "...", "resolutionSummary"?: "string" }`

**Response 200:**
```json
{ "data": { "id": 5, "currentStatus": "IN_PROGRESS", "resolutionSummary": null } }
```
**Errors:** `400 INVALID_TRANSITION` (BR-21), `400 RESOLUTION_SUMMARY_REQUIRED` when
transitioning to Resolved/Closed without one (BR-22/AC-12),
`401 UNAUTHENTICATED`, `403 FORBIDDEN` for Requester caller (SEC-03),
`404 NOT_FOUND` if ticket does not exist.

---

## 26. GET /api/admin/users
**Auth:** Administrator only
**Query:** `search` (name/email substring), `role` (optional exact filter)
**Response 200:** `{ "data": [ { "id":1, "name":"...", "email":"...", "role":"...", "isActive":true } ] }` — no pagination (Decision D-4).
**Errors:** `401 UNAUTHENTICATED`, `403 FORBIDDEN` for non-Administrator caller (SEC-01, SEC-04).

## 27. POST /api/admin/users
**Auth:** Administrator only
**Request:** `{ "name", "email", "role", "isActive", "initialPassword" }`
**Response 201:** created user (no passwordHash in response).
**Errors:** `400 VALIDATION_ERROR` (bad role/password rules), `401 UNAUTHENTICATED`, `403 FORBIDDEN` for non-Administrator caller, `409 DUPLICATE_EMAIL` (BR-11).

## 28. PATCH /api/admin/users/:id
**Auth:** Administrator only
**Request:** `{ "name"?, "email"?, "role"?, "isActive"? }`
**Errors:** `400 VALIDATION_ERROR` (bad role or invalid email format), `401 UNAUTHENTICATED`, `403 FORBIDDEN` for non-Administrator caller, `403 CANNOT_DEACTIVATE_SELF` (BR-32), `403 LAST_ACTIVE_ADMIN` (BR-33, applies whether deactivating OR role-changing away from Administrator), `404 NOT_FOUND` if user does not exist, `409 DUPLICATE_EMAIL` (BR-11).

## 29. PATCH /api/admin/users/:id/password
**Auth:** Administrator only
**Request:** `{ "newPassword": "string" }`
**Response 200:** sets `mustChangePassword = true` for the target user (BR-31).
**Errors:** `400 VALIDATION_ERROR` (password fails BR-07 rules), `401 UNAUTHENTICATED`, `403 FORBIDDEN` for non-Administrator caller, `404 NOT_FOUND` if user does not exist.

---

## HTTP Status Code Reference

| Status | Usage |
|---|---|
| 200/201 | Success |
| 400 | Validation failure, invalid transition, missing resolution summary |
| 401 | No/invalid/expired session |
| 403 | Authenticated but forbidden (wrong role, not owner, restricted must-change session, admin safety rules) |
| 404 | Resource genuinely not found |
| 409 | Conflict (duplicate email, ticket already claimed) |
| 500 | Unexpected server error, safe message only |