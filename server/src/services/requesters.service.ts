import { prisma } from "../lib/prisma";

export interface RequesterDTO {
    id: number;
    name: string;
    email: string;
}

export async function getActiveRequesters(): Promise<RequesterDTO[]> {
    const requesters = await prisma.devRequester.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            email: true,
            // isActive intentionally excluded from the DTO — internal flag only
        },
    });

    return requesters;
}