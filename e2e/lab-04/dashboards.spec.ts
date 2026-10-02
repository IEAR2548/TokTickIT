import { test, expect, Page } from "@playwright/test";
import { loginAs, logoutForReinstall, projectTag } from "../auth-helpers";

// Ref: docs/lab-04/ui-spec.md §1.4 / §2.4 (responsive), §5 (accessibility), §7 (data-testids)
// Ref: docs/lab-04/specification.md FR-12
// Ref: docs/lab-04/tests.md RESP-01, A11Y-01
//
// Both dashboards live at /dashboard and render by role. These tests only READ the seeded
// dataset (samira is IT Staff, alice is a Requester with Tickets), so no fixture provisioning
// is needed and no seed row is mutated.

const STAFF_EMAIL = "samira.chen@example.com";
const REQUESTER_EMAIL = "alice.tanaka@example.com";

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

async function expectNoHorizontalOverflow(page: Page) {
    const measured = await page.evaluate(() => {
        const doc = document.documentElement;
        const amount = doc.scrollWidth - doc.clientWidth;
        const offenders: string[] = [];
        if (amount > 1) {
            const viewportWidth = doc.clientWidth;
            doc.querySelectorAll<HTMLElement>("body *").forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.right > viewportWidth + 1 || rect.left < -1) {
                    offenders.push(
                        `${el.tagName.toLowerCase()}.${el.className} ` +
                            `[${el.getAttribute("data-testid") ?? ""}] right=${Math.round(rect.right)} vw=${viewportWidth}`
                    );
                }
            });
        }
        return { amount, offenders: offenders.slice(0, 8) };
    });
    expect(measured.amount, `Overflowing elements:\n${measured.offenders.join("\n")}`).toBeLessThanOrEqual(1);
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
});
