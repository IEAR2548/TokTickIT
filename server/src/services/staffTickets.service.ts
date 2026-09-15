import { prisma } from "../lib/prisma";

export interface ListStaffTicketsOptions {
    search?: string;
    status?: string;
    itPriority?: string;
    ownerId?: number | "unassigned";
    sortBy?: "createdAt" | "updatedAt" | "itPriority" | "requestedPriority" | "currentStatus" | "ownerName";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}

export async function listStaffTickets(options: ListStaffTicketsOptions) {
    const where: any = {};

    if (options.status) {
        where.currentStatus = options.status;
    }

    if (options.itPriority) {
        where.itPriority = options.itPriority;
    }

    if (options.ownerId !== undefined) {
        if (options.ownerId === "unassigned") {
            where.ownerId = null;
        } else {
            where.ownerId = options.ownerId;
        }
    }

    if (options.search && options.search.trim() !== "") {
        const searchTerm = options.search.trim();
        where.OR = [
            { ticketNumber: { contains: searchTerm, mode: "insensitive" } },
            { summary: { contains: searchTerm, mode: "insensitive" } },
        ];
    }

    const page = options.page && options.page >= 1 ? options.page : 1;
    const pageSize = options.pageSize && [10, 25, 50].includes(options.pageSize) ? options.pageSize : 10;
    const skip = (page - 1) * pageSize;

    const sortBy = options.sortBy ?? "createdAt";
    const sortDir = options.sortDir ?? "desc";

    let orderByClause: any;
    if (sortBy === "ownerName") {
        orderByClause = [{ owner: { name: sortDir } }, { id: "desc" }];
    } else {
        orderByClause = [{ [sortBy]: sortDir }, { id: "desc" }];
    }

    const [tickets, totalCount] = await Promise.all([
        prisma.ticket.findMany({
            where,
            select: {
                id: true,
                ticketNumber: true,
                summary: true,
                description: true,
                requestedPriority: true,
                itPriority: true,
                currentStatus: true,
                appearsResolved: true,
                resolutionSummary: true,
                ownerId: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                relatedSystem: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                requester: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdAt: true,
                updatedAt: true,
            },
            orderBy: orderByClause,
            skip,
            take: pageSize,
        }),
        prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
        data: tickets,
        meta: {
            page,
            pageSize,
            totalCount,
            totalPages,
        },
    };
}
