import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

// Ref: docs/lab-03/specification.md section 8 (Authorization Matrix)
// Ref: docs/lab-03/tests.md SEC-05, SEC-08
// Per Issue #31 Step 1a: SEC-05 is scoped in this Issue to GET /api/auth/me only.
// Full endpoint coverage (tickets, staff, admin) lands in #32-#34.

describe("Lab 3 Security Authorization (SEC-05, SEC-08)", () => {
    it("SEC-05: Unauthenticated request to GET /api/auth/me returns 401 UNAUTHENTICATED", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("UNAUTHENTICATED");
        expect(res.body.message).toMatch(/Authentication required/i);
    });

    it("SEC-08: Unauthenticated request to POST /api/auth/change-password returns 401 UNAUTHENTICATED", async () => {
        const res = await request(app)
            .post("/api/auth/change-password")
            .send({
                currentPassword: "SomePassword123!",
                newPassword: "NewPassword123!",
            });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("UNAUTHENTICATED");
        expect(res.body.message).toMatch(/Authentication required/i);
    });

    it("SEC-08: Request with invalid/tampered session cookie returns 401 UNAUTHENTICATED", async () => {
        const res = await request(app)
            .post("/api/auth/change-password")
            .set("Cookie", "toktickit_session=invalid.tampered.token")
            .send({
                currentPassword: "SomePassword123!",
                newPassword: "NewPassword123!",
            });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("UNAUTHENTICATED");
    });
});
