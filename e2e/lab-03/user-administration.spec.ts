import { test, expect, Page } from "@playwright/test";
import {
    loginAs,
    adminCreateUser,
    logoutForReinstall,
    DEV_PASSWORD,
    projectTag,
    RUN_ID,
} from "../auth-helpers";

// Mirrors the safe user shape returned by GET/POST /api/admin/users
// (never includes passwordHash — BR-08/BR-12).
interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    mustChangePassword?: boolean;
}

// Ref: docs/lab-03/specification.md AC-17, AC-18, AC-19, AC-20, AC-21, AC-30, AC-31,
//      BR-29..BR-36 (admin safety rules), FR-20..FR-24
// Ref: docs/lab-03/ui-spec.md Section 7 (Administrator User Management screen,
//      slide-over form, error banner behaviors)
// Ref: docs/lab-03/tests.md E2E-05
//
// Parallel-safety: fullyParallel runs this spec once per browser project against one
// shared backend, and all four tests in this file run concurrently (fullyParallel
// applies WITHIN a file too — one test must never wait on another's writes).
//
//  - User-creating/mutating tests (E2E-05a/b) provision dedicated fixtures with
//    tag = `u5${projectTag}${retry}` + RUN_ID, so no two workers ever touch the
//    same row (same pattern as E2E-01..E2E-04).
//  - Safety-rule tests (E2E-05c/d) only ever attempt FORBIDDEN writes on the seed
//    Administrator — the server rejects them (403) before any write lands, so the
//    shared seed admin is never actually mutated.
//  - NO test ever creates a second active Administrator fixture: with the seed's
//    exactly-one-active-admin baseline that would race E2E-05d's LAST_ACTIVE_ADMIN
//    precondition across workers (see the note in E2E-05d).

const ADMIN_EMAIL = "alex.morgan@example.com";

/** Open /admin/users and wait for the table to have rendered rows. */
async function goToUsers(page: Page): Promise<void> {
    await page.goto("/admin/users");
    await expect(page.getByTestId("admin-user-table")).toBeVisible();
    await expect(page.locator("[data-testid^='admin-user-row-']").first()).toBeVisible();
}

/**
 * Find the row testid for a user by email via the Admin API (the session cookie
 * in `page` must be an Administrator). More reliable than DOM scanning because
 * the fixture user can sit on any page position and any viewport layout.
 */
