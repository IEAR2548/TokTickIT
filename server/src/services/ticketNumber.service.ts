import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

// Format: TK-YYYYMMDD-NNNN — sequential per day, zero-padded 4 digits.
function buildPrefixForToday(): string {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `TK-${yyyy}${mm}${dd}-`;
}

export async function generateTicketNumber(date = new Date()): Promise<string> {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const prefix = `TK-${yyyy}${mm}${dd}-`;

    const countToday = await prisma.ticket.count({
        where: { ticketNumber: { startsWith: prefix } },
    });

    const sequence = String(countToday + 1).padStart(4, "0");
    return `${prefix}${sequence}`;
}

export async function generateUniqueTicketNumber(maxAttempts = 10): Promise<string> {
    const prefix = buildPrefixForToday();

    // Deletions-proof cursor: start from the highest used sequence, not a count.
    const baseSequence = await getHighestTicketSequence(prefix);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const sequence = String(baseSequence + 1 + attempt).padStart(4, "0");
        const candidate = `${prefix}${sequence}`;
        const exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
        if (!exists) return candidate;
    }

    throw new Error("Unable to generate a unique ticket number");
}

/**
 * Highest ticket sequence already used today (0 if none), derived from the MAX
 * ticketNumber rather than COUNT. Count-based cursors regress whenever a ticket
 * is deleted (server test suites delete fixtures in the shared DB), which made
 * createTicket() re-propose already-used numbers, exhaust its P2002 retries and
 * 500. Zero-padded fixed-width numbers sort lexicographically == numerically.
 */
export async function getHighestTicketSequence(prefix = buildPrefixForToday()): Promise<number> {
    const last = await prisma.ticket.findFirst({
        where: { ticketNumber: { startsWith: prefix } },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
    });
    if (!last) return 0;
    const seq = Number(last.ticketNumber.slice(prefix.length));
    return Number.isFinite(seq) ? seq : 0;
}

export async function getNextTicketNumberBase(): Promise<{ prefix: string; baseCount: number }> {
    const prefix = buildPrefixForToday();
    const baseCount = await getHighestTicketSequence(prefix);
    return { prefix, baseCount };
}

export function buildCandidateTicketNumber(prefix: string, baseCount: number, attempt: number): string {
    const sequence = String(baseCount + 1 + attempt).padStart(4, "0");
    return `${prefix}${sequence}`;
}

/** True if `err` is Prisma's unique-constraint violation (P2002) — i.e. this exact ticketNumber was taken by a concurrent request between our count and our insert. */
export function isTicketNumberUniqueViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}