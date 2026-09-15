import { Request, Response } from "express";
import { listStaffTickets, ListStaffTicketsOptions } from "../services/staffTickets.service";

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
