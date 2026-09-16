import fs from "fs";
import { execSync } from "child_process";

const SCREENSHOT_DIRS = [
    "artifacts/lab-02/screenshots/create-ticket",
    "artifacts/lab-02/screenshots/my-tickets",
    "artifacts/lab-02/screenshots/ticket-detail",
];

export default function globalSetup() {
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
}