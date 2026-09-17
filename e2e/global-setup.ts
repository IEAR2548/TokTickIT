import fs from "fs";
import { execSync } from "child_process";
import { request } from "@playwright/test";

const SCREENSHOT_DIRS = [
    "artifacts/lab-02/screenshots/create-ticket",
    "artifacts/lab-02/screenshots/my-tickets",
    "artifacts/lab-02/screenshots/ticket-detail",
];

// Must match playwright.config.ts's backend webServer url.
const API_BASE_URL = "http://localhost:5000";
const ADMIN_EMAIL = "alex.morgan@example.com";
const DEV_PASSWORD = "DevPass@2026!";

export default async function globalSetup() {
    for (const dir of SCREENSHOT_DIRS) {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
    }

    // Start every run from the documented seed state so consecutive runs are
    // independent: E2E-01 permanently changes its user's password, E2E-03
    // claims and transitions tickets, E2E-04 adds notes. Without this pre-run
    // seed, run N+1 inherited run N's mutations and failed until a manual
    // re-seed. globalTeardown restores seed state again after the run.
    execSync("npm run prisma:seed", { cwd: "./server", stdio: "inherit" });

    // One-time heal for the single shared Administrator account.
    //
    // seed.ts always leaves alex.morgan@example.com with mustChangePassword=true
    // (correctly — it's a fresh-looking seeded account). Nearly every Lab 3 spec
    // file calls loginAs(page, "alex.morgan@example.com") as its very first step
    // to provision fixtures via the Admin API. With fullyParallel workers all
    // starting at once, every one of those calls independently saw
    // mustChangePassword=true and raced to POST /api/auth/change-password on the
    // exact same User row at the same moment. Against a single dev Express
    // server + single dev Postgres instance (not production infra), that lock
    // contention backed up the request queue for the WHOLE run — which is why
    // failures showed up in unrelated specs (CHK-06 stuck on /change-password,
    // ticket lookups timing out, a just-created ticket not yet visible to a
    // search) rather than in one obviously-broken feature. Healing it once here,
    // serially, before any parallel worker starts, removes the race entirely.
    //
    // loginAs()'s own heal logic is left in place in auth-helpers.ts as a safety
    // net for freshly-provisioned per-test fixture users — those are never
    // shared across tests, so they were never racy to begin with.
    const api = await request.newContext({ baseURL: API_BASE_URL });
    try {
        const loginRes = await api.post("/api/auth/login", {
            data: { email: ADMIN_EMAIL, password: DEV_PASSWORD },
        });
        if (!loginRes.ok()) {
            throw new Error(
                `global-setup: admin login failed (${loginRes.status()}): ${await loginRes.text()}`
            );
        }
        const loginBody = (await loginRes.json()) as { data?: { mustChangePassword?: boolean } };

        if (loginBody.data?.mustChangePassword) {
            const changeRes = await api.post("/api/auth/change-password", {
                data: { currentPassword: DEV_PASSWORD, newPassword: DEV_PASSWORD },
            });
            if (!changeRes.ok()) {
                throw new Error(
                    `global-setup: admin password heal failed (${changeRes.status()}): ${await changeRes.text()}`
                );
            }
        }
    } finally {
        await api.dispose();
    }
}