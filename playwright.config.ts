import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: "html",

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

    webServer: {
        command: "npm run dev",
        cwd: "./client",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});