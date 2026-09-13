import { test, expect } from "@playwright/test";

// Ref: docs/lab-03/specification.md AC-07, BR-09
// Ref: docs/lab-03/tests.md E2E-02
// NOTE on E2E-01: Per Step 1b instructions, E2E-01 is left unwritten and flagged
// until Issue #32 when Requester screens/guards migrate to authenticated session.

test.describe("Lab 3 Authentication & Session E2E", () => {
    // E2E-01 is FLAGGED & DEFERRED to Issue #32
    test.skip("E2E-01: Login -> forced password change -> app access (deferred to #32)", async () => {
        // Deferred until Issue #32 integrates RequesterContext with session auth.
    });

    test("E2E-02: Logout -> direct URL access blocked (AC-07)", async ({ page }) => {
        // Navigate to login
        await page.goto("/login");

        // Fill credentials for active user
        await page.getByTestId("login-email").fill("alice.tanaka@example.com");
        await page.getByTestId("login-password").fill("SuperSecret123!");
        await page.getByTestId("login-submit").click();

        // Expect to be logged in and see logout button
        const logoutBtn = page.getByRole("button", { name: /logout/i });
        await expect(logoutBtn).toBeVisible();

        // Perform logout
        await logoutBtn.click();

        // Should redirect to /login
        await expect(page).toHaveURL(/\/login/);

        // Attempt direct navigation to a protected URL
        await page.goto("/my-tickets");

        // Should be blocked and redirected to /login
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByTestId("login-email")).toBeVisible();
    });
});
