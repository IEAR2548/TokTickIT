import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateTicketNumber } from "../../src/services/ticketNumber.service";
import { prisma } from "../../src/lib/prisma";

// Ref: docs/lab-02/specification.md BR-01
// Ref: docs/lab-02/tests.md UNIT-01, UNIT-02

describe("generateTicketNumber", () => {
    let testRequesterId: number;
    let testCategoryId: number;
    let testRelatedSystemId: number;

    beforeAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});

        const requester = await prisma.devRequester.upsert({
            where: { email: "alice.tanaka@example.com" },
            update: { isActive: true },
            create: { name: "Alice Tanaka", email: "alice.tanaka@example.com", isActive: true },
        });

        const category = await prisma.category.upsert({
            where: { name: "Hardware" },
            update: { isActive: true },
            create: { name: "Hardware", isActive: true },
        });

        const relatedSystem = await prisma.relatedSystem.upsert({
            where: { name: "Corporate Laptop" },
            update: { isActive: true },
            create: { name: "Corporate Laptop", isActive: true },
        });

        testRequesterId = requester.id;
        testCategoryId = category.id;
        testRelatedSystemId = relatedSystem.id;
    });

    afterAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.$disconnect();
    });

    it("returns a string matching TK-YYYYMMDD-NNNN (UNIT-01, BR-01)", async () => {
        const number = await generateTicketNumber();
        expect(number).toMatch(/^TK-\d{8}-\d{4}$/);
    });

    it("returns increasing, unique numbers across sequential calls (UNIT-02)", async () => {
        const first = await generateTicketNumber();

        await prisma.ticket.create({
            data: {
                ticketNumber: first,
                requesterId: testRequesterId,
                categoryId: testCategoryId,
                relatedSystemId: testRelatedSystemId,
                summary: "seed row for uniqueness test",
                description: "seed row for uniqueness test description",
                requestedPriority: "MEDIUM",
            },
        });

        const second = await generateTicketNumber();
        expect(second).not.toBe(first);
        expect(second).toMatch(/^TK-\d{8}-\d{4}$/);
    });
});