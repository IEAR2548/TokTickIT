// Ref: docs/lab-03/specification.md BR-21
// Client-side mirror of server/src/validators/ticketStatus.validator.ts
// Used to build the permitted options in the Status dropdown on Staff Ticket Detail.

export type TicketStatus =
    | "NEW"
    | "OPEN"
    | "IN_PROGRESS"
    | "WAITING_FOR_REQUESTER"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED"
    | "CANCELLED";

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

export function permittedTransitions(from: TicketStatus): TicketStatus[] {
    return PERMITTED_STATUS_TRANSITIONS[from] ?? [];
}

/**
 * Role-aware view of the §5.1 matrix for the Ticket Detail status control (FR-07).
 *
 * IT Staff/Admin get the shared staff topology. A Requester has exactly one self-service
 * transition — `Cancelled`, and only from `New`/`Open` on their own Ticket (BR-15). Any other
 * combination yields no options, and the caller must render no control at all.
 */
export function permittedTransitionsFor(
    status: TicketStatus,
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
    isOwner: boolean
): TicketStatus[] {
    if (role === "IT_STAFF" || role === "ADMINISTRATOR") {
        return permittedTransitions(status);
    }
    if (role === "REQUESTER" && isOwner && (status === "NEW" || status === "OPEN")) {
        return ["CANCELLED"];
    }
    return [];
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
    NEW: "New",
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    WAITING_FOR_REQUESTER: "Waiting for Requester",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    REOPENED: "Reopened",
    CANCELLED: "Cancelled",
};
