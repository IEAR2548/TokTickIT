# Lab 2 API Specification

## Overview

All endpoints are prefixed with `/api`. Every response body is JSON. The `requesterId` query parameter acts as the "logged-in user" identity for Lab 2 (temporary testing mechanism). All ownership checks compare the resource's `requesterId` to the provided `requesterId`; mismatches return 403. Unexpected server errors return 500 with a safe message and no stack trace.

---

## Standard Error Shape

```json
{
  "error": "Short machine-readable code",
  "message": "Human-readable description"
}
```

Validation failure shape (400):

```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "summary": "Summary must be between 5 and 200 characters.",
    "categoryId": "Category is required."
  }
}
```

---

## 1. GET /api/requesters

Retrieve all active Development Requesters for the selector dropdown.

### Request

No parameters.

### Response 200

```json
{
  "requesters": [
    { "id": 1, "name": "Alice Tanaka", "email": "alice.tanaka@example.com" },
    { "id": 2, "name": "Bob Chavez",   "email": "bob.chavez@example.com" },
    { "id": 3, "name": "Carol Meier",  "email": "carol.meier@example.com" },
    { "id": 4, "name": "David Sorn",   "email": "david.sorn@example.com" }
  ]
}
```

- Inactive Requesters (`isActive = false`) are excluded.
- Returns empty array if none active.

### Error Responses

| Status | Condition |
|---|---|
| 500 | Unexpected server error |

---

## 2. GET /api/categories

Retrieve all active ticket Categories.

### Request

No parameters.

### Response 200

```json
{
  "categories": [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
}
```

### Error Responses

| Status | Condition |
|---|---|
| 500 | Unexpected server error |

---

## 3. GET /api/related-systems

Retrieve all active Related Systems.

### Request

No parameters.

### Response 200

```json
{
  "relatedSystems": [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" },
    { "id": 4, "name": "LEB2 App" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "Corporate Laptop" }
  ]
}
```

### Error Responses

| Status | Condition |
|---|---|
| 500 | Unexpected server error |

---

## 4. POST /api/tickets

Create a new Ticket for the specified Requester.

### Request Body

```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "The battery of my corporate laptop goes from 100% to 0% in under 2 hours during normal use.",
  "requestedPriority": "MEDIUM"
}
```

| Field | Required | Validation |
|---|---|---|
| `requesterId` | Yes | Must reference an active DevRequester |
| `categoryId` | Yes | Must reference an active Category |
| `relatedSystemId` | Yes | Must reference an active RelatedSystem |
| `summary` | Yes | 5-200 characters after trimming whitespace |
| `description` | Yes | 10-5000 characters after trimming whitespace |
| `requestedPriority` | Yes | One of: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

### Response 201

```json
{
  "ticket": {
    "id": 42,
    "ticketNumber": "TK-20260824-0001",
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 3,
    "summary": "Laptop battery drains quickly",
    "description": "The battery of my corporate laptop goes from 100% to 0% in under 2 hours during normal use.",
    "requestedPriority": "MEDIUM",
    "currentStatus": "NEW",
    "createdAt": "2026-08-24T07:00:00.000Z",
    "updatedAt": "2026-08-24T07:00:00.000Z"
  }
}
```

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | One or more fields fail validation (see fields map) |
| 404 | `REQUESTER_NOT_FOUND` | `requesterId` does not match an active Requester |
| 404 | `CATEGORY_NOT_FOUND` | `categoryId` does not match an active Category |
| 404 | `RELATED_SYSTEM_NOT_FOUND` | `relatedSystemId` does not match an active RelatedSystem |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 5. GET /api/tickets

Retrieve the paginated Ticket list for a specific Requester. Only tickets owned by the specified Requester are returned.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `requesterId` | integer | Yes | — | The selected Requester's ID |
| `search` | string | No | — | Searches Ticket Number and Summary (case-insensitive, partial match) |
| `categoryId` | integer | No | — | Filter by Category ID |
| `status` | string | No | — | Filter by Current Status (e.g., `NEW`) |
| `sortBy` | string | No | `createdAt` | Sort field: `createdAt` or `updatedAt` |
| `sortOrder` | string | No | `desc` | Sort direction: `asc` or `desc` |
| `page` | integer | No | `1` | Page number (1-indexed) |
| `pageSize` | integer | No | `10` | Permitted values: `10`, `25`, `50` |

### Example Request

```
GET /api/tickets?requesterId=1&search=laptop&categoryId=2&page=1&pageSize=10
```

### Response 200

