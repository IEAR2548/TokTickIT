import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-04/specification.md §10 (Dashboard Contract), BR-13, FR-10, FR-11
// Ref: docs/lab-04/tests.md PERF-01
//
// The threshold is informational (a local, small seeded dataset is not representative of
// production) but the test still guards the two properties that matter: the endpoints are
// fast locally AND they return summary data only — never a full Ticket collection.

const LOCAL_BUDGET_MS = 500;

describe("Dashboard performance smoke (PERF-01)", () => {
    let requesterToken: string;
    let staffToken: string;

    beforeAll(async () => {
        const requester = await prisma.user.findFirst({ where: { email: "alice.tanaka@example.com" } });
        const staff = await prisma.user.findFirst({ where: { email: "samira.chen@example.com" } });
        requesterToken = signSessionToken({
            userId: requester!.id,
            role: "REQUESTER",
            mustChangePassword: false,
        });
        staffToken = signSessionToken({ userId: staff!.id, role: "IT_STAFF", mustChangePassword: false });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    async function timed(token: string, path: string) {
        const start = Date.now();
        const res = await request(app)
            .get(path)
            .set("Cookie", `toktickit_session=${token}`);
        return { res, elapsed: Date.now() - start };
    }

    function expectSummaryOnly(body: any) {
        expect(body.data.counts).toBeTypeOf("object");
        expect(Array.isArray(body.data.recentTickets)).toBe(true);
        // BR-13: recent lists are capped at 5 items.
        expect(body.data.recentTickets.length).toBeLessThanOrEqual(5);
        // Summary shape only — a recent item carries exactly the documented keys and none of
        // the heavier Ticket fields (description, category, requester, comments, ...).
        for (const item of body.data.recentTickets) {
            expect(Object.keys(item).sort()).toEqual(["id", "status", "summary", "ticketNumber", "updatedAt"]);
            expect(item).not.toHaveProperty("description");
            expect(item).not.toHaveProperty("category");
        }
    }

    it("GET /api/dashboard/staff responds well under 500ms locally and returns summary data only", async () => {
        const { res, elapsed } = await timed(staffToken, "/api/dashboard/staff");

        expect(res.status).toBe(200);
        expectSummaryOnly(res.body);
        expect(elapsed).toBeLessThan(LOCAL_BUDGET_MS);
    });

    it("GET /api/dashboard/requester responds well under 500ms locally and returns summary data only", async () => {
        const { res, elapsed } = await timed(requesterToken, "/api/dashboard/requester");

        expect(res.status).toBe(200);
        expectSummaryOnly(res.body);
        expect(elapsed).toBeLessThan(LOCAL_BUDGET_MS);
    });
});
