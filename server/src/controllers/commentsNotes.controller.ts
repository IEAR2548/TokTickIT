import { Request, Response } from "express";
import {
    createPublicComment,
    getPublicComments,
    createInternalNote,
    getInternalNotes,
    markTicketAppearsResolved,
} from "../services/commentsNotes.service";

export async function createPublicCommentHandler(req: Request, res: Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const { content } = req.body;
    if (typeof content !== "string" || content.trim().length < 1 || content.trim().length > 2000) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Comment content must be between 1 and 2000 characters",
        });
    }

    try {
        const result = await createPublicComment(ticketId, req.user!.userId, req.user!.role, content.trim());
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }
        if (result.forbidden) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Access denied",
            });
        }

        return res.status(201).json({ data: result.data });
    } catch (err) {
        console.error("[commentsNotes.controller] createPublicCommentHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function getPublicCommentsHandler(req: Request, res: Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    try {
        const result = await getPublicComments(ticketId, req.user!.userId, req.user!.role);
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }
        if (result.forbidden) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Access denied",
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[commentsNotes.controller] getPublicCommentsHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function createInternalNoteHandler(req: Request, res: Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const { content } = req.body;
    if (typeof content !== "string" || content.trim().length < 1 || content.trim().length > 2000) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Note content must be between 1 and 2000 characters",
        });
    }

    try {
        const result = await createInternalNote(ticketId, req.user!.userId, content.trim());
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }

        return res.status(201).json({ data: result.data });
    } catch (err) {
        console.error("[commentsNotes.controller] createInternalNoteHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function getInternalNotesHandler(req: Request, res: Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    try {
        const result = await getInternalNotes(ticketId);
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[commentsNotes.controller] getInternalNotesHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function markAppearsResolvedHandler(req: Request, res: Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    try {
        // Ref: docs/lab-04/api-spec.md §2.2 — PATCH carries `appearsResolved` + `expectedUpdatedAt`.
        const result = await markTicketAppearsResolved(ticketId, req.user!.userId, {
            appearsResolved: body.appearsResolved,
            expectedUpdatedAt: body.expectedUpdatedAt,
        });
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }
        if (result.forbidden) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Access denied",
            });
        }
        if ("stale" in result) {
            // STALE_UPDATE is a Lab 4 code (api-spec §4), so it uses the nested envelope; the
            // pre-existing 404/403 keep Lab 3's string envelope unchanged.
            return res.status(409).json({
                error: {
                    code: "STALE_UPDATE",
                    message: "This ticket was changed by someone else.",
                    data: { current: result.current },
                },
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[commentsNotes.controller] markAppearsResolvedHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}
