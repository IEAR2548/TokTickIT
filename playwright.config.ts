import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    globalSetup: require.resolve('./e2e/global-setup'),
    // Runs only after every test in every project has finished (see
    // global-teardown.ts — per-spec afterAll re-seeds raced live sessions).
    globalTeardown: require.resolve('./e2e/global-teardown'),
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // One local retry absorbs rare scheduler/network hiccups against the shared
    // dev server. Determinism itself is enforced by the tests (per-project
    // users/tickets + pre-run seed); retries are a safety net, not a strategy.
    retries: process.env.CI ? 2 : 1,
    reporter: "html",

    // The default 5s expect timeout is too tight when three browser projects
    // hammer one Vite dev server + Express backend simultaneously.
    expect: { timeout: 10_000 },

    use: {
        baseURL: "http://localhost:5173",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },

    projects: [
        {
            name: "desktop",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1280, height: 800 },
            },
        },
        {
            name: "tablet",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 820, height: 1180 },
            },
        },
        {
            name: "mobile",
            use: {
                ...devices["Pixel 5"],
            },
        },
    ],

    webServer: [
        // Backend API — without this, running Playwright with no dev servers up
        // fails every test with connection errors. Polls /api/health until the
        // Express server is ready to accept requests.
        {
            command: "npm run dev",
            cwd: "./server",
            url: "http://localhost:5000/api/health",
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
        },
        {
            command: "npm run dev",
            cwd: "./client",
            url: "http://localhost:5173",
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
        },
    ],
});