import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";
import { ensureSeedTicket } from "./dashboardFixtures";

// Ref: docs/lab-04/specification.md BR-11, BR-13, FR-11, AC-02, AC-15
// Ref: docs/lab-04/api-spec.md §3.1
// Ref: docs/lab-04/tests.md API-15, API-17, API-25

// The dashboard tests read the shared seeded dataset (they do not create Tickets), so they
// compute the expected numbers from the database at assertion time — the counts are never
// hard-coded, which keeps them honest against manual queries and resilient to residue from
// other suites (server tests run with fileParallelism: false).

const REQUESTER_OPEN_STATUSES = ["NEW", "OPEN", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
const SEEDED_IN_PROGRESS_TICKET = "TK-20260824-0001"; // Alice's IN_PROGRESS Ticket (§9.5)
const ZERO_TICKET_REQUESTER_EMAIL = "fiona.gallagher@example.com"; // §9.5 zero-Ticket Requester

describe("Requester dashboard API (API-15, API-17, API-25)", () => {
    let alice: any;
    let bob: any;
    let fiona: any;
    let aliceToken: string;
    let bobToken: string;
    let fionaToken: string;

    async function getRequesterDashboard(token: string) {
        return request(app)
            .get("/api/dashboard/requester")
            .set("Cookie", `toktickit_session=${token}`);
    }

    /** Manual DB query for one Requester's mutually-exclusive BR-11 buckets. */
    async function manualRequesterCounts(requesterId: number) {
        const tickets = await prisma.ticket.findMany({
            where: { requesterId },
            select: { id: true, currentStatus: true },
        });
        const inBucket = (statuses: readonly string[]) =>
            tickets.filter((t) => statuses.includes(t.currentStatus as string));
        const nonCancelled = tickets.filter((t) => t.currentStatus !== "CANCELLED");
        return {
            tickets,
            open: inBucket(REQUESTER_OPEN_STATUSES),
            inProgress: inBucket(["IN_PROGRESS"]),
            resolved: inBucket(["RESOLVED"]),
            closed: inBucket(["CLOSED"]),
            nonCancelled,
        };
    }

    beforeAll(async () => {
        // Lab 2 suites wipe all Tickets mid-run; restore the Issue 2 baseline first so the
        // BR-11 assertions below run against the real seeded In Progress Ticket.
        await ensureSeedTicket(SEEDED_IN_PROGRESS_TICKET);

        alice = await prisma.user.findFirst({ where: { email: "alice.tanaka@example.com" } });
        bob = await prisma.user.findFirst({ where: { email: "bob.chavez@example.com" } });
        fiona = await prisma.user.findFirst({ where: { email: ZERO_TICKET_REQUESTER_EMAIL } });

        aliceToken = signSessionToken({ userId: alice.id, role: "REQUESTER", mustChangePassword: false });
        bobToken = signSessionToken({ userId: bob.id, role: "REQUESTER", mustChangePassword: false });
        fionaToken = signSessionToken({ userId: fiona.id, role: "REQUESTER", mustChangePassword: false });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("API-15: is scoped strictly to the authenticated Requester — never another Requester's Tickets (AC-02)", async () => {
        const aliceManual = await manualRequesterCounts(alice.id);
        const bobManual = await manualRequesterCounts(bob.id);

        const res = await getRequesterDashboard(aliceToken);
        expect(res.status).toBe(200);
        expect(res.body.data.counts).toMatchObject({
            open: aliceManual.open.length,
            inProgress: aliceManual.inProgress.length,
            resolved: aliceManual.resolved.length,
            closed: aliceManual.closed.length,
        });

        // Every returned recent Ticket must belong to Alice, not to Bob.
        const aliceTicketIds = new Set(aliceManual.tickets.map((t) => t.id));
        const bobTicketIds = new Set(bobManual.tickets.map((t) => t.id));
        for (const item of res.body.data.recentTickets) {
            expect(aliceTicketIds.has(item.id)).toBe(true);
            expect(bobTicketIds.has(item.id)).toBe(false);
        }

        // Alice's own dashboard must not mirror Bob's distinct counts.
        const bobRes = await getRequesterDashboard(bobToken);
        expect(bobRes.body.data.counts).toMatchObject({
            open: bobManual.open.length,
            inProgress: bobManual.inProgress.length,
            resolved: bobManual.resolved.length,
            closed: bobManual.closed.length,
        });

        // Sanity: the two seeded Requesters really do differ, so scoping is observable.
        if (
            aliceManual.open.length === bobManual.open.length &&
            aliceManual.inProgress.length === bobManual.inProgress.length &&
            aliceManual.resolved.length === bobManual.resolved.length &&
            aliceManual.closed.length === bobManual.closed.length
        ) {
            throw new Error("Seed fixture assumption broken: Requester A and B counts are identical");
        }
    });

    it("API-17: the four counts match a manual query and the seeded In Progress Ticket is counted only under inProgress, never under open (BR-11, AC-13)", async () => {
        const inProgressTicket = await prisma.ticket.findUnique({
            where: { ticketNumber: SEEDED_IN_PROGRESS_TICKET },
        });
        expect(inProgressTicket).not.toBeNull();
        expect(inProgressTicket!.requesterId).toBe(alice.id);
        expect(inProgressTicket!.currentStatus).toBe("IN_PROGRESS");

        const manual = await manualRequesterCounts(alice.id);

        const res = await getRequesterDashboard(aliceToken);
        expect(res.status).toBe(200);
        const counts = res.body.data.counts;

        expect(counts.open).toBe(manual.open.length);
        expect(counts.inProgress).toBe(manual.inProgress.length);
        expect(counts.resolved).toBe(manual.resolved.length);
        expect(counts.closed).toBe(manual.closed.length);

        // Explicit BR-11 mutual exclusivity for the seeded Ticket: it is in the In Progress
        // bucket and is NOT in the Open bucket.
        expect(manual.inProgress.some((t) => t.id === inProgressTicket!.id)).toBe(true);
        expect(manual.open.some((t) => t.id === inProgressTicket!.id)).toBe(false);

        // The four cards partition the non-Cancelled Tickets: a Ticket contributes to exactly
        // one of the four counts (so the In Progress Ticket cannot also be counted under open).
        expect(counts.open + counts.inProgress + counts.resolved + counts.closed).toBe(
            manual.nonCancelled.length
        );

        // And if the In Progress Ticket were (incorrectly) folded into "open", the counts would
        // not partition the non-Cancelled set.
        expect(counts.open).not.toBe(manual.open.length + manual.inProgress.length);
    });

    it("API-25: a Requester with zero Tickets gets all four counts at 0 and recentTickets [] — never null or an error (AC-15)", async () => {
        const ticketCount = await prisma.ticket.count({ where: { requesterId: fiona.id } });
        expect(ticketCount).toBe(0);

        const res = await getRequesterDashboard(fionaToken);

        expect(res.status).toBe(200);
        expect(res.body.data.counts).toEqual({ open: 0, inProgress: 0, resolved: 0, closed: 0 });
        expect(Array.isArray(res.body.data.recentTickets)).toBe(true);
        expect(res.body.data.recentTickets).toEqual([]);
    });
});
