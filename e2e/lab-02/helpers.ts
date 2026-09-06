import { Page } from "@playwright/test";

export async function loginAsRequesterByIndex(page: Page, index: number) {
    await page.goto("/select-requester");
    await page.getByLabel(/select requester/i).selectOption({ index }); // index 0 = "Choose a requester…" placeholder
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/my-tickets/);
}

export async function selectFirstRequesterAndGoToMyTickets(page: Page) {
    await loginAsRequesterByIndex(page, 1);
}

export async function getSelectedRequesterId(page: Page): Promise<number> {
    const id = await page.evaluate(() => {
        const raw = sessionStorage.getItem("toktickit.devRequester");
        return raw ? JSON.parse(raw).id : null;
    });
    if (id === null) throw new Error("No requester selected in sessionStorage — did you call loginAsRequesterByIndex first?");
    return id;
}

export async function getTicketIdFromRow(page: Page, ticketNumber: string): Promise<number> {
    const href = await page.locator(".ticket-list-row a", { hasText: ticketNumber }).getAttribute("href");
    const match = href?.match(/\/tickets\/(\d+)/);
    if (!match) throw new Error(`Could not parse a ticket id out of href: ${href}`);
    return Number(match[1]);
}

export async function freezeStickyHeaderForScreenshot(page: Page) {
    await page.addStyleTag({ content: ".app-shell-header { position: static !important; }" });
}