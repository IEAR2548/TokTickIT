import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-04/specification.md §4 (Roles & Authorization Matrix), FR-01, FR-02, FR-08, FR-09, BR-15
// Ref: docs/lab-04/api-spec.md §1, §2
// Ref: docs/lab-04/tests.md AUTH-01
//
// Scope note: this issue implements the Ticket workflow surface (Actions Taken, status change,
// appears-resolved). The dashboard routes (api-spec §3) are tracked under a separate Lab 4 issue,
// so their §4 rows are not asserted here yet; every implemented §4 capability is covered.

const MARKER = "TKT-L4AUTH";
let seq = 0;

describe("Authorization matrix for the Ticket workflow endpoints (AUTH-01)", () => {
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
        requesterId?: number;
        ownerId?: number | null;
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
                summary: `${MARKER} fixture ticket`,
                description: "Lab 4 authorization matrix fixture ticket.",
                ownerId: opts.ownerId === undefined ? staffSamira.id : opts.ownerId,
            },
        });
    }

    async function createAction(ticketId: number, token: string, suffix: string) {
        const res = await request(app)
            .post(`/api/tickets/${ticketId}/actions`)
            .set("Cookie", `toktickit_session=${token}`)
            .set("Idempotency-Key", `key-${MARKER}-${ticketId}-${suffix}`)
            .send({ description: `${MARKER} action`, result: "Done." });
        expect(res.status).toBe(201);
        return res.body.data;
    }

    function patchStatus(ticketId: number, status: string, token: string, extra: Record<string, unknown> = {}) {
        return request(app)
            .patch(`/api/tickets/${ticketId}/status`)
            .set("Cookie", `toktickit_session=${token}`)
            .send({ status, ...extra });
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

    // --- View Actions Taken -----------------------------------------------------
    it("Requester may read Actions Taken on their own Ticket (200)", async () => {
        const ticket = await createTicket({ requesterId: requesterAlice.id });
        await createAction(ticket.id, samiraToken, "own");

        const res = await request(app)
            .get(`/api/tickets/${ticket.id}/actions`)
            .set("Cookie", `toktickit_session=${aliceToken}`);
        expect(res.status).toBe(200);
    });

    it("Requester may NOT read Actions Taken on another Requester's Ticket (403/404)", async () => {
        const ticket = await createTicket({ requesterId: requesterBob.id });
        await createAction(ticket.id, samiraToken, "other");

        const res = await request(app)
            .get(`/api/tickets/${ticket.id}/actions`)
            .set("Cookie", `toktickit_session=${aliceToken}`);
        expect([403, 404]).toContain(res.status);
    });

    it("IT Staff may read Actions Taken on an accessible Ticket (200)", async () => {
        const ticket = await createTicket({ requesterId: requesterBob.id });
        await createAction(ticket.id, samiraToken, "staff-read");

        const res = await request(app)
            .get(`/api/tickets/${ticket.id}/actions`)
            .set("Cookie", `toktickit_session=${samiraToken}`);
        expect(res.status).toBe(200);
    });

    // --- Create Action Taken ----------------------------------------------------
    it("Requester may NOT create an Action Taken (403)", async () => {
        const ticket = await createTicket({ requesterId: requesterAlice.id });

        const res = await request(app)
            .post(`/api/tickets/${ticket.id}/actions`)
            .set("Cookie", `toktickit_session=${aliceToken}`)
            .set("Idempotency-Key", `key-${MARKER}-requester-create`)
            .send({ description: "Requester attempt.", result: "n/a" });

        expect(res.status).toBe(403);
    });

    it("IT Staff may create an Action Taken on an accessible Ticket (201)", async () => {
        const ticket = await createTicket({ requesterId: requesterBob.id });

        const res = await request(app)
            .post(`/api/tickets/${ticket.id}/actions`)
            .set("Cookie", `toktickit_session=${samiraToken}`)
            .set("Idempotency-Key", `key-${MARKER}-staff-create`)
            .send({ description: "Staff action.", result: "Done." });

        expect(res.status).toBe(201);
    });

    // --- Edit Action Taken ------------------------------------------------------
    it("Requester may NOT edit an Action Taken (403)", async () => {
        const ticket = await createTicket({ requesterId: requesterAlice.id });
        const action = await createAction(ticket.id, samiraToken, "edit-requester");

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
            .set("Cookie", `toktickit_session=${aliceToken}`)
            .send({ description: "Requester edit.", expectedUpdatedAt: action.updatedAt });

        expect(res.status).toBe(403);
    });

    it("IT Staff may edit their own Action Taken within the 15-minute window (200)", async () => {
        const ticket = await createTicket();
        const action = await createAction(ticket.id, samiraToken, "edit-window");

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
            .set("Cookie", `toktickit_session=${samiraToken}`)
            .send({ description: "Corrected within window.", expectedUpdatedAt: action.updatedAt });

        expect(res.status).toBe(200);
    });

    it("Administrator may edit an Action Taken after the edit window (200)", async () => {
        const ticket = await createTicket();
        const action = await createAction(ticket.id, samiraToken, "edit-admin");

        await prisma.actionTaken.update({
            where: { id: action.id },
            data: { createdAt: new Date(Date.now() - 20 * 60 * 1000) },
        });
        const fresh = await prisma.actionTaken.findUnique({ where: { id: action.id } });

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
            .set("Cookie", `toktickit_session=${adminToken}`)
            .send({ description: "Admin correction.", expectedUpdatedAt: fresh!.updatedAt.toISOString() });

        expect(res.status).toBe(200);
    });

    // --- Set status -------------------------------------------------------------
    it("Requester may NOT set Resolved/Closed (403)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS", requesterId: requesterAlice.id });

        const res = await patchStatus(ticket.id, "RESOLVED", aliceToken, { resolutionSummary: "Self-service." });
        expect(res.status).toBe(403);
    });

    it("IT Staff may set Resolved on an accessible Ticket (200)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS" });

        const res = await patchStatus(ticket.id, "RESOLVED", samiraToken, {
            resolutionSummary: "Resolved by staff.",
            expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });
        expect(res.status).toBe(200);
    });

    it("Requester may NOT Reopen a Closed Ticket (403)", async () => {
        const ticket = await createTicket({ status: "CLOSED", requesterId: requesterAlice.id });

        const res = await patchStatus(ticket.id, "REOPENED", aliceToken);
        expect(res.status).toBe(403);
    });

    it("IT Staff may Reopen a Closed Ticket (200)", async () => {
        const ticket = await createTicket({ status: "CLOSED" });

        const res = await patchStatus(ticket.id, "REOPENED", samiraToken, {
            expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });
        expect(res.status).toBe(200);
    });

    it("Requester may cancel their own Ticket from New/Open (200)", async () => {
        const ticket = await createTicket({ status: "NEW", requesterId: requesterAlice.id });

        const res = await patchStatus(ticket.id, "CANCELLED", aliceToken, {
            expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });
        expect(res.status).toBe(200);
    });

    it("Requester may NOT cancel their own Ticket once In Progress — 403 (BR-15)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS", requesterId: requesterAlice.id });

        const res = await patchStatus(ticket.id, "CANCELLED", aliceToken, {
            expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });
        expect(res.status).toBe(403);
    });

    // --- Advisory appears-resolved ---------------------------------------------
    it("Requester may set appears-resolved on their own Ticket (200)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS", requesterId: requesterAlice.id });

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/appears-resolved`)
            .set("Cookie", `toktickit_session=${aliceToken}`)
            .send({ appearsResolved: true });

        expect(res.status).toBe(200);
    });

    it("Requester may NOT set appears-resolved on another Requester's Ticket (403/404)", async () => {
        const ticket = await createTicket({ requesterId: requesterBob.id });

        const res = await request(app)
            .patch(`/api/tickets/${ticket.id}/appears-resolved`)
            .set("Cookie", `toktickit_session=${aliceToken}`)
            .send({ appearsResolved: true });

        expect([403, 404]).toContain(res.status);
    });

    it("IT Staff/Admin may NOT set appears-resolved — Requester-only capability (403)", async () => {
        const ticket = await createTicket({ requesterId: requesterAlice.id });

        const asStaff = await request(app)
            .patch(`/api/tickets/${ticket.id}/appears-resolved`)
            .set("Cookie", `toktickit_session=${samiraToken}`)
            .send({ appearsResolved: true });
        expect(asStaff.status).toBe(403);

        const asAdmin = await request(app)
            .patch(`/api/tickets/${ticket.id}/appears-resolved`)
            .set("Cookie", `toktickit_session=${adminToken}`)
            .send({ appearsResolved: true });
        expect(asAdmin.status).toBe(403);
    });
});
