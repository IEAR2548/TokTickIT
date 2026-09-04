import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

// Ref: docs/lab-02/api-spec.md Section 7 POST /api/tickets/:id/attachments
// Ref: docs/lab-02/specification.md BR-15, BR-16, BR-17, BR-19
// Ref: docs/lab-02/tests.md API-14 through API-17

let requesterId: number;
let otherRequesterId: number;
let ticketId: number;

const PNG_1KB = Buffer.alloc(1024, 1);
const PDF_1KB = Buffer.from("%PDF-1.4 fake pdf content");

describe("POST /api/tickets/:id/attachments", () => {
    beforeAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});

        const requester = await prisma.devRequester.upsert({
            where: { email: "alice.tanaka@example.com" },
            update: { isActive: true },
            create: { name: "Alice Tanaka", email: "alice.tanaka@example.com", isActive: true },
        });
        requesterId = requester.id;

        const other = await prisma.devRequester.upsert({
            where: { email: "bob.chavez@example.com" },
            update: { isActive: true },
            create: { name: "Bob Chavez", email: "bob.chavez@example.com", isActive: true },
        });
        otherRequesterId = other.id;

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

        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber: "TK-20260904-9001",
                requesterId,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                summary: "Attachment test ticket",
                description: "Ticket used solely for attachment upload tests.",
                requestedPriority: "LOW",
            },
        });
        ticketId = ticket.id;
    });

    afterAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.$disconnect();
    });

    it("uploads a valid PNG under 5MB and returns 201 (API-14, AC-16)", async () => {
        const res = await request(app)
            .post(`/api/tickets/${ticketId}/attachments`)
            .field("requesterId", requesterId)
            .attach("file", PNG_1KB, { filename: "battery.png", contentType: "image/png" });

        expect(res.status).toBe(201);
        expect(res.body.attachment).toBeDefined();
        expect(res.body.attachment.originalName).toBe("battery.png");
        expect(res.body.attachment.mimeType).toBe("image/png");
        expect(res.body.attachment.ticketId).toBe(ticketId);
        expect(res.body.attachment.isRemoved).toBe(false);
    });

    it("rejects an unsupported file type with 400 UNSUPPORTED_FILE_TYPE (API-15, AC-06, BR-15)", async () => {
        const res = await request(app)
            .post(`/api/tickets/${ticketId}/attachments`)
            .field("requesterId", requesterId)
            .attach("file", Buffer.from("MZ fake executable"), {
                filename: "malware.exe",
                contentType: "application/x-msdownload",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("UNSUPPORTED_FILE_TYPE");
    });

    it("rejects a file larger than 5MB with 400 FILE_TOO_LARGE (API-16, AC-06, BR-16)", async () => {
        const bigFile = Buffer.alloc(6 * 1024 * 1024, 1);
        const res = await request(app)
            .post(`/api/tickets/${ticketId}/attachments`)
            .field("requesterId", requesterId)
            .attach("file", bigFile, { filename: "huge.pdf", contentType: "application/pdf" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("FILE_TOO_LARGE");
    });

    it("rejects upload if ticket belongs to another requester with 403 FORBIDDEN", async () => {
        const res = await request(app)
            .post(`/api/tickets/${ticketId}/attachments`)
            .field("requesterId", otherRequesterId)
            .attach("file", PNG_1KB, { filename: "forbidden.png", contentType: "image/png" });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
    });

    it("rejects upload if ticket does not exist with 404 NOT_FOUND", async () => {
        const res = await request(app)
            .post(`/api/tickets/999999/attachments`)
            .field("requesterId", requesterId)
            .attach("file", PNG_1KB, { filename: "test.png", contentType: "image/png" });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("NOT_FOUND");
    });

    it("rejects the 6th active attachment on a ticket with 400 ATTACHMENT_LIMIT_REACHED (API-17, AC-07, BR-17)", async () => {
        // 1 uploaded in first test, add 4 more valid ones to reach 5
        for (let i = 0; i < 4; i++) {
            const added = await request(app)
                .post(`/api/tickets/${ticketId}/attachments`)
                .field("requesterId", requesterId)
                .attach("file", PDF_1KB, { filename: `doc-${i}.pdf`, contentType: "application/pdf" });
            expect(added.status).toBe(201);
        }

        const sixth = await request(app)
            .post(`/api/tickets/${ticketId}/attachments`)
            .field("requesterId", requesterId)
            .attach("file", PDF_1KB, { filename: "one-too-many.pdf", contentType: "application/pdf" });

        expect(sixth.status).toBe(400);
        expect(sixth.body.error).toBe("ATTACHMENT_LIMIT_REACHED");
    });
});
