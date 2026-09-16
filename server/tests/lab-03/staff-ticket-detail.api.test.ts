import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-03/api-spec.md Endpoints 19, 21-25
// Ref: docs/lab-03/specification.md BR-05, BR-13..BR-22, AC-08..AC-12, AC-16, AC-28, AC-29
// Ref: docs/lab-03/tests.md API-10, API-11, API-12, API-13, API-14, API-18, API-27, API-28

describe("Staff Ticket Detail API (API-10, API-11, API-12, API-13, API-14, API-18, API-27, API-28)", () => {
    let requesterUser: any;
    let staffUser1: any;
    let staffUser2: any;
    let category: any;
    let relatedSystem: any;
    let testTicket: any;

    let staffToken1: string;
    let staffToken2: string;
    let requesterToken: string;

    beforeAll(async () => {
        requesterUser = await prisma.user.findFirst({
            where: { email: "alice.tanaka@example.com" },
        });
        staffUser1 = await prisma.user.findFirst({
            where: { email: "samira.chen@example.com" },
        });
        staffUser2 = await prisma.user.findFirst({
            where: { email: "marcus.vance@example.com" },
        });
        category = await prisma.category.findFirst({ where: { isActive: true } });
        relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        staffToken1 = signSessionToken({
            userId: staffUser1.id,
            role: "IT_STAFF",
            mustChangePassword: false,
        });
        staffToken2 = signSessionToken({
            userId: staffUser2.id,
            role: "IT_STAFF",
            mustChangePassword: false,
        });
        requesterToken = signSessionToken({
            userId: requesterUser.id,
            role: "REQUESTER",
            mustChangePassword: false,
        });

        testTicket = await prisma.ticket.create({
            data: {
                ticketNumber: `TKT-STF-${Date.now().toString().slice(-4)}`,
                requesterId: requesterUser.id,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                requestedPriority: "MEDIUM",
                itPriority: "MEDIUM",
                currentStatus: "NEW",
                summary: "Staff Ticket Detail Test Ticket",
                description: "Test ticket description for staff ticket detail test suite.",
                ownerId: null,
            },
        });
    });

    afterAll(async () => {
        await prisma.ticket.deleteMany({
            where: { summary: "Staff Ticket Detail Test Ticket" },
        });
        await prisma.$disconnect();
    });

    it("API-10: Claim unassigned ticket (AC-08, BR-14)", async () => {
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/claim`)
            .set("Cookie", `toktickit_session=${staffToken1}`);

        expect(res.status).toBe(200);
        expect(res.body.data.ownerId).toBe(staffUser1.id);
        expect(res.body.data.owner.name).toBe(staffUser1.name);
    });

    it("API-12: Claim already-claimed ticket returns 409 CONFLICT (BR-14)", async () => {
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/claim`)
            .set("Cookie", `toktickit_session=${staffToken2}`);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe("CONFLICT");
    });

    it("API-11: Reassign ticket to another active IT staff/admin (AC-09, BR-15)", async () => {
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/assign`)
            .set("Cookie", `toktickit_session=${staffToken1}`)
            .send({ ownerId: staffUser2.id });

        expect(res.status).toBe(200);
        expect(res.body.data.ownerId).toBe(staffUser2.id);
        expect(res.body.data.owner.name).toBe(staffUser2.name);
    });

    it("API-27: Change IT Priority happy path (AC-28, BR-17)", async () => {
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/it-priority`)
            .set("Cookie", `toktickit_session=${staffToken1}`)
            .send({ itPriority: "HIGH" });

        expect(res.status).toBe(200);
        expect(res.body.data.itPriority).toBe("HIGH");

        // Verify requestedPriority is unchanged
        const ticketInDb = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
        expect(ticketInDb?.itPriority).toBe("HIGH");
        expect(ticketInDb?.requestedPriority).toBe("MEDIUM");
    });

    it("API-13: Invalid status transition returns 400 INVALID_TRANSITION (AC-11, BR-21)", async () => {
        // testTicket is currently NEW. Transition directly to CLOSED is invalid.
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/status`)
            .set("Cookie", `toktickit_session=${staffToken1}`)
            .send({ status: "CLOSED", resolutionSummary: "Done" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("INVALID_TRANSITION");
    });

    it("API-28: Valid status transition happy path (AC-29, BR-21)", async () => {
        // NEW -> OPEN is permitted
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/status`)
            .set("Cookie", `toktickit_session=${staffToken1}`)
            .send({ status: "OPEN" });

        expect(res.status).toBe(200);
        expect(res.body.data.currentStatus).toBe("OPEN");
    });

    it("API-14: Transition to Resolved/Closed without resolution summary returns 400 RESOLUTION_SUMMARY_REQUIRED (AC-12, BR-22)", async () => {
        // Transition to IN_PROGRESS first
        await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/status`)
            .set("Cookie", `toktickit_session=${staffToken1}`)
            .send({ status: "IN_PROGRESS" });

        // Attempt transition to RESOLVED without resolutionSummary
        const res = await request(app)
            .patch(`/api/staff/tickets/${testTicket.id}/status`)
            .set("Cookie", `toktickit_session=${staffToken1}`)
            .send({ status: "RESOLVED" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("RESOLUTION_SUMMARY_REQUIRED");
    });

    it("API-18: Mark problem appears-resolved sets appearsResolved true and leaves currentStatus unchanged (AC-16, BR-05, BR-20)", async () => {
        const ticketBefore = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
        const statusBefore = ticketBefore?.currentStatus;

        const res = await request(app)
            .patch(`/api/tickets/${testTicket.id}/appears-resolved`)
            .set("Cookie", `toktickit_session=${requesterToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.appearsResolved).toBe(true);

        const ticketAfter = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
        expect(ticketAfter?.appearsResolved).toBe(true);
        expect(ticketAfter?.currentStatus).toBe(statusBefore);
    });
});
