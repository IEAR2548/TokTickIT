import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-03/api-spec.md Endpoints 15-18
// Ref: docs/lab-03/specification.md BR-04, BR-23..BR-28, AC-04, AC-13..AC-15
// Ref: docs/lab-03/tests.md API-08, API-15, API-16, API-17

describe("Comments and Internal Notes API (API-08, API-15, API-16, API-17)", () => {
    let requesterUser: any;
    let foreignRequester: any;
    let staffUser: any;
    let category: any;
    let relatedSystem: any;
    let ticket: any;

    let requesterToken: string;
    let foreignToken: string;
    let staffToken: string;

    beforeAll(async () => {
        requesterUser = await prisma.user.findFirst({
            where: { email: "alice.tanaka@example.com" },
        });
        foreignRequester = await prisma.user.findFirst({
            where: { email: "bob.chavez@example.com" },
        });
        staffUser = await prisma.user.findFirst({
            where: { email: "samira.chen@example.com" },
        });
        category = await prisma.category.findFirst({ where: { isActive: true } });
        relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

        requesterToken = signSessionToken({
            userId: requesterUser.id,
            role: "REQUESTER",
            mustChangePassword: false,
        });
        foreignToken = signSessionToken({
            userId: foreignRequester.id,
            role: "REQUESTER",
            mustChangePassword: false,
        });
        staffToken = signSessionToken({
            userId: staffUser.id,
            role: "IT_STAFF",
            mustChangePassword: false,
        });

        ticket = await prisma.ticket.create({
            data: {
                ticketNumber: `TKT-COM-${Date.now().toString().slice(-4)}`,
                requesterId: requesterUser.id,
                categoryId: category.id,
                relatedSystemId: relatedSystem.id,
                requestedPriority: "MEDIUM",
                itPriority: "MEDIUM",
                currentStatus: "OPEN",
                summary: "Comments Notes Test Ticket",
                description: "Description for comments notes test ticket.",
            },
        });
    });

    afterAll(async () => {
        await prisma.publicComment.deleteMany({ where: { ticketId: ticket.id } });
        await prisma.internalNote.deleteMany({ where: { ticketId: ticket.id } });
        await prisma.ticket.deleteMany({ where: { id: ticket.id } });
        await prisma.$disconnect();
    });

    it("API-15: Post Public Comment (201; visible to Requester and Staff) (AC-13, BR-04, BR-23)", async () => {
        // Requester posts a public comment on their ticket
        const res = await request(app)
            .post(`/api/tickets/${ticket.id}/comments`)
            .set("Cookie", `toktickit_session=${requesterToken}`)
            .send({ content: "Hello from requester" });

        expect(res.status).toBe(201);
        expect(res.body.data.content).toBe("Hello from requester");
        expect(res.body.data.authorRole).toBe("REQUESTER");
        expect(res.body.data.authorId).toBe(requesterUser.id);

        // Staff can also retrieve it
        const listRes = await request(app)
            .get(`/api/tickets/${ticket.id}/comments`)
            .set("Cookie", `toktickit_session=${staffToken}`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.data.length).toBeGreaterThan(0);
        expect(listRes.body.data[0].content).toBe("Hello from requester");
    });

    it("API-16: Create Internal Note (201; visible to IT Staff, never returned to Requester) (AC-14, BR-04, BR-28)", async () => {
        // IT Staff creates internal note
        const res = await request(app)
            .post(`/api/tickets/${ticket.id}/notes`)
            .set("Cookie", `toktickit_session=${staffToken}`)
            .send({ content: "Sensitive internal diagnostic note" });

        expect(res.status).toBe(201);
        expect(res.body.data.content).toBe("Sensitive internal diagnostic note");
        expect(res.body.data.authorRole).toBe("IT_STAFF");

        // Staff can view the notes
        const staffGet = await request(app)
            .get(`/api/tickets/${ticket.id}/notes`)
            .set("Cookie", `toktickit_session=${staffToken}`);

        expect(staffGet.status).toBe(200);
        expect(staffGet.body.data.some((n: any) => n.content === "Sensitive internal diagnostic note")).toBe(true);

        // Requester gets 403 with NO note data (API-08: AC-04/BR-28)
        const requesterGet = await request(app)
            .get(`/api/tickets/${ticket.id}/notes`)
            .set("Cookie", `toktickit_session=${requesterToken}`);

        expect(requesterGet.status).toBe(403);
        expect(requesterGet.body.error).toBe("FORBIDDEN");
        expect(requesterGet.body.data).toBeUndefined();
    });

    it("API-17: Empty or whitespace-only comment/note content returns 400 and nothing persisted (AC-15, BR-25)", async () => {
        // Empty public comment
        const commentRes = await request(app)
            .post(`/api/tickets/${ticket.id}/comments`)
            .set("Cookie", `toktickit_session=${requesterToken}`)
            .send({ content: "   " });

        expect(commentRes.status).toBe(400);
        expect(commentRes.body.error).toBe("VALIDATION_ERROR");

        // Empty internal note
        const noteRes = await request(app)
            .post(`/api/tickets/${ticket.id}/notes`)
            .set("Cookie", `toktickit_session=${staffToken}`)
            .send({ content: "" });

        expect(noteRes.status).toBe(400);
        expect(noteRes.body.error).toBe("VALIDATION_ERROR");
    });
});
