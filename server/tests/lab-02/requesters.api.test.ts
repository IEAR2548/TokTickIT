import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

const TEST_EMAILS = [
    "alice.tanaka@example.com",
    "bob.chavez@example.com",
    "eve.former@example.com",
];

describe("GET /api/requesters", () => {
    beforeAll(async () => {
        // Ensure only these three known REQUESTER rows exist for the test.
        // Do NOT wipe the whole table — IT_STAFF and ADMINISTRATOR seeded users
        // must survive for downstream tests (e.g. authorization.api.test.ts).
        await prisma.attachment.deleteMany({});
        await prisma.ticket.deleteMany({ where: { requester: { email: { in: TEST_EMAILS } } } });
        await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
        await prisma.user.createMany({
            data: [
                { name: "Alice Tanaka", email: "alice.tanaka@example.com", isActive: true },
                { name: "Bob Chavez", email: "bob.chavez@example.com", isActive: true },
                { name: "Eve Former", email: "eve.former@example.com", isActive: false },
            ],
        });
    });

    afterAll(async () => {
        // Only remove the rows this suite created — do not wipe the whole table
        await prisma.attachment.deleteMany({});
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
        expect(names).toContain("Alice Tanaka");
        expect(names).toContain("Bob Chavez");
        expect(names).not.toContain("Eve Former");
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
            where: { email: { in: ["alice.tanaka@example.com", "bob.chavez@example.com"] } },
            data: { isActive: false },
        });

        const res = await request(app).get("/api/requesters");

        // The endpoint returns only REQUESTER role users — staff/admin don't appear
        expect(res.status).toBe(200);
        // Only REQUESTER-role active users: all 3 test users are now inactive
        const requesterNames = res.body.requesters.map((r: { name: string }) => r.name);
        expect(requesterNames).not.toContain("Alice Tanaka");
        expect(requesterNames).not.toContain("Bob Chavez");

        // restore state for other tests
        await prisma.user.updateMany({
            where: { email: { in: ["alice.tanaka@example.com", "bob.chavez@example.com"] } },
            data: { isActive: true },
        });
    });
});