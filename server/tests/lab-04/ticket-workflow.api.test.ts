import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-04/specification.md §5.1 (transition matrix), §5.2 (resolution gate),
//      §10.1 (STALE_UPDATE 409 vs INVALID_TRANSITION 400), BR-06, BR-07, BR-09, BR-14, BR-15, BR-16
// Ref: docs/lab-04/api-spec.md §2.1, §2.2
// Ref: docs/lab-04/tests.md API-09..API-14, API-21, API-22, API-28, API-29, WF-01, WF-02, AUTH-02

const MARKER = "TKT-L4WF";
let seq = 0;

describe("Ticket status/resolution workflow API (API-09..14, API-21, API-22, API-28, API-29, WF-01, WF-02, AUTH-02)", () => {
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
        appearsResolved?: boolean;
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
                appearsResolved: opts.appearsResolved ?? false,
                summary: `${MARKER} fixture ticket`,
                description: "Lab 4 ticket workflow test fixture ticket.",
                ownerId: opts.ownerId === undefined ? staffSamira.id : opts.ownerId,
            },
        });
    }

    function patchStatus(ticketId: number, body: any, token: string) {
        return request(app)
            .patch(`/api/tickets/${ticketId}/status`)
            .set("Cookie", `toktickit_session=${token}`)
            .send(body);
    }

    function patchAppearsResolved(ticketId: number, body: any, token: string) {
        return request(app)
            .patch(`/api/tickets/${ticketId}/appears-resolved`)
            .set("Cookie", `toktickit_session=${token}`)
            .send(body);
    }

    async function freshUpdatedAt(ticketId: number): Promise<string> {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        return ticket!.updatedAt.toISOString();
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

    it("API-09: In Progress -> Resolved by IT Staff updates the status (AC-04)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS" });

        const res = await patchStatus(
            ticket.id,
            {
                status: "RESOLVED",
                resolutionSummary: "Replaced the faulty cable and confirmed a stable link.",
                expectedUpdatedAt: ticket.updatedAt.toISOString(),
            },
            samiraToken
        );

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("RESOLVED");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("RESOLVED");
    });

    it("API-10: New -> Resolved directly is rejected with 400 INVALID_TRANSITION and no change (AC-05)", async () => {
        const ticket = await createTicket({ status: "NEW" });

        const res = await patchStatus(
            ticket.id,
            {
                status: "RESOLVED",
                resolutionSummary: "Bypassing the lifecycle.",
                expectedUpdatedAt: ticket.updatedAt.toISOString(),
            },
            samiraToken
        );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_TRANSITION");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("NEW");
    });

    it("API-11: two concurrent changes with the same stale token — the second gets 409 STALE_UPDATE with a differing current status (AC-07, FR-14)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS" });
        const stale = ticket.updatedAt.toISOString();

        const first = await patchStatus(
            ticket.id,
            { status: "WAITING_FOR_REQUESTER", expectedUpdatedAt: stale },
            samiraToken
        );
        expect(first.status).toBe(200);
        expect(first.body.data.status).toBe("WAITING_FOR_REQUESTER");

        const second = await patchStatus(
            ticket.id,
            {
                status: "RESOLVED",
                resolutionSummary: "My overwrite attempt.",
                expectedUpdatedAt: stale,
            },
            marcusToken
        );

        expect(second.status).toBe(409);
        expect(second.body.error.code).toBe("STALE_UPDATE");
        expect(second.body.error.data.current.status).toBe("WAITING_FOR_REQUESTER");
        expect(second.body.error.data.current.status).not.toBe("RESOLVED");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("WAITING_FOR_REQUESTER");
    });

    it("API-12: a Requester cancels their own Open Ticket (200, Cancelled) (BR-15)", async () => {
        const ticket = await createTicket({ status: "OPEN", requesterId: requesterAlice.id, ownerId: null });

        const res = await patchStatus(
            ticket.id,
            { status: "CANCELLED", expectedUpdatedAt: ticket.updatedAt.toISOString() },
            aliceToken
        );

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("CANCELLED");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("CANCELLED");
    });

    it("API-13: a Requester cancelling their own In Progress Ticket gets 403 (not 400) and no change (BR-15)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS", requesterId: requesterAlice.id });

        const res = await patchStatus(
            ticket.id,
            { status: "CANCELLED", expectedUpdatedAt: ticket.updatedAt.toISOString() },
            aliceToken
        );

        // BR-15 is a role/ownership authorization failure checked BEFORE the §5.1 matrix,
        // so it is 403 FORBIDDEN, not 400 INVALID_TRANSITION (api-spec.md §2.1 error ordering).
        expect(res.status).toBe(403);

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("IN_PROGRESS");
    });

    it("API-14: appears-resolved sets the flag and never touches status (AC-06, FR-09)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS", requesterId: requesterAlice.id });

        const res = await patchAppearsResolved(
            ticket.id,
            { appearsResolved: true, expectedUpdatedAt: ticket.updatedAt.toISOString() },
            aliceToken
        );

        expect(res.status).toBe(200);
        expect(res.body.data.appearsResolved).toBe(true);
        expect(res.body.data.status).toBe("IN_PROGRESS");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.appearsResolved).toBe(true);
        expect(stored!.currentStatus).toBe("IN_PROGRESS");
    });

    // BR-16 has two triggers: "whenever the Ticket transitions to Reopened, or whenever the
    // Requester edits the Ticket". Only the first is reachable in this codebase — there is no
    // Requester edit-Ticket endpoint anywhere in the app (`PATCH /api/tickets/:id` is not routed;
    // see docs/lab-04/tests.md §16). The Reopen branch is asserted here; the edit branch is
    // recorded as a spec-vs-implementation gap rather than implemented, since this hardening
    // issue adds no new product features.
    it("API-24: BR-16 resets appearsResolved to false when IT Staff Reopens the Ticket (BR-16, AC-14)", async () => {
        const reopened = await createTicket({
            status: "RESOLVED",
            requesterId: requesterAlice.id,
            appearsResolved: true,
        });
        expect(reopened.appearsResolved).toBe(true);

        const reopenRes = await patchStatus(
            reopened.id,
            { status: "REOPENED", expectedUpdatedAt: reopened.updatedAt.toISOString() },
            samiraToken
        );
        expect(reopenRes.status).toBe(200);
        expect(reopenRes.body.data.status).toBe("REOPENED");
        expect(reopenRes.body.data.appearsResolved).toBe(false);

        const afterReopen = await prisma.ticket.findUnique({ where: { id: reopened.id } });
        expect(afterReopen!.currentStatus).toBe("REOPENED");
        expect(afterReopen!.appearsResolved).toBe(false);
    });

    it("API-24 (Reopen via the Lab 3 alias): the same BR-16 reset happens through PATCH /api/staff/tickets/:id/status", async () => {
        const reopened = await createTicket({
            status: "CLOSED",
            requesterId: requesterAlice.id,
            appearsResolved: true,
        });

        const res = await request(app)
            .patch(`/api/staff/tickets/${reopened.id}/status`)
            .set("Cookie", `toktickit_session=${samiraToken}`)
            .send({ status: "REOPENED", expectedUpdatedAt: reopened.updatedAt.toISOString() });
        expect(res.status).toBe(200);

        const after = await prisma.ticket.findUnique({ where: { id: reopened.id } });
        expect(after!.currentStatus).toBe("REOPENED");
        expect(after!.appearsResolved).toBe(false);
    });

    it("§2.2/BR-14: appears-resolved with a stale expectedUpdatedAt returns 409 STALE_UPDATE and leaves the flag unchanged", async () => {
        const ticket = await createTicket({
            status: "IN_PROGRESS",
            requesterId: requesterAlice.id,
            appearsResolved: false,
        });
        const stale = ticket.updatedAt.toISOString();

        await prisma.ticket.update({ where: { id: ticket.id }, data: { summary: `${MARKER} touched` } });

        const res = await patchAppearsResolved(
            ticket.id,
            { appearsResolved: true, expectedUpdatedAt: stale },
            aliceToken
        );

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("STALE_UPDATE");
        expect(res.body.error.data.current).toBeDefined();

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.appearsResolved).toBe(false);
    });

    it("API-21: a stale expectedUpdatedAt with an otherwise-valid transition is 409 STALE_UPDATE, not INVALID_TRANSITION (AC-07, BR-14)", async () => {
        const ticket = await createTicket({ status: "OPEN" });
        const stale = ticket.updatedAt.toISOString();

        await prisma.ticket.update({ where: { id: ticket.id }, data: { summary: `${MARKER} touched` } });

        const res = await patchStatus(ticket.id, { status: "IN_PROGRESS", expectedUpdatedAt: stale }, samiraToken);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("STALE_UPDATE");
        expect(res.body.error.code).not.toBe("INVALID_TRANSITION");
        expect(res.body.error.data.current).toBeDefined();

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("OPEN");
    });

    it("API-22: a current expectedUpdatedAt with a matrix-invalid transition is 400 INVALID_TRANSITION, not STALE_UPDATE (AC-05)", async () => {
        const ticket = await createTicket({ status: "OPEN" });

        const res = await patchStatus(
            ticket.id,
            {
                status: "RESOLVED",
                resolutionSummary: "Trying a forbidden shortcut.",
                expectedUpdatedAt: ticket.updatedAt.toISOString(),
            },
            samiraToken
        );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_TRANSITION");
        expect(res.body.error.code).not.toBe("STALE_UPDATE");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("OPEN");
    });

    it("API-28: retrying an already-applied change returns 409 STALE_UPDATE with data.current.status equal to the requested status, applied exactly once (AC-16, BR-14)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS" });
        const expected = ticket.updatedAt.toISOString();
        const body = {
            status: "RESOLVED",
            resolutionSummary: "Applied once, retried once.",
            expectedUpdatedAt: expected,
        };

        const first = await patchStatus(ticket.id, body, samiraToken);
        expect(first.status).toBe(200);
        expect(first.body.data.status).toBe("RESOLVED");
        const appliedUpdatedAt = first.body.data.updatedAt;

        const retry = await patchStatus(ticket.id, body, samiraToken);

        expect(retry.status).toBe(409);
        expect(retry.body.error.code).toBe("STALE_UPDATE");
        // The key client-side signal for AC-16: current now holds exactly what was requested.
        expect(retry.body.error.data.current.status).toBe("RESOLVED");

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("RESOLVED");
        // The retry did not reapply the transition.
        expect(stored!.updatedAt.toISOString()).toBe(appliedUpdatedAt);
    });

    it("API-29: Resolved/Closed without a non-empty resolutionSummary is 400 RESOLUTION_SUMMARY_REQUIRED with no change and no side effect (§5.2, BR-06, BR-07)", async () => {
        // (a) Resolved, summary omitted.
        const omitted = await createTicket({ status: "IN_PROGRESS" });
        const omittedRes = await patchStatus(
            omitted.id,
            { status: "RESOLVED", expectedUpdatedAt: omitted.updatedAt.toISOString() },
            samiraToken
        );
        expect(omittedRes.status).toBe(400);
        expect(omittedRes.body.error.code).toBe("RESOLUTION_SUMMARY_REQUIRED");

        // (b) Resolved, summary present but blank.
        const blank = await createTicket({ status: "IN_PROGRESS" });
        const blankRes = await patchStatus(
            blank.id,
            {
                status: "RESOLVED",
                resolutionSummary: "   ",
                expectedUpdatedAt: blank.updatedAt.toISOString(),
            },
            samiraToken
        );
        expect(blankRes.status).toBe(400);
        expect(blankRes.body.error.code).toBe("RESOLUTION_SUMMARY_REQUIRED");

        // (c) Closed, summary omitted (valid edge Resolved -> Closed).
        const closing = await createTicket({ status: "RESOLVED" });
        const closingRes = await patchStatus(
            closing.id,
            { status: "CLOSED", expectedUpdatedAt: closing.updatedAt.toISOString() },
            samiraToken
        );
        expect(closingRes.status).toBe(400);
        expect(closingRes.body.error.code).toBe("RESOLUTION_SUMMARY_REQUIRED");

        // Status untouched in every case.
        expect((await prisma.ticket.findUnique({ where: { id: omitted.id } }))!.currentStatus).toBe("IN_PROGRESS");
        expect((await prisma.ticket.findUnique({ where: { id: blank.id } }))!.currentStatus).toBe("IN_PROGRESS");
        expect((await prisma.ticket.findUnique({ where: { id: closing.id } }))!.currentStatus).toBe("RESOLVED");

        // No side-effect record (this implementation logs no Action Taken on a status change).
        const sideEffects = await prisma.actionTaken.count({
            where: { ticketId: { in: [omitted.id, blank.id, closing.id] } },
        });
        expect(sideEffects).toBe(0);
    });

    it("WF-01: the full lifecycle New -> Open -> In Progress -> Resolved -> Closed -> Reopened succeeds edge-by-edge (§5.1)", async () => {
        const ticket = await createTicket({ status: "NEW", requesterId: requesterAlice.id });

        async function step(to: string, extra: Record<string, unknown> = {}) {
            const expectedUpdatedAt = await freshUpdatedAt(ticket.id);
            const res = await patchStatus(ticket.id, { status: to, expectedUpdatedAt, ...extra }, samiraToken);
            expect(res.status, `transition to ${to}`).toBe(200);
            const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
            expect(stored!.currentStatus).toBe(to);
            return res;
        }

        await step("OPEN");
        await step("IN_PROGRESS");
        await step("RESOLVED", { resolutionSummary: "Diagnosed and fixed the root cause." });
        await step("CLOSED", { resolutionSummary: "Confirmed with the requester; closing." });
        await step("REOPENED");

        // A matrix-invalid edge is rejected rather than silently rendered.
        const invalid = await patchStatus(
            ticket.id,
            { status: "CLOSED", expectedUpdatedAt: await freshUpdatedAt(ticket.id) },
            samiraToken
        );
        expect(invalid.status).toBe(400);
        expect(invalid.body.error.code).toBe("INVALID_TRANSITION");
    });

    it("WF-02: a Cancelled Ticket is terminal — any further status change is a 400 matrix rejection and it stays Cancelled (BR-09, §5.1)", async () => {
        const ticket = await createTicket({ status: "CANCELLED" });

        for (const target of ["OPEN", "IN_PROGRESS", "REOPENED", "CLOSED"]) {
            const res = await patchStatus(
                ticket.id,
                { status: target, resolutionSummary: "x", expectedUpdatedAt: await freshUpdatedAt(ticket.id) },
                samiraToken
            );
            expect(res.status, `Cancelled -> ${target}`).toBe(400);
            expect(res.body.error.code).toBe("INVALID_TRANSITION");
        }

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("CANCELLED");
    });

    it("AUTH ordering: authorization precedes request validation — a Requester targeting another's Ticket gets 403 even with no valid status (api-spec §2.1)", async () => {
        const ticket = await createTicket({ status: "NEW", requesterId: requesterBob.id });

        const res = await patchStatus(ticket.id, { status: "" }, aliceToken);

        expect(res.status).toBe(403);

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("NEW");
    });

    it("AUTH-02: a Requester cannot set Resolved/Closed directly — 403 with no state change (FR-08)", async () => {
        const ticket = await createTicket({ status: "IN_PROGRESS", requesterId: requesterAlice.id });

        const toResolved = await patchStatus(
            ticket.id,
            {
                status: "RESOLVED",
                resolutionSummary: "I fixed it myself, surely.",
                expectedUpdatedAt: ticket.updatedAt.toISOString(),
            },
            aliceToken
        );
        expect(toResolved.status).toBe(403);

        const toClosed = await patchStatus(
            ticket.id,
            { status: "CLOSED", resolutionSummary: "Closing myself.", expectedUpdatedAt: ticket.updatedAt.toISOString() },
            aliceToken
        );
        expect(toClosed.status).toBe(403);

        const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(stored!.currentStatus).toBe("IN_PROGRESS");
    });
});
