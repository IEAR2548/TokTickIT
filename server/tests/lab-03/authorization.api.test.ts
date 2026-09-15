import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-03/specification.md section 8 (Authorization Matrix), FR-07, FR-08, BR-03
// Ref: docs/lab-03/tests.md API-09, SEC-05, SEC-08, SEC-09
// Per Issue #31 Step 1a: SEC-05 is scoped in this Issue to GET /api/auth/me only.
// Full endpoint coverage (tickets, staff, admin) lands in #32-#34.

describe("Lab 3 Security Authorization (SEC-05, SEC-08, SEC-09, API-09)", () => {
    let requesterUser: any;
    let foreignUser: any;
    let staffUser: any;
    let adminUser: any;
    let category: any;
    let relatedSystem: any;

    beforeAll(async () => {
        category = await prisma.category.findFirst({ where: { isActive: true } });
        relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        requesterUser = await prisma.user.findFirst({
            where: { email: "alice.tanaka@example.com" },
        });

        foreignUser = await prisma.user.findFirst({
            where: { email: "bob.chavez@example.com" },
        });

        staffUser = await prisma.user.findFirst({
            where: { email: "samira.chen@example.com" },
        });

        adminUser = await prisma.user.findFirst({
            where: { email: "alex.morgan@example.com" },
        });
    });

    afterAll(async () => {
        await prisma.ticket.deleteMany({
            where: {
                summary: { startsWith: "API-09" }
            }
        });
        await prisma.$disconnect();
    });

    it("SEC-05: Unauthenticated request to GET /api/auth/me returns 401 UNAUTHENTICATED", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("UNAUTHENTICATED");
        expect(res.body.message).toMatch(/Authentication required/i);
    });

    it("SEC-08: Unauthenticated request to POST /api/auth/change-password returns 401 UNAUTHENTICATED", async () => {
        const res = await request(app)
            .post("/api/auth/change-password")
            .send({
                currentPassword: "SomePassword123!",
                newPassword: "NewPassword123!",
            });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("UNAUTHENTICATED");
        expect(res.body.message).toMatch(/Authentication required/i);
    });

    it("SEC-08: Request with invalid/tampered session cookie returns 401 UNAUTHENTICATED", async () => {
        const res = await request(app)
            .post("/api/auth/change-password")
            .set("Cookie", "toktickit_session=invalid.tampered.token")
            .send({
                currentPassword: "SomePassword123!",
                newPassword: "NewPassword123!",
            });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("UNAUTHENTICATED");
    });

    describe("API-09: Requester supplies foreign requesterId in request body/query (BR-03, FR-08)", () => {
        it("API-09: ignores client-supplied requesterId in POST /api/tickets body and uses req.user.id from session", async () => {
            const token = signSessionToken({
                userId: requesterUser.id,
                role: "REQUESTER",
                mustChangePassword: false,
            });

            const res = await request(app)
                .post("/api/tickets")
                .set("Cookie", `toktickit_session=${token}`)
                .send({
                    requesterId: foreignUser.id,
                    summary: "API-09 Foreign ID Ticket",
                    description: "Backend must ignore requesterId in body and use session userId",
                    categoryId: category.id,
                    relatedSystemId: relatedSystem.id,
                    requestedPriority: "MEDIUM",
                });

            expect(res.status).toBe(201);
            const ticketData = res.body.data || res.body.ticket;
            expect(ticketData).toBeDefined();
            expect(ticketData.requesterId).toBe(requesterUser.id);
            expect(ticketData.requesterId).not.toBe(foreignUser.id);

            const savedTicket = await prisma.ticket.findUnique({
                where: { id: ticketData.id },
            });
            expect(savedTicket?.requesterId).toBe(requesterUser.id);
        });

        it("API-09: ignores client-supplied requesterId in GET /api/tickets query and uses req.user.id from session", async () => {
            const token = signSessionToken({
                userId: requesterUser.id,
                role: "REQUESTER",
                mustChangePassword: false,
            });

            const res = await request(app)
                .get(`/api/tickets?requesterId=${foreignUser.id}`)
                .set("Cookie", `toktickit_session=${token}`);

            expect(res.status).toBe(200);
            const tickets = res.body.data || res.body.tickets;
            expect(Array.isArray(tickets)).toBe(true);
            for (const ticket of tickets) {
                expect(ticket.requesterId).toBe(requesterUser.id);
            }
        });
    });

    describe("SEC-09: Authenticated non-REQUESTER callers get 403 FORBIDDEN on POST /api/tickets (FR-07)", () => {
        it("SEC-09: authenticated IT_STAFF caller gets 403 FORBIDDEN when calling POST /api/tickets", async () => {
            const token = signSessionToken({
                userId: staffUser.id,
                role: "IT_STAFF",
                mustChangePassword: false,
            });

            const res = await request(app)
                .post("/api/tickets")
                .set("Cookie", `toktickit_session=${token}`)
                .send({
                    summary: "Staff creating ticket should be forbidden",
                    description: "Only requesters can create tickets per FR-07 / Decision D-5",
                    categoryId: category.id,
                    relatedSystemId: relatedSystem.id,
                    requestedPriority: "MEDIUM",
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("FORBIDDEN");
        });

        it("SEC-09: authenticated ADMINISTRATOR caller gets 403 FORBIDDEN when calling POST /api/tickets", async () => {
            const token = signSessionToken({
                userId: adminUser.id,
                role: "ADMINISTRATOR",
                mustChangePassword: false,
            });

            const res = await request(app)
                .post("/api/tickets")
                .set("Cookie", `toktickit_session=${token}`)
                .send({
                    summary: "Admin creating ticket should be forbidden",
                    description: "Only requesters can create tickets per FR-07 / Decision D-5",
                    categoryId: category.id,
                    relatedSystemId: relatedSystem.id,
                    requestedPriority: "MEDIUM",
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("FORBIDDEN");
        });
    });

    describe("SEC-07: Authenticated REQUESTER caller gets 403 FORBIDDEN on GET /api/staff/tickets (AC-33)", () => {
        it("SEC-07: authenticated REQUESTER caller gets 403 FORBIDDEN when calling GET /api/staff/tickets", async () => {
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
    });

    describe("SEC-02: Authenticated REQUESTER caller gets 403 FORBIDDEN on PATCH /api/staff/tickets/:id/it-priority (AC-10)", () => {
        it("SEC-02: authenticated REQUESTER caller gets 403 FORBIDDEN when calling PATCH it-priority", async () => {
            const token = signSessionToken({
                userId: requesterUser.id,
                role: "REQUESTER",
                mustChangePassword: false,
            });

            const res = await request(app)
                .patch("/api/staff/tickets/1/it-priority")
                .set("Cookie", `toktickit_session=${token}`)
                .send({ itPriority: "HIGH" });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("FORBIDDEN");
        });
    });

    describe("SEC-03: Authenticated REQUESTER caller gets 403 FORBIDDEN on PATCH /api/staff/tickets/:id/status (AC-32)", () => {
        it("SEC-03: authenticated REQUESTER caller gets 403 FORBIDDEN when calling PATCH status", async () => {
            const token = signSessionToken({
                userId: requesterUser.id,
                role: "REQUESTER",
                mustChangePassword: false,
            });

            const res = await request(app)
                .patch("/api/staff/tickets/1/status")
                .set("Cookie", `toktickit_session=${token}`)
                .send({ status: "CLOSED" });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("FORBIDDEN");
        });
    });

    describe("SEC-06: Authenticated REQUESTER caller gets 403 FORBIDDEN on GET /api/tickets/:id/notes (AC-04/FR-09)", () => {
        it("SEC-06: authenticated REQUESTER caller gets 403 FORBIDDEN and no note data on GET notes", async () => {
            const token = signSessionToken({
                userId: requesterUser.id,
                role: "REQUESTER",
                mustChangePassword: false,
            });

            const res = await request(app)
                .get("/api/tickets/1/notes")
                .set("Cookie", `toktickit_session=${token}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("FORBIDDEN");
            expect(res.body.data).toBeUndefined();
        });
    });
});
