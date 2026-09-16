import { Page, expect } from "@playwright/test";

// Ref: docs/lab-03/api-spec.md Endpoints 1-4 (auth), docs/lab-03/specification.md AC-02
// Auth is cookie-session based (toktickit_session, httpOnly). Logging in through the
// app's own UI once per context sets the cookie for both page fetches and page.request.
//
// Password self-healing strategy: seed users start with DevPass@2026! and
// mustChangePassword=true. We "change" the password to the SAME value (it satisfies
// BR-07: 8+ chars, upper+lower, number, special) so every worker converges to the
// same known-good credential instead of racing on distinct passwords. Re-seeding
// restores DevPass@2026!, and the next run heals it again — fully idempotent.

export const DEV_PASSWORD = "DevPass@2026!";

export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export const REQUESTER_EMAILS = [
    "alice.tanaka@example.com",
    "bob.chavez@example.com",
    "carol.meier@example.com",
    "david.sorn@example.com",
    "elena.rostova@example.com",
    "fiona.gallagher@example.com",
] as const;

export function requesterEmailByIndex(index: number): string {
    // Mirrors the old lab-02 dev-requester dropdown ordering (index 0 = placeholder),
    // so migrated specs keep using { index: 1 } / { index: 2 } for requester A / B.
    const email = REQUESTER_EMAILS[index - 1];
    if (!email) throw new Error(`No seed requester at index ${index}`);
    return email;
}

/**
 * Log in through the UI. If the account still requires a password change
 * (seed state), complete the forced change in place (same password) so the
 * session lands directly in the app. Safe to call repeatedly in one context.
 */
export async function loginAs(page: Page, email: string, password = DEV_PASSWORD): Promise<void> {
    await page.goto("/login");

    // If a session cookie from a previous test in this context is still valid,
    // the AuthGuard redirects /login away — treat that as "already logged in".
    await page.waitForLoadState("domcontentloaded");
    if (!page.url().includes("/login")) return;

    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(password);

    const loginRes = page.waitForResponse(
        (res) => res.url().includes("/api/auth/login") && res.request().method() === "POST"
    );
    await page.getByTestId("login-submit").click();
    const res = await loginRes;
    if (!res.ok()) {
        throw new Error(`loginAs: login failed for ${email} (${res.status()})`);
    }

    const body = (await res.json()) as { data?: { mustChangePassword?: boolean } };
    if (body.data?.mustChangePassword) {
        await healPasswordChange(page, password);
    }
}

async function healPasswordChange(page: Page, currentPassword: string): Promise<void> {
    await page.waitForURL(/\/change-password/);

    await page.getByTestId("change-password-current").fill(currentPassword);
    await page.getByTestId("change-password-new").fill(currentPassword);
    await page.getByTestId("change-password-confirm").fill(currentPassword);

    const changeRes = page.waitForResponse(
        (res) => res.url().includes("/api/auth/change-password") && res.request().method() === "POST"
    );
    await page.getByTestId("change-password-submit").click();
    const res = await changeRes;
    if (!res.ok()) {
        const msg = await res.text().catch(() => "");
        throw new Error(`loginAs: password self-heal failed for ${currentPassword ? "user" : "?"} (${res.status()}): ${msg}`);
    }

    // After a successful change the app navigates to the role's home screen.
    await expect(page).not.toHaveURL(/\/change-password/);
}

/** Convenience: log in as the seed requester at the given 1-based dropdown index. */
export async function loginAsRequesterByIndex(page: Page, index: number): Promise<void> {
    await loginAs(page, requesterEmailByIndex(index));
}
