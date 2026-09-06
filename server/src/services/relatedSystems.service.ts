import { prisma } from "../lib/prisma";

// Ref: docs/lab-02/api-spec.md Section 3 "GET /api/related-systems"
// Ref: docs/lab-02/specification.md BR-10

export async function getActiveRelatedSystems() {
    return prisma.relatedSystem.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
        },
        orderBy: { id: "asc" },
    });
}
