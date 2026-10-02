import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";
import { ensureSeedTicket } from "./dashboardFixtures";

// Ref: docs/lab-04/specification.md BR-12, BR-13, FR-10, AC-09, Assumption #6/#7/#13
// Ref: docs/lab-04/api-spec.md §3.2
// Ref: docs/lab-04/tests.md API-16, API-26

const SEEDED_REOPENED_TICKET = "TK-20260910-0001"; // Carol's REOPENED Ticket (§9.5)

describe("IT Staff dashboard API (API-16, API-26)", () => {
    let samira: any;
    let adminAlex: any;
    let samiraToken: string;
    let adminToken: string;

    // Dedicated IT Staff fixture who owns no Tickets, to exercise a 0-value card (AC-09).
    const EMPTY_STAFF_EMAIL = `lab4.dash.empty.${Date.now()}@example.com`;
    let emptyStaff: any;
    let emptyStaffToken: string;

    async function getStaffDashboard(token: string) {
        return request(app)
            .get("/api/dashboard/staff")
            .set("Cookie", `toktickit_session=${token}`);
    }

    async function manualStatusCounts() {
        const tickets = await prisma.ticket.findMany({
            select: { id: true, currentStatus: true, ownerId: true },
        });
        const count = (status: string) => tickets.filter((t) => t.currentStatus === status).length;
        return {
            tickets,
            new: count("NEW"),
            openOnly: count("OPEN"),
            reopened: count("REOPENED"),
            inProgress: count("IN_PROGRESS"),
            waitingForRequester: count("WAITING_FOR_REQUESTER"),
            myAssigned: (userId: number) => tickets.filter((t) => t.ownerId === userId).length,
        };
    }

    beforeAll(async () => {
        // Lab 2 suites wipe all Tickets mid-run; restore the Issue 2 baseline first so the
        // BR-12 assertion below runs against the real seeded Reopened Ticket.
        await ensureSeedTicket(SEEDED_REOPENED_TICKET);

        samira = await prisma.user.findFirst({ where: { email: "samira.chen@example.com" } });
        adminAlex = await prisma.user.findFirst({ where: { email: "alex.morgan@example.com" } });

        samiraToken = signSessionToken({ userId: samira.id, role: "IT_STAFF", mustChangePassword: false });
        adminToken = signSessionToken({ userId: adminAlex.id, role: "ADMINISTRATOR", mustChangePassword: false });

        emptyStaff = await prisma.user.create({
            data: {
                name: "Lab4 Empty Staff",
                email: EMPTY_STAFF_EMAIL,
                role: "IT_STAFF",
                isActive: true,
                mustChangePassword: false,
            },
        });
        emptyStaffToken = signSessionToken({
            userId: emptyStaff.id,
            role: "IT_STAFF",
            mustChangePassword: false,
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: EMPTY_STAFF_EMAIL } });
        await prisma.$disconnect();
    });

    it("API-16: a card whose bucket has no Tickets renders 0, not an error (AC-09)", async () => {
        const manual = await manualStatusCounts();

        const res = await getStaffDashboard(emptyStaffToken);

        expect(res.status).toBe(200);
        const counts = res.body.data.counts;
        expect(counts).toMatchObject({
            new: manual.new,
            open: manual.openOnly + manual.reopened,
            inProgress: manual.inProgress,
            waitingForRequester: manual.waitingForRequester,
        });

        // This dedicated IT Staff member owns no Tickets, so the ownership dimension is empty.
        expect(manual.myAssigned(emptyStaff.id)).toBe(0);
        expect(counts.myAssigned).toBe(0);
        // Zero is a real value, not an omitted/undefined/error one.
        expect(counts.myAssigned).not.toBeNull();
        expect(res.body.data.recentTickets).toBeDefined();
    });

    it("API-26: counts.open includes REOPENED Tickets — it equals the manual Open + Reopened count (BR-12)", async () => {
        const reopenedTicket = await prisma.ticket.findUnique({
            where: { ticketNumber: SEEDED_REOPENED_TICKET },
        });
        expect(reopenedTicket).not.toBeNull();
        expect(reopenedTicket!.currentStatus).toBe("REOPENED");

        const manual = await manualStatusCounts();
        // The seeded Reopened Ticket must be a real, countable row for this assertion to bite.
        expect(manual.reopened).toBeGreaterThan(0);

        const res = await getStaffDashboard(samiraToken);
        expect(res.status).toBe(200);
        const counts = res.body.data.counts;

        expect(counts.open).toBe(manual.openOnly + manual.reopened);
        expect(counts.new).toBe(manual.new);
        expect(counts.inProgress).toBe(manual.inProgress);
        expect(counts.waitingForRequester).toBe(manual.waitingForRequester);
        expect(counts.myAssigned).toBe(manual.myAssigned(samira.id));

        // Explicit BR-12 inclusion: dropping Reopened would undercount, so open must NOT equal
        // the Open-only count.
        expect(counts.open).not.toBe(manual.openOnly);

        // myAssigned is an ownership dimension and is expected to overlap with the status cards.
        const samiraOwnsSomeStatusTicket = manual.tickets.some(
            (t) =>
                t.ownerId === samira.id &&
                ["NEW", "OPEN", "REOPENED", "IN_PROGRESS", "WAITING_FOR_REQUESTER"].includes(t.currentStatus)
        );
        expect(samiraOwnsSomeStatusTicket).toBe(true);
        expect(counts.myAssigned).toBeGreaterThan(0);
    });

    it("Administrator reuses the same endpoint and response shape (Assumption #6)", async () => {
        const res = await getStaffDashboard(adminToken);
        expect(res.status).toBe(200);
        expect(Object.keys(res.body.data.counts).sort()).toEqual(
            ["inProgress", "myAssigned", "new", "open", "waitingForRequester"].sort()
        );
        expect(Array.isArray(res.body.data.recentTickets)).toBe(true);
    });
});
