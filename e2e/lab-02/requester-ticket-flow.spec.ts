import { test, expect } from "@playwright/test";
import { loginAsRequesterByIndex, getSelectedRequesterId } from "./helpers";

test.describe.configure({ mode: "serial" });

async function waitForReferenceDataLoaded(page: import("@playwright/test").Page) {
    await expect
        .poll(async () => page.locator("#category option").count(), {
            message: "Category <select> never received real options from GET /api/categories",
            timeout: 10_000,
        })
        .toBeGreaterThan(1); // index 0 is always the "Select…" placeholder

    await expect
        .poll(async () => page.locator("#relatedSystem option").count(), {
            message: "Related System <select> never received real options from GET /api/related-systems",
            timeout: 10_000,
        })
        .toBeGreaterThan(1);
}

async function createTicketViaUI(
    page: import("@playwright/test").Page,
    opts: { priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; summary: string; description: string }
) {
    await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
    await page.waitForURL(/\/create-ticket/);

    await waitForReferenceDataLoaded(page); // <-- the actual fix

    await page.getByLabel(/^category$/i).selectOption({ index: 1 });
    await page.getByLabel(/related system/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption(opts.priority);
    await page.getByLabel(/^summary$/i).fill(opts.summary);
    await page.getByLabel(/^description$/i).fill(opts.description);

    const submitBtn = page.getByRole("button", { name: /submit ticket/i });
    await expect(submitBtn).toBeEnabled();

    const [response] = await Promise.all([
        page.waitForResponse(
            (res) => res.url().includes("/api/tickets") && res.request().method() === "POST" && res.status() < 400
        ),
        submitBtn.click(),
    ]);
    void response;

    const ticketLocator = page.locator(".success-ticket-number");
    await expect(ticketLocator).toBeVisible({ timeout: 15_000 });

    const ticketNumber = (await ticketLocator.textContent())!.trim();
    return ticketNumber;
}

async function createTicketViaAPI(
    page: import("@playwright/test").Page,
    opts: { priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; summary: string; description: string }
): Promise<{ id: number; ticketNumber: string }> {
    const requesterId = await getSelectedRequesterId(page);

    const [categoriesRes, relatedSystemsRes] = await Promise.all([
        page.request.get("/api/categories"),
        page.request.get("/api/related-systems"),
    ]);
    expect(categoriesRes.status()).toBe(200);
    expect(relatedSystemsRes.status()).toBe(200);

    const categoriesBody = await categoriesRes.json();
    const relatedSystemsBody = await relatedSystemsRes.json();
    const categories = Array.isArray(categoriesBody)
        ? categoriesBody
        : categoriesBody.categories ?? categoriesBody.data ?? [];
    const relatedSystems = Array.isArray(relatedSystemsBody)
        ? relatedSystemsBody
        : relatedSystemsBody.relatedSystems ?? relatedSystemsBody.data ?? [];

    if (categories.length === 0 || relatedSystems.length === 0) {
        throw new Error(
            "createTicketViaAPI: no active Category or RelatedSystem returned — check prisma/seed.ts"
        );
    }

    const res = await page.request.post("/api/tickets", {
        data: {
            requesterId,
            categoryId: categories[0].id,
            relatedSystemId: relatedSystems[0].id,
            summary: opts.summary,
            description: opts.description,
            requestedPriority: opts.priority,
        },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    const ticket = body.ticket ?? body.data;
    return { id: ticket.id as number, ticketNumber: ticket.ticketNumber as string };
}

test("E2E-01: select requester, submit Create Ticket, and see a real backend-assigned ticket number (AC-01, AC-05)", async ({
    page,
}) => {
    await loginAsRequesterByIndex(page, 1);
    await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
    await page.waitForURL(/\/create-ticket/);

    await waitForReferenceDataLoaded(page); // <-- same fix applied inline here too

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

    // Setup only — no UI form needed, this test is about ownership isolation, not creation.
    const { ticketNumber } = await createTicketViaAPI(page, {
        priority: "LOW",
        summary: `E2E-02 requester A ticket ${Date.now()}`,
        description: "Belongs to requester A only — used to verify requester-scoped isolation.",
    });

    await page.goto("/my-tickets");
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

    // Create our own ticket via API instead of assuming one already exists in
    // the list (that assumption broke this test whenever it ran in isolation
    // or before E2E-02 had created anything for this requester).
    const { id: ticketId } = await createTicketViaAPI(page, {
        priority: "MEDIUM",
        summary: `E2E-03 attachment lifecycle ${Date.now()}`,
        description: "Owned ticket created solely to exercise the attachment upload/remove flow.",
    });

    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByTestId("ticket-header")).toBeVisible();

    const fileName = `e2e-test-upload-${Date.now()}.png`;
    const fileInput = page.getByLabel(/add attachment/i);
    await fileInput.setInputFiles({
        name: fileName,
        mimeType: "image/png",
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
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

    const { id: ticketId, ticketNumber } = await createTicketViaAPI(page, {
        priority: "CRITICAL",
        summary: `E2E-04 requester A private ticket ${Date.now()}`,
        description: "Used to verify a different requester cannot view this ticket directly by URL.",
    });
    void ticketNumber; // kept for readability at the call site / future assertions

    // Switch to requester B
    await page.goto("/select-requester");
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
    await waitForReferenceDataLoaded(page); // same race applies here too — this page reads <select> options directly

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
    await expect(page.locator(".ticket-list-row")).toHaveCount(10);
    await expect(page.getByText(/showing 1 to 10 of 11 tickets/i)).toBeVisible();

    if (otherCategoryValue) {
        await page.locator('select[aria-label="Category"]').selectOption(otherCategoryValue);
        await expect(page.getByTestId("my-tickets-no-results")).toBeVisible();
        await page.locator('select[aria-label="Category"]').selectOption("");
    }

    await expect(page.locator(".ticket-list-row")).toHaveCount(10);
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText(/page 2 of 2/i)).toBeVisible();
    await expect(page.locator(".ticket-list-row")).toHaveCount(1);
});