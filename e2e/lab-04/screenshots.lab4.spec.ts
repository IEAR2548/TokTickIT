import fs from "fs";
import { test, expect, Page } from "@playwright/test";
import { loginAs, logoutForReinstall, provisionRequesterWithTicket } from "../auth-helpers";

// Ref: docs/lab-04/tests.md §6 (ui-spec Visual & Accessibility Checklist), STYLE-01/STYLE-03
// Ref: docs/lab-04/ui-spec.md §1, §2, §3, §4, §6, §7
//
// Captures the desktop/tablet/mobile screenshots for every Lab 4 screen under
// artifacts/lab-04/screenshots/ and sweeps those screens for console errors, unexpected
// links, placeholder-looking text and horizontal overflow. Run with --project=desktop:
// the test drives all three viewports itself.

const STAFF_EMAIL = "samira.chen@example.com";
const ADMIN_EMAIL = "alex.morgan@example.com";
const REQUESTER_EMAIL = "alice.tanaka@example.com";

const ROOT = "artifacts/lab-04/screenshots";
// ui-spec.md §6 names the three widths the checklist is verified at.
const VIEWPORTS = [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 800 },
] as const;

const KNOWN_ROUTES = [
    "/",
    "/dashboard",
    "/create-ticket",
    "/my-tickets",
    "/staff/queue",
    "/admin/users",
    "/login",
    "/change-password",
];
const KNOWN_PREFIXES = ["/tickets/", "/staff/tickets/"];

function collectPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const url = msg.location()?.url ?? "";
        // The app probes /api/auth/me on load; an unauthenticated session legitimately gets a
        // 401 that the browser reports as a console error. That is expected, not a defect.
        if (url.includes("/api/auth/me")) return;
        errors.push(`console: ${msg.text()} @ ${url}`);
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    return errors;
}

// ui-spec.md §6: "No horizontal overflow — no page-level horizontal scrollbar appears at
// 375 px, 768 px, or 1280 px; wide tables scroll within their own container only."
// So the pass condition is that the *page* cannot be scrolled sideways. Comparing
// documentElement.scrollWidth against its clientWidth is not a valid proxy: Chromium reports
// an inflated root scrollWidth when a descendant sits inside an `overflow-x: auto` container
// (here, the Actions Taken table), even though nothing is actually reachable off-screen.
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
    const measured = await page.evaluate(() => {
        const scrolling = (document.scrollingElement ?? document.documentElement) as HTMLElement;

        // Can the page actually be scrolled horizontally?
        window.scrollTo(1000, window.scrollY);
        const scrolledBy = window.scrollX;
        window.scrollTo(0, window.scrollY);

        const viewportWidth = scrolling.clientWidth;

        // Elements that reach past the viewport AND are not tucked inside a horizontally
        // scrollable ancestor are genuine page-level overflow.
        const clippedByAncestor = (el: HTMLElement): boolean => {
            for (let parent = el.parentElement; parent; parent = parent.parentElement) {
                const ox = getComputedStyle(parent).overflowX;
                if (ox !== "visible") return true;
            }
            return false;
        };
        const offenders: string[] = [];
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if ((rect.right > viewportWidth + 1 || rect.left < -1) && !clippedByAncestor(el)) {
                offenders.push(
                    `${el.tagName.toLowerCase()}.${el.className} ` +
                        `[${el.getAttribute("data-testid") ?? ""}] ` +
                        `left=${Math.round(rect.left)} right=${Math.round(rect.right)} vw=${viewportWidth}`
                );
            }
        });

        return { scrolledBy, viewportWidth, offenders: offenders.slice(0, 20) };
    });

    expect(
        measured.offenders,
        `Elements overflow the viewport at ${measured.viewportWidth}px:\n${measured.offenders.join("\n")}`
    ).toEqual([]);
    expect(measured.scrolledBy, "page-level horizontal scrollbar is present").toBe(0);
}

async function expectKnownLinks(page: Page): Promise<void> {
    const hrefs = await page
        .locator("a[href^='/']")
        .evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
    for (const href of hrefs) {
        const path = href.split("?")[0].split("#")[0];
        const ok = KNOWN_ROUTES.includes(path) || KNOWN_PREFIXES.some((p) => path.startsWith(p));
        expect(ok, `unexpected link target: ${href}`).toBe(true);
    }
}

async function expectCleanVisibleText(page: Page): Promise<void> {
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\bundefined\b/i);
    expect(body).not.toMatch(/\bNaN\b/);
    expect(body).not.toMatch(/\b(TODO|FIXME|TBD|lorem ipsum)\b/i);
}

