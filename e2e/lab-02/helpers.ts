import { Page } from "@playwright/test";

export async function selectFirstRequesterAndGoToMyTickets(page: Page) {
    await page.goto("/select-requester");
    await page.getByLabel(/select requester/i).selectOption({ index: 1 }); // index 0 = "Choose a requester…" placeholder
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/my-tickets/);
}

export async function freezeStickyHeaderForScreenshot(page: Page) {
    await page.addStyleTag({ content: ".app-shell-header { position: static !important; }" });
}