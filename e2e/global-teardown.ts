import { execSync } from "child_process";

// Re-seed the database AFTER the whole run finishes.
//
// Spec files used to re-seed in afterAll, but with fullyParallel workers that
// fires while other specs are still running — resetting mustChangePassword=true
// under live sessions and redirecting them to /change-password mid-test.
// A global teardown runs only after every test in every project has finished,
// so seed state is restored without racing live sessions.
export default function globalTeardown() {
    try {
        execSync("npm run prisma:seed", { cwd: "./server", stdio: "ignore" });
    } catch {
        // ignore cleanup errors — seeding is best-effort restoration
    }
}
