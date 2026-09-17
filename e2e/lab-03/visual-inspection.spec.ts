import { test, expect, Page } from "@playwright/test";
import { loginAs, provisionRequesterWithTicket, adminCreateUser, logoutForReinstall, projectTag, RUN_ID, DEV_PASSWORD } from "../auth-helpers";

// CHK-07 tests provision their own fixtures (admin API + multiple logins) —
// over the 30s default under peak parallel load.
test.setTimeout(90_000);

// Ref: docs/lab-03/ui-spec.md section 10 — Visual Inspection Checklist (7 items)
// Ref: docs/lab-03/tests.md VISUAL-CHK-01..07 (Issue #37)
//
// Every checklist item is automated here as a Playwright assertion; the
// screenshots in artifacts/lab-03/screenshots/ are the accompanying visual
// evidence for the human-eye pass. Computed styles are compared against probe
// elements that resolve the theme.css custom property — no hex literals in
// this spec (the tokens come from theme.css via var()).

const STAFF_EMAIL = "samira.chen@example.com";
const ADMIN_EMAIL = "alex.morgan@example.com";

/** Computed background-color of the first element matching `selector`. */
async function bgOf(page: Page, selector: string): Promise<string> {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`no element matches ${sel}`);
        return getComputedStyle(el).backgroundColor;
    }, selector);
}

/** Resolve a theme.css custom property to its computed rgb() via a probe element. */
async function tokenBg(page: Page, token: string): Promise<string> {
    return page.evaluate((t) => {
        const probe = document.createElement("div");
        probe.style.display = "none";
        probe.style.backgroundColor = `var(${t})`;
        document.body.appendChild(probe);
        const v = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return v;
    }, token);
}

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

// ---------------------------------------------------------------------------
// VISUAL-CHK-01: role badges render the correct token color per role, text visible
// ---------------------------------------------------------------------------
test.describe("VISUAL-CHK-01: role badge colors per role", () => {
    test("each role badge background equals its theme token and the label text is visible", async ({ page }) => {
        await loginAs(page, ADMIN_EMAIL);
        await page.goto("/admin/users");
        await expect(page.getByTestId("admin-user-table")).toBeVisible();

        const cases = [
            { sel: ".badge-role-requester", token: "--color-pale-green", label: /requester/i },
            { sel: ".badge-role-it_staff", token: "--color-field-readonly-bg", label: /it staff/i },
            { sel: ".badge-role-administrator", token: "--color-warning-bg", label: /administrator/i },
        ];

        for (const c of cases) {
            const badge = page.locator(c.sel).first();
            await expect(badge).toBeVisible();
            await expect(badge).toHaveText(c.label); // text always visible, never color-only (ui-spec §9)
            expect(await bgOf(page, c.sel)).toBe(await tokenBg(page, c.token));
        }
    });
});

// ---------------------------------------------------------------------------
// VISUAL-CHK-02: Internal Notes tab visually distinct from Public Comments
// ---------------------------------------------------------------------------
test.describe("VISUAL-CHK-02: internal notes vs public comments background", () => {
    test("notes panel background is the warning token and differs from the public panel", async ({ page }) => {
        await loginAs(page, STAFF_EMAIL);
        const res = await page.request.get("/api/staff/tickets");
        const body = (await res.json()) as { data?: { id: number }[] };
        await page.goto(`/staff/tickets/${body.data![0].id}`);
        await expect(page.getByTestId("staff-ticket-status-select")).toBeVisible();

        await page.getByTestId("tab-public-comments").click();
        await expect(page.getByTestId("public-comments-panel")).toBeVisible();
        const publicBg = await bgOf(page, "[data-testid='public-comments-panel']");

        await page.getByTestId("tab-internal-notes").click();
        await expect(page.getByTestId("internal-notes-panel")).toBeVisible();
        const notesBg = await bgOf(page, "[data-testid='internal-notes-panel']");

        expect(notesBg).toBe(await tokenBg(page, "--color-warning-bg"));
        expect(notesBg).not.toBe(publicBg);
    });
});

