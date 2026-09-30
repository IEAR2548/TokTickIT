import { Request, Response } from "express";
import { changeTicketStatus } from "../services/ticketWorkflow.service";

// Ref: docs/lab-04/api-spec.md §2.1, §4 (error codes)

function errorBody(code: string, message: string, extra?: Record<string, unknown>) {
    return { error: { code, message, ...(extra ?? {}) } };
}

export async function changeTicketStatusHandler(req: Request, res: Response) {
    const ticketId = Number(req.params.ticketId);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json(errorBody("NOT_FOUND", "Ticket not found"));
    }

    try {
        const result = await changeTicketStatus(
            ticketId,
            { userId: req.user!.userId, role: req.user!.role },
            req.body ?? {}
        );

        if ("notFound" in result) {
            return res.status(404).json(errorBody("NOT_FOUND", "Ticket not found"));
        }
        if ("forbidden" in result) {
            return res.status(403).json(errorBody("FORBIDDEN", "Access denied"));
        }
        if ("stale" in result && result.current) {
            const current = result.current;
            return res.status(409).json(
                errorBody("STALE_UPDATE", "This ticket was changed by someone else.", {
                    data: { current },
                })
            );
        }
        if ("invalidTransition" in result && result.current) {
            const current = result.current;
            return res.status(400).json(
                errorBody(
                    "INVALID_TRANSITION",
                    `Cannot move from ${current.status} to ${String(req.body?.status ?? "").toUpperCase()}.`,
                    { data: { current } }
                )
            );
        }
        if ("resolutionSummaryRequired" in result) {
            return res.status(400).json(
                errorBody(
                    "RESOLUTION_SUMMARY_REQUIRED",
                    "A resolution summary is required when changing status to Resolved or Closed."
                )
            );
        }
        if ("validation" in result) {
            return res
                .status(400)
                .json(errorBody("VALIDATION_ERROR", "Request failed validation.", { fields: result.validation }));
        }

        return res.status(200).json({ data: result.data });
    } catch (err) {
        console.error("[ticketWorkflow.controller] changeTicketStatusHandler failed:", err);
        return res.status(500).json(errorBody("INTERNAL_ERROR", "Unexpected server error"));
    }
}
