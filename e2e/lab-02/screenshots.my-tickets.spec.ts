import { test, expect } from "@playwright/test";
import { selectFirstRequesterAndGoToMyTickets, freezeStickyHeaderForScreenshot } from "./helpers";
const OUT_DIR = "artifacts/lab-02/screenshots/my-tickets";

test.describe("My Tickets screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await selectFirstRequesterAndGoToMyTickets(page);
        await expect(page.locator(".ticket-list-row").first()).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await selectFirstRequesterAndGoToMyTickets(page);
        await expect(page.locator(".ticket-list-row").first()).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await selectFirstRequesterAndGoToMyTickets(page);
        await expect(page.locator(".ticket-list-row").first()).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("My Tickets screenshots — states", () => {
    test("empty", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });

        // The unfiltered load determines hasEverHadTickets — force it to 0.
        await page.route("**/api/tickets?*", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    tickets: [],
                    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
                }),
            });
        });

        await selectFirstRequesterAndGoToMyTickets(page);
        await expect(page.getByTestId("my-tickets-empty")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/empty.png`, fullPage: true });
    });

    test("no-results", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.route("**/api/tickets?*", async (route) => {
            const url = route.request().url();
            if (url.includes("search=")) {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        tickets: [],
                        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
                    }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        tickets: [
                            {
                                id: 999001,
                                ticketNumber: "TK-20260101-0001",
                                summary: "Placeholder ticket for no-results screenshot",
                                category: { id: 1, name: "Hardware" },
                                relatedSystem: { id: 1, name: "Corporate Laptop" },
                                requestedPriority: "LOW",
                                currentStatus: "NEW",
                                createdAt: "2026-01-01T09:00:00.000Z",
                                updatedAt: "2026-01-01T09:00:00.000Z",
                            },
                        ],
                        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
                    }),
                });
            }
        });

        await selectFirstRequesterAndGoToMyTickets(page);
        await expect(page.getByText("TK-20260101-0001")).toBeVisible();

        await page.getByRole("searchbox", { name: /search/i }).fill("zzz-no-such-ticket");
        await page.keyboard.press("Enter");

        await expect(page.getByTestId("my-tickets-no-results")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/no-results.png`, fullPage: true });
    });

    test("failure", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });

        await page.route("**/api/tickets?*", async (route) => {
            await route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({ error: "INTERNAL_ERROR", message: "Unexpected server error" }),
            });
        });

        await selectFirstRequesterAndGoToMyTickets(page);
        await expect(page.getByTestId("my-tickets-error")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/failure.png`, fullPage: true });
    });
});