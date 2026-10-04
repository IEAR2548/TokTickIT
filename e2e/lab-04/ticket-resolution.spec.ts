import { test, expect, Page } from "@playwright/test";
import { loginAs, logoutForReinstall, projectTag, provisionRequesterWithTicket, DEV_PASSWORD } from "../auth-helpers";

// Ref: docs/lab-04/tests.md E2E-03, E2E-04, E2E-08, E2E-09
// Ref: docs/lab-04/specification.md §5.1 (matrix), §5.2 (resolution gate), §10.1 (error ordering),
//      AC-04, AC-05, AC-06, AC-14, AC-16, BR-14, BR-15, BR-16
// Ref: docs/lab-04/ui-spec.md §4 (status control), §4.2 (advisory looks-resolved)
//
// Fixture strategy matches the rest of e2e/lab-04: fullyParallel runs every project against one
// shared backend, so each test provisions its own Requester + Ticket and only ever mutates that
// fixture ticket. Transition setup steps use the app's own API; the behaviour under test (the
// status control and the looks-resolved control) is driven through the UI.

const STAFF_EMAIL = "samira.chen@example.com";
const ADMIN_EMAIL = "alex.morgan@example.com";

/** Confirm-required targets per ui-spec §4.1. */
const CONFIRM_REQUIRED = new Set(["RESOLVED", "CLOSED", "CANCELLED"]);

/** Badge label rendered by client/src/components/Badge.tsx for each enum value. */
const STATUS_BADGE_LABEL: Record<string, string> = {
    NEW: "NEW",
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    WAITING_FOR_REQUESTER: "Waiting for Requester",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    REOPENED: "Reopened",
    CANCELLED: "Cancelled",
};

