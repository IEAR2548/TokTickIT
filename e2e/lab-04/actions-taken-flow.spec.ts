import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, provisionRequesterWithTicket, projectTag } from "../auth-helpers";

// Ref: docs/lab-04/ui-spec.md §3.1 (list/table), §3.4 (responsive), §5 (accessibility), §7 (data-testids)
// Ref: docs/lab-04/specification.md §4 (authorization matrix), FR-01, FR-04
// Ref: docs/lab-04/tests.md RESP-02, A11Y-02
//
// Fixture strategy matches e2e/lab-03: fullyParallel runs every project against one
// shared backend, so each test provisions its own Requester + Ticket through the
// app's own API and records its Actions Taken against that fixture ticket only —
// no seed row is mutated.

const STAFF_EMAIL = "samira.chen@example.com";
const ADMIN_EMAIL = "alex.morgan@example.com";

const FOLLOW_UP_DESCRIPTION = "Flashed dock firmware to 3.4.1";
const PLAIN_DESCRIPTION = "Captured firmware baseline before the update";

async function openActionsTab(page: Page) {
    await page.getByTestId("tab-actions-taken").click();
    await expect(page.getByTestId("actions-taken-panel")).toBeVisible();
}

async function openStaffTicketDetail(page: Page, ticketId: number) {
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-number")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * Provision a dedicated Requester + Ticket, then record two Actions Taken on it as
 * IT Staff (one with Follow-Up Required so a badge renders). Returns the fixture
 * ticket id — the panel is always opened by id, never by list position.
 */
async function provisionTicketWithActions(
    page: Page,
    tag: string
): Promise<{ ticketId: number; ticketNumber: string }> {
    await loginAs(page, ADMIN_EMAIL);
    const { ticketNumber } = await provisionRequesterWithTicket(page, tag, {
        summary: `ATUI ${tag} dock stops charging laptops`,
        description: "Fixture ticket for the Actions Taken panel E2E.",
    });

    await loginAs(page, STAFF_EMAIL);

    const listRes = await page.request.get(`/api/staff/tickets?search=${encodeURIComponent(ticketNumber)}`);
    if (!listRes.ok()) {
        throw new Error(`staff ticket search failed (${listRes.status()}): ${await listRes.text()}`);
    }
    const listBody = (await listRes.json()) as { data?: { id: number; ticketNumber: string }[] };
    const ticket = (listBody.data ?? []).find((t) => t.ticketNumber === ticketNumber);
    if (!ticket) {
        throw new Error(`staff ticket search did not return ${ticketNumber}`);
    }

    const keySuffix = `${tag}-${Date.now()}`;
    const plain = await page.request.post(`/api/tickets/${ticket.id}/actions`, {
        headers: { "Idempotency-Key": `e2e-at-plain-${keySuffix}` },
        data: {
            description: PLAIN_DESCRIPTION,
            result: "Baseline recorded",
            followUpRequired: false,
        },
    });
    if (!plain.ok()) {
        throw new Error(`recording baseline action failed (${plain.status()}): ${await plain.text()}`);
    }

    const followUp = await page.request.post(`/api/tickets/${ticket.id}/actions`, {
        headers: { "Idempotency-Key": `e2e-at-followup-${keySuffix}` },
        data: {
            description: FOLLOW_UP_DESCRIPTION,
            result: "Dock re-enumerated and stable",
            followUpRequired: true,
            followUpNote: "Check back with the requester after one week",
        },
    });
    if (!followUp.ok()) {
        throw new Error(`recording follow-up action failed (${followUp.status()}): ${await followUp.text()}`);
    }

    return { ticketId: ticket.id, ticketNumber };
}

test.describe("Lab 4 Actions Taken panel E2E", () => {
    // Fixture provisioning through the Admin API plus three logins exceeds the 30s
    // default under peak parallel load.
    test.setTimeout(90_000);

    test("RESP-02: the Actions Taken table collapses to a stacked card layout on mobile with no horizontal scroll (§3.4)", async ({ page }, testInfo) => {
        const tag = `r2${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId, ticketNumber } = await provisionTicketWithActions(page, tag);

        await page.setViewportSize({ width: 375, height: 800 });
        await loginAs(page, STAFF_EMAIL);
        await page.goto(`/staff/tickets/${ticketId}`);
        await expect(page.getByTestId("staff-ticket-number")).toHaveText(ticketNumber);
        await openActionsTab(page);

        // Table header is hidden; rows render as stacked cards with labelled fields.
        await expect(page.getByTestId("actions-taken-thead")).toBeHidden();

        const firstRow = page.locator("[data-testid^='actions-taken-row-']").first();
        await expect(firstRow).toBeVisible();
        await expect(firstRow).toContainText(FOLLOW_UP_DESCRIPTION);

        // Each cell carries its own visible field label on mobile.
        await expect(firstRow.locator("[data-label='Performed By']")).toBeVisible();
        await expect(firstRow.locator("[data-label='Follow-up']")).toBeVisible();

        // The follow-up badge is icon + text, never colour alone.
        const badge = page.locator("[data-testid^='actions-taken-followup-badge-']").first();
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText(/follow-up/i);

        await expectNoHorizontalOverflow(page);
    });

    test("RESP-02 (control): desktop keeps the table layout with the Date/Time and Performed By columns", async ({ page }, testInfo) => {
        const tag = `r2d${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId } = await provisionTicketWithActions(page, tag);

        await page.setViewportSize({ width: 1280, height: 800 });
        await loginAs(page, STAFF_EMAIL);
        await openStaffTicketDetail(page, ticketId);
        await openActionsTab(page);

        const table = page.getByTestId("actions-taken-table");
        await expect(table).toBeVisible();
        await expect(page.getByTestId("actions-taken-thead")).toBeVisible();
        await expect(page.getByTestId("actions-taken-thead")).toContainText("Performed By");
        await expect(table).toContainText(FOLLOW_UP_DESCRIPTION);

        await expectNoHorizontalOverflow(page);
    });

    test("A11Y-02: axe scan of Ticket Detail with the Actions Taken panel open reports no critical or serious violations (§5)", async ({ page }, testInfo) => {
        const tag = `a2${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId } = await provisionTicketWithActions(page, tag);

        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await openStaffTicketDetail(page, ticketId);
        await openActionsTab(page);
        await expect(page.getByTestId("actions-taken-table")).toBeVisible();

        // Also scan the create form — it adds labels, a toggle and inline errors.
        await page.getByTestId("actions-taken-add-btn").click();
        await expect(page.getByTestId("actions-taken-form")).toBeVisible();
        await page.getByTestId("actions-taken-follow-up-toggle").check();
        await expect(page.getByTestId("actions-taken-follow-up-note-input")).toBeVisible();

        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();

        const blocking = results.violations.filter(
            (violation) => violation.impact === "critical" || violation.impact === "serious"
        );

        expect(
            blocking.flatMap((violation) =>
                violation.nodes.map((node) =>
                    `${violation.id} (${violation.impact}): ${violation.help} -> ${node.target.join(" ")}\n` +
                    `    ${node.html}\n    ${(node.failureSummary ?? "").replace(/\n/g, "\n    ")}`
                )
            )
        ).toEqual([]);
    });
});
