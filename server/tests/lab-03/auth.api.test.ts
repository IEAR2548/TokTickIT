import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/lib/password";

// Ref: docs/lab-03/api-spec.md Section 1-4
// Ref: docs/lab-03/tests.md API-01..API-07, SEC-05, SEC-08

describe("Lab 3 Authentication & Session API", () => {
    let testUserActive: any;
    let testUserInactive: any;
    let testUserMustChange: any;

    const passwordPlain = "SuperSecret123!";
    const newPasswordPlain = "BrandNewPass456$";

    beforeAll(async () => {
        const passwordHash = await hashPassword(passwordPlain);

        // Clean up any leftovers from prior runs
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        "active.requester@example.com",
                        "inactive.requester@example.com",
                        "mustchange.requester@example.com",
                    ],
                },
            },
        });

        testUserActive = await prisma.user.create({
            data: {
                name: "Active Requester",
                email: "active.requester@example.com",
                passwordHash,
                role: "REQUESTER",
                isActive: true,
                mustChangePassword: false,
            },
        });

        testUserInactive = await prisma.user.create({
            data: {
                name: "Inactive Requester",
                email: "inactive.requester@example.com",
                passwordHash,
                role: "REQUESTER",
                isActive: false,
                mustChangePassword: false,
            },
        });

        testUserMustChange = await prisma.user.create({
            data: {
                name: "Must Change Requester",
                email: "mustchange.requester@example.com",
                passwordHash,
                role: "REQUESTER",
                isActive: true,
                mustChangePassword: true,
            },
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        "active.requester@example.com",
                        "inactive.requester@example.com",
                        "mustchange.requester@example.com",
                    ],
                },
            },
        });
        await prisma.$disconnect();
    });

    describe("POST /api/auth/login", () => {
        it("API-01: logs in successfully with valid credentials, sets cookie, and returns safe user data (AC-01)", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "active.requester@example.com",
                    password: passwordPlain,
                });

            expect(res.status).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.id).toBe(testUserActive.id);
            expect(res.body.data.email).toBe("active.requester@example.com");
            expect(res.body.data.role).toBe("REQUESTER");
            expect(res.body.data.mustChangePassword).toBe(false);
            expect(res.body.data.passwordHash).toBeUndefined();

            // Verifies toktickit_session cookie is set and httpOnly
            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const sessionCookie = cookies.find((c: string) => c.startsWith("toktickit_session="));
            expect(sessionCookie).toBeDefined();
            expect(sessionCookie).toMatch(/HttpOnly/i);
        });

        it("API-02: rejects invalid password with 401 generic error (AC-05, BR-06, FR-03)", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "active.requester@example.com",
                    password: "WrongPassword999!",
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe("INVALID_CREDENTIALS");
            expect(res.body.message).toMatch(/Invalid email or password/i);
        });

        it("API-03: rejects unknown email with 401 identical generic error (AC-05, FR-03)", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "nonexistent.user@example.com",
                    password: passwordPlain,
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe("INVALID_CREDENTIALS");
            expect(res.body.message).toMatch(/Invalid email or password/i);
        });

        it("API-04: rejects inactive account login with 401 identical generic error (AC-06, BR-10, FR-02)", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "inactive.requester@example.com",
                    password: passwordPlain,
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe("INVALID_CREDENTIALS");
            expect(res.body.message).toMatch(/Invalid email or password/i);
        });

        it("rejects request missing email or password with 400 VALIDATION_ERROR", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "active.requester@example.com" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("VALIDATION_ERROR");
        });
    });

    describe("GET /api/auth/me", () => {
        it("SEC-05: returns 401 UNAUTHENTICATED when called without session cookie", async () => {
            const res = await request(app).get("/api/auth/me");
            expect(res.status).toBe(401);
            expect(res.body.error).toBe("UNAUTHENTICATED");
        });

        it("returns current user data when authenticated in normal session (BR-12)", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "active.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            const res = await request(app)
                .get("/api/auth/me")
                .set("Cookie", sessionCookie || "");

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(testUserActive.id);
            expect(res.body.data.email).toBe(testUserActive.email);
            expect(res.body.data.passwordHash).toBeUndefined();
        });

        it("returns current user data even when in restricted mustChangePassword session", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "mustchange.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            const res = await request(app)
                .get("/api/auth/me")
                .set("Cookie", sessionCookie || "");

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(testUserMustChange.id);
            expect(res.body.data.mustChangePassword).toBe(true);
        });
    });

    describe("Restricted Session Enforcement (AC-02, BR-02)", () => {
        it("API-05: returns 403 PASSWORD_CHANGE_REQUIRED for non-allowed endpoints when mustChangePassword is true", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "mustchange.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            // A call to any endpoint that requires authentication but isn't /me, /change-password, or /logout
            // Even if calling /api/tickets or a general restricted route
            const res = await request(app)
                .get("/api/tickets")
                .set("Cookie", sessionCookie || "");

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("PASSWORD_CHANGE_REQUIRED");
        });
    });

    describe("POST /api/auth/change-password", () => {
        it("SEC-08: returns 401 UNAUTHENTICATED when called without session cookie", async () => {
            const res = await request(app)
                .post("/api/auth/change-password")
                .send({
                    currentPassword: passwordPlain,
                    newPassword: newPasswordPlain,
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe("UNAUTHENTICATED");
        });

        it("rejects incorrect current password with 401 INVALID_CREDENTIALS", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "mustchange.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            const res = await request(app)
                .post("/api/auth/change-password")
                .set("Cookie", sessionCookie || "")
                .send({
                    currentPassword: "WrongCurrentPassword1!",
                    newPassword: newPasswordPlain,
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe("INVALID_CREDENTIALS");
        });

        it("rejects new password that violates BR-07 rules with 400 VALIDATION_ERROR", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "mustchange.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            const res = await request(app)
                .post("/api/auth/change-password")
                .set("Cookie", sessionCookie || "")
                .send({
                    currentPassword: passwordPlain,
                    newPassword: "short", // invalid
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("VALIDATION_ERROR");
        });

        it("API-06: successfully changes password, clears mustChangePassword, and issues fresh cookie (AC-02)", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "mustchange.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            const res = await request(app)
                .post("/api/auth/change-password")
                .set("Cookie", sessionCookie || "")
                .send({
                    currentPassword: passwordPlain,
                    newPassword: newPasswordPlain,
                });

            expect(res.status).toBe(200);
            expect(res.body.data.changed).toBe(true);

            // DB check: mustChangePassword should be cleared
            const updatedUser = await prisma.user.findUnique({
                where: { id: testUserMustChange.id },
            });
            expect(updatedUser?.mustChangePassword).toBe(false);

            // Fresh session cookie should be issued
            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const newSessionCookie = cookies?.find((c: string) => c.startsWith("toktickit_session="));
            expect(newSessionCookie).toBeDefined();
        });
    });

    describe("POST /api/auth/logout", () => {
        it("API-07: logs out successfully and clears session cookie (AC-07, BR-09)", async () => {
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "active.requester@example.com",
                    password: passwordPlain,
                });
            const sessionCookie = loginRes.headers["set-cookie"];

            const res = await request(app)
                .post("/api/auth/logout")
                .set("Cookie", sessionCookie || "");

            expect(res.status).toBe(200);
            expect(res.body.data.loggedOut).toBe(true);

            // Verifies session cookie is cleared
            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const clearedCookie = cookies?.find((c: string) => c.startsWith("toktickit_session="));
            expect(clearedCookie).toMatch(/(Max-Age=0|Expires=)/i);

            // Subsequent call with cleared cookie is unauthenticated
            const meRes = await request(app)
                .get("/api/auth/me")
                .set("Cookie", clearedCookie || "");
            expect(meRes.status).toBe(401);
        });
    });
});
