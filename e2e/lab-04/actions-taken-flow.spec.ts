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

// ui-spec.md §6: no page-level horizontal scrollbar. documentElement.scrollWidth is not a valid
// proxy here — Chromium inflates it when a descendant sits in an `overflow-x: auto` container
// (the Actions Taken table wrapper) even though nothing is reachable off-screen.
async function expectNoHorizontalOverflow(page: Page) {
    const measured = await page.evaluate(() => {
        const scrolling = (document.scrollingElement ?? document.documentElement) as HTMLElement;
        window.scrollTo(1000, window.scrollY);
        const scrolledBy = window.scrollX;
        window.scrollTo(0, window.scrollY);

        const viewportWidth = scrolling.clientWidth;
        const clippedByAncestor = (el: HTMLElement): boolean => {
            for (let parent = el.parentElement; parent; parent = parent.parentElement) {
                if (getComputedStyle(parent).overflowX !== "visible") return true;
            }
            return false;
        };
        const offenders: string[] = [];
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if ((rect.right > viewportWidth + 1 || rect.left < -1) && !clippedByAncestor(el)) {
                offenders.push(
                    `${el.tagName.toLowerCase()}.${el.className} ` +
                        `[${el.getAttribute("data-testid") ?? ""}] right=${Math.round(rect.right)} vw=${viewportWidth}`
                );
            }
        });
        return { scrolledBy, viewportWidth, offenders: offenders.slice(0, 8) };
    });
    expect(
        measured.offenders,
        `Elements overflow the viewport at ${measured.viewportWidth}px:\n${measured.offenders.join("\n")}`
    ).toEqual([]);
    expect(measured.scrolledBy, "page-level horizontal scrollbar is present").toBe(0);
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

/**
 * Provision a dedicated Requester + Ticket with NO Actions Taken on it yet, then
 * leave the page logged in as IT Staff. Used by the create/edit flow tests so the
 * Actions Taken list starts empty and only this test's own rows appear.
 */