async function findUserRowTestId(page: Page, email: string): Promise<{ rowTestId: string; user: AdminUser }> {
    const res = await page.request.get("/api/admin/users?search=" + encodeURIComponent(email));
    if (!res.ok()) {
        throw new Error(`findUserRowTestId: list failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as { data: AdminUser[] };
    const user = body.data.find((u) => u.email === email);
    if (!user) {
        throw new Error(`findUserRowTestId: no user with email ${email}`);
    }
    return { rowTestId: `admin-user-row-${user.id}`, user };
}

/** Click the Edit button inside a specific user's row. */
async function openEditForRow(page: Page, rowTestId: string): Promise<void> {
    await page.getByTestId(rowTestId).getByRole("button", { name: "Edit" }).click();
    await expect(page.getByTestId("admin-user-form")).toBeVisible();
}

test.describe("Lab 3 Admin User Administration E2E (E2E-05)", () => {
    // 90s per-test budget: several tests provision fixtures through the Admin API
    // and perform multiple logins + UI round-trips — over the 30s default under
    // peak parallel load (same rationale as E2E-01..E2E-04).
    test.setTimeout(90_000);

    // -----------------------------------------------------------------------
    // E2E-05a — Complete user lifecycle (AC-30, AC-02, AC-01, BR-29/BR-31)
    // -----------------------------------------------------------------------
    test("E2E-05a: create user -> appears in table -> forced password change -> app access (AC-30, AC-02, AC-01)", async ({ page }, testInfo) => {
        const tag = `u5a${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const email = `e2e05.new.${tag}.${RUN_ID}@example.com`;
        const name = `E2E05 New ${tag}`;

        // 1. Admin logs in and opens the screen + Create User slide-over
        await loginAs(page, ADMIN_EMAIL);
        await goToUsers(page);
        await page.getByTestId("admin-create-user-button").click();
        await expect(page.getByTestId("admin-user-form")).toBeVisible();

        // 2. Fill the Create User form (FR-21/BR-29: one role, active, initial password)
        await page.getByTestId("admin-user-form-name").fill(name);
        await page.getByTestId("admin-user-form-email").fill(email);
        await page.getByTestId("admin-user-form-role").selectOption("REQUESTER");
        await page.getByTestId("admin-user-form-password").fill(DEV_PASSWORD);
        // Active is checked by default; assert the state we rely on (AC-30 input)
        await expect(page.getByTestId("admin-user-form-active")).toBeChecked();

        // 3. Submit and wait for the create request to succeed (201)
        await Promise.all([
            page.waitForResponse(
                (res) =>
                    res.url().includes("/api/admin/users") &&
                    res.request().method() === "POST" &&
                    res.status() === 201
            ),
            page.getByTestId("admin-user-form-save").click(),
        ]);
        // Success banner + slide-over closes (ui-spec §7 success state)
        await expect(page.locator(".admin-users-banner-success")).toBeVisible();
        await expect(page.getByTestId("admin-user-form")).toHaveCount(0);

        // 4. User appears in the table with the Requester role badge (AC-30)
        const { rowTestId } = await findUserRowTestId(page, email);
        const row = page.getByTestId(rowTestId);
        await expect(row).toBeVisible();
        await expect(row).toContainText(name);
        await expect(row).toContainText(email);
        await expect(row.getByTestId("badge-role")).toHaveText("Requester");
        await expect(row).toContainText("Active");

        // 5. Admin logs out; the brand-new user logs in (AC-01)
        await page.getByRole("button", { name: /logout/i }).click();
        await expect(page).toHaveURL(/\/login/);

        await page.getByTestId("login-email").fill(email);
        await page.getByTestId("login-password").fill(DEV_PASSWORD);
        await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes("/api/auth/login") && res.status() === 200
            ),
            page.getByTestId("login-submit").click(),
        ]);

        // 6. AC-02/BR-31: created with an initial password -> forced change flow
        await expect(page).toHaveURL(/\/change-password/);

        // 7. Change the password following BR-07 complexity rules
        const NEW_PASSWORD = `Lifecycle@${tag}!A1`;
        await page.getByTestId("change-password-current").fill(DEV_PASSWORD);
        await page.getByTestId("change-password-new").fill(NEW_PASSWORD);
        await expect(page.getByTestId("change-password-rule-length")).toHaveClass(/satisfied/);
        await expect(page.getByTestId("change-password-rule-case")).toHaveClass(/satisfied/);
        await expect(page.getByTestId("change-password-rule-number-special")).toHaveClass(/satisfied/);
        await page.getByTestId("change-password-confirm").fill(NEW_PASSWORD);
        await expect(page.getByTestId("change-password-submit")).toBeEnabled();

        await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes("/api/auth/change-password") && res.status() === 200
            ),
            page.getByTestId("change-password-submit").click(),
        ]);

        // 8. Lands on the Requester dashboard (AC-02 satisfied -> normal app)
        await expect(page).toHaveURL(/\/my-tickets/);
        await expect(
            page
                .getByTestId("my-tickets-loading")
                .or(page.getByTestId("my-tickets-empty"))
                .or(page.getByTestId("my-tickets-no-results"))
        ).toBeVisible();
    });

    // -----------------------------------------------------------------------
    // E2E-05b — Edit user & role modification (AC-31, BR-30)
    // -----------------------------------------------------------------------
    test("E2E-05b: edit name + role REQUESTER -> IT_STAFF -> staff queue on next login (AC-31)", async ({ page }, testInfo) => {
        const tag = `u5b${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const email = `e2e05.edit.${tag}.${RUN_ID}@example.com`;
        const originalName = `E2E05 Edit ${tag}`;
        const editedName = `E2E05 Edited ${tag}`;

        // 0. Provision a dedicated REQUESTER fixture via the Admin API
        await loginAs(page, ADMIN_EMAIL);
        await adminCreateUser(page, {
            name: originalName,
            email,
            role: "REQUESTER",
            isActive: true,
            initialPassword: DEV_PASSWORD,
        });

        // 1. Admin opens the user's row in edit mode
        await goToUsers(page);
        const { rowTestId, user } = await findUserRowTestId(page, email);
        await openEditForRow(page, rowTestId);
        await expect(page.getByTestId("admin-user-form-name")).toHaveValue(originalName);
        await expect(page.getByTestId("admin-user-form-email")).toHaveValue(email);

        // 2. Edit the name and change the role REQUESTER -> IT_STAFF
        await page.getByTestId("admin-user-form-name").fill(editedName);
        await page.getByTestId("admin-user-form-role").selectOption("IT_STAFF");

        await Promise.all([
            page.waitForResponse(
                (res) =>
                    res.url().includes(`/api/admin/users/${user.id}`) &&
                    res.request().method() === "PATCH" &&
                    res.status() === 200
            ),
            page.getByTestId("admin-user-form-save").click(),
        ]);
        await expect(page.locator(".admin-users-banner-success")).toBeVisible();
        await expect(page.getByTestId("admin-user-form")).toHaveCount(0);

        // 3. Table reflects the updated name and role badge (AC-31)
        const row = page.getByTestId(rowTestId);
        await expect(row).toContainText(editedName);
        await expect(row.getByTestId("badge-role")).toHaveText("IT Staff");

        // 4. The updated user logs in and lands on the Staff Queue (AC-01, FR-14)
        await logoutForReinstall(page);
        await loginAs(page, email, DEV_PASSWORD); // heals mustChangePassword in place
        await page.goto("/staff/queue");
        await expect(page).toHaveURL(/\/staff\/queue/);
        await expect(
            page
                .getByTestId("staff-queue-loading")
                .or(page.getByTestId("staff-queue-empty"))
                .or(page.locator("[data-testid^='staff-queue-row-']").first())
        ).toBeVisible();
    });

    // -----------------------------------------------------------------------
    // E2E-05c — Search + role filter + status filter (AC-17, FR-20; D-4)
    // -----------------------------------------------------------------------
    test("E2E-05c: search by keyword and filter by role and status update the table (AC-17)", async ({ page }, testInfo) => {
        const tag = `u5c${projectTag(testInfo.project.name)}${testInfo.retry}`;
        const email = `e2e05.filter.${tag}.${RUN_ID}@example.com`;
        const name = `E2E05 Filter ${tag}`;

        await loginAs(page, ADMIN_EMAIL);

        // Dedicated REQUESTER + IT_STAFF fixtures so assertions never depend on
        // seed-row ordering shared with other workers.
        await adminCreateUser(page, {
            name,
            email,
            role: "REQUESTER",
            isActive: true,
            initialPassword: DEV_PASSWORD,
        });
        // Named so the name-search below matches ONLY the requester fixture:
        // "E2E05 FilterColleague" does not contain the substring "E2E05 Filter {tag}".
        const staffEmail = `e2e05.filterstaff.${tag}.${RUN_ID}@example.com`;
        await adminCreateUser(page, {
            name: `E2E05 FilterColleague ${tag}`,
            email: staffEmail,
            role: "IT_STAFF",
            isActive: true,
            initialPassword: DEV_PASSWORD,
        });

        await goToUsers(page);

        // --- Search by partial NAME (AC-17) --------------------------------
        await page.getByTestId("admin-user-search").fill(`E2E05 Filter ${tag}`);
        await page.getByTestId("admin-user-search").press("Enter");

        const { rowTestId } = await findUserRowTestId(page, email);
        const { rowTestId: staffRowTestId } = await findUserRowTestId(page, staffEmail);
        // Only the matching user is shown: the requester row appears, while the
        // colleague fixture and every seed row drop out (AC-17).
        await expect(page.getByTestId(rowTestId)).toBeVisible();
        await expect(page.getByTestId(staffRowTestId)).toHaveCount(0);

        // --- Search by partial EMAIL fragment ------------------------------
        await page.getByTestId("admin-user-search").fill(`e2e05.filter.${tag}`);
        await page.getByTestId("admin-user-search").press("Enter");
        await expect(page.getByTestId(rowTestId)).toBeVisible();

        // No-results state for a keyword nothing matches (ui-spec §7 empty-search state)
        await page.getByTestId("admin-user-search").fill(`no-such-user-${RUN_ID}`);
        await page.getByTestId("admin-user-search").press("Enter");
        await expect(page.getByTestId("admin-user-list-no-results")).toBeVisible();

        // --- Role filter: IT_STAFF (colleague visible, requester is not) -----
        await page.getByTestId("admin-user-search").fill("");
        await page.getByTestId("admin-user-search").press("Enter");
        await page.getByTestId("admin-user-role-filter").selectOption("IT_STAFF");
        await expect(page.getByTestId(staffRowTestId)).toBeVisible();
        await expect(page.getByTestId(rowTestId)).toHaveCount(0);

        // --- Role filter: REQUESTER (requester visible, colleague is not) ----
        await page.getByTestId("admin-user-role-filter").selectOption("REQUESTER");
        await expect(page.getByTestId(rowTestId)).toBeVisible();
        await expect(page.getByTestId(staffRowTestId)).toHaveCount(0);

        // --- Role filter: ADMINISTRATOR (seed admin only) -------------------
        await page.getByTestId("admin-user-role-filter").selectOption("ADMINISTRATOR");
        const adminRes = await page.request.get("/api/admin/users?role=ADMINISTRATOR");
        const adminList = ((await adminRes.json()) as { data: AdminUser[] }).data;
        for (const admin of adminList) {
            await expect(page.getByTestId(`admin-user-row-${admin.id}`)).toBeVisible();
        }
        await expect(page.getByTestId(rowTestId)).toHaveCount(0);
        await expect(page.getByTestId(staffRowTestId)).toHaveCount(0);

        // --- Back to ALL ROLES: everything is visible again ------------------
        await page.getByTestId("admin-user-role-filter").selectOption("");
        await expect(page.getByTestId(rowTestId)).toBeVisible();
        await expect(page.getByTestId(staffRowTestId)).toBeVisible();

        // --- Status filter: ACTIVE (AC-17, FR-20) ----------------------------
        // Positive side: the dedicated fixtures are active. Negative side: the
        // seed's canonical inactive requester eve.former@example.com — no spec
        // ever mutates that row, so its Inactive state is stable across workers
        // and runs (parallel-safe negative fixture).
        const eveRes = await page.request.get("/api/admin/users?search=eve.former");
        const eveList = ((await eveRes.json()) as { data: AdminUser[] }).data;
        expect(eveList).toHaveLength(1);
        expect(eveList[0].isActive).toBe(false); // precondition
        const eveRowTestId = `admin-user-row-${eveList[0].id}`;

        await page.getByTestId("admin-user-status-filter").selectOption("true");
        await expect(page.getByTestId(rowTestId)).toBeVisible();
        await expect(page.getByTestId(staffRowTestId)).toBeVisible();
        await expect(page.getByTestId(eveRowTestId)).toHaveCount(0);

        // --- Status filter: INACTIVE -----------------------------------------
        await page.getByTestId("admin-user-status-filter").selectOption("false");
        await expect(page.getByTestId(eveRowTestId)).toBeVisible();
        await expect(page.getByTestId(rowTestId)).toHaveCount(0);
        await expect(page.getByTestId(staffRowTestId)).toHaveCount(0);

        // --- Status filter: ALL — both states render again --------------------
        await page.getByTestId("admin-user-status-filter").selectOption("");
        await expect(page.getByTestId(eveRowTestId)).toBeVisible();
        await expect(page.getByTestId(rowTestId)).toBeVisible();
        await expect(page.getByTestId(staffRowTestId)).toBeVisible();

        // --- Status + role combine with AND semantics -------------------------
        await page.getByTestId("admin-user-status-filter").selectOption("true");
        await page.getByTestId("admin-user-role-filter").selectOption("IT_STAFF");
        await expect(page.getByTestId(staffRowTestId)).toBeVisible();
        await expect(page.getByTestId(rowTestId)).toHaveCount(0);
        await expect(page.getByTestId(eveRowTestId)).toHaveCount(0);
    });

    // -----------------------------------------------------------------------
    // E2E-05d — Admin safety rules via UI (AC-20, AC-21, BR-32, BR-33, BR-36)
    // -----------------------------------------------------------------------
    test("E2E-05d: self-deactivation, self-demotion and last-admin protection are blocked in the UI (AC-20, AC-21)", async ({ page }) => {
        // Parallel-safety: NO second Administrator fixture is created anywhere in
        // this file — with fullyParallel another worker could flip it active/
        // inactive mid-test and break the exactly-one-active-admin precondition.
        // The seed database ships exactly one active Administrator
        // (alex.morgan@example.com), which is the AC-21 precondition.
        await loginAs(page, ADMIN_EMAIL);
        await goToUsers(page);

        const { rowTestId, user: admin } = await findUserRowTestId(page, ADMIN_EMAIL);
        const formError = page.getByTestId("admin-user-form-error");

        // --- BR-34/AC-20: self-DEACTIVATION attempt is blocked ---------------
        await openEditForRow(page, rowTestId);
        // UI-11: Deactivate is disabled + tooltip for the caller's own account
        const deactivateBtn = page.getByTestId("admin-user-form-deactivate");
        await expect(deactivateBtn).toBeDisabled();
        await expect(deactivateBtn).toHaveAttribute("title", /cannot deactivate your own account/i);

        // Bypass the disabled button by toggling Active off and saving — the
        // server must reject the change either way (403 before any write).
        await page.getByTestId("admin-user-form-active").uncheck();
        await Promise.all([
            page.waitForResponse(
                (res) =>
                    res.url().includes(`/api/admin/users/${admin.id}`) &&
                    res.request().method() === "PATCH" &&
                    res.status() === 403
            ),
            page.getByTestId("admin-user-form-save").click(),
        ]);
        // Error alert/banner in the UI, change blocked
        await expect(formError).toBeVisible();
        await expect(page.getByTestId("admin-user-form")).toBeVisible(); // panel stays open
        await page.getByTestId("admin-user-form-cancel").click();

        // Verify the account is still active (the write never landed)
        const stillActive = await page.request.get(`/api/admin/users?search=${encodeURIComponent(ADMIN_EMAIL)}`);
        const adminAfterDeactivate = ((await stillActive.json()) as { data: AdminUser[] }).data.find(
            (u) => u.email === ADMIN_EMAIL
        );
        expect(adminAfterDeactivate?.isActive).toBe(true);

        // --- BR-35/AC-20: self-DEMOTION (role away from ADMINISTRATOR) is blocked
        await openEditForRow(page, rowTestId);
        await page.getByTestId("admin-user-form-role").selectOption("REQUESTER");
        await Promise.all([
            page.waitForResponse(
                (res) =>
                    res.url().includes(`/api/admin/users/${admin.id}`) &&
                    res.request().method() === "PATCH" &&
                    res.status() === 403
            ),
            page.getByTestId("admin-user-form-save").click(),
        ]);
        await expect(formError).toBeVisible();
        await expect(page.getByTestId("admin-user-form")).toBeVisible();
        await page.getByTestId("admin-user-form-cancel").click();

        // Role unchanged in the table (badge still "Administrator")
        const adminRow = page.getByTestId(rowTestId);
        await expect(adminRow.getByTestId("badge-role")).toHaveText("Administrator");

        // --- BR-36/AC-21: last active Administrator protection ---------------
        // Alex IS the last active Administrator, so both the Deactivate button
        // (UI-11) and the save-path must refuse. The component's tooltip shows
        // the self-explanation first (isSelf wins when both apply); the safety
        // guarantee is the disabled button plus the server-side rejection below.
        await openEditForRow(page, rowTestId);
        await expect(deactivateBtn).toBeDisabled();
        await expect(deactivateBtn).toHaveAttribute(
            "title",
            /cannot deactivate|last active Administrator/i
        );

        await page.getByTestId("admin-user-form-active").uncheck();
        await page.getByTestId("admin-user-form-role").selectOption("IT_STAFF");
        await Promise.all([
            page.waitForResponse(
                (res) =>
                    res.url().includes(`/api/admin/users/${admin.id}`) &&
                    res.request().method() === "PATCH" &&
                    res.status() === 403
            ),
            page.getByTestId("admin-user-form-save").click(),
        ]);
        await expect(formError).toContainText(/administrator/i);

        // Nothing landed: still the single active Administrator
        await page.getByTestId("admin-user-form-cancel").click();
        const finalRes = await page.request.get(`/api/admin/users?role=ADMINISTRATOR`);
        const finalAdmins = ((await finalRes.json()) as { data: AdminUser[] }).data.filter(
            (u) => u.isActive
        );
        expect(finalAdmins).toHaveLength(1);
        expect(finalAdmins[0].email).toBe(ADMIN_EMAIL);
        await expect(adminRow).toContainText("Active");
    });
});
