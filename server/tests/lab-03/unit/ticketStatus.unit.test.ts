import { describe, it, expect } from "vitest";
import { isValidStatusTransition, PERMITTED_STATUS_TRANSITIONS } from "../../../src/validators/ticketStatus.validator";
import { TicketStatus } from "@prisma/client";

// Ref: docs/lab-03/specification.md BR-21, AC-11, AC-29
// Ref: docs/lab-03/tests.md UNIT-03: Status transition matrix

describe("UNIT-03: Ticket Status Transition Matrix (BR-21)", () => {
    it("allows valid transitions per BR-21 transition table", () => {
        // NEW -> OPEN, CANCELLED
        expect(isValidStatusTransition("NEW", "OPEN")).toBe(true);
        expect(isValidStatusTransition("NEW", "CANCELLED")).toBe(true);

        // OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
        expect(isValidStatusTransition("OPEN", "IN_PROGRESS")).toBe(true);
        expect(isValidStatusTransition("OPEN", "WAITING_FOR_REQUESTER")).toBe(true);
        expect(isValidStatusTransition("OPEN", "CANCELLED")).toBe(true);

        // IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
        expect(isValidStatusTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER")).toBe(true);
        expect(isValidStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
        expect(isValidStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(true);

        // WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
        expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "IN_PROGRESS")).toBe(true);
        expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "RESOLVED")).toBe(true);
        expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "CANCELLED")).toBe(true);

        // RESOLVED -> CLOSED, REOPENED
        expect(isValidStatusTransition("RESOLVED", "CLOSED")).toBe(true);
        expect(isValidStatusTransition("RESOLVED", "REOPENED")).toBe(true);

        // CLOSED -> REOPENED
        expect(isValidStatusTransition("CLOSED", "REOPENED")).toBe(true);

        // REOPENED -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
        expect(isValidStatusTransition("REOPENED", "IN_PROGRESS")).toBe(true);
        expect(isValidStatusTransition("REOPENED", "WAITING_FOR_REQUESTER")).toBe(true);
        expect(isValidStatusTransition("REOPENED", "CANCELLED")).toBe(true);
    });

    it("rejects invalid/unlisted status transitions", () => {
        // From NEW cannot go directly to CLOSED or RESOLVED or IN_PROGRESS
        expect(isValidStatusTransition("NEW", "CLOSED")).toBe(false);
        expect(isValidStatusTransition("NEW", "RESOLVED")).toBe(false);
        expect(isValidStatusTransition("NEW", "IN_PROGRESS")).toBe(false);

        // From CLOSED cannot go to OPEN or IN_PROGRESS or RESOLVED
        expect(isValidStatusTransition("CLOSED", "OPEN")).toBe(false);
        expect(isValidStatusTransition("CLOSED", "IN_PROGRESS")).toBe(false);
        expect(isValidStatusTransition("CLOSED", "RESOLVED")).toBe(false);

        // CANCELLED is terminal — cannot transition to any status
        const allStatuses: TicketStatus[] = [
            "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"
        ];
        for (const target of allStatuses) {
            expect(isValidStatusTransition("CANCELLED", target)).toBe(false);
        }

        // Same status transition (e.g. OPEN -> OPEN) is not a transition
        expect(isValidStatusTransition("OPEN", "OPEN")).toBe(false);
    });

    it("exports PERMITTED_STATUS_TRANSITIONS mapping all 8 statuses as single source of truth", () => {
        expect(PERMITTED_STATUS_TRANSITIONS).toBeDefined();
        expect(PERMITTED_STATUS_TRANSITIONS.NEW).toEqual(["OPEN", "CANCELLED"]);
        expect(PERMITTED_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    });
});
