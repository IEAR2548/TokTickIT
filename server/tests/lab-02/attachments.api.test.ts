import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

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

describe("GET /api/attachments/:id/download", () => {
    let ownerId: number;
    let otherId: number;
    let downloadTicketId: number;
    let removedAttachmentId: number;
    let activeAttachmentId: number;
    let removedAndForeignAttachmentId: number;

    beforeAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});

        const owner = await prisma.devRequester.upsert({
            where: { email: "carol.gomez@example.com" },
            update: { isActive: true },
            create: { name: "Carol Gomez", email: "carol.gomez@example.com", isActive: true },
        });
        ownerId = owner.id;

        const other = await prisma.devRequester.upsert({
            where: { email: "dave.kim@example.com" },
            update: { isActive: true },
            create: { name: "Dave Kim", email: "dave.kim@example.com", isActive: true },
        });
        otherId = other.id;

        const category = await prisma.category.findFirst({ where: { isActive: true } });
        const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber: "TK-20260904-9101",
                requesterId: ownerId,
                categoryId: category!.id,
                relatedSystemId: system!.id,
                summary: "Download lifecycle test ticket",
                description: "Ticket used solely for download endpoint tests.",
                requestedPriority: "MEDIUM",
            },
        });
        downloadTicketId = ticket.id;

        const activeAttachment = await prisma.attachment.create({
            data: {
                ticketId: downloadTicketId,
                originalName: "active-file.png",
                storageKey: "test-storage-key-download-active-1",
                mimeType: "image/png",
                sizeBytes: 1024,
                isRemoved: false,
            },
        });
        activeAttachmentId = activeAttachment.id;

        const removedAttachment = await prisma.attachment.create({
            data: {
                ticketId: downloadTicketId,
                originalName: "removed-file.png",
                storageKey: "test-storage-key-download-removed-1",
                mimeType: "image/png",
                sizeBytes: 1024,
                isRemoved: true,
                removalReason: "Uploaded wrong file version",
                removedAt: new Date(),
            },
        });
        removedAttachmentId = removedAttachment.id;

        const removedAndForeign = await prisma.attachment.create({
            data: {
                ticketId: downloadTicketId,
                originalName: "removed-foreign-file.pdf",
                storageKey: "test-storage-key-download-removed-foreign-1",
                mimeType: "application/pdf",
                sizeBytes: 2048,
                isRemoved: true,
                removalReason: "No longer needed",
                removedAt: new Date(),
            },
        });
        removedAndForeignAttachmentId = removedAndForeign.id;
    });

    afterAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.$disconnect();
    });

    it("returns 404 ATTACHMENT_REMOVED and sends no binary body when the file was soft-removed (API-19)", async () => {
        const res = await request(app)
            .get(`/api/attachments/${removedAttachmentId}/download`)
            .query({ requesterId: ownerId });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("ATTACHMENT_REMOVED");
        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.headers["content-disposition"]).toBeUndefined();
    });

    it("returns 403 FORBIDDEN when the attachment belongs to another requester's ticket", async () => {
        const res = await request(app)
            .get(`/api/attachments/${activeAttachmentId}/download`)
            .query({ requesterId: otherId });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
    });

    it("returns 403 FORBIDDEN (not 404 ATTACHMENT_REMOVED) when a non-owner requests an already-removed attachment — ownership is checked before removal state", async () => {
        const res = await request(app)
            .get(`/api/attachments/${removedAndForeignAttachmentId}/download`)
            .query({ requesterId: otherId });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
    });
});

