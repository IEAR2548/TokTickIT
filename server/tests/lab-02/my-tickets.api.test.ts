import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

let requesterA: number;
let requesterB: number;
let inactiveRequesterId: number;
let hardwareCategoryId: number;
let softwareCategoryId: number;
let relatedSystemId: number;

async function createTicket(overrides: Partial<{
    requesterId: number;
    categoryId: number;
    summary: string;
    description: string;
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    currentStatus: "NEW";
    ticketNumber: string;
    createdAt: Date;
    updatedAt: Date;
}>) {
    return prisma.ticket.create({
        data: {
            ticketNumber: overrides.ticketNumber ?? `TK-20260904-${Math.floor(Math.random() * 9000 + 1000)}`,
            requesterId: overrides.requesterId ?? requesterA,
            categoryId: overrides.categoryId ?? hardwareCategoryId,
            relatedSystemId,
            summary: overrides.summary ?? "Default summary text",
            description: overrides.description ?? "A description that is definitely long enough to pass validation.",
            requestedPriority: overrides.requestedPriority ?? "MEDIUM",
            currentStatus: overrides.currentStatus ?? "NEW",
            createdAt: overrides.createdAt,
            updatedAt: overrides.updatedAt,
        },
    });
}

describe("GET /api/tickets", () => {
    beforeAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.devRequester.deleteMany({ where: { email: { contains: "mytickets.test" } } });

        const a = await prisma.devRequester.create({
            data: { name: "Requester A", email: "a.mytickets.test@example.com", isActive: true },
        });
        requesterA = a.id;

        const b = await prisma.devRequester.create({
            data: { name: "Requester B", email: "b.mytickets.test@example.com", isActive: true },
        });
        requesterB = b.id;

        const inactive = await prisma.devRequester.create({
            data: { name: "Inactive Requester", email: "inactive.mytickets.test@example.com", isActive: false },
        });
        inactiveRequesterId = inactive.id;

        const hw = await prisma.category.upsert({
            where: { name: "Hardware" },
            update: { isActive: true },
            create: { name: "Hardware", isActive: true },
        });
        hardwareCategoryId = hw.id;

        const sw = await prisma.category.upsert({
            where: { name: "Software" },
            update: { isActive: true },
            create: { name: "Software", isActive: true },
        });
        softwareCategoryId = sw.id;

        const rs = await prisma.relatedSystem.upsert({
            where: { name: "Corporate Laptop" },
            update: { isActive: true },
            create: { name: "Corporate Laptop", isActive: true },
        });
        relatedSystemId = rs.id;
    });

    afterAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.devRequester.deleteMany({ where: { email: { contains: "mytickets.test" } } });
        await prisma.$disconnect();
    });

    it("returns only the requesting Requester's tickets, never another's (API-08, AC-08, BR-06)", async () => {
        await prisma.ticket.deleteMany({});
        await createTicket({ requesterId: requesterA, summary: "A ticket one" });
        await createTicket({ requesterId: requesterA, summary: "A ticket two" });
        await createTicket({ requesterId: requesterB, summary: "B ticket one" });

        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}`);

        expect(res.status).toBe(200);
        expect(res.body.tickets).toHaveLength(2);
        expect(res.body.tickets.every((t: { summary: string }) => t.summary.startsWith("A ticket"))).toBe(true);

        const first = res.body.tickets[0];
        expect(first).toHaveProperty("id");
        expect(first).toHaveProperty("ticketNumber");
        expect(first).toHaveProperty("summary");
        expect(first.category).toHaveProperty("id");
        expect(first.category).toHaveProperty("name");
        expect(first.relatedSystem).toHaveProperty("id");
        expect(first.relatedSystem).toHaveProperty("name");
        expect(first).toHaveProperty("requestedPriority");
        expect(first).toHaveProperty("currentStatus");
        expect(first).toHaveProperty("createdAt");
        expect(first).toHaveProperty("updatedAt");
    });

    it("filters results by search keyword against ticketNumber or summary (API-09, AC-09)", async () => {
        await prisma.ticket.deleteMany({});
        await createTicket({ requesterId: requesterA, ticketNumber: "TK-20260904-0010", summary: "Laptop battery drains quickly" });
        await createTicket({ requesterId: requesterA, ticketNumber: "TK-20260904-0020", summary: "Cannot connect to VPN" });

        // Search in summary
        const resSummary = await request(app).get(`/api/tickets?requesterId=${requesterA}&search=laptop`);
        expect(resSummary.status).toBe(200);
        expect(resSummary.body.tickets).toHaveLength(1);
        expect(resSummary.body.tickets[0].summary).toMatch(/laptop/i);

        // Search in ticketNumber
        const resNumber = await request(app).get(`/api/tickets?requesterId=${requesterA}&search=0020`);
        expect(resNumber.status).toBe(200);
        expect(resNumber.body.tickets).toHaveLength(1);
        expect(resNumber.body.tickets[0].ticketNumber).toBe("TK-20260904-0020");
    });

    it("filters results by categoryId and status (API-10, AC-10)", async () => {
        await prisma.ticket.deleteMany({});
        await createTicket({ requesterId: requesterA, categoryId: hardwareCategoryId, summary: "Hardware ticket" });
        await createTicket({ requesterId: requesterA, categoryId: softwareCategoryId, summary: "Software ticket" });

        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}&categoryId=${hardwareCategoryId}&status=NEW`);

        expect(res.status).toBe(200);
        expect(res.body.tickets).toHaveLength(1);
        expect(res.body.tickets[0].category.id).toBe(hardwareCategoryId);
        expect(res.body.tickets[0].currentStatus).toBe("NEW");
    });

    it("sorts by createdAt descending by default with id DESC tie-breaker (API-11, AC-11, BR-23)", async () => {
        await prisma.ticket.deleteMany({});
        const first = await createTicket({
            requesterId: requesterA,
            summary: "Oldest ticket",
            createdAt: new Date("2026-09-01T10:00:00.000Z"),
        });
        const second = await createTicket({
            requesterId: requesterA,
            summary: "Newest ticket",
            createdAt: new Date("2026-09-04T10:00:00.000Z"),
        });

        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}`);

        expect(res.status).toBe(200);
        expect(res.body.tickets[0].id).toBe(second.id);
        expect(res.body.tickets[1].id).toBe(first.id);
    });

    it("supports sorting by updatedAt asc and desc (api-spec.md Sec. 5)", async () => {
        await prisma.ticket.deleteMany({});
        const t1 = await createTicket({
            requesterId: requesterA,
            summary: "Ticket 1",
            updatedAt: new Date("2026-09-01T10:00:00.000Z"),
        });
        const t2 = await createTicket({
            requesterId: requesterA,
            summary: "Ticket 2",
            updatedAt: new Date("2026-09-03T10:00:00.000Z"),
        });

        const resAsc = await request(app).get(`/api/tickets?requesterId=${requesterA}&sortBy=updatedAt&sortOrder=asc`);
        expect(resAsc.status).toBe(200);
        expect(resAsc.body.tickets[0].id).toBe(t1.id);
        expect(resAsc.body.tickets[1].id).toBe(t2.id);
    });

    it("paginates results with correct pagination metadata (API-12, AC-12, BR-24)", async () => {
        await prisma.ticket.deleteMany({});
        for (let i = 0; i < 15; i++) {
            await createTicket({ requesterId: requesterA, summary: `Ticket number ${i}` });
        }

        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}&page=2&pageSize=10`);

        expect(res.status).toBe(200);
        expect(res.body.tickets).toHaveLength(5); // 15 total, page 2 of size 10 -> remaining 5
        expect(res.body.pagination).toEqual({
            page: 2,
            pageSize: 10,
            total: 15,
            totalPages: 2,
        });
    });

    it("rejects invalid pageSize (e.g. 7) with 400 VALIDATION_ERROR (API-13, BR-24)", async () => {
        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}&pageSize=7`);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("rejects page < 1 with 400 VALIDATION_ERROR (api-spec.md Sec. 5)", async () => {
        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}&page=0`);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("returns empty tickets array with valid pagination for an out-of-range page", async () => {
        const res = await request(app).get(`/api/tickets?requesterId=${requesterA}&page=999`);

        expect(res.status).toBe(200);
        expect(res.body.tickets).toEqual([]);
        expect(res.body.pagination.page).toBe(999);
    });

    // AC-13
    it("returns an empty tickets array when the Requester has zero tickets (AC-13)", async () => {
        await prisma.ticket.deleteMany({ where: { requesterId: requesterB } });

        const res = await request(app).get(`/api/tickets?requesterId=${requesterB}`);

        expect(res.status).toBe(200);
        expect(res.body.tickets).toEqual([]);
        expect(res.body.pagination.total).toBe(0);
        expect(res.body.pagination.totalPages).toBe(0);
    });

    it("rejects requests without requesterId with 400 VALIDATION_ERROR (api-spec.md Sec. 5)", async () => {
        const res = await request(app).get("/api/tickets");

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 REQUESTER_NOT_FOUND when requesterId does not match an active Requester (api-spec.md Sec. 5)", async () => {
        const resInactive = await request(app).get(`/api/tickets?requesterId=${inactiveRequesterId}`);
        expect(resInactive.status).toBe(404);
        expect(resInactive.body.error).toBe("REQUESTER_NOT_FOUND");

        const resNonExistent = await request(app).get("/api/tickets?requesterId=999999");
        expect(resNonExistent.status).toBe(404);
        expect(resNonExistent.body.error).toBe("REQUESTER_NOT_FOUND");
    });
});