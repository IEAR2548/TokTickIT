# Lab 2 UI Specification — Zen Green Theme

## 1. Color Tokens

| Token | Value | Intended Use |
|---|---|---|
| `--color-primary` | `#006B3C` | App header, primary action buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover states |
| `--color-pale-green` | `#EAF6EF` | Selected items, success states, subtle section backgrounds |
| `--color-page-bg` | `#F5F7F6` | Page/screen background |
| `--color-surface` | `#FFFFFF` | Cards, panels, modal surfaces |
| `--color-surface-border` | `#D9E5DE` | Card and panel borders |
| `--color-surface-shadow` | `rgba(0,107,60,0.08)` | Restrained card shadow |
| `--color-text-primary` | `#1A2E23` | Primary body text (dark charcoal-green, not pure black) |
| `--color-text-secondary` | `#4A6357` | Secondary/helper text |
| `--color-text-placeholder` | `#7A9E8C` | Input placeholder text |
| `--color-field-editable-bg` | `#FFFFFF` | Editable input/select background |
| `--color-field-editable-border` | `#B0C8BC` | Editable field border in default state |
| `--color-field-readonly-bg` | `#EEF4F1` | Read-only field background (soft gray-green) |
| `--color-field-readonly-border` | `#C8DDD5` | Read-only field border |
| `--color-error` | `#B91C1C` | Error text and border (dark red) |
| `--color-error-bg` | `#FEF2F2` | Error message background |
| `--color-warning` | `#B45309` | Warning text (amber) |
| `--color-warning-bg` | `#FFFBEB` | Warning badge/callout background |
| `--color-success` | `#15803D` | Success confirmation text |
| `--color-success-bg` | `#DCFCE7` | Success state background |

---

## 2. Typography

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Base font | `Inter`, sans-serif | 16 px | 400 | Loaded from Google Fonts |
| Page title / H1 | Inter | 24 px | 700 | One per page |
| Section heading / H2 | Inter | 18 px | 600 | |
| Label | Inter | 14 px | 600 | Above input controls |
| Input text | Inter | 14 px | 400 | |
| Helper / validation text | Inter | 12 px | 400 | Below input controls |
| Badge text | Inter | 12 px | 600 | Uppercase where appropriate |
| Button text | Inter | 14 px | 600 | |
| Navigation link | Inter | 14 px | 500 | |

Line height: 1.5 for body text; 1.2 for headings.

---

## 3. Spacing Scale

| Token | Value |
|---|---|
| `--space-xs` | 4 px |
| `--space-sm` | 8 px |
| `--space-md` | 16 px |
| `--space-lg` | 24 px |
| `--space-xl` | 32 px |
| `--space-2xl` | 48 px |

Card internal padding: `--space-lg` (24 px). Form section gap: `--space-md` (16 px).

---

## 4. Input and Field States

| State | Background | Border | Notes |
|---|---|---|---|
| Default (editable) | `#FFFFFF` | `#B0C8BC` 1 px | Clear neutral border |
| Focused (editable) | `#FFFFFF` | `#006B3C` 2 px | Green focus ring; no outline removed |
| Invalid | `#FEF2F2` | `#B91C1C` 1 px | Dark red border |
| Disabled | `#F3F6F4` | `#D1DDD8` 1 px | Visually distinct; cursor not-allowed |
| Read-only | `#EEF4F1` | `#C8DDD5` 1 px | Soft gray-green; clearly not editable |

- Input height: 40 px (single-line).
- Description textarea: min-height 120 px; resizable vertically only; resizing must not break layout.
- Labels appear above controls, not inline. Font weight 600, color `--color-text-primary`.
- Required fields show a red asterisk (`*`) after the label text. The asterisk does not replace the validation message.
- Focus indicators must remain visible for keyboard users (do not set `outline: none` without a replacement).

---

## 5. Validation Message Placement

- Validation messages appear immediately below the associated field, not grouped at the top of the form.
- Color: `--color-error` (`#B91C1C`); font size 12 px; appears as soon as the field is blurred or the form is submitted.
- The error message area is always reserved (min-height 16 px) to prevent layout shift.
- Pattern: `<label for="summary">Summary <span aria-hidden="true">*</span></label> <input id="summary" ...> <p role="alert" id="summary-error" class="field-error">Summary is required.</p>`

---

## 6. Button Hierarchy and States

