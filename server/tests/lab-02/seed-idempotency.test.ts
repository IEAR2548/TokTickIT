import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "child_process";
import { prisma } from "../../src/lib/prisma";

describe("Seed idempotency", () => {
    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("does not create duplicate rows when run twice", async () => {
        execSync("npx prisma db seed", { stdio: "inherit" });
        const firstCategoryCount = await prisma.category.count();
        const firstRelatedSystemCount = await prisma.relatedSystem.count();
        const firstRequesterCount = await prisma.devRequester.count();

        execSync("npx prisma db seed", { stdio: "inherit" });
        const secondCategoryCount = await prisma.category.count();
        const secondRelatedSystemCount = await prisma.relatedSystem.count();
        const secondRequesterCount = await prisma.devRequester.count();

        expect(secondCategoryCount).toBe(firstCategoryCount);
        expect(secondRelatedSystemCount).toBe(firstRelatedSystemCount);
        expect(secondRequesterCount).toBe(firstRequesterCount);
    }, 30000);

    it("seeds exactly the 4 required categories", async () => {
        const names = (await prisma.category.findMany()).map((c) => c.name).sort();
        expect(names).toEqual(
            ["Account and Access", "Hardware", "Network", "Software"].sort()
        );
    });

    it("seeds at least 6 active related systems", async () => {
        const count = await prisma.relatedSystem.count({ where: { isActive: true } });
        expect(count).toBeGreaterThanOrEqual(6);
    });

    it("seeds at least 4 active and 1 inactive requester", async () => {
        const active = await prisma.devRequester.count({ where: { isActive: true } });
        const inactive = await prisma.devRequester.count({ where: { isActive: false } });
        expect(active).toBeGreaterThanOrEqual(4);
        expect(inactive).toBeGreaterThanOrEqual(1);
    });

    it("seeds the correct active requester emails from specification", async () => {
        const emails = (
            await prisma.devRequester.findMany({ where: { isActive: true } })
        )
            .map((r) => r.email)
            .sort();
        expect(emails).toEqual(
            [
                "alice.tanaka@example.com",
                "bob.chavez@example.com",
                "carol.meier@example.com",
                "david.sorn@example.com",
            ].sort()
        );
    });

    it("inactive requester is not returned when filtering by isActive", async () => {
        const inactiveRequester = await prisma.devRequester.findUnique({
            where: { email: "eve.former@example.com" },
        });
        expect(inactiveRequester).not.toBeNull();
        expect(inactiveRequester?.isActive).toBe(false);

        const activeList = await prisma.devRequester.findMany({
            where: { isActive: true },
        });
        const activeEmails = activeList.map((r) => r.email);
        expect(activeEmails).not.toContain("eve.former@example.com");
    });
});