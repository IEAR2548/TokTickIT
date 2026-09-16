import { test, expect, Page } from "@playwright/test";
import { execSync } from "child_process";
import { loginAs } from "../auth-helpers";

// Ref: docs/lab-03/specification.md AC-08, AC-09, AC-28, AC-29, AC-04, AC-14
// Ref: docs/lab-03/ui-spec.md Section 6 (IT Staff Ticket Detail)
// Ref: docs/lab-03/tests.md E2E-03, E2E-04

const UNASSIGNED_TICKET = "TK-20260825-0002"; // Alice, NEW, unassigned (seed)
const MARCUS_OWNED_TICKET = "TK-20260825-0001"; // Alice, IN_PROGRESS, owner Samira (seed)

async function loginAsSamira(page: Page) {
    await loginAs(page, "samira.chen@example.com");
}

async function loginAsAlice(page: Page) {
    // Shared helper completes the forced password change in place if needed.
    await loginAs(page, "alice.tanaka@example.com");
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
    test.afterAll(() => {
        try {
            execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
        } catch {
            // ignore cleanup errors
        }
    });

    test("E2E-03: Claim → set IT Priority → change status → post comment → add note (AC-08, AC-28, AC-29, AC-13, AC-14)", async ({ page }) => {
        await loginAsSamira(page);

        await openStaffTicketByNumber(page, UNASSIGNED_TICKET);

        // 1. AC-08: claim the unassigned ticket
        await page.getByRole("button", { name: "Claim" }).click();
        await expect(page.getByTestId("staff-ticket-owner-value")).toHaveText(/Samira Chen/);

        // 2. AC-28: change IT Priority MEDIUM -> HIGH; Requested Priority stays LOW
        const prioritySelect = page.getByTestId("staff-ticket-priority-select");
        await prioritySelect.selectOption("HIGH");
        await page.getByRole("button", { name: "Save" }).first().click();
        await expect(prioritySelect).toHaveValue("HIGH");

        // 3. AC-29: valid status transition NEW -> OPEN
        const statusSelect = page.getByTestId("staff-ticket-status-select");
        await statusSelect.selectOption("OPEN");
        await page.getByRole("button", { name: "Save" }).first().click();
        await expect(statusSelect).toHaveValue("OPEN");

        // 4. AC-13: post a public comment
        await page.getByTestId("staff-ticket-comment-input").fill("E2E public comment from Samira");
        await page.getByTestId("staff-ticket-comment-submit").click();
        await expect(page.getByTestId("public-comments-panel")).toContainText(
            "E2E public comment from Samira"
        );

        // 5. AC-14: add an internal note
        await page.getByTestId("tab-internal-notes").click();
        await page.getByTestId("staff-ticket-note-input").fill("E2E internal diagnostic note");
        await page.getByTestId("staff-ticket-note-submit").click();
        await expect(page.getByTestId("internal-notes-panel")).toContainText(
            "E2E internal diagnostic note"
        );
    });

    test("E2E-04: Internal Note is never visible to the owning Requester (AC-04, AC-14, BR-28)", async ({ page, browser }) => {
        // Staff posts the internal note on the seed ticket owned by Samira
        await loginAsSamira(page);
        await openStaffTicketByNumber(page, MARCUS_OWNED_TICKET);

        await expect(page.getByTestId("staff-ticket-owner-value")).toBeVisible();

        await page.getByTestId("tab-internal-notes").click();
        await page.getByTestId("staff-ticket-note-input").fill("Private note: vendor RMA in progress");
        await page.getByTestId("staff-ticket-note-submit").click();
        await expect(page.getByTestId("internal-notes-panel")).toContainText(
            "Private note: vendor RMA in progress"
        );

        // Now the owning Requester (isolated session) views the same ticket —
        // the note must not appear anywhere in their view (BR-28).
        const aliceContext = await browser.newContext();
        const alicePage = await aliceContext.newPage();
        await loginAsAlice(alicePage);
        await alicePage.goto("/my-tickets");

        // Other suites (lab-02 bulk creation) can fill page 1 with newer tickets —
        // search for the ticket number instead of assuming list position.
        await alicePage.getByRole("searchbox", { name: /search/i }).fill(MARCUS_OWNED_TICKET);
        await alicePage.getByRole("searchbox", { name: /search/i }).press("Enter");
        await expect(alicePage.getByRole("link", { name: MARCUS_OWNED_TICKET }).first()).toBeVisible();
        await alicePage.getByRole("link", { name: MARCUS_OWNED_TICKET }).first().click();
        await expect(alicePage.getByTestId("ticket-number")).toHaveText(MARCUS_OWNED_TICKET);

        await expect(
            alicePage.getByText("Private note: vendor RMA in progress")
        ).toHaveCount(0);

        // Requester sees the public comments section but never an internal notes panel
        await expect(alicePage.getByTestId("requester-ticket-comment-input")).toBeVisible();
        await expect(alicePage.getByTestId("internal-notes-panel")).toHaveCount(0);

        await aliceContext.close();
    });
});