describe("PATCH /api/attachments/:id/remove", () => {
    let ownerId: number;
    let otherId: number;
    let removeTicketId: number;
    let successAttachmentId: number;
    let validationAttachmentId: number;
    let alreadyRemovedAttachmentId: number;

    beforeAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});

        const owner = await prisma.devRequester.upsert({
            where: { email: "erin.walsh@example.com" },
            update: { isActive: true },
            create: { name: "Erin Walsh", email: "erin.walsh@example.com", isActive: true },
        });
        ownerId = owner.id;

        const other = await prisma.devRequester.upsert({
            where: { email: "frank.oduya@example.com" },
            update: { isActive: true },
            create: { name: "Frank Oduya", email: "frank.oduya@example.com", isActive: true },
        });
        otherId = other.id;

        const category = await prisma.category.findFirst({ where: { isActive: true } });
        const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        const ticket = await prisma.ticket.create({
            data: {
                ticketNumber: "TK-20260904-9102",
                requesterId: ownerId,
                categoryId: category!.id,
                relatedSystemId: system!.id,
                summary: "Remove lifecycle test ticket",
                description: "Ticket used solely for soft-remove endpoint tests.",
                requestedPriority: "HIGH",
            },
        });
        removeTicketId = ticket.id;

        const successAttachment = await prisma.attachment.create({
            data: {
                ticketId: removeTicketId,
                originalName: "to-be-removed.png",
                storageKey: "test-storage-key-remove-success-1",
                mimeType: "image/png",
                sizeBytes: 1024,
                isRemoved: false,
            },
        });
        successAttachmentId = successAttachment.id;

        const validationAttachment = await prisma.attachment.create({
            data: {
                ticketId: removeTicketId,
                originalName: "validation-target.png",
                storageKey: "test-storage-key-remove-validation-1",
                mimeType: "image/png",
                sizeBytes: 1024,
                isRemoved: false,
            },
        });
        validationAttachmentId = validationAttachment.id;

        const alreadyRemoved = await prisma.attachment.create({
            data: {
                ticketId: removeTicketId,
                originalName: "already-removed.pdf",
                storageKey: "test-storage-key-remove-already-1",
                mimeType: "application/pdf",
                sizeBytes: 2048,
                isRemoved: true,
                removalReason: "Duplicate upload",
                removedAt: new Date(),
            },
        });
        alreadyRemovedAttachmentId = alreadyRemoved.id;
    });

    afterAll(async () => {
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.$disconnect();
    });

    it("soft-removes an attachment with a valid reason and returns 200 with isRemoved/removalReason/removedAt recorded (API-18)", async () => {
        const res = await request(app)
            .patch(`/api/attachments/${successAttachmentId}/remove`)
            .send({ requesterId: ownerId, removalReason: "Uploaded wrong file version" });

        expect(res.status).toBe(200);
        expect(res.body.attachment).toBeDefined();
        expect(res.body.attachment.id).toBe(successAttachmentId);
        expect(res.body.attachment.isRemoved).toBe(true);
        expect(res.body.attachment.removalReason).toBe("Uploaded wrong file version");
        expect(res.body.attachment.removedAt).toBeDefined();
        expect(res.body.attachment.removedAt).not.toBeNull();

        // Confirm the state was actually persisted, not just echoed in the response.
        const persisted = await prisma.attachment.findUnique({ where: { id: successAttachmentId } });
        expect(persisted?.isRemoved).toBe(true);
        expect(persisted?.removalReason).toBe("Uploaded wrong file version");
        expect(persisted?.removedAt).not.toBeNull();
    });

    it("rejects an empty removalReason with 400 VALIDATION_ERROR and does not modify the attachment (API-20)", async () => {
        const res = await request(app)
            .patch(`/api/attachments/${validationAttachmentId}/remove`)
            .send({ requesterId: ownerId, removalReason: "" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");

        const persisted = await prisma.attachment.findUnique({ where: { id: validationAttachmentId } });
        expect(persisted?.isRemoved).toBe(false);
    });

    it("rejects a whitespace-only removalReason with 400 VALIDATION_ERROR (API-20)", async () => {
        const res = await request(app)
            .patch(`/api/attachments/${validationAttachmentId}/remove`)
            .send({ requesterId: ownerId, removalReason: "   " });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("VALIDATION_ERROR");

        const persisted = await prisma.attachment.findUnique({ where: { id: validationAttachmentId } });
        expect(persisted?.isRemoved).toBe(false);
    });

    it("rejects removing an attachment that is already removed with 400 ALREADY_REMOVED", async () => {
        const res = await request(app)
            .patch(`/api/attachments/${alreadyRemovedAttachmentId}/remove`)
            .send({ requesterId: ownerId, removalReason: "Trying to remove again" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("ALREADY_REMOVED");
    });

    it("returns 403 FORBIDDEN when a non-owner attempts to remove an attachment on someone else's ticket", async () => {
        const res = await request(app)
            .patch(`/api/attachments/${validationAttachmentId}/remove`)
            .send({ requesterId: otherId, removalReason: "Not my ticket" });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
    });

    it("returns 403 FORBIDDEN (not 400 ALREADY_REMOVED) when a non-owner targets an already-removed attachment — ownership is checked before removal state", async () => {
        const res = await request(app)
            .patch(`/api/attachments/${alreadyRemovedAttachmentId}/remove`)
            .send({ requesterId: otherId, removalReason: "Not my ticket" });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
    });
});