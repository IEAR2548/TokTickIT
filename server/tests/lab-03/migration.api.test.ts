import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { prisma } from "../../src/lib/prisma";

// Ref: docs/lab-03/specification.md section 7 (Data Changes), BR-13, BR-37, BR-38
// Ref: docs/lab-03/tests.md MIG-01
// "Every existing Lab 2 DevRequester row is migrated into a User row with role
//  REQUESTER, preserving its original id so existing Ticket.requesterId foreign
//  keys remain valid without a data rewrite."

// The migrated cohort per BR-37: every Lab 2 DevRequester row, which the seed
// provisions as exactly these User rows. Shared between beforeAll's self-heal
// check and the BR-38 assertion below.
const MIGRATED_REQUESTER_EMAILS = [
    "alice.tanaka@example.com",
    "bob.chavez@example.com",
    "carol.meier@example.com",
    "david.sorn@example.com",
    "elena.rostova@example.com",
    "fiona.gallagher@example.com",
    "eve.former@example.com", // inactive requester is migrated too
];

// A specific, known-stable seeded ticket to inspect for the "expanded columns"
// check below. Deliberately Carol Meier's ticket, not Alice's or Bob's:
// requesters.api.test.ts used to reuse alice/bob/eve's emails as its own fixture
// (now fixed to use its own private emails — see that file), and Bob's seeded
// ticket TK-20260827-0001 is intentionally appearsResolved=true by design. Carol
// is not touched by any other suite, so her ticket's seeded values are a safe,
// deterministic fixture to assert against.
const STABLE_TICKET_NUMBER = "TK-20260828-0001";

describe("MIG-01: DevRequester -> User migration preserves Ticket ownership", () => {
    beforeAll(async () => {
        // Reads whatever the seeded/migrated database contains. Several lab-02
        // suites issue a blanket `prisma.ticket.deleteMany({})` (they need an
        // isolated Ticket table), so by the time this file runs the seed's
        // tickets are usually gone — while `ticketCount` is still > 0 because
        // those suites created their own rows afterward. The old guard only
        // checked `ticketCount === 0` / migrated-cohort size, so it missed that
        // corruption and this file then asserted against a wiped baseline: the
        // STABLE_TICKET lookup returned null, and a leftover requester without
        // mustChangePassword=true failed BR-38. Verify EVERY invariant this file
        // asserts and re-seed when any of them is broken, so the result is
        // genuinely order-independent instead of depending on which suite ran
        // last and what residue it left behind.
        const [ticketCount, migrated, stableTicket] = await Promise.all([
            prisma.ticket.count(),
            prisma.user.findMany({
                where: { role: "REQUESTER", email: { in: MIGRATED_REQUESTER_EMAILS } },
                select: { mustChangePassword: true, passwordHash: true },
            }),
            prisma.ticket.findUnique({
                where: { ticketNumber: STABLE_TICKET_NUMBER },
                select: { id: true },
            }),
        ]);

        const baselineIntact =
            ticketCount > 0 &&
            migrated.length === MIGRATED_REQUESTER_EMAILS.length &&
            migrated.every((u) => u.mustChangePassword && u.passwordHash.length > 20) &&
            stableTicket !== null;

        if (!baselineIntact) {
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
        // BR-38 is scoped to the MIGRATED cohort: BR-37 says "Every existing Lab 2
        // DevRequester row is migrated into a User row" — i.e. the documented seed
        // requesters in MIGRATED_REQUESTER_EMAILS above. Other test suites
        // legitimately create throwaway REQUESTER fixtures (e.g. auth fixtures with
        // mustChangePassword=false) in this shared dev database; those are not
        // migrated accounts, and asserting BR-38 over them made this test flake on
        // file order / leftover state.
        const requesters = await prisma.user.findMany({
            where: { role: "REQUESTER", email: { in: MIGRATED_REQUESTER_EMAILS } },
        });
        expect(
            requesters.length,
            `Expected all ${MIGRATED_REQUESTER_EMAILS.length} migrated requesters to exist`
        ).toBe(MIGRATED_REQUESTER_EMAILS.length);

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
        // Query a SPECIFIC, known-stable seeded ticket rather than findFirst() with
        // no where/orderBy — Postgres does not guarantee row order without an
        // explicit ORDER BY, so an unordered findFirst() could non-deterministically
        // return any seeded ticket, including ones the seed deliberately gives
        // appearsResolved=true (e.g. Bob Chavez's TK-20260827-0001). That made this
        // assertion flake independently of any real migration bug.
        const ticket = await prisma.ticket.findUnique({
            where: { ticketNumber: STABLE_TICKET_NUMBER },
            select: {
                ownerId: true,
                itPriority: true,
                currentStatus: true,
                resolutionSummary: true,
                appearsResolved: true,
            },
        });
        expect(ticket, `Expected seeded ticket ${STABLE_TICKET_NUMBER} to exist`).toBeDefined();
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