import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

describe("GET /api/tickets/:id", () => {
    let ownerId: number;
    let otherId: number;
    let ticketId: number;

    const TICKET_NUMBER = "TK-20260905-8888";

    beforeAll(async () => {
        // Setup owner requester, a different requester, and one ticket owned by `owner`
        const owner = await prisma.devRequester.upsert({
            where: { email: "owner.detail@example.com" },
            update: { isActive: true },
            create: { name: "Owner User", email: "owner.detail@example.com", isActive: true },
        });
        ownerId = owner.id;

        const other = await prisma.devRequester.upsert({
            where: { email: "other.detail@example.com" },
            update: { isActive: true },
            create: { name: "Other User", email: "other.detail@example.com", isActive: true },
        });
        otherId = other.id;

        const category = await prisma.category.findFirst({ where: { isActive: true } });
        const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber: TICKET_NUMBER,
                requesterId: ownerId,
                categoryId: category!.id,
                relatedSystemId: system!.id,
                summary: "Detail endpoint test summary",
                description: "Detail endpoint test description at least 10 chars",
                requestedPriority: "MEDIUM",
            },
        });
        ticketId = ticket.id;
    });

    afterAll(async () => {
        await prisma.ticket.deleteMany({ where: { ticketNumber: TICKET_NUMBER } });
        await prisma.devRequester.deleteMany({
            where: { email: { in: ["owner.detail@example.com", "other.detail@example.com"] } },
        });
        await prisma.$disconnect();
    });

    it("returns 400 VALIDATION_ERROR when requesterId is missing", async () => {
        const res = await request(app).get(`/api/tickets/${ticketId}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 NOT_FOUND when the ticket id does not exist", async () => {
        // Ticket ids are autoincrement ints; pick one far outside the seeded/created range.
        const nonExistentId = ticketId + 999999;

        const res = await request(app)
            .get(`/api/tickets/${nonExistentId}`)
            .query({ requesterId: ownerId });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("NOT_FOUND");
    });

    it("returns 403 FORBIDDEN when accessed by a non-owner requester (API-06, BR-06)", async () => {
        const res = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .query({ requesterId: otherId });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
    });

    it("returns 200 with full ticket detail and relations for the owner (API-07)", async () => {
        const res = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .query({ requesterId: ownerId });

        expect(res.status).toBe(200);
        expect(res.body.ticket).toBeDefined();

        const { ticket } = res.body;
        expect(ticket.id).toBe(ticketId);
        expect(ticket.ticketNumber).toBe(TICKET_NUMBER);
        expect(ticket.summary).toBe("Detail endpoint test summary");
        expect(ticket.description).toBe("Detail endpoint test description at least 10 chars");
        expect(ticket.requestedPriority).toBe("MEDIUM");
        expect(ticket.currentStatus).toBe("NEW");
        expect(ticket.createdAt).toBeDefined();
        expect(ticket.updatedAt).toBeDefined();

        // Relations must be fully expanded, not just ids (per API-07 contract)
        expect(ticket.requester).toBeDefined();
        expect(ticket.requester.id).toBe(ownerId);
        expect(ticket.requester.name).toBeDefined();
        expect(ticket.requester.email).toBeDefined();

        expect(ticket.category).toBeDefined();
        expect(ticket.category.id).toBeDefined();
        expect(ticket.category.name).toBeDefined();

        expect(ticket.relatedSystem).toBeDefined();
        expect(ticket.relatedSystem.id).toBeDefined();
        expect(ticket.relatedSystem.name).toBeDefined();
    });
});