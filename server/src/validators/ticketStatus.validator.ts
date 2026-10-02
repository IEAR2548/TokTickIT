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

// Ref: docs/lab-04/specification.md §5.1 (full matrix incl. the role column), BR-15
export type TicketTransitionRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface TransitionContext {
    isRequesterOwner?: boolean;
}

const STAFF_ROLES: readonly string[] = ["IT_STAFF", "ADMINISTRATOR"];

/**
 * Role-aware view of the §5.1 matrix.
 *
 * IT Staff/Admin share the topology in `PERMITTED_STATUS_TRANSITIONS`. A Requester has exactly
 * one self-service transition — `Cancelled`, and only from `New`/`Open` on their *own* Ticket
 * (BR-15). Any other combination is not permitted.
 */
export function isPermittedTransition(
    from: TicketStatus,
    to: TicketStatus,
    role: string,
    context: TransitionContext = {}
): boolean {
    if (!from || !to || from === to) return false;

    if (STAFF_ROLES.includes(role)) {
        return isValidStatusTransition(from, to);
    }

    if (role === "REQUESTER") {
        if (!context.isRequesterOwner) return false;
        if (to !== "CANCELLED") return false;
        return from === "NEW" || from === "OPEN";
    }

    return false;
}
