import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

describe("GET /api/requesters", () => {
    beforeAll(async () => {
        // Ensure a known, deterministic seed state for this test suite
        await prisma.devRequester.deleteMany({});
        await prisma.devRequester.createMany({
            data: [
                { name: "Alice Tanaka", email: "alice.tanaka@example.com", isActive: true },
                { name: "Bob Chavez", email: "bob.chavez@example.com", isActive: true },
                { name: "Eve Former", email: "eve.former@example.com", isActive: false },
            ],
        });
    });

    afterAll(async () => {
        // Only remove the rows this suite created — do not wipe the whole table
        await prisma.devRequester.deleteMany({
            where: {
                email: {
                    in: [
                        "alice.tanaka@example.com",
                        "bob.chavez@example.com",
                        "eve.former@example.com",
                    ],
                },
            },
        });
        await prisma.$disconnect();
    });

    it("returns only active requesters (BR-04)", async () => {
        const res = await request(app).get("/api/requesters");

        expect(res.status).toBe(200);
        expect(res.body.requesters).toBeInstanceOf(Array);
        expect(res.body.requesters).toHaveLength(2);

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
        await prisma.devRequester.updateMany({ data: { isActive: false } });

        const res = await request(app).get("/api/requesters");

        expect(res.status).toBe(200);
        expect(res.body.requesters).toEqual([]);

        // restore state for other tests
        await prisma.devRequester.updateMany({
            where: { email: { in: ["alice.tanaka@example.com", "bob.chavez@example.com"] } },
            data: { isActive: true },
        });
    });
});