| Variant | Background | Text | Border | Notes |
|---|---|---|---|---|
| Primary | `#006B3C` | `#FFFFFF` | None | Main CTA: Submit Ticket, Continue, Create Ticket |
| Secondary | `#FFFFFF` | `#006B3C` | `#006B3C` 1 px | Supporting actions: Cancel, View Ticket |
| Tertiary | Transparent | `#006B3C` | None | Low-emphasis: Create Another, back links |
| Destructive | `#B91C1C` | `#FFFFFF` | None | Permanent-action risk: used cautiously |
| Disabled | `#D1DDD8` | `#7A9E8C` | None | Cannot be activated; cursor not-allowed |
| Busy | Primary bg with spinner | Dimmed text | None | Disabled during in-flight requests |

- Minimum button height: 40 px desktop; 44 px on touch targets (mobile).
- All buttons include visible text. Icons may supplement but must not replace unclear text.
- Every icon-only control requires an `aria-label` attribute and a visible tooltip on hover/focus.
- The Submit button enters busy state immediately on click and is disabled until the request resolves.

---

## 7. Badge Rules

### Current Status

| Status | Background | Text Color |
|---|---|---|
| NEW | `#EAF6EF` | `#006B3C` |

Future statuses will be defined in later labs.

### Requested Priority

| Priority | Background | Text Color |
|---|---|---|
| LOW | `#F3F4F6` | `#374151` |
| MEDIUM | `#EFF6FF` | `#1D4ED8` |
| HIGH | `#FFFBEB` | `#B45309` |
| CRITICAL | `#FEF2F2` | `#B91C1C` |

Badge rules:
- Badges use rounded corners (border-radius 12 px), padding 2 px 8 px, and uppercase letter-spacing.
- Color alone is never the only differentiator; badge text always indicates the value.

---

## 8. Application Shell

