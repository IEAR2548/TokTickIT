import { test, expect, Page } from "@playwright/test";
import { loginAs, adminCreateUser, DEV_PASSWORD, projectTag, RUN_ID, uniqueFixtureSuffix } from "../auth-helpers";

// Ref: docs/lab-03/ui-spec.md section 3 (Change Password screen), section 10
// Ref: docs/lab-03/tests.md VISUAL-02
// Pattern: e2e/lab-02/screenshots.create-ticket.spec.ts.
// The screen is only reachable with a mustChangePassword session, so a dedicated
// fixture user is provisioned per project+retry+run (same pattern as RESP-04)
// instead of mutating any seed account.

const OUT_DIR = "artifacts/lab-03/screenshots/change-password";

async function provisionFixtureAndOpenScreen(page: Page, tag: string): Promise<string> {
    await loginAs(page, "alex.morgan@example.com"); // seed Administrator
    const user = await adminCreateUser(page, {
        name: `Visual ${tag}`,
        email: `e2e.vis.cp.${tag}.${RUN_ID}@example.com`,
        role: "REQUESTER",
        isActive: true,
        initialPassword: DEV_PASSWORD,
    });
    await page.goto("/login"); // admin session stays; /login shows the form
    return user.email;
}

test.describe("Change Password screenshots — breakpoints", () => {
    let fixtureEmail = "";

    test.beforeAll(async ({ browser }, testInfo) => {
        // Call-time UUID: Playwright re-runs this hook for a retried test in the
        // SAME worker process (RUN_ID unchanged, workerIndex/retry can still read
        // 0), which previously recreated the identical email and 409'd. A fresh
        // suffix per invocation is safe across workers and in-process re-runs.
        const page = await browser.newPage();
        fixtureEmail = await provisionFixtureAndOpenScreen(
            page,
            `cp${projectTag(testInfo.project.name)}${uniqueFixtureSuffix()}`
        );
        await page.close();
    });

    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await manualLogin(page, fixtureEmail);
        await expect(page.getByTestId("change-password-submit")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await manualLogin(page, fixtureEmail);
        await expect(page.getByTestId("change-password-submit")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await manualLogin(page, fixtureEmail);
        await expect(page.getByTestId("change-password-submit")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });

    test("state: live checklist validation", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await manualLogin(page, fixtureEmail);
        await expect(page.getByTestId("change-password-submit")).toBeVisible();

        // ui-spec §3: checklist updates live as the user types — capture a
        // partially-satisfied state (length met, case/number-special unmet).
        await page.getByTestId("change-password-current").fill(DEV_PASSWORD);
        await page.getByTestId("change-password-new").fill("onlylower123");
        await expect(page.getByTestId("change-password-rule-length")).toHaveClass(/rule-met|satisfied/);
        await expect(page.getByTestId("change-password-rule-case")).toHaveClass(/rule-unmet/);

        await page.screenshot({ path: `${OUT_DIR}/checklist-validation.png`, fullPage: true });
    });
});

/** Manual login (not loginAs): the redirect to /change-password IS the screen under test. */
async function manualLogin(page: Page, email: string) {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(DEV_PASSWORD);
    await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.status() === 200),
        page.getByTestId("login-submit").click(),
    ]);
    await expect(page).toHaveURL(/\/change-password/);
}
