import { describe, it, expect } from "vitest";
import {
    BANGKOK_OFFSET_MS,
    bangkokDayIndex,
    isWithinRecentWindow,
    recentWindowStart,
} from "../../src/utils/dashboardDates";

// Ref: docs/lab-04/specification.md BR-13 ("recently updated" = last 7 days, Asia/Bangkok calendar days)
// Ref: docs/lab-04/tests.md UNIT-04

describe("UNIT-04: BR-13 'recently updated' 7-day window at the Asia/Bangkok (UTC+7) day edge", () => {
    it("derives the calendar day from the Bangkok clock, not UTC", () => {
        // 2026-09-30T18:00Z is already 2026-10-01T01:00 in Bangkok.
        const afterMidnightBangkok = new Date("2026-09-30T18:00:00.000Z");
        // 2026-09-30T16:59:59Z is still 2026-09-30T23:59:59 in Bangkok.
        const justBeforeMidnightBangkok = new Date("2026-09-30T16:59:59.000Z");

        expect(bangkokDayIndex(afterMidnightBangkok)).toBe(
            bangkokDayIndex(new Date("2026-10-01T00:00:00.000Z"))
        );
        expect(bangkokDayIndex(justBeforeMidnightBangkok)).toBe(
            bangkokDayIndex(new Date("2026-09-30T00:00:00.000Z"))
        );
        expect(bangkokDayIndex(afterMidnightBangkok) - bangkokDayIndex(justBeforeMidnightBangkok)).toBe(1);
    });

    it("includes an item from the earliest Bangkok day in the window and excludes the day before it", () => {
        // "Now" is 2026-10-01 01:00 Bangkok.
        const now = new Date("2026-09-30T18:00:00.000Z");

        // 2026-09-24T17:30Z -> 2026-09-25 00:30 Bangkok = 6 days back -> inside the 7-day window.
        expect(isWithinRecentWindow(new Date("2026-09-24T17:30:00.000Z"), now)).toBe(true);

        // 2026-09-23T17:30Z -> 2026-09-24 00:30 Bangkok = 7 days back -> outside the window.
        expect(isWithinRecentWindow(new Date("2026-09-23T17:30:00.000Z"), now)).toBe(false);

        // Same UTC calendar date as the included instant, but before the Bangkok midnight that starts the window.
        expect(isWithinRecentWindow(new Date("2026-09-24T16:59:59.000Z"), now)).toBe(false);
    });

    it("recentWindowStart is the first included instant — Bangkok midnight of the earliest day", () => {
        const now = new Date("2026-09-30T18:00:00.000Z"); // 2026-10-01 01:00 Bangkok

        const start = recentWindowStart(now, 7);

        // The boundary itself is inside the window; one millisecond earlier is not.
        expect(isWithinRecentWindow(start, now)).toBe(true);
        expect(isWithinRecentWindow(new Date(start.getTime() - 1), now)).toBe(false);

        // ...and it lands exactly on Bangkok midnight.
        expect(new Date(start.getTime() + BANGKOK_OFFSET_MS).toISOString()).toBe("2026-09-25T00:00:00.000Z");
    });

    it("treats an update at the very edge of the current Bangkok day as recent", () => {
        const now = new Date("2026-09-30T18:00:00.000Z"); // Bangkok Oct 1
        // Just after Bangkok midnight on the same day as "now".
        expect(isWithinRecentWindow(new Date("2026-09-30T17:00:00.000Z"), now)).toBe(true);
    });
});