```json
{
  "tickets": [
    {
      "id": 42,
      "ticketNumber": "TK-20260824-0001",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-24T07:00:00.000Z",
      "updatedAt": "2026-08-24T07:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `requesterId` missing, `page` < 1, or `pageSize` not in permitted values |
| 404 | `REQUESTER_NOT_FOUND` | `requesterId` does not match an active Requester |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. GET /api/tickets/:id

Retrieve a single Ticket by ID. Ownership is enforced: the provided `requesterId` must match the Ticket's `requesterId`.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `requesterId` | integer | Yes | Must match the Ticket owner |

### Response 200

```json
{
  "ticket": {
    "id": 42,
    "ticketNumber": "TK-20260824-0001",
    "requester": { "id": 1, "name": "Alice Tanaka", "email": "alice.tanaka@example.com" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
    "summary": "Laptop battery drains quickly",
    "description": "The battery of my corporate laptop goes from 100% to 0% in under 2 hours during normal use.",
    "requestedPriority": "MEDIUM",
    "currentStatus": "NEW",
    "createdAt": "2026-08-24T07:00:00.000Z",
    "updatedAt": "2026-08-24T07:00:00.000Z"
  }
}
```

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `requesterId` missing or not an integer |
| 403 | `FORBIDDEN` | The Ticket exists but belongs to a different Requester |
| 404 | `NOT_FOUND` | Ticket ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 7. POST /api/tickets/:id/attachments

Upload an Attachment to an owned Ticket. Sent as `multipart/form-data`.

### Request

| Field | Type | Required | Validation |
|---|---|---|---|
| `requesterId` | integer (body field) | Yes | Must match Ticket owner |
| `file` | file (multipart) | Yes | JPG/JPEG/PNG/WEBP/PDF; max 5 MB |

### Validation Rules

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Maximum file size: 5,242,880 bytes (5 MB)
- Active attachment count must be under 5 before upload is accepted
- Filename is sanitized; original name stored in `originalName`; a UUID is used as `storageKey`

### Response 201

```json
{
  "attachment": {
    "id": 10,
    "ticketId": 42,
    "originalName": "battery-screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 204800,
    "isRemoved": false,
    "uploadedAt": "2026-08-24T07:05:00.000Z"
  }
}
```

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `requesterId` missing |
| 400 | `UNSUPPORTED_FILE_TYPE` | File MIME type not permitted |
| 400 | `FILE_TOO_LARGE` | File exceeds 5 MB |
| 400 | `ATTACHMENT_LIMIT_REACHED` | Ticket already has 5 active attachments |
| 403 | `FORBIDDEN` | Ticket belongs to a different Requester |
| 404 | `NOT_FOUND` | Ticket ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error (Ticket creation is NOT rolled back) |

---

## 8. GET /api/tickets/:id/attachments

Retrieve all Attachment metadata for an owned Ticket.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `requesterId` | integer | Yes | Must match the Ticket owner |

### Response 200

```json
{
  "attachments": [
    {
      "id": 10,
      "ticketId": 42,
      "originalName": "battery-screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 204800,
      "isRemoved": false,
      "uploadedAt": "2026-08-24T07:05:00.000Z",
      "removalReason": null,
      "removedAt": null
    },
    {
      "id": 11,
      "ticketId": 42,
      "originalName": "old-report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 512000,
      "isRemoved": true,
      "uploadedAt": "2026-08-24T07:10:00.000Z",
      "removalReason": "Uploaded wrong file",
      "removedAt": "2026-08-24T07:15:00.000Z"
    }
  ]
}
```

- All attachments (active and removed) are returned. Removed attachments include `removalReason` and `removedAt`.

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `requesterId` missing |
| 403 | `FORBIDDEN` | Ticket belongs to a different Requester |
| 404 | `NOT_FOUND` | Ticket ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 9. GET /api/attachments/:id/download

Stream the file bytes of a single active Attachment. Ownership is enforced via `requesterId`.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `requesterId` | integer | Yes | Must match the owner of the Ticket that contains this Attachment |

### Response 200

- Content-Type: the attachment's `mimeType`
- Content-Disposition: `attachment; filename="<originalName>"`
- Body: raw file bytes

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `requesterId` missing |
| 403 | `FORBIDDEN` | Attachment belongs to a Ticket owned by a different Requester |
| 404 | `NOT_FOUND` | Attachment ID does not exist |
| 404 | `ATTACHMENT_REMOVED` | Attachment has been soft-removed and cannot be downloaded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 10. PATCH /api/attachments/:id/remove

Soft-remove an active Attachment by setting `isRemoved = true`, recording `removedAt` and `removalReason`.

### Request Body

```json
{
  "requesterId": 1,
  "removalReason": "Uploaded wrong file version"
}
```

| Field | Required | Validation |
|---|---|---|
| `requesterId` | Yes | Must match the owner of the Ticket containing this Attachment |
| `removalReason` | Yes | Non-empty string |

### Response 200

```json
{
  "attachment": {
    "id": 10,
    "ticketId": 42,
    "originalName": "battery-screenshot.png",
    "mimeType": "image/png",
    "sizeBytes": 204800,
    "isRemoved": true,
    "removalReason": "Uploaded wrong file version",
    "removedAt": "2026-08-24T08:00:00.000Z",
    "uploadedAt": "2026-08-24T07:05:00.000Z"
  }
}
```

### Error Responses

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `requesterId` or `removalReason` missing or empty |
| 400 | `ALREADY_REMOVED` | Attachment is already soft-removed |
| 403 | `FORBIDDEN` | Attachment belongs to a Ticket owned by a different Requester |
| 404 | `NOT_FOUND` | Attachment ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## HTTP Status Code Reference

| Status | Usage |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Resource created successfully |
| 400 | Invalid input, validation failure, unsupported file type, oversized file, already-removed, limit reached |
| 403 | Ownership failure (Requester does not own the resource) |
| 404 | Resource not found or removed attachment access blocked |
| 500 | Unexpected server error (safe message, no stack trace exposed) |

---

## Ticket-List Query Behavior Notes

- `search` performs case-insensitive substring match against `ticketNumber` and `summary`.
- `categoryId` and `status` may be combined to narrow results.
- Default sort is `createdAt DESC`. Secondary sort is `id DESC` to break ties.
- Invalid `page` (less than 1) or `pageSize` (not 10, 25, or 50) returns 400 `VALIDATION_ERROR`.
- Results are always scoped to the provided `requesterId`; cross-Requester data is never returned.
