import { prisma } from "../lib/prisma";
import { generateUniqueTicketNumber } from "./ticketNumber.service";
import { CreateTicketInput } from "../validators/ticket.validator";

export class RequesterNotFoundError extends Error {
    constructor() {
        super("Requester does not match an active Requester");
    }
}

export class CategoryNotFoundError extends Error {
    constructor() {
        super("Category does not match an active Category");
    }
}

export class RelatedSystemNotFoundError extends Error {
    constructor() {
        super("Related system does not match an active RelatedSystem");
    }
}

export async function createTicket(input: CreateTicketInput) {
    const requester = await prisma.devRequester.findUnique({
        where: { id: input.requesterId },
    });
    if (!requester || !requester.isActive) {
        throw new RequesterNotFoundError();
    }

    const category = await prisma.category.findFirst({
        where: { id: input.categoryId, isActive: true },
    });
    if (!category) {
        throw new CategoryNotFoundError();
    }

    const relatedSystem = await prisma.relatedSystem.findFirst({
        where: { id: input.relatedSystemId, isActive: true },
    });
    if (!relatedSystem) {
        throw new RelatedSystemNotFoundError();
    }

    const ticketNumber = await generateUniqueTicketNumber();

    const ticket = await prisma.ticket.create({
        data: {
            ticketNumber,
            requesterId: input.requesterId,
            categoryId: input.categoryId,
            relatedSystemId: input.relatedSystemId,
            summary: input.summary.trim(),
            description: input.description.trim(),
            requestedPriority: input.requestedPriority,
            currentStatus: "NEW", // BR-02
        },
    });

    return ticket;
}

export interface ListTicketsOptions {
    requesterId: number;
    search?: string;
    categoryId?: number;
    status?: string;
    sortBy?: "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}

export async function listTickets(options: ListTicketsOptions) {
    const requester = await prisma.devRequester.findUnique({
        where: { id: options.requesterId },
    });
    if (!requester || !requester.isActive) {
        throw new RequesterNotFoundError();
    }

    const where: any = {
        requesterId: options.requesterId,
    };

    if (options.categoryId) {
        where.categoryId = options.categoryId;
    }

    if (options.status) {
        where.currentStatus = options.status;
    }

    if (options.search && options.search.trim() !== "") {
        const searchTerm = options.search.trim();
        where.OR = [
            { ticketNumber: { contains: searchTerm, mode: "insensitive" } },
            { summary: { contains: searchTerm, mode: "insensitive" } },
        ];
    }

    const page = options.page && options.page >= 1 ? options.page : 1;
    const pageSize = options.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const sortBy = options.sortBy ?? "createdAt";
    const sortOrder = options.sortOrder ?? "desc";

    const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            select: {
                id: true,
                ticketNumber: true,
                summary: true,
                category: { select: { id: true, name: true } },
                relatedSystem: { select: { id: true, name: true } },
                requestedPriority: true,
                currentStatus: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: [
                { [sortBy]: sortOrder },
                { id: "desc" }, // BR-23: secondary sort to break ties
            ],
            skip,
            take: pageSize,
        }),
        prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
        tickets,
        pagination: {
            page,
            pageSize,
            total,
            totalPages,
        },
    };
}
