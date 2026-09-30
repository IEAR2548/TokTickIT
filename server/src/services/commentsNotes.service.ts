import { prisma } from "../lib/prisma";

// Ref: docs/lab-03/api-spec.md Endpoints 15-19
// Ref: docs/lab-03/specification.md BR-04, BR-05, BR-20, BR-23..BR-28

export async function createPublicComment(ticketId: number, authorId: number, authorRole: string, content: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    if (authorRole === "REQUESTER" && ticket.requesterId !== authorId) {
        return { forbidden: true };
    }

    const comment = await prisma.publicComment.create({
        data: {
            ticketId,
            authorId,
            content,
        },
        select: {
            id: true,
            ticketId: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            },
        },
    });

    return {
        data: {
            id: comment.id,
            ticketId: comment.ticketId,
            authorId: comment.authorId,
            authorName: comment.author.name,
            authorRole: comment.author.role,
            content: comment.content,
            createdAt: comment.createdAt,
            author: comment.author,
        },
    };
}

export async function getPublicComments(ticketId: number, callerUserId: number, callerRole: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    if (callerRole === "REQUESTER" && ticket.requesterId !== callerUserId) {
        return { forbidden: true };
    }

    const comments = await prisma.publicComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            ticketId: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            },
        },
    });

    return {
        data: comments.map((c) => ({
            id: c.id,
            ticketId: c.ticketId,
            authorId: c.authorId,
            authorName: c.author.name,
            authorRole: c.author.role,
            content: c.content,
            createdAt: c.createdAt,
            author: c.author,
        })),
    };
}

export async function createInternalNote(ticketId: number, authorId: number, content: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    const note = await prisma.internalNote.create({
        data: {
            ticketId,
            authorId,
            content,
        },
        select: {
            id: true,
            ticketId: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            },
        },
    });

    return {
        data: {
            id: note.id,
            ticketId: note.ticketId,
            authorId: note.authorId,
            authorName: note.author.name,
            authorRole: note.author.role,
            content: note.content,
            createdAt: note.createdAt,
            author: note.author,
        },
    };
}

export async function getInternalNotes(ticketId: number) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    const notes = await prisma.internalNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            ticketId: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            },
        },
    });

    return {
        data: notes.map((n) => ({
            id: n.id,
            ticketId: n.ticketId,
            authorId: n.authorId,
            authorName: n.author.name,
            authorRole: n.author.role,
            content: n.content,
            createdAt: n.createdAt,
            author: n.author,
        })),
    };
}

// Ref: docs/lab-04/api-spec.md §2.2, specification.md FR-09/AC-06, BR-16
export interface MarkAppearsResolvedOptions {
    /** Defaults to true for backward compatibility with the Lab 3 body-less call. */
    appearsResolved?: unknown;
    expectedUpdatedAt?: unknown;
}

export async function markTicketAppearsResolved(
    ticketId: number,
    requesterId: number,
    options: MarkAppearsResolvedOptions = {}
) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true };

    if (ticket.requesterId !== requesterId) {
        return { forbidden: true };
    }

    // BR-14: the same optimistic-concurrency check applies here. Omitted for Lab 3 clients.
    if (options.expectedUpdatedAt !== undefined) {
        const expected = new Date(String(options.expectedUpdatedAt));
        if (Number.isNaN(expected.getTime()) || expected.getTime() !== ticket.updatedAt.getTime()) {
            return {
                stale: true,
                current: { status: ticket.currentStatus, updatedAt: ticket.updatedAt },
            };
        }
    }

    const appearsResolved =
        typeof options.appearsResolved === "boolean" ? options.appearsResolved : true;

    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { appearsResolved },
        select: {
            id: true,
            appearsResolved: true,
            currentStatus: true,
            updatedAt: true,
        },
    });

    // Never touches `status` (FR-09/AC-06): it is only ever *read* back for the client.
    return {
        data: {
            id: updated.id,
            appearsResolved: updated.appearsResolved,
            status: updated.currentStatus,
            updatedAt: updated.updatedAt,
        },
    };
}