// ---------------------------------------------------------------------------
// VISUAL-CHK-03: editable vs read-only field token pair on Staff Ticket Detail
// ---------------------------------------------------------------------------
test.describe("VISUAL-CHK-03: editable/read-only token pair", () => {
    test("editable selects use the editable-bg token, read-only values the readonly-bg token, and they differ", async ({ page }) => {
        await loginAs(page, STAFF_EMAIL);
        const res = await page.request.get("/api/staff/tickets");
        const body = (await res.json()) as { data?: { id: number }[] };
        await page.goto(`/staff/tickets/${body.data![0].id}`);
        await expect(page.getByTestId("staff-ticket-status-select")).toBeVisible();

        const editableBg = await bgOf(page, "[data-testid='staff-ticket-status-select']");
        const readonlyBg = await bgOf(page, ".staff-ticket-field-value");

        // --color-field-editable-bg and --color-surface are both #FFFFFF in
        // theme.css, so the editable select satisfies either binding.
        expect(editableBg).toBe(await tokenBg(page, "--color-field-editable-bg"));
        expect(readonlyBg).toBe(await tokenBg(page, "--color-field-readonly-bg"));
        expect(editableBg).not.toBe(readonlyBg);
    });
});

// ---------------------------------------------------------------------------
// VISUAL-CHK-04: no "Create Ticket" nav item for IT Staff / Administrator
// ---------------------------------------------------------------------------
test.describe("VISUAL-CHK-04: Create Ticket nav hidden for staff roles", () => {
    test("visible for Requester, absent for IT Staff and Administrator (Decision D-5)", async ({ page }) => {
        // Requester: the link exists (proves the locator is meaningful)
        await loginAs(page, "alice.tanaka@example.com");
        await expect(page.getByRole("link", { name: "Create Ticket", exact: true }).first()).toBeAttached();

        // loginAs returns early when a session is already live, so log out
        // between role switches — otherwise the next assertions would run
        // against the previous session's shell.
        await logoutForReinstall(page);

        // IT Staff: absent
        await loginAs(page, STAFF_EMAIL);
        await expect(page.getByRole("link", { name: "Create Ticket", exact: true })).toHaveCount(0);

        await logoutForReinstall(page);

        // Administrator: absent
        await loginAs(page, ADMIN_EMAIL);
        await expect(page.getByRole("link", { name: "Create Ticket", exact: true })).toHaveCount(0);
    });
});

// ---------------------------------------------------------------------------
// VISUAL-CHK-05 + VISUAL-CHK-06: admin list has no pagination; create form has
// no email-delivery checkbox (Decisions D-4 / D-2)
// ---------------------------------------------------------------------------
test.describe("VISUAL-CHK-05/06: admin screen minimalist-contract items", () => {
    test("CHK-05: user list renders no pagination controls (D-4)", async ({ page }) => {
        await loginAs(page, ADMIN_EMAIL);
        await page.goto("/admin/users");
        await expect(page.getByTestId("admin-user-table")).toBeVisible();

        await expect(page.locator(".admin-users-container .pagination, [data-testid*='pagination']")).toHaveCount(0);
        await expect(
            page.locator(".admin-users-container").getByRole("button", { name: /next|previous/i })
        ).toHaveCount(0);
        await expect(
            page.locator(".admin-users-container").getByRole("link", { name: /next|previous/i })
        ).toHaveCount(0);
    });

    test("CHK-06: create-user form has no email-delivery checkbox (D-2)", async ({ page }) => {
        await loginAs(page, ADMIN_EMAIL);
        await page.goto("/admin/users");
        await page.getByTestId("admin-create-user-button").click();
        const form = page.getByTestId("admin-user-form");
        await expect(form).toBeVisible();

        await expect(form.locator("input[type='checkbox']")).toHaveCount(1); // the Active toggle (ui-spec §7) is the ONLY checkbox
        await expect(form.getByTestId("admin-user-form-active")).toBeAttached();
        await expect(form.getByText(/email delivery|send email|notify/i)).toHaveCount(0);
    });
});

