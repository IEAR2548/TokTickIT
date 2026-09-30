// Ref: docs/lab-04/specification.md BR-13, Assumption #3
// "Recently updated" on a dashboard means within the last 7 days, based on Asia/Bangkok (UTC+7)
// calendar days — not UTC days. These pure helpers move the day-boundary math out of the query
// so the UTC/UTC+7 edge is unit-testable on its own.

export const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The zero-based index of the Asia/Bangkok calendar day that contains `date`. */
export function bangkokDayIndex(date: Date): number {
    return Math.floor((date.getTime() + BANGKOK_OFFSET_MS) / DAY_MS);
}

/** True when `updatedAt` falls on one of the last `days` Asia/Bangkok calendar days ending at `now`. */
export function isWithinRecentWindow(updatedAt: Date, now: Date, days = 7): boolean {
    const dayDifference = bangkokDayIndex(now) - bangkokDayIndex(updatedAt);
    return dayDifference < days;
}

/** The first instant included in the window — Bangkok midnight of the earliest included day. */
export function recentWindowStart(now: Date, days = 7): Date {
    const startDayIndex = bangkokDayIndex(now) - (days - 1);
    return new Date(startDayIndex * DAY_MS - BANGKOK_OFFSET_MS);
}
