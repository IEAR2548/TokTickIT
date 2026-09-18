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

export async function getStaffTicketDetail(ticketId: number) {
    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
            id: true,
            ticketNumber: true,
            summary: true,
            description: true,
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true, email: true } },
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
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    publicComments: true,
                    internalNotes: true,
                    attachments: { where: { isRemoved: false } },
                },
            },
        },
    });

    if (!ticket) return null;

    return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        summary: ticket.summary,
        description: ticket.description,
        category: ticket.category,
        relatedSystem: ticket.relatedSystem,
        requester: ticket.requester,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        appearsResolved: ticket.appearsResolved,
        resolutionSummary: ticket.resolutionSummary,
        ownerId: ticket.ownerId,
        owner: ticket.owner,
        commentsCount: ticket._count.publicComments,
        notesCount: ticket._count.internalNotes,
        attachmentsCount: ticket._count.attachments,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
    };
}

export async function claimStaffTicket(ticketId: number, staffUserId: number) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    if (ticket.ownerId !== null && ticket.ownerId !== staffUserId) {
        return { conflict: true };
    }

    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { ownerId: staffUserId },
        select: {
            id: true,
            ownerId: true,
            owner: { select: { id: true, name: true, role: true } },
        },
    });

    return { data: updated };
}

export async function assignStaffTicket(ticketId: number, targetOwnerId: number) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetOwnerId } });
    if (!targetUser || !targetUser.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(targetUser.role)) {
        return { validationError: "Target owner must be an active IT Staff or Administrator" };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { ownerId: targetOwnerId },
        select: {
            id: true,
            ownerId: true,
            owner: { select: { id: true, name: true, role: true } },
        },
    });

    return { data: updated };
}

export async function updateStaffTicketPriority(ticketId: number, itPriority: string) {
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(itPriority)) {
        return { validationError: "Invalid IT priority" };
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { itPriority: itPriority as any },
        select: {
            id: true,
            itPriority: true,
        },
    });

    return { data: updated };
}

export async function updateStaffTicketStatus(
    ticketId: number,
    newStatus: string,
    resolutionSummary?: string,
    isValidTransitionFn?: (from: any, to: any) => boolean
) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    if (isValidTransitionFn && !isValidTransitionFn(ticket.currentStatus, newStatus)) {
        return { invalidTransition: true };
    }

    if (newStatus === "RESOLVED" || newStatus === "CLOSED") {
        const summaryToUse = resolutionSummary !== undefined ? resolutionSummary.trim() : (ticket.resolutionSummary || "");
        if (!summaryToUse) {
            return { resolutionSummaryRequired: true };
        }
    }

    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            currentStatus: newStatus as any,
            resolutionSummary: resolutionSummary !== undefined ? (resolutionSummary.trim() || null) : ticket.resolutionSummary,
        },
        select: {
            id: true,
            currentStatus: true,
            resolutionSummary: true,
        },
    });

    return { data: updated };
}