// ---------------------------------------------------------------------------
// VISUAL-CHK-07: all screens usable and non-overflowing at 375px / 850px / 1280px
// (ui-spec §10's exact widths; RESP-03..06 cover the 375/768/1280 set)
// ---------------------------------------------------------------------------
const CHK07_VIEWPORTS = [
    { name: "mobile-375", width: 375, height: 800 },
    { name: "tablet-850", width: 850, height: 800 },
    { name: "desktop-1280", width: 1280, height: 800 },
] as const;

test.describe("VISUAL-CHK-07: no-overflow sweep at 375/850/1280", () => {
    // Parallel-safety: the three viewport tests below run concurrently per
    // project, so there is NO shared fixture — each test provisions its own
    // (tag includes the viewport width). The change-password test needs a
    // user whose mustChangePassword flag is still TRUE; the requester-ticket
    // test needs a user+ticket pair from ONE provisioning call. Sharing one
    // user across tests raced the flag heal and broke the redirect assertion.

    /** Manual login so the redirect to /change-password (the screen under test) happens. */
    async function manualLoginToChangePassword(page: Page, email: string) {
        await page.goto("/login");
        await page.getByTestId("login-email").fill(email);
        await page.getByTestId("login-password").fill(DEV_PASSWORD);
        await Promise.all([
            page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.status() === 200),
            page.getByTestId("login-submit").click(),
        ]);
        await expect(page).toHaveURL(/\/change-password/);
    }

    async function openStaffTicket(page: Page) {
        await loginAs(page, STAFF_EMAIL);
        const res = await page.request.get("/api/staff/tickets");
        const body = (await res.json()) as { data?: { id: number }[] };
        await page.goto(`/staff/tickets/${body.data![0].id}`);
        await expect(page.getByTestId("staff-ticket-status-select")).toBeVisible();
    }

    for (const vp of CHK07_VIEWPORTS) {
        test(`login + change-password at ${vp.name}`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });

            await page.goto("/login");
            await expect(page.getByTestId("login-card")).toBeVisible();
            await expectNoHorizontalOverflow(page);

            // Dedicated still-flagged user for THIS viewport — the login must
            // land on /change-password with the checklist visible.
            await loginAs(page, ADMIN_EMAIL);
            const user = await adminCreateUser(page, {
                name: `Visual CHK7 ${vp.name}`,
                email: `e2e.chk7.${projectTag(testInfo.project.name)}${testInfo.retry}-${vp.width}.${RUN_ID}@example.com`,
                role: "REQUESTER",
                isActive: true,
                initialPassword: DEV_PASSWORD,
            });
            await manualLoginToChangePassword(page, user.email);
            await expect(page.getByTestId("change-password-submit")).toBeVisible();
            await expectNoHorizontalOverflow(page);
        });

        test(`staff queue + staff ticket detail at ${vp.name}`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });

            await loginAs(page, STAFF_EMAIL);
            await page.goto("/staff/queue");
            await expect(page.getByTestId("staff-queue-search")).toBeVisible();
            await expectNoHorizontalOverflow(page);

            await openStaffTicket(page);
            await expectNoHorizontalOverflow(page);
        });

        test(`requester ticket detail + admin users at ${vp.name}`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });

            // One provisioning call -> the email and ticketNumber belong to the
            // SAME user, so this fixture's own list actually contains the ticket.
            const tag = `chk7${projectTag(testInfo.project.name)}${testInfo.retry}-${vp.width}`;
            await loginAs(page, ADMIN_EMAIL);
            const { email, ticketNumber } = await provisionRequesterWithTicket(page, tag, {
                summary: `CHK7 ${tag} overflow sweep fixture`,
            });

            await loginAs(page, email);
            await page.goto("/my-tickets");
            await expect(page.locator("[data-testid='ticket-row']").first()).toBeVisible();
            await page.getByRole("link", { name: ticketNumber }).first().click();
            await expect(page.getByTestId("ticket-number")).toHaveText(ticketNumber);
            await expectNoHorizontalOverflow(page);

            // loginAs returns early when a session is already live — log out
            // before switching to the Administrator session.
            await logoutForReinstall(page);

            await loginAs(page, ADMIN_EMAIL);
            await page.goto("/admin/users");
            await expect(page.getByTestId("admin-user-table")).toBeVisible();
            await expectNoHorizontalOverflow(page);
        });
    }
});
