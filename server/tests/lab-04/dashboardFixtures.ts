import { execSync } from "child_process";
import { prisma } from "../../src/lib/prisma";

// The dashboard suites assert against the documented Issue 2 seed fixtures (an In Progress
// Requester Ticket, a Reopened Ticket, and a zero-Ticket Requester). The pre-existing Lab 2
// suites call a blanket `prisma.ticket.deleteMany({})`, which wipes that baseline partway
// through a full `vitest run`. Restore the baseline the same way migration.test.ts does — by
// re-running the existing, idempotent seed script — rather than duplicating fixtures here.

/**
 * Ensures a specific seeded Ticket exists. If a Lab 2 suite has since deleted it, replay the
 * idempotent seed script and then return.
 */
export async function ensureSeedTicket(ticketNumber: string): Promise<void> {
    const existing = await prisma.ticket.findUnique({ where: { ticketNumber } });
    if (existing) return;
    execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
}
