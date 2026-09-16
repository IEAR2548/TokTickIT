import { Page } from "@playwright/test";
import { loginAsRequesterByIndex as sharedLoginAsRequesterByIndex } from "../auth-helpers";

// Ref: docs/lab-03/specification.md MIG-02 — Lab 2 E2E flows pass unmodified in
// intent; the identity source migrates from the removed Development Requester
// selector to authenticated sessions. All exported function names are preserved
// so the screenshot specs keep working unchanged.

export async function loginAsRequesterByIndex(page: Page, index: number) {
    await sharedLoginAsRequesterByIndex(page, index);
    await page.goto("/my-tickets");
}

export async function selectFirstRequesterAndGoToMyTickets(page: Page) {
    await loginAsRequesterByIndex(page, 1);
}

/**
 * Formerly read the dev-requester identity from sessionStorage. Sessions now
 * carry identity, so this returns the logged-in user's id via /api/auth/me —
 * used by specs that need requesterId for API-side ticket creation.
 */
export async function getSelectedRequesterId(page: Page): Promise<number> {
    const me = await page.request.get("/api/auth/me");
    if (!me.ok()) {
        throw new Error("getSelectedRequesterId: not authenticated — did you call loginAsRequesterByIndex first?");
    }
    const body = await me.json();
    return body.data.id as number;
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