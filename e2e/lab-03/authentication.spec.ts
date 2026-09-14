import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

// Ref: docs/lab-03/specification.md AC-01, AC-02, BR-02, BR-07
// Ref: docs/lab-03/ui-spec.md Section 2, Section 3
// Ref: docs/lab-03/tests.md E2E-01, E2E-02

test.describe("Lab 3 Authentication & Session E2E", () => {
    test.afterAll(() => {
        try {
            execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
        } catch {
            // ignore cleanup errors
        }
    });

    test("E2E-01: Login -> forced password change -> app access (AC-01, AC-02)", async ({ page }) => {
        await page.goto("/login");

        // 1. Log in with user requiring password change (Marcus Vance)
        await page.getByTestId("login-email").fill("marcus.vance@example.com");
        await page.getByTestId("login-password").fill("DevPass@2026!");

        await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes("/api/auth/login") && res.status() === 200
            ),
            page.getByTestId("login-submit").click(),
        ]);

        // 2. AC-02: Must be redirected to /change-password
        await expect(page).toHaveURL(/\/change-password/);
        await expect(page.getByTestId("change-password-current")).toBeVisible();
        await expect(page.getByTestId("change-password-new")).toBeVisible();
        await expect(page.getByTestId("change-password-confirm")).toBeVisible();

        // 3. Normal app screens remain unavailable while mustChangePassword is true (AC-02, BR-02)
        await page.goto("/staff/queue");
        await expect(page).toHaveURL(/\/change-password/);

        await page.goto("/my-tickets");
        await expect(page).toHaveURL(/\/change-password/);

        // 4. Fill current password
        await page.getByTestId("change-password-current").fill("DevPass@2026!");

        // 5. Test password rule checklist (BR-07, UI-03)
        await page.getByTestId("change-password-new").fill("short");
        await expect(page.getByTestId("change-password-rule-length")).not.toHaveClass(/satisfied/);

        await page.getByTestId("change-password-new").fill("NewSecretPass@2026!");
        await expect(page.getByTestId("change-password-rule-length")).toHaveClass(/satisfied/);
        await expect(page.getByTestId("change-password-rule-case")).toHaveClass(/satisfied/);
        await expect(page.getByTestId("change-password-rule-number-special")).toHaveClass(/satisfied/);

        // 6. Confirm password mismatch: submit disabled
        await page.getByTestId("change-password-confirm").fill("MismatchPass@2026!");
        await expect(page.getByTestId("change-password-submit")).toBeDisabled();

        // Match confirm password: submit enabled
        await page.getByTestId("change-password-confirm").fill("NewSecretPass@2026!");
        await expect(page.getByTestId("change-password-submit")).toBeEnabled();

        // 7. Submit password change
        await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes("/api/auth/change-password") && res.status() === 200
            ),
            page.getByTestId("change-password-submit").click(),
        ]);

        // 8. Normal app access is granted (redirected to staff queue for IT_STAFF)
        await expect(page).toHaveURL(/\/staff\/queue/);
        await expect(page.getByTestId("staff-queue-container")).toBeVisible();
    });

    test("E2E-02: Logout -> direct URL access blocked (AC-07)", async ({ page }) => {
        // Navigate to login
        await page.goto("/login");

        // Fill credentials for active user
        await page.getByTestId("login-email").fill("samira.chen@example.com");
        await page.getByTestId("login-password").fill("DevPass@2026!");

        await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes("/api/auth/login") && res.status() === 200
            ),
            page.getByTestId("login-submit").click(),
        ]);

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
