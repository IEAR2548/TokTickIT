import { test, expect, Page } from "@playwright/test";
import { loginAs } from "../auth-helpers";

// Fixture-provisioning tests (RESP-04/06) do admin-API setup + two logins per
// test — over the 30s default under peak parallel load.
test.setTimeout(90_000);

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

// ---------------------------------------------------------------------------
// RESP-03..06: New Lab 3 screens at all 3 viewports (Issue #37, AC-26).
// Appended after the already-Pass RESP-01/RESP-02 blocks (untouched).
// Every test: correct-role navigation, no horizontal overflow at each width,
// and key controls visible/usable — never depending on a specific ticket id
// (fixtures per project + retry + RUN_ID, same pattern as E2E-01/03/04).
// ---------------------------------------------------------------------------

const VIEWPORTS = [
    { label: "mobile (375px)", width: 375, height: 800 },
    { label: "tablet (768px)", width: 768, height: 1024 },
    { label: "desktop (1280px)", width: 1280, height: 800 },
] as const;

async function expectWithinViewport(page: Page, locator: import("@playwright/test").Locator) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    const vw = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
}

// ---------------------------------------------------------------------------
// RESP-03: Login screen
// ---------------------------------------------------------------------------
for (const vp of VIEWPORTS) {
    test(`RESP-03: Login at ${vp.label} — centered card, visible usable fields, no overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/login");

        const card = page.getByTestId("login-card");
        await expect(card).toBeVisible();

        // Centered: equal-ish margins on both sides of the card
        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        const leftGap = box!.x;
        const rightGap = vp.width - (box!.x + box!.width);
        expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);

        const email = page.getByTestId("login-email");
        const password = page.getByTestId("login-password");
        const submit = page.getByTestId("login-submit");
        await expect(email).toBeVisible();
        await expect(password).toBeVisible();
        await expect(submit).toBeVisible();

        // Usable = fully inside the viewport, not clipped by any edge
        await expectWithinViewport(page, email);
        await expectWithinViewport(page, password);
        await expectWithinViewport(page, submit);

        await expectNoHorizontalOverflow(page);
    });
}

// ---------------------------------------------------------------------------
// RESP-03..06 imports: per-project fixtures need the project/retry tags.
// ---------------------------------------------------------------------------
import { adminCreateUser, provisionRequesterWithTicket, projectTag, RUN_ID, uniqueFixtureSuffix, DEV_PASSWORD } from "../auth-helpers";

// ---------------------------------------------------------------------------
// RESP-04: Change Password screen (needs a mustChangePassword session —
// provisioned per project so the manual login below never heals a seed user).
// ---------------------------------------------------------------------------
test.describe("RESP-04: Change Password responsive breakpoints", () => {
    let fixtureEmail = "";    test.beforeAll(async ({ browser }, testInfo) => {
        // Call-time UUID, NOT RUN_ID + workerIndex + retry: Playwright re-runs
        // this hook for a retried test in the SAME worker process, where RUN_ID
        // is unchanged and workerIndex/retry can both still read 0 — that reused
        // the identical fixture email and 409'd. uniqueFixtureSuffix() is fresh
        // on every invocation, so concurrent workers and in-process re-runs are
        // both safe.
        const tag = `rp${projectTag(testInfo.project.name)}${uniqueFixtureSuffix()}`;
        const page = await browser.newPage();
        await loginAs(page, "alex.morgan@example.com");
        const user = await adminCreateUser(page, {
            name: `E2E Resp04 ${tag}`,
            email: `e2e.resp04.${tag}.${RUN_ID}@example.com`,
            role: "REQUESTER",
            isActive: true,
            initialPassword: DEV_PASSWORD,
        });
        fixtureEmail = user.email;
        await page.close();
    });

    for (const vp of VIEWPORTS) {
        test(`at ${vp.label} — checklist visible, not clipped, Continue visible, no overflow`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });

            // Manual login (not loginAs) — the redirect to /change-password IS the
            // screen under test; loginAs would self-heal the flag and navigate away.
            await page.goto("/login");
            await page.getByTestId("login-email").fill(fixtureEmail);
            await page.getByTestId("login-password").fill(DEV_PASSWORD);
            await Promise.all([
                page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.status() === 200),
                page.getByTestId("login-submit").click(),
            ]);
            await expect(page).toHaveURL(/\/change-password/);

            const ruleLength = page.getByTestId("change-password-rule-length");
            const ruleCase = page.getByTestId("change-password-rule-case");
            const ruleSpecial = page.getByTestId("change-password-rule-number-special");
            const submit = page.getByTestId("change-password-submit");

            await expect(ruleLength).toBeVisible();
            await expect(ruleCase).toBeVisible();
            await expect(ruleSpecial).toBeVisible();
            await expect(submit).toBeVisible();
            for (const el of [ruleLength, ruleCase, ruleSpecial, submit]) {
                await expectWithinViewport(page, el);
            }

            await expectNoHorizontalOverflow(page);
        });
    }
});

// ---------------------------------------------------------------------------
// RESP-05: Staff Ticket Detail (read-only — first result from the staff
// queue API, never a hard-coded ticket id).
// ---------------------------------------------------------------------------
async function openFirstStaffTicket(page: Page) {
    await loginAs(page, "samira.chen@example.com");
    const res = await page.request.get("/api/staff/tickets");
    if (!res.ok()) throw new Error(`RESP-05: staff tickets list failed (${res.status()})`);
    const body = (await res.json()) as { data?: { id: number }[] };
    const first = body.data?.[0];
    if (!first) throw new Error("RESP-05: no tickets in staff queue to open");
    await page.goto(`/staff/tickets/${first.id}`);
    await expect(page.getByTestId("staff-ticket-status-select")).toBeVisible();
}

for (const vp of VIEWPORTS) {
    test(`RESP-05: Staff Ticket Detail at ${vp.label} — grid columns, tappable tabs, no overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await openFirstStaffTicket(page);

        // Header grid: single column on mobile, two columns from tablet up
        const gridColumns = await page.evaluate(() => {
            const grid = document.querySelector(".staff-ticket-header-grid");
            if (!grid) return 0;
            return getComputedStyle(grid).gridTemplateColumns.split(" ").filter((c) => c && c !== "0px").length;
        });
        if (vp.width < 768) {
            expect(gridColumns).toBe(1);
        } else {
            expect(gridColumns).toBe(2);
        }

        // Tabs visible and not overlapping each other horizontally
        const tabPublic = page.getByTestId("tab-public-comments");
        const tabNotes = page.getByTestId("tab-internal-notes");
        const tabAttach = page.getByTestId("tab-attachments");
        await expect(tabPublic).toBeVisible();
        await expect(tabNotes).toBeVisible();
        await expect(tabAttach).toBeVisible();

        // Not overlapping horizontally: tabs may WRAP to a second row on mobile
        // (flex-wrap), which is fine — only tabs on the SAME row must not overlap.
        // All three rects are captured in ONE evaluate so they come from the same
        // layout frame — sequential boundingBox() calls straddle font-swap
        // reflows and produce phantom 2-3px "overlaps".
        const boxes = await page.evaluate(() => {
            const ids = ["tab-public-comments", "tab-internal-notes", "tab-attachments"];
            return ids.map((id) => {
                const el = document.querySelector(`[data-testid='${id}']`);
                if (!el) throw new Error(`missing tab: ${id}`);
                const r = el.getBoundingClientRect();
                return { x: r.x, width: r.width, y: r.y };
            });
        });
        boxes.sort((a, b) => a.y - b.y || a.x - b.x);
        for (let i = 1; i < boxes.length; i++) {
            if (Math.abs(boxes[i].y - boxes[i - 1].y) > 2) continue; // different row
            expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width - 1);
        }

        // Tappable: switching to Internal Notes renders its panel at this viewport
        await tabNotes.click();
        await expect(page.getByTestId("internal-notes-panel")).toBeVisible();

        await expectNoHorizontalOverflow(page);
    });
}

