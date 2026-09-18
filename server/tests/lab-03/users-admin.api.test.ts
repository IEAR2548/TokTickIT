import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { signSessionToken } from "../../src/lib/session";

// Ref: docs/lab-03/api-spec.md endpoints 26-29
//   (GET/POST /api/admin/users, PATCH /api/admin/users/:id, PATCH /api/admin/users/:id/password)
// Ref: docs/lab-03/specification.md FR-20..FR-24, BR-29..BR-34, AC-17..AC-21, AC-30, AC-31
// Ref: docs/lab-03/tests.md API-20..API-26, API-29, API-30
// Scope guardrails (Issue #36): no user deletion (BR-34), no pagination (D-4),
// no email delivery (D-2), no bulk ops, no multi-column sort, no multiple simultaneous filters.

const TEST_EMAIL_DOMAIN = "@api-tests.example.com";
const VALID_PASSWORD = "TestPass@2026!"; // BR-07 compliant

describe("Admin User Management API (endpoints 26-29)", () => {
    let adminUser: any;

    beforeAll(async () => {
        adminUser = await prisma.user.findFirst({
            where: { email: "alex.morgan@example.com" },
        });

        // Clean leftovers from previous runs so state is deterministic
        await prisma.user.deleteMany({
            where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
        });
        // Restore seed state for the sole seed Administrator (alex.morgan)
        if (adminUser) {
            await prisma.user.update({
                where: { id: adminUser.id },
                data: { role: "ADMINISTRATOR", isActive: true },
            });
        }
        await prisma.$disconnect();
    });

    function cookieFor(user: any, role = user.role) {
        const token = signSessionToken({
            userId: user.id,
            role,
            mustChangePassword: false,
        });
        return `toktickit_session=${token}`;
    }

    describe("API-20: Admin user search matches partial name/email (AC-17, FR-20)", () => {
        let target: any;

        beforeAll(async () => {
            target = await prisma.user.create({
                data: {
                    name: "Zaphod Api Search",
                    email: `zaphod.search${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "REQUESTER",
                    isActive: true,
                    mustChangePassword: true,
                },
            });
        });

        it("matches a partial name substring case-insensitively", async () => {
            const res = await request(app)
                .get("/api/admin/users?search=zaph")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            for (const u of res.body.data) {
                const matches =
                    u.name.toLowerCase().includes("zaph") ||
                    u.email.toLowerCase().includes("zaph");
                expect(matches).toBe(true);
            }
            expect(res.body.data.some((u: any) => u.id === target.id)).toBe(true);
        });

        it("matches a partial email substring", async () => {
            const res = await request(app)
                .get("/api/admin/users?search=zaphod.search")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            for (const u of res.body.data) {
                expect(u.email.toLowerCase()).toContain("zaphod.search");
            }
            expect(res.body.data.some((u: any) => u.id === target.id)).toBe(true);
        });

        it("supports the optional exact role filter (FR-20)", async () => {
            const res = await request(app)
                .get("/api/admin/users?role=ADMINISTRATOR")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            for (const u of res.body.data) {
                expect(u.role).toBe("ADMINISTRATOR");
            }
        });

        it("returns all matching users with no pagination metadata (Decision D-4)", async () => {
            const res = await request(app)
                .get("/api/admin/users")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            expect(res.body.meta).toBeUndefined();
        });

        it("never returns password material in list responses (BR-08, BR-12)", async () => {
            const res = await request(app)
                .get("/api/admin/users")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/i);
            expect(JSON.stringify(res.body)).not.toMatch(/"password":"/i);
        });
    });

    describe("API-21: Duplicate email on create -> 409 DUPLICATE_EMAIL (AC-18, BR-11)", () => {
        it("rejects creating a user with an email already in use", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Cookie", cookieFor(adminUser))
                .send({
                    name: "Duplicate Email Try",
                    email: "alice.tanaka@example.com", // already exists in seed
                    role: "REQUESTER",
                    isActive: true,
                    initialPassword: VALID_PASSWORD,
                });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe("DUPLICATE_EMAIL");

            // Nothing was persisted
            const count = await prisma.user.count({
                where: { name: "Duplicate Email Try" },
            });
            expect(count).toBe(0);
        });
    });

    describe("API-22: Set new initial password -> mustChangePassword=true on next login (AC-19, BR-31)", () => {
        let target: any;
        const OLD_PASSWORD = "TestPass@2026!";
        const NEW_PASSWORD = "FreshPass@2026!";

        beforeAll(async () => {
            target = await prisma.user.create({
                data: {
                    name: "Api TwentyTwo Target",
                    email: `api22.target${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(OLD_PASSWORD, 10),
                    role: "REQUESTER",
                    isActive: true,
                    mustChangePassword: false,
                },
            });
        });

        it("returns 200 and flags the target mustChangePassword=true", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${target.id}/password`)
                .set("Cookie", cookieFor(adminUser))
                .send({ newPassword: NEW_PASSWORD });

            expect(res.status).toBe(200);

            const dbUser = await prisma.user.findUnique({ where: { id: target.id } });
            expect(dbUser?.mustChangePassword).toBe(true);
        });

        it("forces the target through the change-password flow on next login", async () => {
            // The old password no longer works
            const oldLogin = await request(app)
                .post("/api/auth/login")
                .send({ email: target.email, password: OLD_PASSWORD });
            expect(oldLogin.status).toBe(401);

            // The new password works and lands in the restricted (must-change) session
            const login = await request(app)
                .post("/api/auth/login")
                .send({ email: target.email, password: NEW_PASSWORD });
            expect(login.status).toBe(200);
            expect(login.body.data.mustChangePassword).toBe(true);
        });

        it("rejects a new initial password that fails BR-07 with 400 VALIDATION_ERROR", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${target.id}/password`)
                .set("Cookie", cookieFor(adminUser))
                .send({ newPassword: "weakpass" });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("VALIDATION_ERROR");
        });
    });

    describe("API-23: Self-deactivation attempt -> 403 CANNOT_DEACTIVATE_SELF (AC-20, BR-32)", () => {
        // A helper admin is created so the self-deactivation attempt does not
        // simultaneously trip BR-33 (last active Administrator). With the seed's
        // single admin, any self-deactivation is necessarily also a last-admin
        // deactivation; isolating BR-32 here requires >1 active Administrator.
        let helperAdmin: any;

        beforeAll(async () => {
            helperAdmin = await prisma.user.create({
                data: {
                    name: "Api TwentyThree Helper Admin",
                    email: `api23.helper${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "ADMINISTRATOR",
                    isActive: true,
                    mustChangePassword: false,
                },
            });
        });

        it("rejects an Administrator deactivating their own account", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${adminUser.id}`)
                .set("Cookie", cookieFor(adminUser))
                .send({ isActive: false });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("CANNOT_DEACTIVATE_SELF");

            // The account must remain active
            const dbUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
            expect(dbUser?.isActive).toBe(true);
        });
    });

    describe("API-24: Deactivate last active Administrator -> 403 LAST_ACTIVE_ADMIN (AC-21, BR-33)", () => {
        let secondAdmin: any;

        beforeAll(async () => {
            secondAdmin = await prisma.user.upsert({
                where: { email: `api24.admin2${TEST_EMAIL_DOMAIN}` },
                update: { role: "ADMINISTRATOR", isActive: true },
                create: {
                    name: "Api TwentyFour Admin Two",
                    email: `api24.admin2${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "ADMINISTRATOR",
                    isActive: true,
                    mustChangePassword: false,
                },
            });
            // Deterministic starting state: seed admin active
            await prisma.user.update({
                where: { id: adminUser.id },
                data: { role: "ADMINISTRATOR", isActive: true },
            });
        });

        it("allows deactivating an Administrator while another active Administrator remains (200)", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${secondAdmin.id}`)
                .set("Cookie", cookieFor(adminUser))
                .send({ isActive: false });

            expect(res.status).toBe(200);
            const dbUser = await prisma.user.findUnique({ where: { id: secondAdmin.id } });
            expect(dbUser?.isActive).toBe(false);
        });

        it("rejects deactivating the last active Administrator with 403 LAST_ACTIVE_ADMIN", async () => {
            // Self-contained precondition: demote every test-domain Administrator
            // directly in the DB (not via the API under test) — including the
            // API-23 helper admin — leaving exactly one active Administrator.
            await prisma.user.updateMany({
                where: { email: { endsWith: TEST_EMAIL_DOMAIN }, role: "ADMINISTRATOR" },
                data: { isActive: false },
            });
            await prisma.user.update({
                where: { id: secondAdmin.id },
                data: { isActive: false },
            });

            // Precondition: exactly one active Administrator remains (alex.morgan)
            const activeAdmins = await prisma.user.count({
                where: { role: "ADMINISTRATOR", isActive: true },
            });
            expect(activeAdmins).toBe(1);

            const res = await request(app)
                .patch(`/api/admin/users/${adminUser.id}`)
                .set("Cookie", cookieFor(adminUser))
                .send({ isActive: false });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("LAST_ACTIVE_ADMIN");

            const dbUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
            expect(dbUser?.isActive).toBe(true);
        });
    });

    describe("API-25: Edit user with duplicate email -> 409 DUPLICATE_EMAIL on PATCH (BR-11, BR-30)", () => {
        let target: any;

        beforeAll(async () => {
            target = await prisma.user.create({
                data: {
                    name: "Api TwentyFive Target",
                    email: `api25.target${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "IT_STAFF",
                    isActive: true,
                    mustChangePassword: false,
                },
            });
        });

        it("rejects changing a user's email to one that already exists", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${target.id}`)
                .set("Cookie", cookieFor(adminUser))
                .send({ email: "bob.chavez@example.com" }); // exists in seed

            expect(res.status).toBe(409);
            expect(res.body.error).toBe("DUPLICATE_EMAIL");

            // Email unchanged in the database
            const dbUser = await prisma.user.findUnique({ where: { id: target.id } });
            expect(dbUser?.email).toBe(`api25.target${TEST_EMAIL_DOMAIN}`);
        });
    });

    describe("API-26: Role-change the last active Admin away from Administrator -> 403 LAST_ACTIVE_ADMIN (AC-21, BR-33 covers role changes too)", () => {
        beforeAll(async () => {
            // Deterministic starting state: alex.morgan is the only active Administrator
            await prisma.user.updateMany({
                where: { email: { endsWith: TEST_EMAIL_DOMAIN }, role: "ADMINISTRATOR" },
                data: { isActive: false },
            });
            await prisma.user.update({
                where: { id: adminUser.id },
                data: { role: "ADMINISTRATOR", isActive: true },
            });
        });

        it("rejects changing the last active Administrator's role with 403 LAST_ACTIVE_ADMIN", async () => {
            // Precondition: exactly one active Administrator remains
            const activeAdmins = await prisma.user.count({
                where: { role: "ADMINISTRATOR", isActive: true },
            });
            expect(activeAdmins).toBe(1);

            const res = await request(app)
                .patch(`/api/admin/users/${adminUser.id}`)
                .set("Cookie", cookieFor(adminUser))
                .send({ role: "IT_STAFF" });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("LAST_ACTIVE_ADMIN");

            // Role unchanged in the database
            const dbUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
            expect(dbUser?.role).toBe("ADMINISTRATOR");
        });
    });

    describe("API-29: Create user happy path -> 201, mustChangePassword=true (AC-30, FR-21, BR-29)", () => {
        it("creates a user and flags mustChangePassword=true", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Cookie", cookieFor(adminUser))
                .send({
                    name: "New Hire Requester",
                    email: `api29.newhire${TEST_EMAIL_DOMAIN}`,
                    role: "REQUESTER",
                    isActive: true,
                    initialPassword: VALID_PASSWORD,
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.name).toBe("New Hire Requester");
            expect(res.body.data.email).toBe(`api29.newhire${TEST_EMAIL_DOMAIN}`);
            expect(res.body.data.role).toBe("REQUESTER");
            expect(res.body.data.isActive).toBe(true);

            // BR-08: no password material in the response
            expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/i);
            expect(JSON.stringify(res.body)).not.toMatch(/initialPassword/i);

            const dbUser = await prisma.user.findUnique({
                where: { email: `api29.newhire${TEST_EMAIL_DOMAIN}` },
            });
            expect(dbUser).toBeDefined();
            expect(dbUser?.mustChangePassword).toBe(true);
            expect(dbUser?.passwordHash).not.toBe(VALID_PASSWORD); // bcrypt-hashed, BR-08
        });

        it("rejects a role outside the permitted set with 400 VALIDATION_ERROR (BR-29)", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Cookie", cookieFor(adminUser))
                .send({
                    name: "Bad Role User",
                    email: `api29.badrole${TEST_EMAIL_DOMAIN}`,
                    role: "SUPERADMIN",
                    isActive: true,
                    initialPassword: VALID_PASSWORD,
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("VALIDATION_ERROR");
        });

        it("rejects a weak initial password with 400 VALIDATION_ERROR (BR-07)", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Cookie", cookieFor(adminUser))
                .send({
                    name: "Weak Password User",
                    email: `api29.weakpass${TEST_EMAIL_DOMAIN}`,
                    role: "REQUESTER",
                    isActive: true,
                    initialPassword: "weakpass",
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("VALIDATION_ERROR");
        });
    });

    describe("API-31: Optional status (isActive) filter on the user list (FR-20, AC-17)", () => {
        let activeTarget: any;
        let inactiveTarget: any;

        beforeAll(async () => {
            activeTarget = await prisma.user.create({
                data: {
                    name: "Api ThirtyOne Active",
                    email: `api31.active${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "REQUESTER",
                    isActive: true,
                    mustChangePassword: false,
                },
            });
            inactiveTarget = await prisma.user.create({
                data: {
                    name: "Api ThirtyOne Inactive",
                    email: `api31.inactive${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "REQUESTER",
                    isActive: false,
                    mustChangePassword: false,
                },
            });
        });

        it("isActive=true returns only active users", async () => {
            const res = await request(app)
                .get("/api/admin/users?isActive=true")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            for (const u of res.body.data) {
                expect(u.isActive).toBe(true);
            }
            expect(res.body.data.some((u: any) => u.id === activeTarget.id)).toBe(true);
            expect(res.body.data.some((u: any) => u.id === inactiveTarget.id)).toBe(false);
        });

        it("isActive=false returns only inactive users", async () => {
            const res = await request(app)
                .get("/api/admin/users?isActive=false")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            for (const u of res.body.data) {
                expect(u.isActive).toBe(false);
            }
            expect(res.body.data.some((u: any) => u.id === inactiveTarget.id)).toBe(true);
            expect(res.body.data.some((u: any) => u.id === activeTarget.id)).toBe(false);
        });

        it("combines role + isActive (AND semantics)", async () => {
            const res = await request(app)
                .get("/api/admin/users?role=REQUESTER&isActive=false")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            for (const u of res.body.data) {
                expect(u.role).toBe("REQUESTER");
                expect(u.isActive).toBe(false);
            }
            expect(res.body.data.some((u: any) => u.id === inactiveTarget.id)).toBe(true);
        });

        it("combines search + isActive (AND semantics)", async () => {
            const res = await request(app)
                .get(`/api/admin/users?search=api31.active&isActive=true`)
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].id).toBe(activeTarget.id);
        });

        it("omitting isActive returns users of both states (All Statuses)", async () => {
            const res = await request(app)
                .get("/api/admin/users")
                .set("Cookie", cookieFor(adminUser));

            expect(res.status).toBe(200);
            const ids = res.body.data.map((u: any) => u.id);
            expect(ids).toContain(activeTarget.id);
            expect(ids).toContain(inactiveTarget.id);
        });
    });

    describe("API-30: Edit user name+role happy path -> 200, record updated (AC-31, FR-22, BR-30)", () => {
        let target: any;

        beforeAll(async () => {
            target = await prisma.user.create({
                data: {
                    name: "Api Thirty Original",
                    email: `api30.target${TEST_EMAIL_DOMAIN}`,
                    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
                    role: "IT_STAFF",
                    isActive: true,
                    mustChangePassword: false,
                },
            });
        });

        it("updates a user's name and role", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${target.id}`)
                .set("Cookie", cookieFor(adminUser))
                .send({ name: "Api Thirty Renamed", role: "REQUESTER" });

            expect(res.status).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.name).toBe("Api Thirty Renamed");
            expect(res.body.data.role).toBe("REQUESTER");

            const dbUser = await prisma.user.findUnique({ where: { id: target.id } });
            expect(dbUser?.name).toBe("Api Thirty Renamed");
            expect(dbUser?.role).toBe("REQUESTER");
        });
    });
});
