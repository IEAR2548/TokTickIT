import { test, expect } from "@playwright/test";
import { loginAsRequesterByIndex, getSelectedRequesterId, getTicketIdFromRow } from "./helpers";

test.describe.configure({ mode: "serial" });

async function createTicketViaUI(
    page: import("@playwright/test").Page,
    opts: { priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; summary: string; description: string }
) {
    await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
    await page.waitForURL(/\/create-ticket/);
    await page.getByLabel(/^category$/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption(opts.priority);
    await page.getByLabel(/^summary$/i).fill(opts.summary);
    await page.getByLabel(/^description$/i).fill(opts.description);
    await page.getByRole("button", { name: /submit ticket/i }).click();
    const ticketNumber = (await page.locator(".success-ticket-number").textContent())!.trim();
    return ticketNumber;
}

test("E2E-01: select requester, submit Create Ticket, and see a real backend-assigned ticket number (AC-01, AC-05)", async ({
    page,
}) => {
    await loginAsRequesterByIndex(page, 1);
    await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
    await page.waitForURL(/\/create-ticket/);

    await page.getByLabel(/^category$/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption("HIGH");
    await page.getByLabel(/^summary$/i).fill(`E2E-01 create flow ${Date.now()}`);
    await page
        .getByLabel(/^description$/i)
        .fill("End-to-end scenario E2E-01 — verifying real ticket creation and the busy submit state.");

    await page.route("**/api/tickets", async (route) => {
        if (route.request().method() === "POST") {
            await new Promise((r) => setTimeout(r, 500));
        }
        await route.continue();
    });

    await page.getByRole("button", { name: /submit ticket/i }).click();

    // busy + disabled while in flight
    await expect(page.getByRole("button", { name: /submitting/i })).toBeDisabled();

    // a real, backend-assigned ticket number appears
    const ticketNumber = page.locator(".success-ticket-number");
    await expect(ticketNumber).toBeVisible();
    await expect(ticketNumber).toHaveText(/^TK-\d{8}-\d{4}$/);
});

test("E2E-02: switching requester A -> B hides A's ticket from My Tickets (AC-08, AC-23)", async ({ page }) => {
    await loginAsRequesterByIndex(page, 1);
    const ticketNumber = await createTicketViaUI(page, {
        priority: "LOW",
        summary: `E2E-02 requester A ticket ${Date.now()}`,
        description: "Belongs to requester A only — used to verify requester-scoped isolation.",
    });

    // Confirm it shows up for A first
    await page.getByRole("button", { name: /view ticket/i }).click();
    await page.waitForURL(/\/my-tickets/);
    await expect(page.getByText(ticketNumber)).toBeVisible();

    // Switch to requester B
    await page.getByRole("button", { name: /change requester/i }).click();
    await page.waitForURL(/\/select-requester/);
    await page.getByLabel(/select requester/i).selectOption({ index: 2 });
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/my-tickets/);

    // A's ticket must not appear under B
    await expect(page.getByText(ticketNumber)).not.toBeVisible();
});

test("E2E-03: upload an attachment, soft-remove it with a reason, then confirm download is blocked (AC-16, AC-17)", async ({
    page,
}) => {
    await loginAsRequesterByIndex(page, 1);
    const requesterId = await getSelectedRequesterId(page);

    // Land on any existing ticket owned by this requester.
    await expect(page.locator(".ticket-list-row").first()).toBeVisible();
    await page.locator(".ticket-list-row a").first().click();
    await page.waitForURL(/\/tickets\/\d+/);

    const fileName = `e2e-test-upload-${Date.now()}.png`;
    const fileInput = page.getByLabel(/add attachment/i);
    await fileInput.setInputFiles({
        name: fileName,
        mimeType: "image/png",
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature bytes — enough to pass MIME/type checks
    });

    const uploadedRow = page.locator(".attachment-active-list .attachment-row", { hasText: fileName });
    await expect(uploadedRow).toHaveCount(1);
    await expect(uploadedRow).toBeVisible();

    const downloadLinkTestId = await uploadedRow
        .locator('a[data-testid^="attachment-download-link-"]')
        .getAttribute("data-testid");
    const attachmentId = Number(downloadLinkTestId!.replace("attachment-download-link-", ""));

    await uploadedRow.getByRole("button", { name: /remove/i }).click();
    await page.getByLabel(/removal reason/i).fill("E2E-03 — verifying download is blocked after soft-remove");
    await page.getByRole("button", { name: /confirm remove/i }).click();

    const removedRow = page.locator(".attachment-removed-list .attachment-row", { hasText: fileName });
    await expect(removedRow).toBeVisible();
    await expect(removedRow.getByRole("link", { name: /download/i })).toHaveCount(0);

    const downloadUrl = `/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
    const res = await page.request.get(downloadUrl);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("ATTACHMENT_REMOVED");
});

test("E2E-04: navigating directly to another requester's ticket URL shows the error screen (AC-03)", async ({ page }) => {
    await loginAsRequesterByIndex(page, 1);
    const ticketNumber = await createTicketViaUI(page, {
        priority: "CRITICAL",
        summary: `E2E-04 requester A private ticket ${Date.now()}`,
        description: "Used to verify a different requester cannot view this ticket directly by URL.",
    });

    await page.getByRole("button", { name: /view ticket/i }).click();
    await page.waitForURL(/\/my-tickets/);
    const ticketId = await getTicketIdFromRow(page, ticketNumber);

    // Switch to requester B
    await page.getByRole("button", { name: /change requester/i }).click();
    await page.waitForURL(/\/select-requester/);
    await page.getByLabel(/select requester/i).selectOption({ index: 2 });
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/my-tickets/);

    // Direct-navigate to A's ticket while logged in as B.
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByTestId("ticket-not-found")).toBeVisible();
    await expect(page.getByText(/ticket not found or access denied/i)).toBeVisible();
});

test("E2E-05: search, filter, and paginate My Tickets return correct results (AC-09, AC-10, AC-12)", async ({ page }) => {
    await loginAsRequesterByIndex(page, 1);
    const requesterId = await getSelectedRequesterId(page);
    const keyword = `e2e05-${Date.now()}`;

    await page.goto("/create-ticket");
    const categoryId = await page.locator("#category option").nth(1).getAttribute("value");
    const relatedSystemId = await page.locator("#relatedSystem option").nth(1).getAttribute("value");
    const otherCategoryValue = await page.locator("#category option").nth(2).getAttribute("value");

    for (let i = 0; i < 11; i++) {
        const res = await page.request.post("/api/tickets", {
            data: {
                requesterId,
                categoryId: Number(categoryId),
                relatedSystemId: Number(relatedSystemId),
                summary: `${keyword} bulk ticket ${i}`,
                description: "Bulk-created by E2E-05 to guarantee a paginated dataset.",
                requestedPriority: "LOW",
            },
        });
        if (res.status() !== 201) {
            console.log(`E2E-05 bulk-create #${i} failed with ${res.status()}:`, await res.text());
        }
        expect(res.status()).toBe(201);
    }

    await page.goto("/my-tickets");

    await page.getByRole("searchbox", { name: /search/i }).fill(keyword);
    await page.keyboard.press("Enter");
    await expect(page.locator(".ticket-list-row")).toHaveCount(10); // page 1 of 11 matches
    await expect(page.getByText(/showing 1 to 10 of 11 tickets/i)).toBeVisible();

    if (otherCategoryValue) {
        await page.locator('select[aria-label="Category"]').selectOption(otherCategoryValue);
        await expect(page.getByTestId("my-tickets-no-results")).toBeVisible();
        await page.locator('select[aria-label="Category"]').selectOption(""); // back to All Categories
    }

    // pagination — Next moves to page 2 and shows the remaining ticket.
    await expect(page.locator(".ticket-list-row")).toHaveCount(10);
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/page 2 of 2/i)).toBeVisible();
    await expect(page.locator(".ticket-list-row")).toHaveCount(1);
});