function ensureDirs(): void {
    for (const dir of ["staff-dashboard", "requester-dashboard", "actions-taken"]) {
        fs.mkdirSync(`${ROOT}/${dir}`, { recursive: true });
    }
}

/**
 * Freezes the sticky app-shell header (position: static) and scrolls to top
 * before fullPage capture — fullPage screenshots otherwise repeat/overlay the
 * fixed header in the middle of stitched images (see Lab 2 ai-use.md).
 */
async function captureFullPage(page: Page, path: string): Promise<void> {
    await page.addStyleTag({ content: ".app-shell-header { position: static !important; }" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path, fullPage: true });
}

test.describe("Lab 4 screenshots + visual sweep", () => {
    test.setTimeout(120_000);

    test("staff dashboard at all breakpoints", async ({ page }) => {
        ensureDirs();
        const errors = collectPageErrors(page);

        await loginAs(page, STAFF_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("staff-dashboard-card-new")).toBeVisible();

        for (const vp of VIEWPORTS) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await expect(page.getByTestId("staff-dashboard-card-my-assigned")).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await expectKnownLinks(page);
            await expectCleanVisibleText(page);
            await captureFullPage(page, `${ROOT}/staff-dashboard/${vp.name}.png`);
        }

        expect(errors, errors.join("\n")).toEqual([]);
    });

    test("requester dashboard at all breakpoints", async ({ page }) => {
        ensureDirs();
        const errors = collectPageErrors(page);

        await loginAs(page, REQUESTER_EMAIL);
        await page.goto("/dashboard");
        await expect(page.getByTestId("requester-dashboard-card-open")).toBeVisible();

        for (const vp of VIEWPORTS) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await expect(page.getByTestId("requester-dashboard-card-closed")).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await expectKnownLinks(page);
            await expectCleanVisibleText(page);
            await captureFullPage(page, `${ROOT}/requester-dashboard/${vp.name}.png`);
        }

        expect(errors, errors.join("\n")).toEqual([]);
    });

    test("Actions Taken panel, create form and status control at all breakpoints", async ({ page }, testInfo) => {
        ensureDirs();
        const errors = collectPageErrors(page);
        const tag = `s4${testInfo.project.name}${testInfo.retry}`;

        // Provision a fixture Ticket with one follow-up Action Taken so the table has a row.
        await loginAs(page, ADMIN_EMAIL);
        const { ticketNumber } = await provisionRequesterWithTicket(page, tag, {
            summary: `Lab 4 screenshot fixture ${tag}`,
            description: "Fixture ticket for the Lab 4 screenshot sweep.",
        });

        await loginAs(page, STAFF_EMAIL);
        const searchRes = await page.request.get(
            `/api/staff/tickets?search=${encodeURIComponent(ticketNumber)}`
        );
        const searchBody = (await searchRes.json()) as { data?: { id: number }[] };
        const ticketId = searchBody.data?.[0]?.id;
        if (!ticketId) throw new Error(`fixture ticket not found: ${ticketNumber}`);

        const createRes = await page.request.post(`/api/tickets/${ticketId}/actions`, {
            headers: { "Idempotency-Key": `lab4-shot-${tag}-${Date.now()}` },
            data: {
                description: "Flashed dock firmware to 3.4.1",
                result: "Dock re-enumerated and stable",
                followUpRequired: true,
                followUpNote: "Check back with the requester next week",
            },
        });
        if (!createRes.ok()) throw new Error(`fixture action failed (${createRes.status()})`);

        for (const vp of VIEWPORTS) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto(`/staff/tickets/${ticketId}`);
            await expect(page.getByTestId("staff-ticket-number")).toHaveText(ticketNumber);
            await expect(page.getByTestId("ticket-status-badge")).toHaveText("NEW");
            await expect(page.getByTestId("staff-ticket-status-select")).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await expectCleanVisibleText(page);
            await captureFullPage(page, `${ROOT}/actions-taken/status-control-${vp.name}.png`);

            await page.getByTestId("tab-actions-taken").click();
            await expect(page.getByTestId("actions-taken-panel")).toBeVisible();
            await expect(page.locator("[data-testid^='actions-taken-row-']").first()).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await captureFullPage(page, `${ROOT}/actions-taken/list-${vp.name}.png`);

            await page.getByTestId("actions-taken-add-btn").click();
            await expect(page.getByTestId("actions-taken-form")).toBeVisible();
            await page.getByTestId("actions-taken-follow-up-toggle").check();
            await expect(page.getByTestId("actions-taken-follow-up-note-input")).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await captureFullPage(page, `${ROOT}/actions-taken/create-form-${vp.name}.png`);
            await page.getByTestId("actions-taken-cancel-btn").click();
        }

        expect(errors, errors.join("\n")).toEqual([]);
    });
});
