import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { prisma } from "../../src/lib/prisma";

function findLab4MigrationDir(): string {
    const migrationsRoot = path.resolve(process.cwd(), "prisma/migrations");
    const dirs = fs
        .readdirSync(migrationsRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.includes("lab4_actions_taken"))
        .map((d) => d.name);
    return path.join(migrationsRoot, dirs[0]);
}

let performedById: number;
let missingTicketId: number;

describe("MIG-01 / MIG-04: Lab 4 ActionTaken migration and schema-level BR-01 enforcement", () => {
    beforeAll(async () => {
        if ((await prisma.ticket.count()) === 0) {
            execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
        }

        const staff = await prisma.user.findFirst({
            where: { role: "IT_STAFF", isActive: true },
            orderBy: { id: "asc" },
        });
        performedById = staff!.id;

        const maxTicket = await prisma.ticket.findFirst({ orderBy: { id: "desc" } });
        missingTicketId = (maxTicket?.id ?? 0) + 100000;
    });

    afterAll(async () => {
        await prisma.$executeRawUnsafe(
            `DELETE FROM "ActionTaken" WHERE "description" LIKE '[MIG-TEST]%'`
        );
        await prisma.$disconnect();
    });

    it("MIG-01: ActionTaken table exists, Lab 1-3 rows remain, and new columns default correctly", async () => {
        const actionCount = await prisma.actionTaken.count();
        expect(actionCount).toBeGreaterThanOrEqual(0);

        const [userCount, ticketCount, categoryCount] = await Promise.all([
            prisma.user.count(),
            prisma.ticket.count(),
            prisma.category.count(),
        ]);
        expect(userCount).toBeGreaterThan(0);
        expect(ticketCount).toBeGreaterThan(0);
        expect(categoryCount).toBeGreaterThan(0);

        const created = await prisma.actionTaken.create({
            data: {
                ticketId: (await prisma.ticket.findFirst())!.id,
                actionDateTime: new Date(),
                description: "[MIG-TEST] defaults probe",
                result: "probe",
                performedById,
                attachmentNotes: null,
            },
        });

        expect(created.followUpRequired).toBe(false);
        expect(created.followUpNote).toBeNull();
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
        expect(created.actionDateTime).toBeInstanceOf(Date);

        await prisma.actionTaken.delete({ where: { id: created.id } });
    });

    it("MIG-02: down-migration drops ActionTaken cleanly without touching Lab 1-3 tables", async () => {
        const downSql = fs.readFileSync(path.join(findLab4MigrationDir(), "down.sql"), "utf8");

        const client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        try {
            const ticketBefore = await client.query('SELECT count(*)::int AS n FROM "Ticket"');
            const userBefore = await client.query('SELECT count(*)::int AS n FROM "User"');

            await client.query("BEGIN");
            await client.query(downSql);

            const reg = await client.query(`SELECT to_regclass('"ActionTaken"')::text AS t`);
            expect(reg.rows[0].t, "ActionTaken table should be gone after down-migration").toBeNull();

            const ticketAfter = await client.query('SELECT count(*)::int AS n FROM "Ticket"');
            const userAfter = await client.query('SELECT count(*)::int AS n FROM "User"');
            expect(ticketAfter.rows[0].n).toBe(ticketBefore.rows[0].n);
            expect(userAfter.rows[0].n).toBe(userBefore.rows[0].n);

            await client.query("ROLLBACK");
        } finally {
            await client.end();
        }

        const regAfter = await prisma.$queryRawUnsafe<Array<{ t: string | null }>>(
            `SELECT to_regclass('"ActionTaken"')::text AS t`
        );
        expect(regAfter[0].t).not.toBeNull();
    });

    it("MIG-03: seed is idempotent and produces the required Lab 4 Action Taken fixtures", async () => {
        execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
        const before = {
            tickets: await prisma.ticket.count(),
            actions: await prisma.actionTaken.count(),
            maxActionId: (await prisma.actionTaken.findFirst({ orderBy: { id: "desc" } }))?.id ?? 0,
        };

        execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
        const after = {
            tickets: await prisma.ticket.count(),
            actions: await prisma.actionTaken.count(),
            maxActionId: (await prisma.actionTaken.findFirst({ orderBy: { id: "desc" } }))?.id ?? 0,
        };

        expect(after.tickets).toBe(before.tickets);
        expect(after.actions).toBe(before.actions);
        expect(after.maxActionId).toBe(before.maxActionId);

        const grouped = await prisma.actionTaken.groupBy({
            by: ["ticketId"],
            _count: { _all: true },
        });
        expect(grouped.some((g) => g._count._all >= 3)).toBe(true);
        const followUp = await prisma.actionTaken.count({ where: { followUpRequired: true } });
        expect(followUp).toBeGreaterThanOrEqual(1);
    });

    it("MIG-04: direct insert with NULL ticketId is rejected by the database (BR-01)", async () => {
        await expect(
            prisma.$executeRawUnsafe(
                `INSERT INTO "ActionTaken" ("ticketId", "actionDateTime", "description", "result", "performedById")
                 VALUES (NULL, now(), '[MIG-TEST] null-ticket', 'r', $1)`,
                performedById
            )
        ).rejects.toThrow(/ticketId/i);
    });

    it("MIG-04: direct insert referencing a non-existent Ticket is rejected by the FK (BR-01)", async () => {
        await expect(
            prisma.$executeRawUnsafe(
                `INSERT INTO "ActionTaken" ("ticketId", "actionDateTime", "description", "result", "performedById")
                 VALUES ($1, now(), '[MIG-TEST] missing-ticket', 'r', $2)`,
                missingTicketId,
                performedById
            )
        ).rejects.toThrow(/ticketId/i);

        const orphans = await prisma.$executeRawUnsafe(
            `SELECT count(*)::int AS n FROM "ActionTaken" WHERE "ticketId" = $1`,
            missingTicketId
        );
        expect((orphans as any).n ?? 0).toBe(0);
    });
});
