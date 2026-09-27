import { Request, Response } from "express";
import { listActions, createAction, updateAction } from "../services/actionsTaken.service";

function parsePositiveInt(raw: string): number | null {
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) return null;
    return value;
}

function errorBody(code: string, message: string, extra?: Record<string, unknown>) {
    return { error: { code, message, ...(extra ?? {}) } };
}

export async function listActionsHandler(req: Request, res: Response) {
    const ticketId = parsePositiveInt(req.params.ticketId);
    if (ticketId === null) {
        return res.status(404).json(errorBody("NOT_FOUND", "Ticket not found"));
    }

    try {
        const result = await listActions(ticketId, {
            userId: req.user!.userId,
            role: req.user!.role,
        });

        if ("notFound" in result) {
            return res.status(404).json(errorBody("NOT_FOUND", "Ticket not found"));
        }
        if ("forbidden" in result) {
            return res.status(403).json(errorBody("FORBIDDEN", "Access denied"));
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[actionsTaken.controller] listActionsHandler failed:", err);
        return res.status(500).json(errorBody("INTERNAL_ERROR", "Unexpected server error"));
    }
}

export async function createActionHandler(req: Request, res: Response) {
    const ticketId = parsePositiveInt(req.params.ticketId);
    if (ticketId === null) {
        return res.status(404).json(errorBody("NOT_FOUND", "Ticket not found"));
    }

    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
        return res.status(400).json(
            errorBody("VALIDATION_ERROR", "Idempotency-Key header is required.", {
                fields: { idempotencyKey: "Required." },
            })
        );
    }

    try {
        const result = await createAction(
            ticketId,
            { userId: req.user!.userId, role: req.user!.role },
            req.body ?? {},
            idempotencyKey.trim()
        );

        if ("notFound" in result) {
            return res.status(404).json(errorBody("NOT_FOUND", "Ticket not found"));
        }
        if ("cancelled" in result) {
            return res
                .status(409)
                .json(errorBody("TICKET_CANCELLED", "Cancelled tickets cannot receive new actions."));
        }
        if ("validation" in result) {
            return res
                .status(400)
                .json(errorBody("VALIDATION_ERROR", "Request failed validation.", { fields: result.validation }));
        }

        const status = result.replayed ? 200 : 201;
        return res.status(status).json({ data: result.data });
    } catch (err) {
        console.error("[actionsTaken.controller] createActionHandler failed:", err);
        return res.status(500).json(errorBody("INTERNAL_ERROR", "Unexpected server error"));
    }
}

export async function updateActionHandler(req: Request, res: Response) {
    const ticketId = parsePositiveInt(req.params.ticketId);
    const actionId = parsePositiveInt(req.params.actionId);
    if (ticketId === null || actionId === null) {
        return res.status(404).json(errorBody("NOT_FOUND", "Action not found"));
    }

    try {
        const result = await updateAction(
            ticketId,
            actionId,
            { userId: req.user!.userId, role: req.user!.role },
            req.body ?? {}
        );

        if ("notFound" in result) {
            return res.status(404).json(errorBody("NOT_FOUND", "Action not found"));
        }
        if ("editWindowExpired" in result) {
            return res
                .status(403)
                .json(errorBody("EDIT_WINDOW_EXPIRED", "This action can no longer be edited."));
        }
        if ("stale" in result) {
            return res.status(409).json(
                errorBody("STALE_UPDATE", "This action was changed by someone else.", {
                    data: { current: result.current },
                })
            );
        }
        if ("validation" in result) {
            return res
                .status(400)
                .json(errorBody("VALIDATION_ERROR", "Request failed validation.", { fields: result.validation }));
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[actionsTaken.controller] updateActionHandler failed:", err);
        return res.status(500).json(errorBody("INTERNAL_ERROR", "Unexpected server error"));
    }
}
