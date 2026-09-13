import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    recordFailedAttempt,
    recordSuccessfulLogin,
    getFailedAttempts,
    clearAllAttempts,
} from "../../../src/services/loginAttempts.service";

// Ref: docs/lab-03/specification.md BR-06
// "After 5 consecutive failed login attempts for the same email within 15 minutes,
//  further attempts return the same generic invalid-credentials message but are
//  logged server-side; no account lockout UI is required in Lab 3."

describe("BR-06: Failed login attempts tracking and logging", () => {
    beforeEach(() => {
        clearAllAttempts();
        vi.restoreAllMocks();
    });

    it("records failed attempts for an email and reports count", () => {
        const email = "user@example.com";
        const result1 = recordFailedAttempt(email);
        expect(result1.count).toBe(1);
        expect(result1.exceededThreshold).toBe(false);

        const result2 = recordFailedAttempt(email);
        expect(result2.count).toBe(2);
        expect(result2.exceededThreshold).toBe(false);
    });

    it("flags threshold exceeded after 5 failed attempts within 15 minutes", () => {
        const email = "target@example.com";
        for (let i = 1; i <= 4; i++) {
            const res = recordFailedAttempt(email);
            expect(res.count).toBe(i);
            expect(res.exceededThreshold).toBe(false);
        }

        // 5th attempt reaches the threshold
        const res5 = recordFailedAttempt(email);
        expect(res5.count).toBe(5);
        expect(res5.exceededThreshold).toBe(true);

        // 6th attempt still flagged
        const res6 = recordFailedAttempt(email);
        expect(res6.count).toBe(6);
        expect(res6.exceededThreshold).toBe(true);
    });

    it("resets failed attempts count upon successful login", () => {
        const email = "reset@example.com";
        recordFailedAttempt(email);
        recordFailedAttempt(email);
        expect(getFailedAttempts(email)).toBe(2);

        recordSuccessfulLogin(email);
        expect(getFailedAttempts(email)).toBe(0);
    });

    it("tracks attempts independently per email", () => {
        recordFailedAttempt("userA@example.com");
        recordFailedAttempt("userA@example.com");
        recordFailedAttempt("userB@example.com");

        expect(getFailedAttempts("userA@example.com")).toBe(2);
        expect(getFailedAttempts("userB@example.com")).toBe(1);
    });

    it("logs a security warning when 5 or more failed attempts occur", () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const email = "bruteforce@example.com";

        for (let i = 0; i < 5; i++) {
            recordFailedAttempt(email);
        }

        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls.some(args =>
            args.some(arg => typeof arg === "string" && (arg.includes("5") || arg.includes(email) || arg.includes("failed login attempts")))
        )).toBe(true);
    });
});
