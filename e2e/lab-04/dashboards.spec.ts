import { test, expect, Page } from "@playwright/test";
import { loginAs, logoutForReinstall, projectTag, provisionRequesterWithTicket } from "../auth-helpers";

// Ref: docs/lab-04/ui-spec.md §1.4 / §2.4 (responsive), §5 (accessibility), §7 (data-testids)
// Ref: docs/lab-04/specification.md FR-12, AC-02, AC-08, AC-11
// Ref: docs/lab-04/tests.md RESP-01, A11Y-01, E2E-05, E2E-07, E2E-10
//
// RESP-01 and A11Y-01 READ the seeded dataset (samira is IT Staff, alice is a Requester with
// Tickets). E2E-05/10 provision their own fixtures because they need two isolated Requesters
// (E2E-05) or a guaranteed fresh "Recent Tickets" row (E2E-10).

const STAFF_EMAIL = "samira.chen@example.com";
const REQUESTER_EMAIL = "alice.tanaka@example.com";
const ADMIN_EMAIL = "alex.morgan@example.com";

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

const STAFF_CARDS = [
    "staff-dashboard-card-new",
    "staff-dashboard-card-open",
    "staff-dashboard-card-in-progress",
    "staff-dashboard-card-waiting",
    "staff-dashboard-card-my-assigned",
] as const;

const REQUESTER_CARDS = [
    "requester-dashboard-card-open",
    "requester-dashboard-card-in-progress",
    "requester-dashboard-card-resolved",
    "requester-dashboard-card-closed",
] as const;

// ui-spec.md §6: the pass condition is "no page-level horizontal scrollbar", and wide tables
// may "scroll within their own container only". So assert the page cannot be scrolled sideways
// and that no element outside a horizontally scrollable ancestor escapes the viewport.
// documentElement.scrollWidth is NOT a valid proxy: Chromium inflates the root scrollWidth when
// a descendant lives inside an `overflow-x: auto` container even though nothing is reachable.
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

/** How many of the given cards share the top row (same vertical offset, within a tolerance). */
async function cardsOnFirstRow(page: Page, testIds: readonly string[]): Promise<number> {
    return page.evaluate((ids) => {
        const tops = ids
            .map((id) => document.querySelector(`[data-testid="${id}"]`))
            .filter((el): el is Element => el !== null)
            .map((el) => Math.round(el.getBoundingClientRect().top));
        if (tops.length === 0) return 0;
        const min = Math.min(...tops);
        return tops.filter((top) => Math.abs(top - min) <= 8).length;
    }, testIds as unknown as string[]);
}

/** Tab forward until every wanted test id has been focused (or the cap is hit). */
async function tabUntilFocused(page: Page, wanted: readonly string[], cap = 60): Promise<string[]> {
    const focused: string[] = [];
    for (let i = 0; i < cap; i++) {
        await page.keyboard.press("Tab");
        const testId = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            return el?.getAttribute("data-testid") ?? null;
        });
        if (testId && !focused.includes(testId)) focused.push(testId);
        if (wanted.every((id) => focused.includes(id))) break;
    }
    return focused;
}

async function expectFocusVisible(page: Page) {
    const visible = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return false;
        try {
            return el.matches(":focus-visible");
        } catch {
            return false;
        }
    });
    expect(visible).toBe(true);
}

