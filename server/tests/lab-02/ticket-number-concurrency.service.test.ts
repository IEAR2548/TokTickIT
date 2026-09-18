import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTicket } from "../../src/services/tickets.service";

const CONCURRENCY = 8;

describe("createTicket() under concurrent load", () => {
    let requesterId: number;
    let categoryId: number;
    let relatedSystemId: number;
    const createdTicketIds: number[] = [];

    beforeAll(async () => {
        const requester = await prisma.user.upsert({
            where: { email: "concurrency.regression@example.com" },
            update: { isActive: true },
            create: { name: "Concurrency Regression", email: "concurrency.regression@example.com", isActive: true },
        });
        requesterId = requester.id;

        const category = await prisma.category.findFirst({ where: { isActive: true } });
        const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
        categoryId = category!.id;
        relatedSystemId = relatedSystem!.id;
    });

    afterAll(async () => {
        if (createdTicketIds.length > 0) {
            await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
        }
        await prisma.user.deleteMany({ where: { email: "concurrency.regression@example.com" } });
        await prisma.$disconnect();
    });

    it(`handles ${CONCURRENCY} simultaneous createTicket() calls with zero failures and all-unique ticket numbers`, async () => {
        const settled = await Promise.allSettled(
            Array.from({ length: CONCURRENCY }, (_, i) =>
                createTicket({
                    requesterId,
                    categoryId,
                    relatedSystemId,
                    summary: `Concurrency regression ticket #${i}`,
                    description:
                        "Fired simultaneously with several others to verify createTicket() survives concurrent ticket-number generation without collisions.",
                    requestedPriority: "LOW",
                })
            )
        );

        const rejected = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
        // Comparing against [] (rather than checking .length === 0) means a
        // failure here prints the actual rejection reasons in the diff.
        expect(rejected.map((r) => r.reason)).toEqual([]);

        const fulfilled = settled.filter(
            (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createTicket>>> => r.status === "fulfilled"
        );
        expect(fulfilled).toHaveLength(CONCURRENCY);

        fulfilled.forEach((r) => createdTicketIds.push(r.value.id));

        const ticketNumbers = fulfilled.map((r) => r.value.ticketNumber);
        expect(new Set(ticketNumbers).size).toBe(CONCURRENCY);

        // Sanity: still well-formed TK-YYYYMMDD-NNNN numbers, not just unique junk.
        for (const num of ticketNumbers) {
            expect(num).toMatch(/^TK-\d{8}-\d{4}$/);
        }
    });
});