import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import {
    isValidStatusTransition,
    isPermittedTransition,
    PERMITTED_STATUS_TRANSITIONS,
} from "../../src/validators/ticketStatus.validator";
import {
    resetAppearsResolvedOnReopen,
    resetAppearsResolvedOnRequesterEdit,
} from "../../src/utils/ticketResolution";

// Ref: docs/lab-04/specification.md §5.1 (full transition matrix), BR-15, BR-16
// Ref: docs/lab-04/tests.md UNIT-03, UNIT-05

const ALL_STATUSES: TicketStatus[] = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
];

const STAFF_ROLES = ["IT_STAFF", "ADMINISTRATOR"] as const;

describe("UNIT-03: Ticket Status Transition Matrix, including role (specification.md §5.1)", () => {
    it("IT Staff/Admin are permitted exactly the topology of the §5.1 table", () => {
        for (const from of ALL_STATUSES) {
            for (const to of ALL_STATUSES) {
                for (const role of STAFF_ROLES) {
                    expect(
                        isPermittedTransition(from, to, role, { isRequesterOwner: false }),
                        `${role}: ${from} -> ${to}`
                    ).toBe(isValidStatusTransition(from, to));
                }
            }
        }
    });

    it("pins the easy-to-miss §5.1 cells: Open -> Waiting for Requester and Resolved -> Reopened are staff-only, not just Closed -> Reopened", () => {
        expect(isPermittedTransition("OPEN", "WAITING_FOR_REQUESTER", "IT_STAFF")).toBe(true);
        expect(isPermittedTransition("RESOLVED", "REOPENED", "IT_STAFF")).toBe(true);
        expect(isPermittedTransition("CLOSED", "REOPENED", "IT_STAFF")).toBe(true);
        expect(isPermittedTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER", "IT_STAFF")).toBe(true);
    });

    it("a Requester may only trigger Cancelled, and only from New/Open on their own Ticket (BR-15)", () => {
        expect(
            isPermittedTransition("NEW", "CANCELLED", "REQUESTER", { isRequesterOwner: true })
        ).toBe(true);
        expect(
            isPermittedTransition("OPEN", "CANCELLED", "REQUESTER", { isRequesterOwner: true })
        ).toBe(true);

        // Not their Ticket -> denied.
        expect(
            isPermittedTransition("NEW", "CANCELLED", "REQUESTER", { isRequesterOwner: false })
        ).toBe(false);

        // Once work has begun, a Requester may no longer cancel (BR-15).
        for (const from of ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED"] as TicketStatus[]) {
            expect(
                isPermittedTransition(from, "CANCELLED", "REQUESTER", { isRequesterOwner: true }),
                `Requester ${from} -> CANCELLED`
            ).toBe(false);
        }

        // A Requester may never perform any non-Cancelled transition, even on their own Ticket.
        for (const from of ALL_STATUSES) {
            for (const to of ALL_STATUSES) {
                if (to === "CANCELLED") continue;
                expect(
                    isPermittedTransition(from, to, "REQUESTER", { isRequesterOwner: true }),
                    `Requester ${from} -> ${to}`
                ).toBe(false);
            }
        }
    });

    it("CANCELLED is terminal for every role and every target (BR-09)", () => {
        for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]) {
            for (const to of ALL_STATUSES) {
                expect(
                    isPermittedTransition("CANCELLED", to, role, { isRequesterOwner: true }),
                    `${role}: CANCELLED -> ${to}`
                ).toBe(false);
            }
        }
        expect(PERMITTED_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    });
});

describe("UNIT-05: BR-16 appearsResolved reset helpers", () => {
    const resolvedTicket = {
        id: 5,
        currentStatus: "RESOLVED" as TicketStatus,
        appearsResolved: true,
    };

    it("the Reopen path resets appearsResolved to false as a side effect", () => {
        const result = resetAppearsResolvedOnReopen(resolvedTicket);
        expect(result.appearsResolved).toBe(false);
        // Unrelated fields are preserved.
        expect(result.id).toBe(5);
        expect(result.currentStatus).toBe("RESOLVED");
    });

    it("the Requester-edit path resets appearsResolved to false as a side effect", () => {
        const result = resetAppearsResolvedOnRequesterEdit(resolvedTicket);
        expect(result.appearsResolved).toBe(false);
        expect(result.id).toBe(5);
    });

    it("resetting an already-false flag is a no-op", () => {
        const clear = { ...resolvedTicket, appearsResolved: false };
        expect(resetAppearsResolvedOnReopen(clear).appearsResolved).toBe(false);
        expect(resetAppearsResolvedOnRequesterEdit(clear).appearsResolved).toBe(false);
    });
});
