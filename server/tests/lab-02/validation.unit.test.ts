import { describe, it, expect } from "vitest";
import { validateCreateTicket } from "../../src/validators/ticket.validator";

// Ref: docs/lab-02/specification.md BR-07, BR-08
// Ref: docs/lab-02/tests.md UNIT-03

describe("validateCreateTicket (UNIT-03, BR-07, BR-08)", () => {
    const validBase = {
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW" as const,
    };

    it("trims whitespace from summary and description before checking length", () => {
        const errors = validateCreateTicket({
            ...validBase,
            summary: "   Valid Summary   ", // 13 chars trimmed -> valid
            description: "   Valid Description that has more than 10 chars   ", // valid
        });
        expect(errors.summary).toBeUndefined();
        expect(errors.description).toBeUndefined();
    });

    it("does not count untrimmed spaces towards minimum length for summary (min 5 chars)", () => {
        const errors = validateCreateTicket({
            ...validBase,
            summary: "   Hi   ", // 2 chars trimmed -> < 5 chars -> error
            description: "Valid Description that has more than 10 chars",
        });
        expect(errors.summary).toBe("Summary must be between 5 and 200 characters.");
    });

    it("does not count untrimmed spaces towards minimum length for description (min 10 chars)", () => {
        const errors = validateCreateTicket({
            ...validBase,
            summary: "Valid Summary",
            description: "       Short      ", // 5 chars trimmed -> < 10 chars -> error
        });
        expect(errors.description).toBe("Description must be between 10 and 5000 characters.");
    });

    it("rejects non-string summary or description", () => {
        const errors = validateCreateTicket({
            ...validBase,
            summary: 12345 as any,
            description: null as any,
        });
        expect(errors.summary).toBe("Summary must be between 5 and 200 characters.");
        expect(errors.description).toBe("Description must be between 10 and 5000 characters.");
    });
});