// ---------------------------------------------------------------------------
// RESP-06: Requester Ticket Detail additions (per-project fixture ticket —
// this test clicks "appears resolved", which mutates the ticket).
// ---------------------------------------------------------------------------
for (const vp of VIEWPORTS) {
    test(`RESP-06: Requester Ticket Detail at ${vp.label} — comments + appears-resolved usable, no overflow`, async ({ page }, testInfo) => {
        await loginAs(page, "alex.morgan@example.com");
        const { email, ticketNumber } = await provisionRequesterWithTicket(page, `r6${projectTag(testInfo.project.name)}${testInfo.retry}-${vp.width}`, {
            summary: `RESP-06 ${vp.width}px printer offline after reboot`,
        });

        await loginAs(page, email);
        await page.goto("/my-tickets");
        // Open this fixture's ticket from the requester's own list
        await expect(page.locator("[data-testid='ticket-row']").first()).toBeVisible();
        await page.getByRole("link", { name: ticketNumber }).first().click();
        await expect(page.getByTestId("ticket-number")).toHaveText(ticketNumber);

        const commentInput = page.getByTestId("requester-ticket-comment-input");
        const resolvedBtn = page.getByTestId("requester-ticket-appears-resolved-btn");
        await expect(page.getByTestId("public-comments-panel").or(commentInput)).toBeVisible();
        await expect(commentInput).toBeVisible();
        await expect(resolvedBtn).toBeVisible();

        await expectWithinViewport(page, commentInput);
        await expectWithinViewport(page, resolvedBtn);

        // Tappable: clicking shows the persistent pale-green indicator
        await resolvedBtn.click();
        await expect(page.getByTestId("requester-ticket-appears-resolved-indicator")).toBeVisible();

        await expectNoHorizontalOverflow(page);
    });
}
