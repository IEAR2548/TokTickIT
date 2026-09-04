import { prisma } from "../lib/prisma";

// Ref: docs/lab-02/specification.md BR-01
// Format: TK-YYYYMMDD-NNNN — sequential per day, zero-padded 4 digits.

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

/**
 * Generates a ticket number and retries on a rare unique-constraint collision.
 */
export async function generateUniqueTicketNumber(maxAttempts = 10): Promise<string> {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const prefix = `TK-${yyyy}${mm}${dd}-`;

    const baseCount = await prisma.ticket.count({
        where: { ticketNumber: { startsWith: prefix } },
    });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const sequence = String(baseCount + 1 + attempt).padStart(4, "0");
        const candidate = `${prefix}${sequence}`;
        const exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
        if (!exists) return candidate;
    }

    throw new Error("Unable to generate a unique ticket number");
}