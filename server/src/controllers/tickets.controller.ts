import { Request, Response } from "express";
import { validateCreateTicket, hasErrors, CreateTicketInput } from "../validators/ticket.validator";
import {
    createTicket,
    RequesterNotFoundError,
    CategoryNotFoundError,
    RelatedSystemNotFoundError,
} from "../services/tickets.service";

// Ref: docs/lab-02/api-spec.md Section 4 "POST /api/tickets"

export async function createTicketHandler(req: Request, res: Response) {
    const body = req.body as Partial<CreateTicketInput>;
    const fieldErrors = validateCreateTicket(body);
    if (hasErrors(fieldErrors)) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            fields: fieldErrors,
        });
    }

    try {
        const ticket = await createTicket(body as CreateTicketInput);
        return res.status(201).json({ ticket });
    } catch (err) {
        if (err instanceof RequesterNotFoundError) {
            return res.status(404).json({
                error: "REQUESTER_NOT_FOUND",
                message: "requesterId does not match an active Requester",
            });
        }
        if (err instanceof CategoryNotFoundError) {
            return res.status(404).json({
                error: "CATEGORY_NOT_FOUND",
                message: "categoryId does not match an active Category",
            });
        }
        if (err instanceof RelatedSystemNotFoundError) {
            return res.status(404).json({
                error: "RELATED_SYSTEM_NOT_FOUND",
                message: "relatedSystemId does not match an active RelatedSystem",
            });
        }
        console.error("[tickets.controller] createTicketHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}