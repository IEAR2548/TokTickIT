import fs from "fs";

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
}