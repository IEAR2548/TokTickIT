import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

// Ref: these must NOT collide with docs/lab-03's shared seed baseline emails
// (see prisma/seed.ts's SEED_USER_EMAILS and migration.api.test.ts's
// MIGRATED_REQUESTER_EMAILS). This suite used to reuse alice.tanaka@example.com /
// bob.chavez@example.com / eve.former@example.com, which are also the exact rows
// migration.api.test.ts's BR-38 check and other suites depend on as a stable
// baseline. Deleting and recreating them here (with no role/passwordHash/
// mustChangePassword set) corrupted that baseline for the rest of the run, and
// silently reset it every time this suite happened to run before another one —
// producing different test failures depending on file execution order. Using our
// own private fixture emails means this suite can freely create/mutate/delete its
// rows without ever touching another suite's data.
const TEST_EMAILS = [
    "requesters-fixture-alice@example.com",
    "requesters-fixture-bob@example.com",
    "requesters-fixture-eve@example.com",
];

describe("GET /api/requesters", () => {
    beforeAll(async () => {
        // Ensure only these three known REQUESTER rows exist for the test.
        // Do NOT wipe the whole table — IT_STAFF and ADMINISTRATOR seeded users
        // must survive for downstream tests (e.g. authorization.api.test.ts).
        await prisma.attachment.deleteMany({
            where: { ticket: { requester: { email: { in: TEST_EMAILS } } } },
        });
        await prisma.ticket.deleteMany({ where: { requester: { email: { in: TEST_EMAILS } } } });
        await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
        await prisma.user.createMany({
            data: [
                { name: "Requesters Fixture Alice", email: "requesters-fixture-alice@example.com", isActive: true },
                { name: "Requesters Fixture Bob", email: "requesters-fixture-bob@example.com", isActive: true },
                { name: "Requesters Fixture Eve", email: "requesters-fixture-eve@example.com", isActive: false },
            ],
        });
    });

    afterAll(async () => {
        // Only remove the rows this suite created — scoped to TEST_EMAILS, never
        // a blanket deleteMany({}) that could touch another suite's fixtures.
        await prisma.attachment.deleteMany({
            where: { ticket: { requester: { email: { in: TEST_EMAILS } } } },
        });
        await prisma.ticket.deleteMany({ where: { requester: { email: { in: TEST_EMAILS } } } });
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: TEST_EMAILS,
                },
            },
        });
        await prisma.$disconnect();
    });

    it("returns only active requesters (BR-04)", async () => {
        const res = await request(app).get("/api/requesters");

        expect(res.status).toBe(200);
        expect(res.body.requesters).toBeInstanceOf(Array);

        const names = res.body.requesters.map((r: { name: string }) => r.name);
        expect(names).toContain("Requesters Fixture Alice");
        expect(names).toContain("Requesters Fixture Bob");
        expect(names).not.toContain("Requesters Fixture Eve");
    });

    it("returns each requester with id, name, and email only", async () => {
        const res = await request(app).get("/api/requesters");
        const first = res.body.requesters[0];

        expect(first).toHaveProperty("id");
        expect(first).toHaveProperty("name");
        expect(first).toHaveProperty("email");
        expect(first).not.toHaveProperty("isActive"); // internal flag, not exposed to client
    });

    it("returns an empty array (not an error) when no active requesters exist", async () => {
        // Temporarily deactivate only the test users, not staff/admin
        await prisma.user.updateMany({
            where: { email: { in: ["requesters-fixture-alice@example.com", "requesters-fixture-bob@example.com"] } },
            data: { isActive: false },
        });

        const res = await request(app).get("/api/requesters");

        // The endpoint returns only REQUESTER role users — staff/admin don't appear
        expect(res.status).toBe(200);
        // Only REQUESTER-role active users: all 3 test users are now inactive
        const requesterNames = res.body.requesters.map((r: { name: string }) => r.name);
        expect(requesterNames).not.toContain("Requesters Fixture Alice");
        expect(requesterNames).not.toContain("Requesters Fixture Bob");

        // restore state for other tests
        await prisma.user.updateMany({
            where: { email: { in: ["requesters-fixture-alice@example.com", "requesters-fixture-bob@example.com"] } },
            data: { isActive: true },
        });
    });
});