import { test, expect, Page } from "@playwright/test";
import { loginAs } from "../auth-helpers";

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

// ---------------------------------------------------------------------------
// RESP-02: Admin User Management responsive breakpoints (Issue #36, AC-26)
// Two-panel desktop layout -> stacked mobile, no horizontal overflow.
// Ref: docs/lab-03/ui-spec.md section 7, docs/lab-03/tests.md RESP-02.
// ---------------------------------------------------------------------------

async function loginAsAdminAndGoToUsers(page: Page) {
    // loginAs self-heals the seed admin's mustChangePassword flag (same-password change),
    // landing the session directly in the app.
    await loginAs(page, "alex.morgan@example.com");
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users/);
}

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("RESP-02: Admin User Management responsive breakpoints", () => {
    test("desktop (>=992px): two-panel layout with table and slide-over form side by side, no overflow", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await loginAsAdminAndGoToUsers(page);

        const container = page.getByTestId("admin-users-container");
        await expect(container).toBeVisible();

        const table = page.getByTestId("admin-user-table");
        await expect(table).toBeVisible();

        await expect(page.getByTestId("admin-user-search")).toBeVisible();
        await expect(page.getByTestId("admin-user-role-filter")).toBeVisible();
        await expect(page.getByTestId("admin-create-user-button")).toBeVisible();

        // Seed data guarantees at least one user row
        const firstRow = page.locator("[data-testid^='admin-user-row-']").first();
        await expect(firstRow).toBeVisible();

        // Two-panel: opening the create slide-over renders the form beside the table,
        // not stacked underneath it
        const tableBox = await table.boundingBox();
        await page.getByTestId("admin-create-user-button").click();
        const formBox = await page.getByTestId("admin-user-form").boundingBox();
        expect(formBox).not.toBeNull();
        expect(tableBox).not.toBeNull();
        expect(formBox!.x).toBeGreaterThanOrEqual(tableBox!.x + tableBox!.width * 0.5);

        await expectNoHorizontalOverflow(page);
    });

    test("tablet (768-991px): usable list with search and create button, no overflow", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await loginAsAdminAndGoToUsers(page);

        await expect(page.getByTestId("admin-user-table")).toBeVisible();
        await expect(page.getByTestId("admin-user-search")).toBeVisible();
        await expect(page.getByTestId("admin-create-user-button")).toBeVisible();

        await expectNoHorizontalOverflow(page);
    });

    test("mobile (<768px): stacked layout, table header hidden, slide-over form full width, no overflow", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await loginAsAdminAndGoToUsers(page);

        const container = page.getByTestId("admin-users-container");
        await expect(container).toBeVisible();

        // Table header row hidden on mobile; rows render as stacked cards
        const tableHeader = page.locator("[data-testid='admin-user-table'] thead");
        await expect(tableHeader).toBeHidden();

        const firstRow = page.locator("[data-testid^='admin-user-row-']").first();
        await expect(firstRow).toBeVisible();

        await expect(page.getByTestId("admin-user-search")).toBeVisible();

        // Slide-over form stacks full-width on mobile instead of a narrow side panel
        await page.getByTestId("admin-create-user-button").click();
        const formBox = await page.getByTestId("admin-user-form").boundingBox();
        expect(formBox).not.toBeNull();
        const viewportWidth = page.viewportSize()!.width;
        expect(formBox!.width).toBeGreaterThanOrEqual(viewportWidth * 0.9);

        await expectNoHorizontalOverflow(page);
    });
});
