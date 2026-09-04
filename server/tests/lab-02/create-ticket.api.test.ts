import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

// Ref: docs/lab-02/api-spec.md POST /api/tickets
// Ref: docs/lab-02/specification.md AC-01, AC-04, BR-01, BR-02, BR-07, BR-08, BR-11
// Ref: docs/lab-02/tests.md API-01 through API-05

let requesterId: number;
let inactiveRequesterId: number;
let categoryId: number;
let relatedSystemId: number;

describe("POST /api/tickets", () => {
    beforeAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});

        const requester = await prisma.devRequester.upsert({
            where: { email: "alice.tanaka@example.com" },
            update: { isActive: true },
            create: { name: "Alice Tanaka", email: "alice.tanaka@example.com", isActive: true },
        });
        requesterId = requester.id;

        const inactive = await prisma.devRequester.upsert({
            where: { email: "eve.former@example.com" },
            update: { isActive: false },
            create: { name: "Eve Former", email: "eve.former@example.com", isActive: false },
        });
        inactiveRequesterId = inactive.id;

        const category = await prisma.category.upsert({
            where: { name: "Hardware" },
            update: { isActive: true },
            create: { name: "Hardware", isActive: true },
        });
        categoryId = category.id;

        const relatedSystem = await prisma.relatedSystem.upsert({
            where: { name: "Corporate Laptop" },
            update: { isActive: true },
            create: { name: "Corporate Laptop", isActive: true },
        });
        relatedSystemId = relatedSystem.id;
    });

    beforeEach(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
    });

    afterAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.$disconnect();
    });

    it("creates a ticket with valid data and returns 201 with official Ticket Number (API-01, AC-01, BR-01, BR-02)", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId,
                summary: "Laptop battery drains quickly",
                description: "Battery drains fast even when idle, started after last update.",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(201);
        expect(res.body.ticket).toBeDefined();
        expect(res.body.ticket.ticketNumber).toMatch(/^TK-\d{8}-\d{4}$/);
        expect(res.body.ticket.requesterId).toBe(requesterId);
        expect(res.body.ticket.currentStatus).toBe("NEW"); // BR-02

        const saved = await prisma.ticket.findUnique({
            where: { id: res.body.ticket.id },
        });
        expect(saved).not.toBeNull();
    });

    it("creates a ticket with CRITICAL priority (BR-11)", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId,
                summary: "Server is completely down",
                description: "All enterprise services are unreachable across the whole organization.",
                requestedPriority: "CRITICAL",
            });

        expect(res.status).toBe(201);
        expect(res.body.ticket.requestedPriority).toBe("CRITICAL");
    });

    it("rejects a ticket with empty Summary (API-02, AC-04, BR-07)", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId,
                summary: "   ",
                description: "A description that is definitely long enough to pass validation.",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
        expect(res.body.fields).toHaveProperty("summary");

        const count = await prisma.ticket.count();
        expect(count).toBe(0);
    });

    it("rejects a ticket with Summary shorter than 5 chars (API-03, AC-04, BR-07)", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId,
                summary: "Hi",
                description: "A description that is definitely long enough to pass validation.",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
        expect(res.body.fields).toHaveProperty("summary");
    });

    it("rejects a ticket with Description shorter than 10 chars (API-04, AC-04, BR-08)", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId,
                summary: "Valid summary here",
                description: "Short",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
        expect(res.body.fields).toHaveProperty("description");
    });

    it("rejects a ticket with invalid requestedPriority value (API-05, AC-04, BR-11)", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId,
                summary: "Valid summary text",
                description: "A description that is definitely long enough to pass validation.",
                requestedPriority: "URGENT",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");
        expect(res.body.fields).toHaveProperty("requestedPriority");
    });

    it("returns 404 when requesterId does not match an active Requester", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId: inactiveRequesterId,
                categoryId,
                relatedSystemId,
                summary: "Valid summary text",
                description: "A description that is definitely long enough to pass validation.",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("REQUESTER_NOT_FOUND");
    });

    it("returns 404 when categoryId does not exist", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId: 999999,
                relatedSystemId,
                summary: "Valid summary text",
                description: "A description that is definitely long enough to pass validation.",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("CATEGORY_NOT_FOUND");
    });

    it("returns 404 when relatedSystemId does not exist", async () => {
        const res = await request(app)
            .post("/api/tickets")
            .send({
                requesterId,
                categoryId,
                relatedSystemId: 999999,
                summary: "Valid summary text",
                description: "A description that is definitely long enough to pass validation.",
                requestedPriority: "MEDIUM",
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("RELATED_SYSTEM_NOT_FOUND");
    });
});