import { prisma } from "../lib/prisma";

export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const FALLBACK_DEDUP_WINDOW_MS = 5 * 1000;

const MAX_TEXT_LENGTH = 4000;
const MAX_ATTACHMENT_NOTES_LENGTH = 1000;

const actionSelect = {
    id: true,
    ticketId: true,
    actionDateTime: true,
    description: true,
    result: true,
    performedById: true,
    followUpRequired: true,
    followUpNote: true,
    attachmentNotes: true,
    createdAt: true,
    updatedAt: true,
    performedBy: { select: { id: true, name: true } },
} as const;

interface Actor {
    userId: number;
    role: string;
}

type ActionRecord = {
    id: number;
    ticketId: number;
    actionDateTime: Date;
    description: string;
    result: string;
    performedById: number;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    performedBy: { id: number; name: string };
};

function toResponse(action: ActionRecord) {
    return {
        id: action.id,
        ticketId: action.ticketId,
        actionDateTime: action.actionDateTime,
        description: action.description,
        result: action.result,
        performedBy: action.performedBy,
        followUpRequired: action.followUpRequired,
        followUpNote: action.followUpNote,
        attachmentNotes: action.attachmentNotes,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
    };
}

interface NormalizedFields {
    fields: Record<string, string>;
    description: string;
    result: string;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
}

function normalizeAndValidate(
    body: Record<string, unknown>,
    existing?: ActionRecord
): NormalizedFields {
    const fields: Record<string, string> = {};

    const rawDescription = body.description !== undefined ? body.description : existing?.description ?? "";
    const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
    if (description.length < 1 || description.length > MAX_TEXT_LENGTH) {
        fields.description = description.length < 1 ? "Description is required." : `Description must be at most ${MAX_TEXT_LENGTH} characters.`;
    }

    const rawResult = body.result !== undefined ? body.result : existing?.result ?? "";
    const result = typeof rawResult === "string" ? rawResult.trim() : "";
    if (result.length < 1 || result.length > MAX_TEXT_LENGTH) {
        fields.result = result.length < 1 ? "Result is required." : `Result must be at most ${MAX_TEXT_LENGTH} characters.`;
    }

    const followUpRequired =
        body.followUpRequired === undefined ? existing?.followUpRequired ?? false : body.followUpRequired === true;

    const rawNote = body.followUpNote !== undefined ? body.followUpNote : existing?.followUpNote ?? "";
    const followUpNote = typeof rawNote === "string" ? rawNote.trim() : "";
    if (followUpRequired && followUpNote.length === 0) {
        fields.followUpNote = "Required when Follow-Up Required is Yes.";
    }

    const rawAttachment = body.attachmentNotes !== undefined ? body.attachmentNotes : existing?.attachmentNotes ?? null;
    const attachmentNotes =
        rawAttachment === null || rawAttachment === undefined || rawAttachment === ""
            ? null
            : String(rawAttachment);
    if (attachmentNotes !== null && attachmentNotes.length > MAX_ATTACHMENT_NOTES_LENGTH) {
        fields.attachmentNotes = `Attachment notes must be at most ${MAX_ATTACHMENT_NOTES_LENGTH} characters.`;
    }

    return {
        fields,
        description,
        result,
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote : null,
        attachmentNotes,
    };
}

export async function listActions(ticketId: number, actor: Actor) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true as const };

    if (actor.role === "REQUESTER" && ticket.requesterId !== actor.userId) {
        return { forbidden: true as const };
    }

    const actions = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: [{ actionDateTime: "desc" }, { id: "desc" }],
        select: actionSelect,
    });

    return { data: actions.map(toResponse) };
}

export async function createAction(
    ticketId: number,
    actor: Actor,
    body: Record<string, unknown>,
    idempotencyKey: string
) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true as const };

    if (ticket.currentStatus === "CANCELLED") {
        return { cancelled: true as const };
    }

    const normalized = normalizeAndValidate(body);
    if (Object.keys(normalized.fields).length > 0) {
        return { validation: normalized.fields };
    }

    const byKey = await prisma.actionTaken.findFirst({
        where: { ticketId, idempotencyKey },
        select: actionSelect,
    });
    if (byKey) {
        return { data: toResponse(byKey), replayed: true as const };
    }

    const fallbackSince = new Date(Date.now() - FALLBACK_DEDUP_WINDOW_MS);
    const byContent = await prisma.actionTaken.findFirst({
        where: {
            ticketId,
            performedById: actor.userId,
            description: normalized.description,
            result: normalized.result,
            createdAt: { gte: fallbackSince },
        },
        orderBy: { id: "asc" },
        select: actionSelect,
    });
    if (byContent) {
        return { data: toResponse(byContent), replayed: true as const };
    }

    const created = await prisma.actionTaken.create({
        data: {
            ticketId,
            actionDateTime: new Date(),
            description: normalized.description,
            result: normalized.result,
            performedById: actor.userId,
            followUpRequired: normalized.followUpRequired,
            followUpNote: normalized.followUpNote,
            attachmentNotes: normalized.attachmentNotes,
            idempotencyKey,
        },
        select: actionSelect,
    });

    return { data: toResponse(created), replayed: false as const };
}

export async function updateAction(
    ticketId: number,
    actionId: number,
    actor: Actor,
    body: Record<string, unknown>
) {
    const action = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        select: actionSelect,
    });
    if (!action) return { notFound: true as const };

    const isAdmin = actor.role === "ADMINISTRATOR";
    if (!isAdmin) {
        const isCreator = action.performedById === actor.userId;
        const withinWindow = Date.now() - action.createdAt.getTime() <= EDIT_WINDOW_MS;
        if (!isCreator || !withinWindow) {
            return { editWindowExpired: true as const };
        }
    }

    if (body.expectedUpdatedAt === undefined) {
        return { validation: { expectedUpdatedAt: "Required." } };
    }
    const expected = new Date(String(body.expectedUpdatedAt));
    if (Number.isNaN(expected.getTime()) || expected.getTime() !== action.updatedAt.getTime()) {
        return { stale: true as const, current: toResponse(action) };
    }

    const normalized = normalizeAndValidate(body, action);
    if (Object.keys(normalized.fields).length > 0) {
        return { validation: normalized.fields };
    }

    const updated = await prisma.actionTaken.update({
        where: { id: actionId },
        data: {
            description: normalized.description,
            result: normalized.result,
            followUpRequired: normalized.followUpRequired,
            followUpNote: normalized.followUpNote,
            attachmentNotes: normalized.attachmentNotes,
        },
        select: actionSelect,
    });

    return { data: toResponse(updated) };
}
