import { test, expect } from "@playwright/test";

// Ref: docs/lab-03/ui-spec.md section 2 (Login screen), section 10 (Visual Inspection)
// Ref: docs/lab-03/tests.md VISUAL-01
// Pattern: e2e/lab-02/screenshots.create-ticket.spec.ts — explicit viewport per
// test, full-page capture, sticky header frozen (see screenshots-helpers.ts).
// /login is unauthenticated, so no loginAs is needed here.

const OUT_DIR = "artifacts/lab-03/screenshots/login";

test.describe("Login screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/login");
        await expect(page.getByTestId("login-card")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await page.goto("/login");
        await expect(page.getByTestId("login-card")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto("/login");
        await expect(page.getByTestId("login-card")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Login screenshots — states", () => {
    test("error state (invalid credentials banner)", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto("/login");
        await page.getByTestId("login-email").fill("nobody@example.com");
        await page.getByTestId("login-password").fill("WrongPass@2026!");
        await page.getByTestId("login-submit").click();

        // ui-spec §2: identical generic banner for wrong password / unknown email (AC-05/AC-06)
        await expect(page.getByTestId("login-error")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/error.png`, fullPage: true });
    });
});
