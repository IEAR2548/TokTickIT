import { test, expect, Page } from "@playwright/test";
import { selectFirstRequesterAndGoToMyTickets } from "./helpers";

// MIG-02: identity now comes from authenticated sessions (shared helper),
// preserving the original viewport/layout assertions unchanged.

async function selectFirstRequesterAndGoToMyTicketsAt(page: Page, width: number, height: number) {
    await page.setViewportSize({ width, height });
    await selectFirstRequesterAndGoToMyTickets(page);
    await expect(page).toHaveURL(/\/my-tickets/);
}

test.describe("My Tickets — responsive table/card layout", () => {
    test("desktop (>=992px): full 6-column table, all columns visible", async ({ page }) => {
        await selectFirstRequesterAndGoToMyTicketsAt(page, 1280, 800);

        await expect(page.locator(".ticket-list thead")).toBeVisible();
        const headerCells = page.locator(".ticket-list thead th");
        await expect(headerCells).toHaveCount(6);
        await expect(headerCells.nth(5)).toBeVisible();
    });

    test("tablet (768-991px): table stays, but the Updated column is hidden to avoid cramping", async ({ page }) => {
        await selectFirstRequesterAndGoToMyTicketsAt(page, 820, 1180);

        await expect(page.locator(".ticket-list thead")).toBeVisible();
        await expect(page.locator(".ticket-list thead th").nth(5)).toBeHidden();
        await expect(page.locator(".ticket-list thead th").nth(0)).toBeVisible();
    });

    test("mobile (<768px): table collapses into a stacked card list, header hidden", async ({ page }) => {
        await selectFirstRequesterAndGoToMyTicketsAt(page, 375, 800);

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
        await selectFirstRequesterAndGoToMyTicketsAt(page, 1280, 800);
        await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
        await expect(page).toHaveURL(/\/create-ticket/);

        const grid = page.locator(".classification-section");
        const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
        expect(columns.trim().split(/\s+/)).toHaveLength(2);
    });

    test("mobile (<768px): system-info and classification fields collapse to a single column", async ({ page }) => {
        await selectFirstRequesterAndGoToMyTicketsAt(page, 375, 800);
        await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
        await expect(page).toHaveURL(/\/create-ticket/);

        const grid = page.locator(".classification-section");
        const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
        expect(columns.trim().split(/\s+/)).toHaveLength(1);
    });
});