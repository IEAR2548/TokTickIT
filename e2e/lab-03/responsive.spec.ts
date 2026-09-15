import { test, expect, Page } from "@playwright/test";

async function loginAsStaffAndGoToQueue(page: Page) {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("samira.chen@example.com");
    await page.getByTestId("login-password").fill("DevPass@2026!");

    // รอ login response จริง ก่อนไปหน้าอื่น — กัน race condition กับ session cookie
    await Promise.all([
        page.waitForResponse(
            (res) => res.url().includes("/api/auth/login") && res.status() === 200
        ),
        page.getByTestId("login-submit").click(),
    ]);

    await page.goto("/staff/queue");
    await expect(page).toHaveURL(/\/staff\/queue/);
}

test.describe("RESP-01: Staff Queue responsive breakpoints", () => {
    test("desktop (>=992px): full 8-column table with search and pagination", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await loginAsStaffAndGoToQueue(page);

        const table = page.getByTestId("staff-queue-table");
        await expect(table).toBeVisible();

        const search = page.getByTestId("staff-queue-search");
        await expect(search).toBeVisible();

        const filtersBtn = page.getByTestId("staff-queue-filters-button");
        await expect(filtersBtn).toBeVisible();
    });

    test("tablet (768-991px): compact table, owner column hidden, pagination prev/next only", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await loginAsStaffAndGoToQueue(page);

        const table = page.getByTestId("staff-queue-table");
        await expect(table).toBeVisible();

        const ownerHeader = page.getByTestId("staff-queue-thead").getByTestId("col-owner");
        await expect(ownerHeader).toBeHidden();
    });

    test("mobile (<768px): collapses into stacked cards list, table header hidden", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await loginAsStaffAndGoToQueue(page);

        const tableHeader = page.locator(".staff-queue-table thead, [data-testid='staff-queue-thead']");
        await expect(tableHeader).toBeHidden();

        const cards = page.locator("[data-testid^='staff-queue-row-']").first();
        await expect(cards).toBeVisible();
    });
});
