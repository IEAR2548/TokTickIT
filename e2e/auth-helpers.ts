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

// Unique-per-run suffix for fixture records created through the Admin API.
// Combined with the per-project tag (below) it gives every parallel worker its
// own users/tickets, so no two tests ever mutate the same row.
export const RUN_ID = `${Date.now()}`;

export function projectTag(projectName: string | undefined): string {
    return (projectName ?? "anon").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

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
    // The redirect is CLIENT-side and only happens after AuthContext's
    // /api/auth/me round-trip resolves, so a bare URL check races it: a session
    // that is about to be redirected still sits on /login here. Wait briefly
    // for a /me call first; if none arrives, there is no live session.
    await page.waitForLoadState("domcontentloaded");
    if (!page.url().includes("/login")) return;
    try {
        await page.waitForRequest(
            (req) => req.url().includes("/api/auth/me") && req.method() === "GET",
            { timeout: 2000 }
        );
    } catch {
        // No /me call within 2s -> no live session; continue with login.
    }
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

// ---------------------------------------------------------------------------
// Per-project API fixtures.
//
// fullyParallel runs three browser projects against one shared backend. Tests
// that MUTATE a user or ticket (password change, claim, status transition,
// notes) must never share those rows across projects, or one worker's write
// breaks another worker's assertions mid-flight. These helpers provision a
// dedicated user/ticket per project via the app's own API, using the session
// cookie from the caller's page.
// ---------------------------------------------------------------------------

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    mustChangePassword?: boolean;
}

/**
 * Create a dedicated user via the Admin API and return it.
 * Caller must already hold an Administrator session in `page`.
 */
export async function adminCreateUser(
    page: Page,
    input: { name: string; email: string; role: string; isActive: boolean; initialPassword: string }
): Promise<AdminUser> {
    const res = await page.request.post("/api/admin/users", { data: input });
    if (!res.ok()) {
        throw new Error(`adminCreateUser failed (${res.status()}): ${await res.text()}`);
    }
    const body = await res.json();
    return body.data as AdminUser;
}

/**
 * Log out via the API (clears the session cookie shared by page.request) and
 * return to /login so the next loginAs starts from a clean session.
 */
export async function logoutForReinstall(page: Page): Promise<void> {
    await page.request.post("/api/auth/logout");
    await page.goto("/login");
}

/**
 * Provision a dedicated REQUESTER (mustChangePassword=true, so the test can
 * drive the forced-change flow) plus one fresh ticket owned by them.
 * Caller must hold an Administrator session in `page`; the helper leaves the
 * page logged OUT so the caller can log in as anyone next.
 */
export async function provisionRequesterWithTicket(
    page: Page,
    tag: string,
    ticket: { summary: string; description?: string }
): Promise<{ user: AdminUser; email: string; ticketNumber: string }> {
    const email = `e2e.${tag}.${RUN_ID}@example.com`;
    const user = await adminCreateUser(page, {
        name: `E2E ${tag} Requester`,
        email,
        role: "REQUESTER",
        isActive: true,
        initialPassword: DEV_PASSWORD,
    });

    // Reference data is stable seed content — pick the first of each.
    // NOTE response shapes differ: /api/categories returns a bare array,
    // /api/related-systems returns { relatedSystems: [...] }.
    const categoriesBody = (await (await page.request.get("/api/categories")).json()) as
        | { id: number }[]
        | { categories?: { id: number }[] };
    const categories = Array.isArray(categoriesBody) ? categoriesBody : categoriesBody.categories ?? [];
    const systemsBody = (await (await page.request.get("/api/related-systems")).json()) as
        | { id: number }[]
        | { relatedSystems?: { id: number }[] };
    const systems = Array.isArray(systemsBody) ? systemsBody : systemsBody.relatedSystems ?? [];
    if (!categories || categories.length === 0) {
        throw new Error("provisionRequesterWithTicket: no active categories found");
    }
    if (!systems || systems.length === 0) {
        throw new Error("provisionRequesterWithTicket: no active related systems found");
    }

    // Swap the admin session for the new requester's session (loginAs heals the
    // mustChangePassword flag in place, same-password change).
    await logoutForReinstall(page);
    await loginAs(page, email, DEV_PASSWORD);

    const res = await page.request.post("/api/tickets", {
        data: {
            summary: ticket.summary,
            description: ticket.description ?? "E2E fixture ticket",
            categoryId: categories[0].id,
            relatedSystemId: systems[0].id,
            requestedPriority: "MEDIUM",
        },
    });
    if (!res.ok()) {
        throw new Error(`provisionRequesterWithTicket: ticket create failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as { ticket?: { ticketNumber?: string } };
    const ticketNumber = body.ticket?.ticketNumber;
    if (!ticketNumber) {
        throw new Error(`provisionRequesterWithTicket: no ticketNumber in response: ${JSON.stringify(body).slice(0, 200)}`);
    }

    // Leave the page logged out — the caller logs in as whoever it needs next.
    await logoutForReinstall(page);

    return { user, email, ticketNumber };
}
