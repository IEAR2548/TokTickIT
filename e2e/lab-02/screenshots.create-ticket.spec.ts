import { test, expect } from "@playwright/test";
import { selectFirstRequesterAndGoToMyTickets, freezeStickyHeaderForScreenshot } from "./helpers";

const OUT_DIR = "artifacts/lab-02/screenshots/create-ticket";

async function goToCreateTicket(page: import("@playwright/test").Page) {
    await selectFirstRequesterAndGoToMyTickets(page);
    await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
    await page.waitForURL(/\/create-ticket/);

    // รอให้ Reference Data โหลดสำเร็จและมี option ให้เลือกเกินกว่าค่าเริ่มต้น
    await expect.poll(async () => page.locator("#category option").count()).toBeGreaterThan(1);
    await expect.poll(async () => page.locator("#relatedSystem option").count()).toBeGreaterThan(1);
}

test.describe("Create Ticket screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToCreateTicket(page);
        await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await goToCreateTicket(page);
        await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await goToCreateTicket(page);
        await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Create Ticket screenshots — states", () => {
    test("validation", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToCreateTicket(page);

        // Submit with nothing filled in — pure client-side validation (BR-07/08/11),
        // no backend call involved.
        await page.getByRole("button", { name: /submit ticket/i }).click();
        await expect(page.getByText(/summary must be between|summary is required/i)).toBeVisible();

        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/validation.png`, fullPage: true });
    });

    test("success", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToCreateTicket(page);

        await page.getByLabel(/^category$/i).selectOption({ index: 1 });
        await page.getByLabel(/related system/i).selectOption({ index: 1 });
        await page.getByLabel(/requested priority/i).selectOption("MEDIUM");
        await page.getByLabel(/^summary$/i).fill("E2E screenshot — success state ticket");
        await page
            .getByLabel(/^description$/i)
            .fill("Created by the Issue #17 visual-inspection screenshot suite. Safe to ignore/delete.");

        await page.getByRole("button", { name: /submit ticket/i }).click();
        await expect(page.getByRole("heading", { name: /ticket created/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /view ticket/i })).toBeVisible();

        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/success.png`, fullPage: true });
    });

    test("failure", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });

        // Only the create POST is mocked — category/related-system GETs still
        // hit the real backend so the form itself renders normally.
        await page.route("**/api/tickets", async (route) => {
            if (route.request().method() === "POST") {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ error: "INTERNAL_ERROR", message: "Unexpected server error" }),
                });
            } else {
                await route.continue();
            }
        });

        await goToCreateTicket(page);
        await page.getByLabel(/^category$/i).selectOption({ index: 1 });
        await page.getByLabel(/related system/i).selectOption({ index: 1 });
        await page.getByLabel(/requested priority/i).selectOption("MEDIUM");
        await page.getByLabel(/^summary$/i).fill("E2E screenshot — failure state ticket");
        await page.getByLabel(/^description$/i).fill("This submission is mocked to fail with a 500 response.");

        await page.getByRole("button", { name: /submit ticket/i }).click();
        await expect(page.getByRole("alert").filter({ hasText: /unexpected server error/i })).toBeVisible();

        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/failure.png`, fullPage: true });
    });
});