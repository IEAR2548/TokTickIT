import { Request, Response } from "express";
import { validateCreateTicket, hasErrors, CreateTicketInput } from "../validators/ticket.validator";
import {
    createTicket,
    listTickets,
    RequesterNotFoundError,
    CategoryNotFoundError,
    RelatedSystemNotFoundError,
} from "../services/tickets.service";

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

export async function listTicketsHandler(req: Request, res: Response) {
    const requesterIdRaw = req.query.requesterId;
    const requesterId = Number(requesterIdRaw);
    if (!requesterIdRaw || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "requesterId is required and must be a positive integer",
        });
    }

    let page = 1;
    if (req.query.page !== undefined) {
        page = Number(req.query.page);
        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "page must be an integer greater than or equal to 1",
            });
        }
    }

    let pageSize = 10;
    if (req.query.pageSize !== undefined) {
        pageSize = Number(req.query.pageSize);
        if (![10, 25, 50].includes(pageSize)) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "pageSize must be one of 10, 25, 50",
            });
        }
    }

    let sortBy: "createdAt" | "updatedAt" = "createdAt";
    if (req.query.sortBy !== undefined) {
        const s = String(req.query.sortBy);
        if (s !== "createdAt" && s !== "updatedAt") {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "sortBy must be 'createdAt' or 'updatedAt'",
            });
        }
        sortBy = s;
    }

    let sortOrder: "asc" | "desc" = "desc";
    if (req.query.sortOrder !== undefined) {
        const o = String(req.query.sortOrder).toLowerCase();
        if (o !== "asc" && o !== "desc") {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "sortOrder must be 'asc' or 'desc'",
            });
        }
        sortOrder = o;
    }

    let categoryId: number | undefined;
    if (req.query.categoryId !== undefined) {
        const c = Number(req.query.categoryId);
        if (Number.isInteger(c) && c > 0) {
            categoryId = c;
        }
    }

    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    try {
        const result = await listTickets({
            requesterId,
            search,
            categoryId,
            status,
            sortBy,
            sortOrder,
            page,
            pageSize,
        });
        return res.status(200).json(result);
    } catch (err) {
        if (err instanceof RequesterNotFoundError) {
            return res.status(404).json({
                error: "REQUESTER_NOT_FOUND",
                message: "requesterId does not match an active Requester",
            });
        }
        console.error("[tickets.controller] listTicketsHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}
