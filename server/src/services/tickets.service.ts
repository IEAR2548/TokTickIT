import { prisma } from "../lib/prisma";
import { generateUniqueTicketNumber } from "./ticketNumber.service";
import { CreateTicketInput } from "../validators/ticket.validator";

// Ref: docs/lab-02/specification.md BR-01, BR-02, BR-04, BR-09, BR-10
// Ref: docs/lab-02/api-spec.md Section 4

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