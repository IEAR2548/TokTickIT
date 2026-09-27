import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

const MARKER = "TKT-L4ACT";
let seq = 0;

describe("Actions Taken API (API-01..08, API-18..20, API-23, API-27, WF-03)", () => {
    let requesterAlice: any;
    let requesterBob: any;
    let staffSamira: any;
    let staffMarcus: any;
    let adminAlex: any;
    let category: any;
    let relatedSystem: any;

    let aliceToken: string;
    let bobToken: string;
    let samiraToken: string;
    let marcusToken: string;
    let adminToken: string;

    async function createTicket(opts: {
        status?: any;
        ownerId?: number | null;
        requesterId?: number;
        summary?: string;
    } = {}) {
        seq += 1;
        return prisma.ticket.create({
            data: {
                ticketNumber: `${MARKER}-${Date.now()}-${seq}`,
                requesterId: opts.requesterId ?? requesterAlice.id,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                requestedPriority: "MEDIUM",
                itPriority: "MEDIUM",
                currentStatus: opts.status ?? "NEW",
                summary: opts.summary ?? `${MARKER} fixture ticket`,
                description: "Lab 4 Actions Taken test fixture ticket.",
                ownerId: opts.ownerId === undefined ? staffSamira.id : opts.ownerId,
            },
        });
    }

    function postAction(ticketId: number, body: any, token: string, key?: string) {
        const req = request(app)
            .post(`/api/tickets/${ticketId}/actions`)
            .set("Cookie", `toktickit_session=${token}`);
        if (key !== undefined) req.set("Idempotency-Key", key);
        return req.send(body);
    }

    beforeAll(async () => {
        requesterAlice = await prisma.user.findFirst({ where: { email: "alice.tanaka@example.com" } });
        requesterBob = await prisma.user.findFirst({ where: { email: "bob.chavez@example.com" } });
        staffSamira = await prisma.user.findFirst({ where: { email: "samira.chen@example.com" } });
        staffMarcus = await prisma.user.findFirst({ where: { email: "marcus.vance@example.com" } });
        adminAlex = await prisma.user.findFirst({ where: { email: "alex.morgan@example.com" } });
        category = await prisma.category.findFirst({ where: { isActive: true } });
        relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        aliceToken = signSessionToken({ userId: requesterAlice.id, role: "REQUESTER", mustChangePassword: false });
        bobToken = signSessionToken({ userId: requesterBob.id, role: "REQUESTER", mustChangePassword: false });
        samiraToken = signSessionToken({ userId: staffSamira.id, role: "IT_STAFF", mustChangePassword: false });
        marcusToken = signSessionToken({ userId: staffMarcus.id, role: "IT_STAFF", mustChangePassword: false });
        adminToken = signSessionToken({ userId: adminAlex.id, role: "ADMINISTRATOR", mustChangePassword: false });
    });

    afterAll(async () => {
        await prisma.actionTaken.deleteMany({ where: { ticket: { ticketNumber: { startsWith: MARKER } } } });
        await prisma.ticket.deleteMany({ where: { ticketNumber: { startsWith: MARKER } } });
        await prisma.$disconnect();
    });

    it("API-01: server ignores a client-supplied performedById and uses the session actor", async () => {
        const ticket = await createTicket();
        const res = await postAction(
            ticket.id,
            {
                description: "Reset the account password.",
                result: "Requester can log in again.",
                performedById: staffMarcus.id,
            },
            samiraToken,
            `key-api01-${ticket.id}`
        );

        expect(res.status).toBe(201);
        expect(res.body.data.performedBy.id).toBe(staffSamira.id);

        const stored = await prisma.actionTaken.findFirst({ where: { ticketId: ticket.id } });
        expect(stored!.performedById).toBe(staffSamira.id);
        expect(stored!.performedById).not.toBe(staffMarcus.id);
    });

    it("API-02: a Requester cannot create an Action Taken (403)", async () => {
        const ticket = await createTicket({ requesterId: requesterAlice.id });
        const res = await postAction(
            ticket.id,
            { description: "Let me add this.", result: "n/a" },
            aliceToken,
            `key-api02-${ticket.id}`
        );

        expect(res.status).toBe(403);
        const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
        expect(count).toBe(0);
    });

    it("API-03: creates a valid Action Taken under the correct Ticket and actor (exactly one Ticket)", async () => {
        const ticket = await createTicket();
        const res = await postAction(
            ticket.id,
            {
                description: "Replaced network cable and re-tested the port.",
                result: "Connection stable after replacement.",
                followUpRequired: true,
                followUpNote: "Check again after 24h under load.",
                attachmentNotes: "See photo IMG_0231.jpg in ticket attachments.",
            },
            samiraToken,
            `key-api03-${ticket.id}`
        );

        expect(res.status).toBe(201);
        expect(res.body.data.ticketId).toBe(ticket.id);
        expect(res.body.data.performedBy.id).toBe(staffSamira.id);
        expect(res.body.data.description).toBe("Replaced network cable and re-tested the port.");

        const rows = await prisma.actionTaken.findMany({ where: { ticketId: ticket.id } });
        expect(rows.length).toBe(1);
        expect(rows[0].ticketId).toBe(ticket.id);
    });

    it("API-04: followUpRequired=true with empty followUpNote is rejected with a field-level 400 and no record", async () => {
        const ticket = await createTicket();
        const res = await postAction(
            ticket.id,
            { description: "Investigate.", result: "Pending.", followUpRequired: true, followUpNote: "" },
            samiraToken,
            `key-api04-${ticket.id}`
        );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.fields.followUpNote).toBeDefined();

        const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
        expect(count).toBe(0);
    });

    it("API-05: creating on a Cancelled Ticket returns 409 TICKET_CANCELLED and creates no record (AC-12)", async () => {
        const ticket = await createTicket({ status: "CANCELLED" });
        const res = await postAction(
            ticket.id,
            { description: "Late work.", result: "Should not persist." },
            samiraToken,
            `key-api05-${ticket.id}`
        );

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("TICKET_CANCELLED");

        const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
        expect(count).toBe(0);
    });

    it("API-06: a creator editing after 16 minutes is rejected with 403 EDIT_WINDOW_EXPIRED (BR-10)", async () => {
        const ticket = await createTicket();
        const created = await postAction(
            ticket.id,
            { description: "Original.", result: "Original." },
            samiraToken,
            `key-api06-${ticket.id}`
        );
        const actionId = created.body.data.id;

        await prisma.actionTaken.update({
            where: { id: actionId },
            data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) },
        });
        const fresh = await prisma.actionTaken.findUnique({ where: { id: actionId } });

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/actions/${actionId}`)
            .set("Cookie", `toktickit_session=${samiraToken}`)
            .send({ description: "Edited too late.", expectedUpdatedAt: fresh!.updatedAt.toISOString() });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("EDIT_WINDOW_EXPIRED");

        const stored = await prisma.actionTaken.findUnique({ where: { id: actionId } });
        expect(stored!.description).toBe("Original.");
    });

    it("API-07: an Administrator may edit after 16 minutes (200, BR-10)", async () => {
        const ticket = await createTicket();
        const created = await postAction(
            ticket.id,
            { description: "Original admin-edit.", result: "Original." },
            samiraToken,
            `key-api07-${ticket.id}`
        );
        const actionId = created.body.data.id;

        await prisma.actionTaken.update({
            where: { id: actionId },
            data: { createdAt: new Date(Date.now() - 16 * 60 * 1000) },
        });
        const fresh = await prisma.actionTaken.findUnique({ where: { id: actionId } });

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/actions/${actionId}`)
            .set("Cookie", `toktickit_session=${adminToken}`)
            .send({ description: "Admin corrected this.", expectedUpdatedAt: fresh!.updatedAt.toISOString() });

        expect(res.status).toBe(200);
        expect(res.body.data.description).toBe("Admin corrected this.");
    });

    it("API-08: a stale expectedUpdatedAt on edit returns 409 STALE_UPDATE with the current record, no overwrite (BR-14)", async () => {
        const ticket = await createTicket();
        const created = await postAction(
            ticket.id,
            { description: "Before.", result: "Before." },
            samiraToken,
            `key-api08-${ticket.id}`
        );
        const actionId = created.body.data.id;
        const staleUpdatedAt = created.body.data.updatedAt;

        await prisma.actionTaken.update({
            where: { id: actionId },
            data: { result: "Changed by someone else." },
        });

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/actions/${actionId}`)
            .set("Cookie", `toktickit_session=${samiraToken}`)
            .send({ description: "My overwrite attempt.", expectedUpdatedAt: staleUpdatedAt });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("STALE_UPDATE");
        expect(res.body.error.data.current.id).toBe(actionId);
        expect(res.body.error.data.current.result).toBe("Changed by someone else.");

        const stored = await prisma.actionTaken.findUnique({ where: { id: actionId } });
        expect(stored!.description).toBe("Before.");
        expect(stored!.result).toBe("Changed by someone else.");
    });

    it("API-18: replaying the same Idempotency-Key returns the original record with 200 and creates no duplicate (BR-17)", async () => {
        const ticket = await createTicket();
        const body = { description: "Idempotent create.", result: "Once only." };
        const key = `key-api18-${ticket.id}`;

        const first = await postAction(ticket.id, body, samiraToken, key);
        expect(first.status).toBe(201);

        const second = await postAction(ticket.id, body, samiraToken, key);
        expect(second.status).toBe(200);
        expect(second.body.data.id).toBe(first.body.data.id);

        const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
        expect(count).toBe(1);
    });

    it("API-19: a Requester cannot list Actions Taken for a Ticket they do not own (403/404)", async () => {
        const ownTicket = await createTicket({ requesterId: requesterAlice.id });
        await postAction(
            ownTicket.id,
            { description: "Alice's action.", result: "Visible to owner." },
            samiraToken,
            `key-api19-own-${ownTicket.id}`
        );
        const ownRes = await request(app)
            .get(`/api/tickets/${ownTicket.id}/actions`)
            .set("Cookie", `toktickit_session=${aliceToken}`);
        expect(ownRes.status).toBe(200);
        expect(Array.isArray(ownRes.body.data)).toBe(true);
        expect(ownRes.body.data.length).toBe(1);

        const bobsTicket = await createTicket({ requesterId: requesterBob.id });
        await postAction(
            bobsTicket.id,
            { description: "Bob's action.", result: "Private." },
            samiraToken,
            `key-api19-bob-${bobsTicket.id}`
        );

        const res = await request(app)
            .get(`/api/tickets/${bobsTicket.id}/actions`)
            .set("Cookie", `toktickit_session=${aliceToken}`);

        expect([403, 404]).toContain(res.status);
    });

    it("API-20: a client-supplied actionDateTime is ignored; the server sets it (BR-03)", async () => {
        const ticket = await createTicket();
        const submitted = "2000-01-01T00:00:00.000Z";
        const before = Date.now();

        const res = await postAction(
            ticket.id,
            { description: "Time spoof attempt.", result: "n/a", actionDateTime: submitted },
            samiraToken,
            `key-api20-${ticket.id}`
        );

        expect(res.status).toBe(201);
        const stored = await prisma.actionTaken.findFirst({ where: { ticketId: ticket.id } });
        expect(stored!.actionDateTime.toISOString()).not.toBe(submitted);
        expect(Math.abs(stored!.actionDateTime.getTime() - before)).toBeLessThan(60 * 1000);
    });

    it("API-23: a missing Idempotency-Key header returns 400 VALIDATION_ERROR with fields.idempotencyKey and no record (BR-17)", async () => {
        const ticket = await createTicket();
        const res = await postAction(
            ticket.id,
            { description: "No key.", result: "n/a" },
            samiraToken
        );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.fields.idempotencyKey).toBeDefined();

        const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
        expect(count).toBe(0);
    });

    it("API-27: a different key with identical content within 5s falls back to the original record (BR-17, AC-10)", async () => {
        const ticket = await createTicket();
        const body = { description: "Double submit.", result: "Same payload." };

        const first = await postAction(ticket.id, body, samiraToken, `key-api27-a-${ticket.id}`);
        expect(first.status).toBe(201);

        const second = await postAction(ticket.id, body, samiraToken, `key-api27-b-${ticket.id}`);
        expect(second.status).toBe(200);
        expect(second.body.data.id).toBe(first.body.data.id);

        const count = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
        expect(count).toBe(1);
    });

    it("WF-03: an IT Staff member who is not the Ticket Owner may record an Action Taken (BR-02)", async () => {
        const ticket = await createTicket({ ownerId: staffSamira.id });
        const res = await postAction(
            ticket.id,
            { description: "Different staff worked this.", result: "Done." },
            marcusToken,
            `key-wf03-${ticket.id}`
        );

        expect(res.status).toBe(201);
        expect(res.body.data.performedBy.id).toBe(staffMarcus.id);
        expect(res.body.data.performedBy.id).not.toBe(ticket.ownerId);
    });
});