test.describe("Lab 4 dashboards E2E", () => {
    test("RESP-01: both dashboards reflow without horizontal scroll at desktop, tablet and mobile widths (§1.4, §2.4)", async ({ page }, testInfo) => {
        const tag = projectTag(testInfo.project.name);

        // --- IT Staff Dashboard -------------------------------------------------
        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAs(page, STAFF_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("staff-dashboard-card-new")).toBeVisible();

        await expectNoHorizontalOverflow(page);
        expect(await cardsOnFirstRow(page, STAFF_CARDS), "desktop staff row").toBe(5);

        await page.setViewportSize({ width: 820, height: 1180 });
        await expect(page.getByTestId("staff-dashboard-card-my-assigned")).toBeVisible();
        await expectNoHorizontalOverflow(page);
        expect(await cardsOnFirstRow(page, STAFF_CARDS), "tablet staff row (3+2)").toBe(3);

        await page.setViewportSize({ width: 375, height: 800 });
        await expect(page.getByTestId("staff-dashboard-card-my-assigned")).toBeVisible();
        await expectNoHorizontalOverflow(page);
        expect(await cardsOnFirstRow(page, STAFF_CARDS), "mobile staff row").toBe(2);

        // --- Requester Dashboard ------------------------------------------------
        await page.setViewportSize({ width: 1280, height: 900 });
        await logoutForReinstall(page);
        await loginAs(page, REQUESTER_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("requester-dashboard-card-open")).toBeVisible();

        await expectNoHorizontalOverflow(page);
        expect(await cardsOnFirstRow(page, REQUESTER_CARDS), "desktop requester row").toBe(4);

        await page.setViewportSize({ width: 820, height: 1180 });
        await expect(page.getByTestId("requester-dashboard-card-closed")).toBeVisible();
        await expectNoHorizontalOverflow(page);
        expect(await cardsOnFirstRow(page, REQUESTER_CARDS), "tablet requester row (2x2)").toBe(2);

        await page.setViewportSize({ width: 375, height: 800 });
        await expect(page.getByTestId("requester-dashboard-card-closed")).toBeVisible();
        await expectNoHorizontalOverflow(page);
        expect(await cardsOnFirstRow(page, REQUESTER_CARDS), "mobile requester row").toBe(2);

        void tag;
    });

    test("A11Y-01: keyboard-only pass through both dashboards reaches cards, rows and quick actions with a visible focus ring (§5)", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });

        // --- IT Staff Dashboard -------------------------------------------------
        await loginAs(page, STAFF_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("staff-dashboard-card-new")).toBeVisible();
        await page.locator("body").click({ position: { x: 2, y: 2 } });

        const staffFocus = await tabUntilFocused(page, [
            "staff-dashboard-card-new",
            "staff-dashboard-card-my-assigned",
            "staff-dashboard-quick-action-search",
            "staff-dashboard-quick-action-queue",
            "staff-dashboard-refresh-btn",
        ]);
        expect(staffFocus).toContain("staff-dashboard-card-new");
        expect(staffFocus).toContain("staff-dashboard-card-my-assigned");
        expect(staffFocus).toContain("staff-dashboard-quick-action-search");
        expect(staffFocus).toContain("staff-dashboard-quick-action-queue");
        expect(staffFocus).toContain("staff-dashboard-refresh-btn");
        await expectFocusVisible(page);

        // A metric card is activatable by keyboard.
        await page.getByTestId("staff-dashboard-card-new").focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/staff\/queue/);

        // --- Requester Dashboard ------------------------------------------------
        await logoutForReinstall(page);
        await loginAs(page, REQUESTER_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("requester-dashboard-card-open")).toBeVisible();
        await page.locator("body").click({ position: { x: 2, y: 2 } });

        const requesterFocus = await tabUntilFocused(page, [
            "requester-dashboard-card-open",
            "requester-dashboard-card-closed",
            "requester-dashboard-quick-action-create",
            "requester-dashboard-quick-action-my-tickets",
        ]);
        expect(requesterFocus).toContain("requester-dashboard-card-open");
        expect(requesterFocus).toContain("requester-dashboard-card-closed");
        expect(requesterFocus).toContain("requester-dashboard-quick-action-create");
        expect(requesterFocus).toContain("requester-dashboard-quick-action-my-tickets");
        await expectFocusVisible(page);

        await page.getByTestId("requester-dashboard-card-open").focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/my-tickets/);
    });

    test("E2E-05: a Requester's dashboard shows only their own data, and direct navigation to another Requester's Ticket is forbidden (AC-02, AC-08)", async ({ page }, testInfo) => {
        const tagA = `e5a${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const tagB = `e5b${projectTag(testInfo.project.name)}${testInfo.retry}`;

        // Two isolated Requesters, each owning exactly one Ticket.
        await loginAs(page, ADMIN_EMAIL);
        const a = await provisionRequesterWithTicket(page, tagA, {
            summary: `E2E-05 Requester A ticket ${tagA}`,
            description: "Owned by Requester A.",
        });
        await loginAs(page, ADMIN_EMAIL);
        const b = await provisionRequesterWithTicket(page, tagB, {
            summary: `E2E-05 Requester B ticket ${tagB}`,
            description: "Owned by Requester B.",
        });

        await loginAs(page, ADMIN_EMAIL);
        const aId = await findTicketId(page, a.ticketNumber);
        const bId = await findTicketId(page, b.ticketNumber);

        // Requester A's dashboard is scoped to A's Tickets only.
        await logoutForReinstall(page);
        await loginAs(page, a.email);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto("/dashboard");
        await expect(page.getByTestId("requester-dashboard-card-open")).toBeVisible();

        const recent = page.getByTestId("requester-dashboard-recent-tickets");
        await expect(recent).toContainText(a.ticketNumber);
        await expect(recent).not.toContainText(b.ticketNumber);
        // Requester B's Ticket must not leak anywhere onto A's dashboard.
        await expect(page.locator("body")).not.toContainText(b.ticketNumber);

        // Direct navigation to Requester B's Ticket is forbidden — presented identically to a
        // missing Ticket so the screen never discloses whose Ticket it is.
        await page.goto(`/tickets/${bId}`);
        await expect(page.getByTestId("ticket-not-found")).toBeVisible();
        await expect(page.getByText("Ticket not found or access denied")).toBeVisible();

        // A's own Ticket still opens normally.
        await page.goto(`/tickets/${aId}`);
        await expect(page.getByTestId("ticket-number")).toHaveText(a.ticketNumber);
    });

    test("E2E-07: the major Lab 1–3 screens still load and function after the Lab 4 deploy (AC-11, FR-13)", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });

        // Requester: My Tickets -> Ticket Detail -> Attachments / Public Comments / Actions Taken.
        await loginAs(page, REQUESTER_EMAIL);
        await page.goto("/my-tickets");
        const myRow = page.locator("[data-testid='ticket-row']").first();
        await expect(myRow).toBeVisible();
        await myRow.getByRole("link").click();
        await expect(page.getByTestId("ticket-number")).toBeVisible();
        await expect(page.getByTestId("attachment-section")).toBeVisible();
        await expect(page.getByTestId("requester-ticket-comment-input")).toBeVisible();
        await expect(page.getByTestId("actions-taken-panel")).toBeVisible();

        // IT Staff: Ticket Queue -> Ticket Detail -> Internal Notes.
        await logoutForReinstall(page);
        await loginAs(page, STAFF_EMAIL);
        await page.goto("/staff/queue");
        await expect(page.getByTestId("staff-queue-table")).toBeVisible();
        const queueRow = page.locator("[data-testid^='staff-queue-row-']").first();
        await expect(queueRow).toBeVisible();
        await queueRow.click();
        await expect(page.getByTestId("staff-ticket-number")).toBeVisible();
        await page.getByTestId("tab-internal-notes").click();
        await expect(page.getByTestId("internal-notes-panel")).toBeVisible();
        await expect(page.getByTestId("staff-ticket-note-input")).toBeVisible();

        // Administrator: user management list.
        await logoutForReinstall(page);
        await loginAs(page, ADMIN_EMAIL);
        await page.goto("/admin/users");
        await expect(page.getByTestId("admin-users-container")).toBeVisible();
        await expect(page.getByTestId("admin-user-table")).toBeVisible();
    });

    test("E2E-10: dashboard metric cards and Recent Tickets rows navigate to the correctly filtered list / detail screen (FR-12)", async ({ page }, testInfo) => {
        const tag = `e10${projectTag(testInfo.project.name)}${testInfo.retry}`;
        await page.setViewportSize({ width: 1280, height: 900 });

        // A fresh fixture Ticket guarantees the Requester dashboard has a Recent Tickets row.
        await loginAs(page, ADMIN_EMAIL);
        const { email, ticketNumber } = await provisionRequesterWithTicket(page, tag, {
            summary: `E2E-10 dashboard navigation ${tag}`,
            description: "Fixture ticket for the dashboard navigation E2E.",
        });

        // --- IT Staff Dashboard -------------------------------------------------
        await loginAs(page, STAFF_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("staff-dashboard-card-new")).toBeVisible();

        // A status metric card opens the Ticket Queue pre-filtered to that status.
        await page.getByTestId("staff-dashboard-card-waiting").click();
        await expect(page).toHaveURL(/\/staff\/queue\?status=WAITING_FOR_REQUESTER/);
        await page.getByTestId("staff-queue-filters-button").click();
        await expect(page.locator("#staff-filter-status")).toHaveValue("WAITING_FOR_REQUESTER");

        // The My Assigned card opens the Queue pre-filtered to ownership by the current user.
        await page.goto("/dashboard");
        await page.getByTestId("staff-dashboard-card-my-assigned").click();
        await expect(page).toHaveURL(/\/staff\/queue\?owner=me/);
        await page.getByTestId("staff-queue-filters-button").click();
        await expect(page.locator("#staff-filter-owner")).toHaveValue("me");

        // A real Recent Tickets row opens that Ticket's Detail screen.
        await page.goto("/dashboard");
        const staffRecent = page.getByTestId("staff-dashboard-recent-tickets");
        const staffRow = staffRecent.locator(".dashboard-recent-row").first();
        await expect(staffRow).toBeVisible();
        const clickedNumber = (await staffRecent.locator(".dashboard-recent-number").first().innerText()).trim();
        await staffRow.click();
        await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
        await expect(page.getByTestId("staff-ticket-number")).toHaveText(clickedNumber);

        // --- Requester Dashboard -------------------------------------------------
        await logoutForReinstall(page);
        await loginAs(page, email);
        await page.goto("/dashboard");
        await expect(page.getByTestId("requester-dashboard-card-open")).toBeVisible();

        // The Resolved card opens My Tickets pre-filtered to that status.
        await page.getByTestId("requester-dashboard-card-resolved").click();
        await expect(page).toHaveURL(/\/my-tickets\?status=RESOLVED/);
        await expect(page.locator('select[aria-label="Current Status"]')).toHaveValue("RESOLVED");

        // The fixture Ticket's Recent Tickets row opens the correct Ticket Detail screen.
        await page.goto("/dashboard");
        const requesterRecent = page.getByTestId("requester-dashboard-recent-tickets");
        await expect(requesterRecent).toContainText(ticketNumber);
        await expect(requesterRecent.locator(".dashboard-recent-row")).toHaveCount(1);
        await requesterRecent.locator(".dashboard-recent-row").click();
        await expect(page).toHaveURL(/\/tickets\/\d+/);
        await expect(page.getByTestId("ticket-number")).toHaveText(ticketNumber);
    });
});