async function provisionCleanTicket(
    page: Page,
    tag: string
): Promise<{ ticketId: number; ticketNumber: string }> {
    await loginAs(page, ADMIN_EMAIL);
    const { ticketNumber } = await provisionRequesterWithTicket(page, tag, {
        summary: `ATFLOW ${tag} dock stops charging laptops`,
        description: "Fixture ticket for the Actions Taken create-flow E2E.",
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

    test("E2E-01: IT Staff adds an Action Taken with follow-up and sees it in the list (AC-01, FR-04)", async ({ page }, testInfo) => {
        const tag = `e1${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId, ticketNumber } = await provisionCleanTicket(page, tag);

        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await openStaffTicketDetail(page, ticketId);
        await expect(page.getByTestId("staff-ticket-number")).toHaveText(ticketNumber);
        await openActionsTab(page);

        // Starts empty, then the create form opens.
        await expect(page.getByTestId("actions-taken-empty-state")).toBeVisible();
        await page.getByTestId("actions-taken-add-btn").click();
        await expect(page.getByTestId("actions-taken-form")).toBeVisible();

        const description = `Flashed dock firmware to 3.4.1 (${tag})`;
        await page.getByTestId("actions-taken-description-input").fill(description);
        await page.getByTestId("actions-taken-result-input").fill("Dock re-enumerated and stable");
        await page.getByTestId("actions-taken-follow-up-toggle").check();
        await page.getByTestId("actions-taken-follow-up-note-input").fill("Check back with the requester after one week");
        await page.getByTestId("actions-taken-submit-btn").click();

        // Form closes and the new row is visible in the list with its follow-up badge.
        await expect(page.getByTestId("actions-taken-form")).toBeHidden();
        const row = page.locator("[data-testid^='actions-taken-row-']").filter({ hasText: description });
        await expect(row).toHaveCount(1);
        await expect(row).toContainText("Dock re-enumerated and stable");
        await expect(page.locator("[data-testid^='actions-taken-followup-badge-']")).toHaveCount(1);

        // Server-side confirmation: exactly one record, with the follow-up data intact.
        const listRes = await page.request.get(`/api/tickets/${ticketId}/actions`);
        const listBody = (await listRes.json()) as { data?: { description: string; followUpRequired: boolean; followUpNote: string | null }[] };
        const persisted = (listBody.data ?? []).filter((a) => a.description === description);
        expect(persisted).toHaveLength(1);
        expect(persisted[0].followUpRequired).toBe(true);
        expect(persisted[0].followUpNote).toBe("Check back with the requester after one week");
    });

    test("E2E-02: Follow-Up Required with no note is blocked, keeps the form open, then recovers (AC-03)", async ({ page }, testInfo) => {
        const tag = `e2${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId } = await provisionCleanTicket(page, tag);

        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await openStaffTicketDetail(page, ticketId);
        await openActionsTab(page);

        const description = `Follow-up note guard (${tag})`;
        await page.getByTestId("actions-taken-add-btn").click();
        await page.getByTestId("actions-taken-description-input").fill(description);
        await page.getByTestId("actions-taken-result-input").fill("Diagnostics captured");
        await page.getByTestId("actions-taken-follow-up-toggle").check();
        // Deliberately leave the Follow-up Note empty.
        await page.getByTestId("actions-taken-submit-btn").click();

        // Blocked with a field-level error directly under the field; form and values survive.
        await expect(page.locator("#actions-taken-follow-up-note-error")).toHaveText(
            "Required when Follow-Up Required is Yes."
        );
        await expect(page.getByTestId("actions-taken-form")).toBeVisible();
        await expect(page.getByTestId("actions-taken-description-input")).toHaveValue(description);
        await expect(page.getByTestId("actions-taken-result-input")).toHaveValue("Diagnostics captured");

        // Nothing was persisted by the blocked submit.
        const beforeRes = await page.request.get(`/api/tickets/${ticketId}/actions`);
        const beforeBody = (await beforeRes.json()) as { data?: { description: string }[] };
        expect((beforeBody.data ?? []).filter((a) => a.description === description)).toHaveLength(0);

        // Correcting the note completes the flow.
        await page.getByTestId("actions-taken-follow-up-note-input").fill("Check back next week");
        await page.getByTestId("actions-taken-submit-btn").click();
        await expect(page.getByTestId("actions-taken-form")).toBeHidden();
        await expect(
            page.locator("[data-testid^='actions-taken-row-']").filter({ hasText: description })
        ).toHaveCount(1);
    });

    test("E2E-06: a double submission under a slow network creates exactly one Action Taken (AC-10, FR-15, BR-17)", async ({ page }, testInfo) => {
        const tag = `e6${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const { ticketId } = await provisionCleanTicket(page, tag);

        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await openStaffTicketDetail(page, ticketId);
        await openActionsTab(page);

        const description = `Slow-network idempotency check (${tag})`;

        let replayStatus = 0;
        let replayId: number | null = null;
        let originalStatus = 0;
        let originalId: number | null = null;

        await page.route("**/api/tickets/*/actions", async (route) => {
            if (route.request().method() !== "POST") return route.continue();

            const url = route.request().url();
            const body = route.request().postDataJSON();

            // Throttle: the app's own submission is in flight for a while.
            await new Promise((resolve) => setTimeout(resolve, 900));

            // A real double-click sends a second request with a *different* Idempotency-Key, so
            // replay the identical payload with a fresh key inside the 5s fallback window. The
            // server must collapse it to the original record rather than creating a second row.
            const replay = await page.request.post(url, {
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": `e2e-e6-replay-${Date.now()}`,
                },
                data: body,
            });
            replayStatus = replay.status();
            const replayBody = (await replay.json().catch(() => ({}))) as { data?: { id: number } };
            replayId = replayBody.data?.id ?? null;

            // Let the original request complete and hand its response to the app.
            const response = await route.fetch();
            originalStatus = response.status();
            const responseText = await response.text();
            const originalBody = JSON.parse(responseText) as { data?: { id: number } };
            originalId = originalBody.data?.id ?? null;
            await route.fulfill({ response, body: responseText });
        });

        await page.getByTestId("actions-taken-add-btn").click();
        await page.getByTestId("actions-taken-description-input").fill(description);
        await page.getByTestId("actions-taken-result-input").fill("Verified once under slow network");
        const submit = page.getByTestId("actions-taken-submit-btn");
        await submit.click();

        // Client-side guard: the submit control disables itself while the request is in flight.
        await expect(submit).toBeDisabled();

        // The list settles with exactly one row for this description.
        await expect(
            page.locator("[data-testid^='actions-taken-row-']").filter({ hasText: description })
        ).toHaveCount(1);

        // Exactly one record persisted. Exactly one of the two identical submissions created it
        // (201); the other was collapsed onto that same record (200) — proving the required
        // Idempotency-Key + fallback de-dup contract held under the duplicate submission.
        const listRes = await page.request.get(`/api/tickets/${ticketId}/actions`);
        const listBody = (await listRes.json()) as { data?: { id: number; description: string }[] };
        const matching = (listBody.data ?? []).filter((a) => a.description === description);
        expect(matching).toHaveLength(1);
        expect([originalStatus, replayStatus].filter((s) => s === 201)).toHaveLength(1);
        expect([originalStatus, replayStatus].filter((s) => s === 200)).toHaveLength(1);
        expect(originalId).toBe(matching[0].id);
        expect(replayId).toBe(matching[0].id);

        await page.unroute("**/api/tickets/*/actions");
    });
});
