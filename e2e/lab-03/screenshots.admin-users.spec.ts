import { test, expect } from "@playwright/test";
import { loginAs } from "../auth-helpers";

// Ref: docs/lab-03/ui-spec.md section 7 (Administrator User Management), section 10
// Ref: docs/lab-03/tests.md VISUAL-06
// Pattern: e2e/lab-02/screenshots.create-ticket.spec.ts. The create panel is
// only OPENED, never submitted — no data is mutated.

const OUT_DIR = "artifacts/lab-03/screenshots/admin-users";

async function goToUsers(page: Page) {
    await loginAs(page, "alex.morgan@example.com");
    await page.goto("/admin/users");
    await expect(page.getByTestId("admin-user-table")).toBeVisible();
}

test.describe("Admin User Management screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToUsers(page);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await goToUsers(page);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await goToUsers(page);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Admin User Management screenshots — states", () => {
    test("create-user panel open", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToUsers(page);

        // ui-spec §7: "+ Create User" opens the right-hand slide-over form
        await page.getByTestId("admin-create-user-button").click();
        await expect(page.getByTestId("admin-user-form")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/create-panel-open.png`, fullPage: true });
    });
});
