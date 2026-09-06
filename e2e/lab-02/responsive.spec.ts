import { test, expect, Page } from "@playwright/test";

async function selectFirstRequesterAndGoToMyTickets(page: Page) {
    await page.goto("/select-requester");
    await page.getByLabel(/select requester/i).selectOption({ index: 1 }); // index 0 is the "Choose a requester…" placeholder
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/my-tickets/);
}

test.describe("My Tickets — responsive table/card layout", () => {
    test("desktop (>=992px): full 6-column table, all columns visible", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await selectFirstRequesterAndGoToMyTickets(page);

        await expect(page.locator(".ticket-list thead")).toBeVisible();
        const headerCells = page.locator(".ticket-list thead th");
        await expect(headerCells).toHaveCount(6);
        await expect(headerCells.nth(5)).toBeVisible();
    });

    test("tablet (768-991px): table stays, but the Updated column is hidden to avoid cramping", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await selectFirstRequesterAndGoToMyTickets(page);

        await expect(page.locator(".ticket-list thead")).toBeVisible();
        await expect(page.locator(".ticket-list thead th").nth(5)).toBeHidden();
        await expect(page.locator(".ticket-list thead th").nth(0)).toBeVisible();
    });

    test("mobile (<768px): table collapses into a stacked card list, header hidden", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await selectFirstRequesterAndGoToMyTickets(page);

        await expect(page.locator(".ticket-list thead")).toBeHidden();
        await expect(page.locator(".ticket-list")).toHaveCSS("display", "block");

        const firstRow = page.locator(".ticket-list-row").first();
        await expect(firstRow).toBeVisible();
        await expect(firstRow).toHaveCSS("display", "block");
    });
});

test.describe("Create Ticket — responsive form grid", () => {
    test("desktop/tablet (>=768px): system-info and classification fields render as a 2-column grid", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await selectFirstRequesterAndGoToMyTickets(page);
        await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
        await expect(page).toHaveURL(/\/create-ticket/);

        const grid = page.locator(".classification-section");
        const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
        expect(columns.trim().split(/\s+/)).toHaveLength(2);
    });

    test("mobile (<768px): system-info and classification fields collapse to a single column", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await selectFirstRequesterAndGoToMyTickets(page);
        await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
        await expect(page).toHaveURL(/\/create-ticket/);

        const grid = page.locator(".classification-section");
        const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
        expect(columns.trim().split(/\s+/)).toHaveLength(1);
    });
});