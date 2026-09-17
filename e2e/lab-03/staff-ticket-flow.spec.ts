import { test, expect, Page } from "@playwright/test";
import { loginAs, provisionRequesterWithTicket, projectTag } from "../auth-helpers";

// Ref: docs/lab-03/specification.md AC-08, AC-09, AC-28, AC-29, AC-04, AC-14
// Ref: docs/lab-03/ui-spec.md Section 6 (IT Staff Ticket Detail)
// Ref: docs/lab-03/tests.md E2E-03, E2E-04
//
// Parallel-safety: fullyParallel runs this spec once per browser project against
// one shared backend. E2E-03 MUTATES its ticket (claim, priority, status,
// comments, notes) and E2E-04 adds an internal note — so each project gets its
// own fixture ticket/requester instead of sharing seed rows (TK-20260825-0001 /
// TK-20260825-0002), where one worker's claim broke another's mid-flight.

const STAFF_EMAIL = "samira.chen@example.com";

async function loginAsSamira(page: Page) {
    await loginAs(page, STAFF_EMAIL);
}

async function openStaffTicketByNumber(page: Page, ticketNumber: string) {
    await page.goto("/staff/queue");
    await page.getByTestId("staff-queue-search").fill(ticketNumber);
    await page.getByTestId("staff-queue-search").press("Enter");
    // Wait for the filtered row itself — the table skeleton is always in the DOM,
    // so table visibility alone does not imply results have loaded.
    await expect(page.locator("[data-testid^='staff-queue-row-']").first()).toBeVisible();
    await page.getByRole("link", { name: ticketNumber }).first().click();
    await expect(page.getByTestId("staff-ticket-number")).toHaveText(ticketNumber);
}

test.describe("Lab 3 IT Staff Ticket Flow E2E", () => {
    // 90s per-test budget: fixture provisioning through the Admin API + two
    // logins + several saves exceed the 30s default under peak parallel load
    // (the product itself is not slow — the clock just runs out mid-workflow).
    test.setTimeout(90_000);
    test("E2E-03: Claim → set IT Priority → change status → post comment → add note (AC-08, AC-28, AC-29, AC-13, AC-14)", async ({ page }, testInfo) => {
        // 0. Provision a dedicated per-project ticket (admin session, then logged out).
        //    Tag includes retry so a retried test provisions fresh fixtures instead of
        //    colliding with its own first attempt (409 DUPLICATE_EMAIL); the t3 prefix
        //    keeps E2E-03/E2E-04 fixtures apart when both run in the same project.
        const tag = `t3${projectTag(testInfo.project.name)}${testInfo.retry}`;
        await loginAs(page, "alex.morgan@example.com");
        const { ticketNumber } = await provisionRequesterWithTicket(page, tag, {
            summary: `E2E-03 ${tag} laptop battery drains quickly`,
            description: "Per-project fixture ticket for the claim/priority/status flow.",
        });

        // 1. Staff claims and works the dedicated ticket
        await loginAsSamira(page);
        await openStaffTicketByNumber(page, ticketNumber);

        // 2. AC-08: claim the unassigned ticket
        await page.getByRole("button", { name: "Claim" }).click();
        await expect(page.getByTestId("staff-ticket-owner-value")).toHaveText(/Samira Chen/);

        // 3. AC-28: change IT Priority MEDIUM -> HIGH; Requested Priority stays MEDIUM
        const prioritySelect = page.getByTestId("staff-ticket-priority-select");
        await prioritySelect.selectOption("HIGH");
        await page.getByRole("button", { name: "Save" }).first().click();
        await expect(prioritySelect).toHaveValue("HIGH");

        // 4. AC-29: valid status transition NEW -> OPEN
        const statusSelect = page.getByTestId("staff-ticket-status-select");
        await statusSelect.selectOption("OPEN");
        await page.getByRole("button", { name: "Save" }).first().click();
        await expect(statusSelect).toHaveValue("OPEN");

        // 5. AC-13: post a public comment
        await page.getByTestId("staff-ticket-comment-input").fill("E2E public comment from Samira");
        await page.getByTestId("staff-ticket-comment-submit").click();
        await expect(page.getByTestId("public-comments-panel")).toContainText(
            "E2E public comment from Samira"
        );

        // 6. AC-14: add an internal note
        await page.getByTestId("tab-internal-notes").click();
        await page.getByTestId("staff-ticket-note-input").fill("E2E internal diagnostic note");
        await page.getByTestId("staff-ticket-note-submit").click();
        await expect(page.getByTestId("internal-notes-panel")).toContainText(
            "E2E internal diagnostic note"
        );
    });

    test("E2E-04: Internal Note is never visible to the owning Requester (AC-04, AC-14, BR-28)", async ({ page, browser }, testInfo) => {
        // 0. Provision a dedicated per-project requester + ticket (t4 prefix + retry
        //    for the same fixture-collision reasons as E2E-03).
        const tag = `t4${projectTag(testInfo.project.name)}${testInfo.retry}`;
        await loginAs(page, "alex.morgan@example.com");
        const { email, ticketNumber } = await provisionRequesterWithTicket(page, tag, {
            summary: `E2E-04 ${tag} VPN certificate error`,
            description: "Per-project fixture ticket for the internal-note privacy flow.",
        });

        // 1. Staff posts the internal note on the dedicated ticket
        await loginAsSamira(page);
        await openStaffTicketByNumber(page, ticketNumber);

        await expect(page.getByTestId("staff-ticket-owner-value")).toBeVisible();

        await page.getByTestId("tab-internal-notes").click();
        const NOTE_TEXT = "Private note: vendor RMA in progress";
        await page.getByTestId("staff-ticket-note-input").fill(NOTE_TEXT);
        await page.getByTestId("staff-ticket-note-submit").click();
        await expect(page.getByTestId("internal-notes-panel")).toContainText(NOTE_TEXT);

        // 2. Now the owning Requester (isolated context) views the same ticket —
        //    the note must not appear anywhere in their view (BR-28).
        const aliceContext = await browser.newContext();
        const alicePage = await aliceContext.newPage();
        // logIn directly as the fixture requester (mustChangePassword healed in place).
        await loginAs(alicePage, email);
        await alicePage.goto("/my-tickets");

        // Other suites can fill page 1 with newer tickets — search for the
        // fixture ticket number instead of assuming list position.
        await alicePage.getByRole("searchbox", { name: /search/i }).fill(ticketNumber);
        await alicePage.getByRole("searchbox", { name: /search/i }).press("Enter");
        await expect(alicePage.getByRole("link", { name: ticketNumber }).first()).toBeVisible();
        await alicePage.getByRole("link", { name: ticketNumber }).first().click();
        await expect(alicePage.getByTestId("ticket-number")).toHaveText(ticketNumber);

        await expect(alicePage.getByText(NOTE_TEXT)).toHaveCount(0);

        // Requester sees the public comments section but never an internal notes panel
        await expect(alicePage.getByTestId("requester-ticket-comment-input")).toBeVisible();
        await expect(alicePage.getByTestId("internal-notes-panel")).toHaveCount(0);

        await aliceContext.close();
    });
});