- Full-width top navigation bar with `--color-primary` (#006B3C) background.
- Contents (left to right): TokTickIT logo/wordmark (white text); nav links (My Tickets, Create Ticket) in white; spacer; current Requester name (white, 14 px); Change Requester button (secondary/outline variant, white border and text on green background).
- Active navigation link is underlined or highlighted with `--color-pale-green` indicator.
- Shell is present on all screens except the Development Requester Selection screen.
- On mobile (under 768 px): nav links collapse into a hamburger icon; clicking opens a slide-down or overlay menu.

---

## 9. Development Requester Selection Screen

### Layout

- Full-page background: `--color-primary` or a Zen Green gradient.
- Centered white card (max-width 480 px, padding 32 px, border-radius 12 px, subtle shadow).

### Required Elements

- TokTickIT title (white or primary-green text, depending on background; 28 px, bold).
- Explanatory text: *"Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3."* (smaller text, secondary color).
- Label: "Select Requester".
- Dropdown (`<select>`) populated with `{name} — {email}` for each active Requester; blank placeholder option "Choose a requester…".
- Continue button (primary); disabled until a Requester is selected from the dropdown.
- Keyboard-accessible: all controls reachable and operable by keyboard.

### States

| State | UI |
|---|---|
| Loading | Skeleton or spinner replaces dropdown; Continue button disabled |
| Empty | Message: "No active requesters are available. Contact your administrator." |
| Failure | Message: "Failed to load requesters. Please try again." + Retry button |
| Ready | Dropdown enabled; Continue button enabled after selection |

---

## 10. Create Ticket Screen

### Layout (Desktop 992 px+)

```
[Page title: Create Ticket]
+----------------------------------------------+
| SYSTEM INFO (read-only, 2-column grid)       |
| Ticket Number: Will be assigned  |  Date: today |
| Status: New                      |  Requester: Alice Tanaka |
+----------------------------------------------+
| CLASSIFICATION (2-column grid)               |
| Category: [select]    | Related System: [select] |
+----------------------------------------------+
| Requested Priority: [select]                 |
+----------------------------------------------+
| Summary: [text input — full width]           |
+----------------------------------------------+
| Description: [textarea — full width]         |
+----------------------------------------------+
| ATTACHMENTS                                  |
| [File picker button]  (max 5, see rules)     |
| [Attachment chip list]                       |
+----------------------------------------------+
| [Cancel]              [Submit Ticket]        |
+----------------------------------------------+
```

### States

| State | UI |
|---|---|
| Initial | Empty form; reference data (Categories, Related Systems) loaded from API |
| Validation failure | Field-level error messages appear below each invalid field; form values retained |
| Submitting | Submit button shows spinner and is disabled; all fields become read-only |
| Success | Green success panel with generated Ticket Number; "View Ticket" (primary) and "Create Another" (secondary) buttons |
| API failure | Red error callout below buttons: "Failed to submit ticket. Please try again."; all form values retained |

### Field Specifications

| Field | Editable | Required | Validation |
|---|---|---|---|
| Ticket Number | No (read-only) | — | System-assigned after submission |
| Ticket Date | No (read-only) | — | Current date, set by system |
| Current Status | No (read-only) | — | Always "New" for new tickets |
| Requester | No (read-only) | — | Populated from selected DevRequester |
| Category | Yes | Yes | Must select from active Categories |
| Related System | Yes | Yes | Must select from active Related Systems |
| Requested Priority | Yes | Yes | One of: Low, Medium, High, Critical |
| Summary | Yes | Yes | 5-200 characters |
| Description | Yes | Yes | 10-5000 characters |
| Attachments | Yes | No | JPG/JPEG/PNG/WEBP/PDF; max 5 MB each; max 5 files |

---

## 11. My Tickets Screen

### Layout (Desktop 992 px+)

```
[My Tickets]                          [+ Create Ticket]
[Search bar: Ticket Number or Summary     ]
[Category filter] [Status filter]  [Sort by: Created Date v] [Order: Desc v]

+----------+----------------------------+----------+--------+------------+-----------+
| Ticket # | Summary                    | Category | Status | Created    | Updated   |
+----------+----------------------------+----------+--------+------------+-----------+
| TK-…-001 | Laptop battery drains...  | Hardware | NEW    | 2026-08-24 | 2026-08-24 |
+----------+----------------------------+----------+--------+------------+-----------+

[< Prev]  [Page 1 of 3]  [Next >]
```

### Layout (Mobile under 768 px)

Each ticket renders as a vertical card with Ticket Number, Summary, Category badge, Status badge, and Created date. No horizontal table.

### States

| State | UI |
|---|---|
| Loading | Skeleton rows or spinner in list area |
| Empty | "You haven't created any tickets yet." + "Create Ticket" button |
| No results | "No tickets match your search or filters." + "Clear filters" button |
| Failure | "Failed to load tickets. Please try again." + Retry button |

### Search and Filter Behavior

- Search is debounced (300 ms) or triggered on Enter.
- Category and Status filters reset page to 1 when changed.
- Sorting reset page to 1 when changed.
- "Clear all filters" link resets search, category filter, status filter, sort, and page to defaults.
- Pagination: Previous button disabled on page 1; Next button disabled on last page; current page indicator visible at all times.

---

## 12. Requester Ticket Detail Screen

### Layout (Desktop 992 px+)

```
[< Back to My Tickets]
[Ticket TK-20260824-0001]

+------------------------------------------+
| TICKET INFORMATION (read-only)           |
| Ticket Number  | Ticket Date             |
| Requester      | Current Status: [badge] |
| Category       | Related System          |
| Requested Priority: [badge]              |
+------------------------------------------+
| Summary (read-only field)                |
+------------------------------------------+
| Description (read-only multiline)        |
+------------------------------------------+
| ATTACHMENTS                              |
| [+ Add Attachment] (disabled if 5 active)|
|                                          |
| Active Attachments                       |
| filename.png  PNG  204 KB  2026-08-24  [Download] [Remove] |
|                                          |
| Removed Attachments                      |
| ~~old-report.pdf~~ Removed 2026-08-24   |
| Reason: Uploaded wrong file version     |
+------------------------------------------+
```

### Attachment Section Rules

- Active attachment row: filename, MIME type label (PNG, PDF, etc.), file size, upload date, Download button (primary/secondary), Remove button (destructive).
- Remove button opens a confirmation dialog requiring a non-empty removal reason before proceeding.
- Removed attachment row: filename with strikethrough styling, removed date, removal reason. No download control.
- "Add Attachment" button is disabled and shows a tooltip "Maximum 5 attachments reached" when 5 active attachments are present.
- The attachment section is always visible even if there are no attachments; it shows an empty message "No attachments."

### Attachment Upload (Inline)

When "Add Attachment" is clicked:
1. A file picker opens (filtered to JPG/JPEG/PNG/WEBP/PDF).
2. If file type or size is invalid, an error message is shown inline; no upload is attempted.
3. If valid, a progress indicator is shown while uploading.
4. On success, the new attachment appears at the top of the active list.
5. On failure, a safe error message is shown; the Ticket is unaffected.

---

## 13. Responsive Requirements

| Viewport | Required Behavior |
|---|---|
| Desktop 992 px+ | Multi-column form layout (2-col system info, 2-col classification); ticket list as data table; content centered with max-width 1200 px |
| Tablet 768-991 px | Two-column where practical; Summary and Description receive at least 60% width; table may collapse some columns |
| Mobile under 768 px | All fields stack vertically (single column); ticket table becomes card list; buttons are at least 44 px tall; no horizontal page scrolling; attachment filenames wrap rather than overflow |
| All sizes | No clipped labels, overlapping validation messages, hidden buttons, or unreadable attachment names |

---

## 14. Accessibility Rules

- All form controls have associated `<label>` elements with matching `for` / `id`.
- Required-field asterisks are `aria-hidden="true"` and not read by screen readers as a substitute for the label.
- Error messages use `role="alert"` or `aria-live="polite"` so screen readers announce them.
- All icon-only buttons have `aria-label` describing the action.
- Focus order follows a logical reading order (top to bottom, left to right).
- Focus indicator is visible: at minimum a 2 px outline in a color with 3:1 contrast ratio against the adjacent color.
- All interactive controls are operable by keyboard alone (Tab, Shift+Tab, Enter, Space, Arrow keys for select).
- Color is never the sole means of conveying information (badges include text, error fields include messages).

---

## 15. Visual Inspection Checklist

Use the following checklist after implementation and after capturing Playwright screenshots at each viewport:

### Colors and Theming

- [ ] Primary green (`#006B3C`) used for app header, primary buttons, and strong emphasis.
- [ ] Secondary green (`#0B7A46`) used for active nav links, hover states, and focus accents.
- [ ] Pale green (`#EAF6EF`) used for success and selected states.
- [ ] Page background is `#F5F7F6` or similarly quiet near-white.
- [ ] Editable fields have white background and clear neutral border.
- [ ] Read-only fields have visually distinct soft gray-green shading.
- [ ] Error color (dark red) is used only for errors, not as decoration.
- [ ] Warning color (amber) is used only for warnings.

### Typography and Spacing

- [ ] Inter font loads correctly from Google Fonts.
- [ ] Labels are above their controls with consistent font weight.
- [ ] Required-field asterisks are visible and red.
- [ ] Consistent spacing between form rows.

### Validation

- [ ] Validation messages appear immediately below the associated field.
- [ ] Messages appear on blur or on submit; not before the user has interacted.
- [ ] Error messages disappear when the field becomes valid.

### Buttons

- [ ] Primary, secondary, tertiary, disabled, and busy states are visually distinct.
- [ ] Submit button shows spinner and is disabled during in-flight request.
- [ ] Touch targets are at least 44 px on mobile.

### Responsive

- [ ] Desktop 992 px+: no horizontal overflow; multi-column layout correct.
- [ ] Tablet 768-991 px: two-column where specified; no clipping.
- [ ] Mobile under 768 px: all fields stack vertically; no horizontal scrolling; cards not table.

### Badges

- [ ] Status badges match the correct color per status.
- [ ] Priority badges match the correct color per priority.
- [ ] Badge text is readable at all viewport sizes.

### Empty and Failure States

- [ ] My Tickets empty state is visible and includes a Create Ticket action.
- [ ] My Tickets no-results state is distinct from empty state.
- [ ] API failure states include a retry mechanism.
- [ ] Requester Selection empty and failure states are present.

### Attachments

- [ ] Active attachments show Download and Remove buttons.
- [ ] Removed attachments show strikethrough filename, removal date, and reason — no Download button.
- [ ] Add Attachment button is disabled when 5 active attachments are present.

---

## 16. Screenshot Paths

Playwright screenshots must be saved at the following paths after test runs:

```
artifacts/lab-02/screenshots/create-ticket/
  create-ticket-desktop.png
  create-ticket-tablet.png
  create-ticket-mobile.png
  create-ticket-validation.png
  create-ticket-success.png
  create-ticket-failure.png

artifacts/lab-02/screenshots/my-tickets/
  my-tickets-desktop.png
  my-tickets-tablet.png
  my-tickets-mobile.png
  my-tickets-empty.png
  my-tickets-no-results.png
  my-tickets-failure.png

artifacts/lab-02/screenshots/ticket-detail/
  ticket-detail-desktop.png
  ticket-detail-tablet.png
  ticket-detail-mobile.png
  ticket-detail-attachments.png
  ticket-detail-removed-attachment.png
```