async function findTicketId(page: Page, ticketNumber: string): Promise<number> {
    const res = await page.request.get(`/api/staff/tickets?search=${encodeURIComponent(ticketNumber)}`);
    if (!res.ok()) {
        throw new Error(`staff ticket search failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as { data?: { id: number; ticketNumber: string }[] };
    const ticket = (body.data ?? []).find((t) => t.ticketNumber === ticketNumber);
    if (!ticket) {
        throw new Error(`staff ticket search did not return ${ticketNumber}`);
    }
    return ticket.id;
}

/**
 * Provision a dedicated Requester + Ticket, then leave the page logged in as IT Staff.
 * Returns the fixture Requester's email so a test can switch to their session later.
 */
async function provisionTicket(
    page: Page,
    tag: string
): Promise<{ requesterEmail: string; ticketId: number; ticketNumber: string }> {
    await loginAs(page, ADMIN_EMAIL);
    const { email, ticketNumber } = await provisionRequesterWithTicket(page, tag, {
        summary: `TRES ${tag} laptop will not charge on the docking station`,
        description: "Fixture ticket for the status workflow E2E.",
    });

    await loginAs(page, STAFF_EMAIL);
    const ticketId = await findTicketId(page, ticketNumber);

    return { requesterEmail: email, ticketId, ticketNumber };
}

/** Drive the staff status control through the UI, handling the confirmation step. */
async function applyStatusUI(page: Page, target: string, summary?: string): Promise<void> {
    await page.getByTestId("staff-ticket-status-select").selectOption(target);

    if (CONFIRM_REQUIRED.has(target)) {
        const dialog = page.getByTestId("ticket-status-confirm-dialog");
        await expect(dialog).toBeVisible();
        if (summary !== undefined) {
            await page.getByTestId("ticket-status-resolution-summary-input").fill(summary);
        }
        await page.getByTestId("ticket-status-confirm-btn").click();
        await expect(dialog).toBeHidden();
    }

    await expect(page.getByTestId("ticket-status-badge")).toHaveText(STATUS_BADGE_LABEL[target]);
}

/** Transition a Ticket via the API from the current (already authenticated) session. */
async function transitionViaApi(page: Page, ticketId: number, status: string, summary?: string): Promise<void> {
    const detailRes = await page.request.get(`/api/staff/tickets/${ticketId}`);
    if (!detailRes.ok()) {
        throw new Error(`could not read ticket ${ticketId} (${detailRes.status()})`);
    }
    const detail = (await detailRes.json()) as { data: { updatedAt: string } };

    const res = await page.request.patch(`/api/tickets/${ticketId}/status`, {
        data: {
            status,
            ...(summary !== undefined ? { resolutionSummary: summary } : {}),
            expectedUpdatedAt: detail.data.updatedAt,
        },
    });
    if (!res.ok()) {
        throw new Error(`transition to ${status} failed (${res.status()}): ${await res.text()}`);
    }
}

/** Swap the page's session to IT Staff via the API (faster than a UI logout/login round trip). */
async function becomeStaffViaApi(page: Page): Promise<void> {
    await page.request.post("/api/auth/logout");
    const res = await page.request.post("/api/auth/login", {
        data: { email: STAFF_EMAIL, password: DEV_PASSWORD },
    });
    if (!res.ok()) {
        throw new Error(`staff API login failed (${res.status()}): ${await res.text()}`);
    }
}

test.describe("Lab 4 ticket resolution workflow E2E", () => {
    test.setTimeout(120_000);

    test("E2E-03: IT Staff drives New→Open→In Progress→Resolved→Closed, then a crafted invalid transition is rejected as 400 INVALID_TRANSITION (AC-04, AC-05)", async ({ page }, testInfo) => {
        const tag = `e3${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId, ticketNumber } = await provisionTicket(page, tag);

        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await page.goto(`/staff/tickets/${ticketId}`);
        await expect(page.getByTestId("staff-ticket-number")).toHaveText(ticketNumber);

        // Full valid path through the UI, including the two confirmation steps.
        await applyStatusUI(page, "OPEN");
        await applyStatusUI(page, "IN_PROGRESS");
        await applyStatusUI(page, "RESOLVED", "Replaced the faulty dock cable; charging verified.");
        await applyStatusUI(page, "CLOSED", "Confirmed with the requester; closing the ticket.");

        // Crafted invalid transition: Closed → In Progress is not a matrix edge (§5.1). The
        // expectedUpdatedAt is current, so this must be INVALID_TRANSITION (400) — never the
        // STALE_UPDATE (409) branch.
        const detail = (await (await page.request.get(`/api/staff/tickets/${ticketId}`)).json()) as {
            data: { updatedAt: string };
        };
        const crafted = await page.request.patch(`/api/tickets/${ticketId}/status`, {
            data: { status: "IN_PROGRESS", expectedUpdatedAt: detail.data.updatedAt },
        });

        expect(crafted.status()).toBe(400);
        const craftedBody = (await crafted.json()) as { error?: { code?: string } };
        expect(craftedBody.error?.code).toBe("INVALID_TRANSITION");
        expect(craftedBody.error?.code).not.toBe("STALE_UPDATE");

        // The status is unchanged by the rejected request.
        const after = (await (await page.request.get(`/api/staff/tickets/${ticketId}`)).json()) as {
            data: { currentStatus: string };
        };
        expect(after.data.currentStatus).toBe("CLOSED");
    });

    test("E2E-04: a Requester marks \"looks resolved\" — flag set, status unchanged, IT Staff sees the same status (AC-06)", async ({ page }, testInfo) => {
        const tag = `e4${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { requesterEmail, ticketId, ticketNumber } = await provisionTicket(page, tag);

        // Move New → Open so the flag is attached to an active (non-terminal) status.
        await transitionViaApi(page, ticketId, "OPEN");

        // Requester marks the advisory flag; the status badge must not move.
        await logoutForReinstall(page);
        await loginAs(page, requesterEmail);
        await page.goto(`/tickets/${ticketId}`);
        await expect(page.getByTestId("ticket-number")).toHaveText(ticketNumber);
        await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");

        await page.getByTestId("requester-ticket-appears-resolved-btn").click();
        await expect(page.getByTestId("requester-ticket-appears-resolved-indicator")).toBeVisible();
        await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");

        // IT Staff's dashboard still reports the Ticket in its prior status (read immediately
        // after the flag write, before the global "recent tickets" ordering can drift under the
        // parallel suite). The dashboard endpoint is exactly what the Staff Dashboard renders.
        await becomeStaffViaApi(page);
        const dashboard = (await (await page.request.get("/api/dashboard/staff")).json()) as {
            data: { recentTickets: { ticketNumber: string; status: string }[] };
        };
        const row = (dashboard.data.recentTickets ?? []).find((t) => t.ticketNumber === ticketNumber);
        expect(row, "fixture ticket should be in the Staff dashboard's recent list").toBeTruthy();
        expect(row?.status).toBe("OPEN");

        // And on the deterministic Staff Ticket Detail screen, the advisory flag is surfaced
        // while the status stays Open.
        await loginAs(page, STAFF_EMAIL);
        await page.goto(`/staff/tickets/${ticketId}`);
        await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");
        await expect(page.getByTestId("staff-ticket-appears-resolved-badge")).toBeVisible();
    });

    test("E2E-08: reopening a Closed Ticket clears the Requester's looks-resolved flag (AC-14, BR-16)", async ({ page }, testInfo) => {
        const tag = `e8${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { requesterEmail, ticketId, ticketNumber } = await provisionTicket(page, tag);

        // Staff opens the Ticket.
        await transitionViaApi(page, ticketId, "OPEN");

        // Requester marks "looks resolved" while it is active.
        await logoutForReinstall(page);
        await loginAs(page, requesterEmail);
        await page.goto(`/tickets/${ticketId}`);
        await page.getByTestId("requester-ticket-appears-resolved-btn").click();
        await expect(page.getByTestId("requester-ticket-appears-resolved-indicator")).toBeVisible();

        // Staff resolves, closes, then reopens.
        await logoutForReinstall(page);
        await loginAs(page, STAFF_EMAIL);
        await transitionViaApi(page, ticketId, "IN_PROGRESS");
        await transitionViaApi(page, ticketId, "RESOLVED", "Fixed the dock; charging verified.");
        await transitionViaApi(page, ticketId, "CLOSED", "Confirmed with the requester.");
        await transitionViaApi(page, ticketId, "REOPENED");

        // Requester's next view: the flag is cleared — the unresolved control is back and the
        // resolved indicator is gone.
        await logoutForReinstall(page);
        await loginAs(page, requesterEmail);
        await page.goto(`/tickets/${ticketId}`);
        await expect(page.getByTestId("ticket-number")).toHaveText(ticketNumber);
        await expect(page.getByTestId("requester-ticket-appears-resolved-btn")).toBeVisible();
        await expect(page.getByTestId("requester-ticket-appears-resolved-indicator")).toHaveCount(0);

        // Server-side confirmation: the flag reads back false and the status is Reopened.
        await becomeStaffViaApi(page);
        const detail = (await (await page.request.get(`/api/staff/tickets/${ticketId}`)).json()) as {
            data: { appearsResolved: boolean; currentStatus: string };
        };
        expect(detail.data.appearsResolved).toBe(false);
        expect(detail.data.currentStatus).toBe("REOPENED");
    });

    test("E2E-09: a retried already-applied status change resyncs silently — no conflict banner and no error toast (AC-16)", async ({ page }, testInfo) => {
        const tag = `e9${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId } = await provisionTicket(page, tag);

        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await page.goto(`/staff/tickets/${ticketId}`);
        await expect(page.getByTestId("staff-ticket-number")).toBeVisible();

        // Intercept the first status change and replay the *identical* request (same
        // expectedUpdatedAt, same target) so the server has already applied it. The second call
        // returns 409 STALE_UPDATE with data.current.status equal to the requested status — the
        // duplicate response the UI must absorb silently.
        let firstStatus = 0;
        let retryStatus = 0;
        let retryCode = "";
        let retryCurrentStatus = "";

        await page.route("**/api/tickets/*/status", async (route) => {
            if (route.request().method() !== "PATCH") return route.continue();

            const first = await route.fetch();
            firstStatus = first.status();

            await new Promise((resolve) => setTimeout(resolve, 250));

            const retry = await route.fetch();
            retryStatus = retry.status();
            const retryBody = (await retry.json().catch(() => ({}))) as {
                error?: { code?: string; data?: { current?: { status?: string } } };
            };
            retryCode = retryBody.error?.code ?? "";
            retryCurrentStatus = retryBody.error?.data?.current?.status ?? "";

            // Hand the duplicate (409) response to the app.
            await route.fulfill({
                status: retry.status(),
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(retryBody),
            });
        });

        await applyStatusUI(page, "OPEN");

        expect(firstStatus).toBe(200);
        expect(retryStatus).toBe(409);
        expect(retryCode).toBe("STALE_UPDATE");
        expect(retryCurrentStatus).toBe("OPEN");

        // Silently resynced: the badge reflects the requested status, and neither the
        // genuine-conflict banner nor an error toast is shown.
        await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");
        await expect(page.getByTestId("ticket-status-conflict-banner")).toHaveCount(0);
        await expect(page.getByTestId("ticket-status-error-toast")).toHaveCount(0);

        // The transition was applied exactly once on the server.
        const detail = (await (await page.request.get(`/api/staff/tickets/${ticketId}`)).json()) as {
            data: { currentStatus: string };
        };
        expect(detail.data.currentStatus).toBe("OPEN");

        await page.unroute("**/api/tickets/*/status");
    });
});
