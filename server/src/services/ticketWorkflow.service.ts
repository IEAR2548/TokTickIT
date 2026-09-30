import { TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isPermittedTransition } from "../validators/ticketStatus.validator";

// Ref: docs/lab-04/specification.md §5.1 (transition matrix), §5.2 (resolution gate),
//      §10.1 (STALE_UPDATE vs INVALID_TRANSITION), BR-06, BR-07, BR-09, BR-14, BR-15, BR-16
// Ref: docs/lab-04/api-spec.md §2.1

export const ALL_TICKET_STATUSES: readonly TicketStatus[] = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
];

interface Actor {
    userId: number;
    role: string;
}

interface TicketForWorkflow {
    id: number;
    requesterId: number;
    currentStatus: TicketStatus;
    updatedAt: Date;
}

function currentState(ticket: TicketForWorkflow) {
    return { status: ticket.currentStatus, updatedAt: ticket.updatedAt };
}

export interface StatusChangeResultData {
    id: number;
    status: TicketStatus;
    resolutionSummary: string | null;
    appearsResolved: boolean;
    updatedAt: Date;
}

/**
 * Applies a Ticket status change, enforcing the §5.1 matrix and the §5.2 resolution gate.
 *
 * Check order (mirrors api-spec.md §2.1): role/ownership authorization (403) before the
 * transition-outcome errors, then the optimistic-concurrency check (409 STALE_UPDATE) before
 * the matrix (400 INVALID_TRANSITION) and resolution-summary (400 RESOLUTION_SUMMARY_REQUIRED)
 * gates. STALE_UPDATE always wins over the matrix so a retried, already-applied request is
 * reported as a conflict rather than as a now-invalid transition.
 */
export async function changeTicketStatus(ticketId: number, actor: Actor, body: Record<string, unknown>) {
    const rawStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
    const to = ALL_TICKET_STATUSES.includes(rawStatus as TicketStatus)
        ? (rawStatus as TicketStatus)
        : undefined;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { notFound: true as const };

    const isRequesterOwner = ticket.requesterId === actor.userId;

    // Authorization first, before every 400 (api-spec §2.1 lists 403 ahead of the transition
    // outcomes): a Requester may only ever trigger Cancelled, and only while the Ticket is
    // still New/Open (BR-15). A role/ownership failure is 403, never a matrix 400.
    if (actor.role === "REQUESTER") {
        if (!isRequesterOwner) return { forbidden: true as const };
        if (to !== "CANCELLED" || (ticket.currentStatus !== "NEW" && ticket.currentStatus !== "OPEN")) {
            return { forbidden: true as const };
        }
    }

    if (!to) {
        return { validation: { status: "A valid status is required." } };
    }

    // Optimistic concurrency, checked first (regardless of whether the transition is valid).
    if (body.expectedUpdatedAt !== undefined) {
        const expected = new Date(String(body.expectedUpdatedAt));
        if (Number.isNaN(expected.getTime()) || expected.getTime() !== ticket.updatedAt.getTime()) {
            return { stale: true as const, current: currentState(ticket) };
        }
    }

    if (!isPermittedTransition(ticket.currentStatus, to, actor.role, { isRequesterOwner })) {
        return { invalidTransition: true as const, current: currentState(ticket) };
    }

    const resolutionSummary =
        typeof body.resolutionSummary === "string" ? body.resolutionSummary.trim() : "";
    if ((to === "RESOLVED" || to === "CLOSED") && resolutionSummary.length === 0) {
        return { resolutionSummaryRequired: true as const };
    }

    const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            currentStatus: to,
            // BR-06/BR-07: only Resolved/Closed carry a resolution summary.
            ...(to === "RESOLVED" || to === "CLOSED" ? { resolutionSummary: resolutionSummary || null } : {}),
            // BR-16: Reopening clears the Requester's advisory flag as a side effect.
            ...(to === "REOPENED" ? { appearsResolved: false } : {}),
        },
        select: {
            id: true,
            currentStatus: true,
            resolutionSummary: true,
            appearsResolved: true,
            updatedAt: true,
        },
    });

    const data: StatusChangeResultData = {
        id: updated.id,
        status: updated.currentStatus,
        resolutionSummary: updated.resolutionSummary,
        appearsResolved: updated.appearsResolved,
        updatedAt: updated.updatedAt,
    };

    return { data };
}
