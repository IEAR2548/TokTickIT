import { test, expect, Page } from "@playwright/test";
import { loginAs } from "../auth-helpers";

// Ref: docs/lab-03/ui-spec.md section 5 (IT Staff Ticket Queue), section 10
// Ref: docs/lab-03/tests.md VISUAL-03
// Pattern: e2e/lab-02/screenshots.create-ticket.spec.ts. Read-only screen —
// seed data is used directly (no fixtures mutated).

const OUT_DIR = "artifacts/lab-03/screenshots/staff-queue";

async function goToQueue(page: Page) {
    await loginAs(page, "samira.chen@example.com");
    await page.goto("/staff/queue");
    await expect(page.getByTestId("staff-queue-search")).toBeVisible();
}

test.describe("Staff Queue screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToQueue(page);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await goToQueue(page);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await goToQueue(page);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Staff Queue screenshots — states", () => {
    test("filters panel open", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToQueue(page);

        // ui-spec §5: Filters button opens the Status / IT Priority / Owner panel
        await page.getByTestId("staff-queue-filters-button").click();
        await expect(page.locator(".staff-queue-filter-panel")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/filters-open.png`, fullPage: true });
    });

    test("no-results state", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToQueue(page);

        await page.getByTestId("staff-queue-search").fill("ZZZ-NO-SUCH-TICKET");
        await page.getByTestId("staff-queue-search").press("Enter");
        await expect(page.getByTestId("staff-queue-no-results").or(page.getByTestId("staff-queue-empty"))).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/no-results.png`, fullPage: true });
    });
});
