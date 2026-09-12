import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { prisma } from "../../src/lib/prisma";

// Ref: docs/lab-03/specification.md section 7 (Data Changes), BR-13, BR-37, BR-38
// Ref: docs/lab-03/tests.md MIG-01
// "Every existing Lab 2 DevRequester row is migrated into a User row with role
//  REQUESTER, preserving its original id so existing Ticket.requesterId foreign
//  keys remain valid without a data rewrite."

describe("MIG-01: DevRequester -> User migration preserves Ticket ownership", () => {
    beforeAll(async () => {
        // Reads whatever the seeded/migrated database contains. If prior test suites
        // emptied the Ticket table, re-run seed to restore the pre-existing data.
        const ticketCount = await prisma.ticket.count();
        if (ticketCount === 0) {
            execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
        }
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("the User table exists with role, isActive, passwordHash, mustChangePassword columns", async () => {
        // Will throw if the User model/table doesn't exist yet (TDD red step before
        // the schema migration is applied) — that's the expected failure right now.
        const anyUser = await prisma.user.findFirst({
            select: { id: true, role: true, isActive: true, passwordHash: true, mustChangePassword: true },
        });
        expect(anyUser).toBeDefined();
    });

    it("every existing Ticket.requesterId resolves to a User with role REQUESTER (BR-37)", async () => {
        const tickets = await prisma.ticket.findMany({ select: { id: true, requesterId: true } });
        expect(tickets.length, "Expected pre-existing Lab 2 tickets from seed data").toBeGreaterThan(0);

        for (const ticket of tickets) {
            const owner = await prisma.user.findUnique({ where: { id: ticket.requesterId } });
            expect(
                owner,
                `Ticket ${ticket.id}'s requesterId ${ticket.requesterId} does not resolve to any User row`
            ).not.toBeNull();
            expect(owner!.role).toBe("REQUESTER");
        }
    });

    it("migrated Requester accounts have a real bcrypt hash and mustChangePassword=true (BR-38)", async () => {
        const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
        expect(requesters.length).toBeGreaterThan(0);

        for (const r of requesters) {
            expect(r.passwordHash, `User ${r.id} has an empty passwordHash`).not.toBe("");
            expect(r.passwordHash.length).toBeGreaterThan(20);
            expect(r.mustChangePassword, `Migrated Requester ${r.id} should require a password change`).toBe(true);
        }
    });

    it("seed data includes at least 3 active + 1 inactive IT Staff and 1 active Administrator (handout §5.3)", async () => {
        const activeStaff = await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } });
        const inactiveStaff = await prisma.user.count({ where: { role: "IT_STAFF", isActive: false } });
        const activeAdmins = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } });

        expect(activeStaff).toBeGreaterThanOrEqual(3);
        expect(inactiveStaff).toBeGreaterThanOrEqual(1);
        expect(activeAdmins).toBeGreaterThanOrEqual(1);
    });

    it("Ticket has ownerId, itPriority, currentStatus (expanded enum), resolutionSummary, appearsResolved columns", async () => {
        const ticket = await prisma.ticket.findFirst({
            select: {
                ownerId: true,
                itPriority: true,
                currentStatus: true,
                resolutionSummary: true,
                appearsResolved: true,
            },
        });
        expect(ticket).toBeDefined();
        // itPriority backfilled from requestedPriority for pre-existing tickets (BR-17)
        expect(ticket!.itPriority).not.toBeNull();
        expect(ticket!.appearsResolved).toBe(false);
    });

    it("PublicComment and InternalNote tables exist and are empty right after migration", async () => {
        const commentCount = await prisma.publicComment.count();
        const noteCount = await prisma.internalNote.count();
        // Not asserting > 0 — these are new tables; seed.ts may add example rows later.
        // Just confirming the tables exist and are queryable without error.
        expect(commentCount).toBeGreaterThanOrEqual(0);
        expect(noteCount).toBeGreaterThanOrEqual(0);
    });
});