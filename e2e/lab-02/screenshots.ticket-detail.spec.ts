import { test, expect, Page } from "@playwright/test";
import { selectFirstRequesterAndGoToMyTickets, freezeStickyHeaderForScreenshot } from "./helpers";

const OUT_DIR = "artifacts/lab-02/screenshots/ticket-detail";
const MOCK_TICKET_ID = 999001;

async function goToFirstTicketDetail(page: Page) {
    await selectFirstRequesterAndGoToMyTickets(page);
    await page.locator(".ticket-list-row a").first().click();
    await page.waitForURL(/\/tickets\/\d+/);
}

function mockTicketDetail(page: Page) {
    return page.route(`**/api/tickets/${MOCK_TICKET_ID}**`, async (route) => {
        const url = route.request().url();
        if (url.includes("/attachments")) {
            await route.fallback();
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                ticket: {
                    id: MOCK_TICKET_ID,
                    ticketNumber: "TK-20260101-0001",
                    requester: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
                    category: { id: 1, name: "Hardware" },
                    relatedSystem: { id: 1, name: "Corporate Laptop" },
                    summary: "Laptop battery drains quickly",
                    description:
                        "Battery goes from 100% to 0% in under two hours during normal use, started after the last OS update.",
                    requestedPriority: "MEDIUM",
                    currentStatus: "NEW",
                    createdAt: "2026-01-01T09:00:00.000Z",
                    updatedAt: "2026-01-01T09:00:00.000Z",
                },
            }),
        });
    });
}

function mockAttachments(page: Page, includeRemoved: boolean) {
    const attachments: any[] = [
        {
            id: 1,
            ticketId: MOCK_TICKET_ID,
            originalName: "battery-screenshot.png",
            mimeType: "image/png",
            sizeBytes: 204800,
            isRemoved: false,
            removalReason: null,
            removedAt: null,
            uploadedAt: "2026-01-01T09:05:00.000Z",
        },
        {
            id: 2,
            ticketId: MOCK_TICKET_ID,
            originalName: "diagnostic-report.pdf",
            mimeType: "application/pdf",
            sizeBytes: 512000,
            isRemoved: false,
            removalReason: null,
            removedAt: null,
            uploadedAt: "2026-01-01T09:07:00.000Z",
        },
    ];

    if (includeRemoved) {
        attachments.push({
            id: 3,
            ticketId: MOCK_TICKET_ID,
            originalName: "old-report.pdf",
            mimeType: "application/pdf",
            sizeBytes: 307200,
            isRemoved: true,
            removalReason: "Uploaded wrong file version",
            removedAt: "2026-01-01T10:15:00.000Z",
            uploadedAt: "2026-01-01T09:10:00.000Z",
        });
    }

    return page.route(`**/api/tickets/${MOCK_TICKET_ID}/attachments**`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ attachments }),
        });
    });
}

test.describe("Ticket Detail screenshots — breakpoints", () => {
    test("desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await goToFirstTicketDetail(page);
        await expect(page.getByTestId("ticket-header")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/desktop.png`, fullPage: true });
    });

    test("tablet", async ({ page }) => {
        await page.setViewportSize({ width: 820, height: 1180 });
        await goToFirstTicketDetail(page);
        await expect(page.getByTestId("ticket-header")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/tablet.png`, fullPage: true });
    });

    test("mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await goToFirstTicketDetail(page);
        await expect(page.getByTestId("ticket-header")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/mobile.png`, fullPage: true });
    });
});

test.describe("Ticket Detail screenshots — attachment states", () => {
    test("attachments", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await mockTicketDetail(page);
        await mockAttachments(page, false);

        await selectFirstRequesterAndGoToMyTickets(page);
        await page.goto(`/tickets/${MOCK_TICKET_ID}`);

        await expect(page.getByText("battery-screenshot.png")).toBeVisible();
        await expect(page.getByText("diagnostic-report.pdf")).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/attachments.png`, fullPage: true });
    });

    test("removed-attachment", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await mockTicketDetail(page);
        await mockAttachments(page, true);

        await selectFirstRequesterAndGoToMyTickets(page);
        await page.goto(`/tickets/${MOCK_TICKET_ID}`);

        const removedName = page.getByText("old-report.pdf");
        await expect(removedName).toBeVisible();
        await expect(page.getByText(/Uploaded wrong file version/)).toBeVisible();
        await freezeStickyHeaderForScreenshot(page);
        await page.screenshot({ path: `${OUT_DIR}/removed-attachment.png`, fullPage: true });
    });
});