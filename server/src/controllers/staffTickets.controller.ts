import { Request, Response } from "express";
import {
    listStaffTickets,
    ListStaffTicketsOptions,
    getStaffTicketDetail,
    claimStaffTicket,
    assignStaffTicket,
    updateStaffTicketPriority,
    updateStaffTicketStatus,
} from "../services/staffTickets.service";
import { isValidStatusTransition } from "../validators/ticketStatus.validator";

export async function listStaffTicketsHandler(req: Request, res: Response) {
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

    const allowedSortBy = [
        "createdAt",
        "updatedAt",
        "itPriority",
        "requestedPriority",
        "currentStatus",
        "ownerName",
    ];
    let sortBy: ListStaffTicketsOptions["sortBy"] = "createdAt";
    if (req.query.sortBy !== undefined) {
        const s = String(req.query.sortBy);
        if (!allowedSortBy.includes(s)) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: `sortBy must be one of: ${allowedSortBy.join(", ")}`,
            });
        }
        sortBy = s as ListStaffTicketsOptions["sortBy"];
    }

    let sortDir: "asc" | "desc" = "desc";
    if (req.query.sortDir !== undefined) {
        const d = String(req.query.sortDir).toLowerCase();
        if (d !== "asc" && d !== "desc") {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "sortDir must be 'asc' or 'desc'",
            });
        }
        sortDir = d;
    }

    let itPriority: string | undefined;
    if (req.query.itPriority !== undefined) {
        const p = String(req.query.itPriority).toUpperCase();
        if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(p)) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "itPriority must be one of LOW, MEDIUM, HIGH, CRITICAL",
            });
        }
        itPriority = p;
    }

    let ownerId: number | "unassigned" | undefined;
    if (req.query.ownerId !== undefined) {
        const rawOwner = String(req.query.ownerId);
        if (rawOwner === "unassigned") {
            ownerId = "unassigned";
        } else {
            const parsed = Number(rawOwner);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                return res.status(400).json({
                    error: "VALIDATION_ERROR",
                    message: "ownerId must be a positive integer or 'unassigned'",
                });
            }
            ownerId = parsed;
        }
    }

    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    try {
        const result = await listStaffTickets({
            search,
            status,
            itPriority,
            ownerId,
            sortBy,
            sortDir,
            page,
            pageSize,
        });

        return res.status(200).json(result);
    } catch (err) {
        console.error("[staffTickets.controller] listStaffTicketsHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function getStaffTicketDetailHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    try {
        const ticket = await getStaffTicketDetail(id);
        if (!ticket) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }

        return res.status(200).json({ data: ticket });
    } catch (err) {
        console.error("[staffTickets.controller] getStaffTicketDetailHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function claimStaffTicketHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const staffUserId = req.user!.userId;

    try {
        const result = await claimStaffTicket(id, staffUserId);
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }
        if (result.conflict) {
            return res.status(409).json({
                error: "CONFLICT",
                message: "Ticket is already claimed by another staff member",
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[staffTickets.controller] claimStaffTicketHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function assignStaffTicketHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const { ownerId } = req.body;
    if (ownerId === undefined || !Number.isInteger(Number(ownerId)) || Number(ownerId) <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Target owner must be an active IT Staff or Administrator",
        });
    }

    try {
        const result = await assignStaffTicket(id, Number(ownerId));
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }
        if (result.validationError) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: result.validationError,
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[staffTickets.controller] assignStaffTicketHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function updateStaffTicketPriorityHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const { itPriority } = req.body;
    if (!itPriority || !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(itPriority)) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "itPriority must be one of LOW, MEDIUM, HIGH, CRITICAL",
        });
    }

    try {
        const result = await updateStaffTicketPriority(id, itPriority);
        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[staffTickets.controller] updateStaffTicketPriorityHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function updateStaffTicketStatusHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket not found",
        });
    }

    const { status, resolutionSummary } = req.body;
    if (!status) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Status is required",
        });
    }

    try {
        const result = await updateStaffTicketStatus(
            id,
            status,
            resolutionSummary,
            isValidStatusTransition
        );

        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket not found",
            });
        }
        if (result.invalidTransition) {
            return res.status(400).json({
                error: "INVALID_TRANSITION",
                message: `Transition to ${status} is not permitted from the current status`,
            });
        }
        if (result.resolutionSummaryRequired) {
            return res.status(400).json({
                error: "RESOLUTION_SUMMARY_REQUIRED",
                message: "A resolution summary is required when marking a ticket as Resolved or Closed",
            });
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[staffTickets.controller] updateStaffTicketStatusHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

