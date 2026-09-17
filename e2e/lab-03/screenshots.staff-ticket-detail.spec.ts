import { test, expect, Page } from "@playwright/test";
import { loginAs, provisionRequesterWithTicket, projectTag } from "../auth-helpers";

// The resolution-summary state test provisions a fixture ticket and drives two
// status transitions through the staff API (admin + staff logins).
test.setTimeout(90_000);

// Ref: docs/lab-03/ui-spec.md section 6 (IT Staff Ticket Detail), section 10
// Ref: docs/lab-03/tests.md VISUAL-04
// Pattern: e2e/lab-02/screenshots.create-ticket.spec.ts. Breakpoint shots are
// read-only (first queue ticket, never a hard-coded id). The resolution-summary
// state shot needs a ticket in IN_PROGRESS / WAITING_FOR_REQUESTER (BR-21), so it
// provisions a dedicated fixture ticket and transitions it via the staff API —
// fixture-only mutation, no seed rows touched.

const OUT_DIR = "artifacts/lab-03/screenshots/staff-ticket-detail";

async function openFirstStaffTicket(page: Page): Promise<Page> {
    await loginAs(page, "samira.chen@example.com");
    const res = await page.request.get("/api/staff/tickets");
    if (!res.ok()) throw new Error(`staff ticket list failed (${res.status()})`);
    const body = (await res.json()) as { data?: { id: number }[] };
    const first = body.data?.[0];
    if (!first) throw new Error("no tickets in staff queue");
    await page.goto(`/staff/tickets/${first.id}`);
    await expect(page.getByTestId("staff-ticket-status-select")).toBeVisible();
    return page;
}

/**
 * BR-21: RESOLVED is only a permitted transition from IN_PROGRESS or
 * WAITING_FOR_REQUESTER — no seed ticket is in those states, so provision a
 * dedicated fixture ticket (per project + retry + run) and drive it to
 * IN_PROGRESS through the staff API before opening the screen.
 */
async function openTicketEligibleForResolve(page: Page, tag: string): Promise<Page> {
    await loginAs(page, "alex.morgan@example.com");
    const { email, ticketNumber } = await provisionRequesterWithTicket(page, tag, {
        summary: `VISUAL ${tag} resolution summary state`,
    });
    void email;

    // Staff session: NEW -> OPEN -> IN_PROGRESS (permitted transitions, BR-21)
    await loginAs(page, "samira.chen@example.com");
    await page.goto("/staff/queue");
    await page.getByTestId("staff-queue-search").fill(ticketNumber);
    await page.getByTestId("staff-queue-search").press("Enter");

    // Click THE fixture's row — never the first row: with fullyParallel, other
    // specs transition their own tickets concurrently, and if the filtered
    // fetch has not applied yet the first row belongs to someone else's ticket
    // (its NEW->OPEN patch would then 400 INVALID_TRANSITION mid-flight).
    const rowLink = page.locator("[data-testid^='staff-queue-row-'] a", { hasText: ticketNumber }).first();
    await expect(rowLink).toBeVisible();
    await rowLink.click();
    await expect(page.getByTestId("staff-ticket-number")).toHaveText(ticketNumber);

    const urlPath = new URL(page.url()).pathname;
    const ticketId = urlPath.match(/\/staff\/tickets\/(\d+)/)?.[1];
    if (!ticketId) throw new Error(`could not parse ticket id from url: ${page.url()}`);

    // Drive the state defensively: read the CURRENT status first and only patch
    // the transitions still needed (parallel-run safe, BR-21-permitted only).
    const detail = await page.request.get(`/api/staff/tickets/${ticketId}`);
    if (!detail.ok()) {
        throw new Error(`staff ticket detail failed (${detail.status()})`);
    }
    const currentStatus = ((await detail.json()) as { data?: { currentStatus?: string } }).data?.currentStatus;

    if (currentStatus === "NEW") {
        const res = await page.request.patch(`/api/staff/tickets/${ticketId}/status`, {
            data: { status: "OPEN" },
        });
        if (!res.ok()) {
            throw new Error(`transition to OPEN failed (${res.status()}): ${await res.text()}`);
        }
    }
    if (currentStatus === "NEW" || currentStatus === "OPEN" || currentStatus === "WAITING_FOR_REQUESTER") {
        const res = await page.request.patch(`/api/staff/tickets/${ticketId}/status`, {
            data: { status: "IN_PROGRESS" },
        });
        if (!res.ok()) {
            throw new Error(`transition to IN_PROGRESS failed (${res.status()}): ${await res.text()}`);
        }
    }

    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-status-select")).toHaveValue("IN_PROGRESS");
    return page;
}

test.describe("Staff Ticket Detail screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openFirstStaffTicket(page);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await openFirstStaffTicket(page);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await openFirstStaffTicket(page);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Staff Ticket Detail screenshots — states", () => {
    test("internal notes tab active", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openFirstStaffTicket(page);

        // ui-spec §6: Internal Notes panel has the distinct --color-warning-bg background
        await page.getByTestId("tab-internal-notes").click();
        await expect(page.getByTestId("internal-notes-panel")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/internal-notes-tab.png`, fullPage: true });
    });

    test("resolution summary revealed on resolve transition", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openTicketEligibleForResolve(
            page,
            `rsv${projectTag(testInfo.project.name)}${testInfo.retry}`
        );

        // BR-22: selecting Resolved reveals the resolution-summary textarea (not saved)
        await page.getByTestId("staff-ticket-status-select").selectOption("RESOLVED");
        await expect(page.getByTestId("staff-ticket-resolution-summary")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/resolution-summary.png`, fullPage: true });
    });
});
