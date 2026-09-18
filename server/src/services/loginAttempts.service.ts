// Ref: docs/lab-03/specification.md BR-06
// "After 5 consecutive failed login attempts for the same email within 15 minutes,
//  further attempts return the same generic invalid-credentials message but are
//  logged server-side; no account lockout UI is required in Lab 3."

interface AttemptRecord {
    timestamps: number[];
}

const attemptsByEmail = new Map<string, AttemptRecord>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const THRESHOLD = 5;

function pruneOldAttempts(timestamps: number[], now: number): number[] {
    return timestamps.filter((t) => now - t < ATTEMPT_WINDOW_MS);
}

export function recordFailedAttempt(email: string): { count: number; exceededThreshold: boolean } {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();

    const existing = attemptsByEmail.get(normalizedEmail);
    const validTimestamps = existing ? pruneOldAttempts(existing.timestamps, now) : [];
    validTimestamps.push(now);

    attemptsByEmail.set(normalizedEmail, { timestamps: validTimestamps });

    const count = validTimestamps.length;
    const exceededThreshold = count >= THRESHOLD;

    if (exceededThreshold) {
        console.warn(`[SECURITY WARNING] ${count} failed login attempts for email: ${normalizedEmail} within 15 minutes.`);
    }

    return { count, exceededThreshold };
}

export function recordSuccessfulLogin(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    attemptsByEmail.delete(normalizedEmail);
}

export function getFailedAttempts(email: string): number {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const existing = attemptsByEmail.get(normalizedEmail);
    if (!existing) return 0;

    const validTimestamps = pruneOldAttempts(existing.timestamps, now);
    attemptsByEmail.set(normalizedEmail, { timestamps: validTimestamps });
    return validTimestamps.length;
}

export function clearAllAttempts(): void {
    attemptsByEmail.clear();
}
