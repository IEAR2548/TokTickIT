import { TicketStatus } from "@prisma/client";

// Ref: docs/lab-03/specification.md BR-21, AC-11, AC-29
// Single source of truth for permitted ticket status transitions

export const PERMITTED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    NEW: ["OPEN", "CANCELLED"],
    OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "REOPENED"],
    CLOSED: ["REOPENED"],
    REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
    CANCELLED: [],
};

export function isValidStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
    if (!from || !to || from === to) return false;
    const permitted = PERMITTED_STATUS_TRANSITIONS[from];
    if (!permitted) return false;
    return permitted.includes(to);
}
