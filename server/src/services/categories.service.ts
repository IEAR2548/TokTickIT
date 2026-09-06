import { prisma } from "../lib/prisma";

export interface CategoryDTO {
    id: number;
    name: string;
}

export async function getActiveCategories(): Promise<CategoryDTO[]> {
    return await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: {
            id: true,
            name: true,
        },
    });
}