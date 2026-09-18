import { test, expect, Page } from "@playwright/test";
import { loginAs, provisionRequesterWithTicket, projectTag } from "../auth-helpers";

// Each test provisions a dedicated fixture ticket (admin API + two logins).
test.setTimeout(90_000);

// Ref: docs/lab-03/ui-spec.md section 4 (Requester Ticket Detail additions), section 10
// Ref: docs/lab-03/tests.md VISUAL-05
// Pattern: e2e/lab-02/screenshots.create-ticket.spec.ts. The appears-resolved
// state test MUTATES its ticket, so each test provisions a dedicated fixture
// ticket per project + retry + run (same pattern as RESP-06) — no seed rows.

const OUT_DIR = "artifacts/lab-03/screenshots/requester-ticket-detail";

async function openFixtureTicket(page: Page, tag: string) {
    await loginAs(page, "alex.morgan@example.com");
    const { email, ticketNumber } = await provisionRequesterWithTicket(page, tag, {
        summary: `VISUAL ${tag} laptop won't connect to wifi`,
    });

    await loginAs(page, email);
    await page.goto("/my-tickets");
    await expect(page.locator("[data-testid='ticket-row']").first()).toBeVisible();
    await page.getByRole("link", { name: ticketNumber }).first().click();
    await expect(page.getByTestId("ticket-number")).toHaveText(ticketNumber);
    return { ticketNumber };
}

test.describe("Requester Ticket Detail screenshots — breakpoints", () => {
    test("desktop", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openFixtureTicket(page, `rtd${projectTag(testInfo.project.name)}${testInfo.retry}-1280`);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await openFixtureTicket(page, `rtd${projectTag(testInfo.project.name)}${testInfo.retry}-820`);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await openFixtureTicket(page, `rtd${projectTag(testInfo.project.name)}${testInfo.retry}-375`);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Requester Ticket Detail screenshots — states", () => {
    test("appears-resolved indicator active", async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await openFixtureTicket(page, `rtd${projectTag(testInfo.project.name)}${testInfo.retry}-state`);

        // ui-spec §4: clicking shows a persistent pale-green indicator
        await page.getByTestId("requester-ticket-appears-resolved-btn").click();
        await expect(page.getByTestId("requester-ticket-appears-resolved-indicator")).toBeVisible();
        await page.screenshot({ path: `${OUT_DIR}/appears-resolved.png`, fullPage: true });
    });
});
