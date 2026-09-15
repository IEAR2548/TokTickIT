import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-03/api-spec.md endpoint 20 (GET /api/staff/tickets)
// Ref: docs/lab-03/specification.md AC-23, AC-33
// Ref: docs/lab-03/tests.md API-19, SEC-07

describe("Staff Ticket Queue API (API-19, SEC-07)", () => {
    let staffUser: any;
    let otherStaffUser: any;
    let adminUser: any;
    let requesterUser: any;
    let category: any;
    let relatedSystem: any;
    let testTickets: any[] = [];

    beforeAll(async () => {
        staffUser = await prisma.user.findFirst({
            where: { email: "samira.chen@example.com" },
        });

        otherStaffUser = await prisma.user.findFirst({
            where: { email: "marcus.vance@example.com" },
        });

        adminUser = await prisma.user.findFirst({
            where: { email: "alex.morgan@example.com" },
        });

        requesterUser = await prisma.user.findFirst({
            where: { email: "alice.tanaka@example.com" },
        });

        category = await prisma.category.findFirst({ where: { isActive: true } });
        relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        // Clean up any existing API-19 test tickets
        await prisma.ticket.deleteMany({
            where: { summary: { startsWith: "API-19" } },
        });

        // Seed structured tickets for deterministic search/filter/sort/pagination tests
        const ticketA = await prisma.ticket.create({
            data: {
                ticketNumber: "TKT-9901",
                summary: "API-19 Alpha Laptop Issue",
                description: "Test ticket A description",
                requesterId: requesterUser.id,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                requestedPriority: "LOW",
                itPriority: "CRITICAL",
                currentStatus: "NEW",
                ownerId: null, // unassigned
            },
        });

        const ticketB = await prisma.ticket.create({
            data: {
                ticketNumber: "TKT-9902",
                summary: "API-19 Beta Monitor Flicker",
                description: "Test ticket B description",
                requesterId: requesterUser.id,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                requestedPriority: "HIGH",
                itPriority: "LOW",
                currentStatus: "IN_PROGRESS",
                ownerId: staffUser.id,
            },
        });

        const ticketC = await prisma.ticket.create({
            data: {
                ticketNumber: "TKT-9903",
                summary: "API-19 Gamma Network Outage",
                description: "Test ticket C description",
                requesterId: requesterUser.id,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                requestedPriority: "CRITICAL",
                itPriority: "MEDIUM",
                currentStatus: "RESOLVED",
                ownerId: otherStaffUser.id,
            },
        });

        testTickets = [ticketA, ticketB, ticketC];
    });

    afterAll(async () => {
        await prisma.ticket.deleteMany({
            where: { summary: { startsWith: "API-19" } },
        });
        await prisma.$disconnect();
    });

    function getStaffCookie(user: any = staffUser) {
        const token = signSessionToken({
            userId: user.id,
            role: user.role,
            mustChangePassword: false,
        });
        return `toktickit_session=${token}`;
    }

    describe("Authorization & Security (SEC-07)", () => {
        it("SEC-07: Unauthenticated request to GET /api/staff/tickets returns 401 UNAUTHENTICATED", async () => {
            const res = await request(app).get("/api/staff/tickets");
            expect(res.status).toBe(401);
            expect(res.body.error).toBe("UNAUTHENTICATED");
        });

        it("SEC-07: Authenticated REQUESTER caller gets 403 FORBIDDEN on GET /api/staff/tickets", async () => {
            const token = signSessionToken({
                userId: requesterUser.id,
                role: "REQUESTER",
                mustChangePassword: false,
            });

            const res = await request(app)
                .get("/api/staff/tickets")
                .set("Cookie", `toktickit_session=${token}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("FORBIDDEN");
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it("allows access to IT_STAFF and ADMINISTRATOR roles", async () => {
            const staffRes = await request(app)
                .get("/api/staff/tickets")
                .set("Cookie", getStaffCookie(staffUser));
            expect(staffRes.status).toBe(200);

            const adminRes = await request(app)
                .get("/api/staff/tickets")
                .set("Cookie", getStaffCookie(adminUser));
            expect(adminRes.status).toBe(200);
        });
    });

    describe("API-19: Search filter (ticketNumber and summary)", () => {
        it("filters tickets matching ticketNumber substring", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=9901")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            const found = res.body.data.find((t: any) => t.ticketNumber === "TKT-9901");
            expect(found).toBeDefined();
            expect(found.summary).toBe("API-19 Alpha Laptop Issue");
        });

        it("filters tickets matching summary substring case-insensitively", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=monitor flicker")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            const found = res.body.data.find((t: any) => t.ticketNumber === "TKT-9902");
            expect(found).toBeDefined();
        });
    });

    describe("API-19: Filters (status, itPriority, ownerId)", () => {
        it("filters tickets by status", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?status=NEW&search=API-19")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].currentStatus).toBe("NEW");
            expect(res.body.data[0].ticketNumber).toBe("TKT-9901");
        });

        it("filters tickets by itPriority", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?itPriority=CRITICAL&search=API-19")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].itPriority).toBe("CRITICAL");
            expect(res.body.data[0].ticketNumber).toBe("TKT-9901");
        });

        it("filters unassigned tickets with ownerId=unassigned", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?ownerId=unassigned&search=API-19")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].ownerId).toBeNull();
            expect(res.body.data[0].ticketNumber).toBe("TKT-9901");
        });

        it("filters tickets by specific ownerId", async () => {
            const res = await request(app)
                .get(`/api/staff/tickets?ownerId=${staffUser.id}&search=API-19`)
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].ownerId).toBe(staffUser.id);
            expect(res.body.data[0].ticketNumber).toBe("TKT-9902");
        });
    });

    describe("API-19: Sorting across all Step 1 Option (b) supported fields", () => {
        it("sorts by createdAt asc/desc", async () => {
            const resAsc = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=createdAt&sortDir=asc")
                .set("Cookie", getStaffCookie());
            expect(resAsc.status).toBe(200);
            expect(resAsc.body.data[0].ticketNumber).toBe("TKT-9901");

            const resDesc = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=createdAt&sortDir=desc")
                .set("Cookie", getStaffCookie());
            expect(resDesc.status).toBe(200);
            expect(resDesc.body.data[0].ticketNumber).toBe("TKT-9903");
        });

        it("sorts by updatedAt asc/desc", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=updatedAt&sortDir=desc")
                .set("Cookie", getStaffCookie());
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
        });

        it("sorts by itPriority asc/desc", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=itPriority&sortDir=asc")
                .set("Cookie", getStaffCookie());
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
        });

        it("sorts by requestedPriority asc/desc (Step 1 Option b)", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=requestedPriority&sortDir=asc")
                .set("Cookie", getStaffCookie());
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
        });

        it("sorts by currentStatus asc/desc (Step 1 Option b)", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=currentStatus&sortDir=asc")
                .set("Cookie", getStaffCookie());
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
        });

        it("sorts by ownerName asc/desc (Step 1 Option b)", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=API-19&sortBy=ownerName&sortDir=asc")
                .set("Cookie", getStaffCookie());
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
        });
    });

    describe("API-19: Pagination and metadata shape", () => {
        it("returns paginated data with correct metadata shape", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?page=1&pageSize=10")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.meta).toBeDefined();
            expect(res.body.meta).toEqual({
                page: 1,
                pageSize: 10,
                totalCount: expect.any(Number),
                totalPages: expect.any(Number),
            });
            expect(res.body.data.length).toBeLessThanOrEqual(10);
        });

        it("includes ticket relations: owner, category, relatedSystem, requester", async () => {
            const res = await request(app)
                .get("/api/staff/tickets?search=9902")
                .set("Cookie", getStaffCookie());

            expect(res.status).toBe(200);
            const ticket = res.body.data[0];
            expect(ticket).toBeDefined();
            expect(ticket.owner).toBeDefined();
            expect(ticket.owner.name).toBe(staffUser.name);
            expect(ticket.category).toBeDefined();
            expect(ticket.relatedSystem).toBeDefined();
            expect(ticket.requester).toBeDefined();
        });
    });
});
