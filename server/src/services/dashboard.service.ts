import { TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recentWindowStart } from "../utils/dashboardDates";

// Ref: docs/lab-04/specification.md §10 (Dashboard Contract), BR-11, BR-12, BR-13,
//      FR-10, FR-11, AC-02, AC-09, AC-13, AC-15, Assumptions #6/#7/#12/#13
// Ref: docs/lab-04/api-spec.md §3.1, §3.2
//
// Both dashboards return SUMMARY data only — never a full Ticket collection.

/** BR-11: the Requester Dashboard's "My Open Tickets" bucket. In Progress has its own card. */
export const REQUESTER_OPEN_STATUSES: TicketStatus[] = [
    "NEW",
    "OPEN",
    "WAITING_FOR_REQUESTER",
    "REOPENED",
];

/** BR-12: the IT Staff Dashboard's "Open" bucket counts Open AND Reopened. */
export const STAFF_OPEN_STATUSES: TicketStatus[] = ["OPEN", "REOPENED"];

/** BR-13: recent lists are capped at the 5 most recently updated Tickets. */
export const RECENT_TICKETS_LIMIT = 5;

interface RecentTicketRow {
    id: number;
    ticketNumber: string;
    summary: string;
    currentStatus: TicketStatus;
    updatedAt: Date;
}

/** Maps a Ticket row onto the documented `{ id, ticketNumber, summary, status, updatedAt }`. */
function toRecentTicket(ticket: RecentTicketRow) {
    return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        summary: ticket.summary,
        status: ticket.currentStatus,
        updatedAt: ticket.updatedAt,
    };
}

const RECENT_SELECT = {
    id: true,
    ticketNumber: true,
    summary: true,
    currentStatus: true,
    updatedAt: true,
} as const;

/** Tickets updated within the BR-13 window, newest first, capped at 5. */
function recentTicketsQuery(where: Record<string, unknown>, now: Date) {
    return prisma.ticket.findMany({
        where: { ...where, updatedAt: { gte: recentWindowStart(now) } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: RECENT_TICKETS_LIMIT,
        select: RECENT_SELECT,
    });
}

export interface RequesterDashboardCounts {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
}

/**
 * BR-11: the four counts are mutually exclusive by current status, scoped strictly to the
 * authenticated Requester. `Cancelled` Tickets appear on none of the four cards.
 */
export async function getRequesterDashboard(requesterId: number, now: Date = new Date()) {
    const [open, inProgress, resolved, closed, recent] = await Promise.all([
        prisma.ticket.count({
            where: { requesterId, currentStatus: { in: REQUESTER_OPEN_STATUSES } },
        }),
        prisma.ticket.count({ where: { requesterId, currentStatus: "IN_PROGRESS" } }),
        prisma.ticket.count({ where: { requesterId, currentStatus: "RESOLVED" } }),
        prisma.ticket.count({ where: { requesterId, currentStatus: "CLOSED" } }),
        recentTicketsQuery({ requesterId }, now),
    ]);

    return {
        counts: { open, inProgress, resolved, closed } satisfies RequesterDashboardCounts,
        recentTickets: recent.map(toRecentTicket),
    };
}

export interface StaffDashboardCounts {
    new: number;
    open: number;
    inProgress: number;
    waitingForRequester: number;
    myAssigned: number;
}

/**
 * BR-12: status counts across every Ticket the caller can see; `myAssigned` is an ownership
 * dimension that intentionally overlaps with them. Admin reuses this shape verbatim
 * (Assumption #6).
 */
export async function getStaffDashboard(actorUserId: number, now: Date = new Date()) {
    const [newCount, open, inProgress, waitingForRequester, myAssigned, recent] = await Promise.all([
        prisma.ticket.count({ where: { currentStatus: "NEW" } }),
        prisma.ticket.count({ where: { currentStatus: { in: STAFF_OPEN_STATUSES } } }),
        prisma.ticket.count({ where: { currentStatus: "IN_PROGRESS" } }),
        prisma.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
        prisma.ticket.count({ where: { ownerId: actorUserId } }),
        recentTicketsQuery({}, now),
    ]);

    return {
        counts: {
            new: newCount,
            open,
            inProgress,
            waitingForRequester,
            myAssigned,
        } satisfies StaffDashboardCounts,
        recentTickets: recent.map(toRecentTicket),
    };
}
