import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";

// Ref: docs/lab-02/api-spec.md Section 3 GET /api/related-systems
// Ref: docs/lab-02/specification.md BR-10

describe("GET /api/related-systems", () => {
    beforeAll(async () => {
        await prisma.relatedSystem.upsert({
            where: { name: "Email" },
            update: { isActive: true },
            create: { name: "Email", isActive: true },
        });
        await prisma.relatedSystem.upsert({
            where: { name: "Legacy Offline System" },
            update: { isActive: false },
            create: { name: "Legacy Offline System", isActive: false },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("returns 200 with only active related systems", async () => {
        const res = await request(app).get("/api/related-systems");

        expect(res.status).toBe(200);
        expect(res.body.relatedSystems).toBeDefined();
        expect(Array.isArray(res.body.relatedSystems)).toBe(true);
        expect(res.body.relatedSystems.length).toBeGreaterThanOrEqual(1);

        for (const sys of res.body.relatedSystems) {
            expect(sys).toHaveProperty("id");
            expect(sys).toHaveProperty("name");
            expect(typeof sys.id).toBe("number");
            expect(typeof sys.name).toBe("string");
        }

        const inactiveFound = res.body.relatedSystems.some(
            (sys: { name: string }) => sys.name === "Legacy Offline System"
        );
        expect(inactiveFound).toBe(false);
    });
});
