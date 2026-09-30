import { describe, it, expect } from "vitest";
import { normalizeAndValidate } from "../../src/validators/actionsTaken.validator";

// Ref: docs/lab-04/specification.md BR-04, FR-05
// Ref: docs/lab-04/api-spec.md §1.2 (followUpNote "required iff followUpRequired=true,
//      else must be omitted/empty"), §1.3 (omitted field = unchanged)
// Ref: docs/lab-04/tests.md UNIT-01, UNIT-02

const VALID_BASE = {
    description: "Replaced network cable, re-tested port.",
    result: "Connection stable after replacement.",
};

describe("UNIT-01: Follow-up Note is required when Follow-Up Required is Yes (BR-04)", () => {
    it("rejects an empty Follow-up Note with followUpRequired=true", () => {
        const result = normalizeAndValidate({
            ...VALID_BASE,
            followUpRequired: true,
            followUpNote: "",
        });

        expect(result.fields.followUpNote).toBeDefined();
    });

    it("rejects an omitted Follow-up Note with followUpRequired=true", () => {
        const result = normalizeAndValidate({ ...VALID_BASE, followUpRequired: true });

        expect(result.fields.followUpNote).toBeDefined();
    });

    it("rejects a whitespace-only Follow-up Note with followUpRequired=true", () => {
        const result = normalizeAndValidate({
            ...VALID_BASE,
            followUpRequired: true,
            followUpNote: "   ",
        });

        expect(result.fields.followUpNote).toBeDefined();
    });

    it("accepts a non-empty Follow-up Note with followUpRequired=true", () => {
        const result = normalizeAndValidate({
            ...VALID_BASE,
            followUpRequired: true,
            followUpNote: "Check again after 24h under load.",
        });

        expect(result.fields).toEqual({});
        expect(result.followUpNote).toBe("Check again after 24h under load.");
    });
});

describe("UNIT-02: Follow-up Note must be empty when Follow-Up Required is No (BR-04)", () => {
    it("rejects a non-empty client-supplied Follow-up Note with followUpRequired=false", () => {
        const result = normalizeAndValidate({
            ...VALID_BASE,
            followUpRequired: false,
            followUpNote: "Check again after 24h under load.",
        });

        expect(result.fields.followUpNote).toBeDefined();
    });

    it("accepts an empty or omitted Follow-up Note with followUpRequired=false", () => {
        const explicitEmpty = normalizeAndValidate({
            ...VALID_BASE,
            followUpRequired: false,
            followUpNote: "",
        });
        expect(explicitEmpty.fields).toEqual({});
        expect(explicitEmpty.followUpNote).toBeNull();

        const omitted = normalizeAndValidate({
            ...VALID_BASE,
            followUpRequired: false,
            followUpNote: undefined,
        });
        expect(omitted.fields).toEqual({});
        expect(omitted.followUpNote).toBeNull();
    });

    it("clears an inherited note instead of rejecting it when an update turns follow-up off (api-spec §1.3)", () => {
        // The client did not supply a note here — it only turned the flag off. An omitted
        // field means "unchanged" (§1.3), so the stale note must be cleared to satisfy
        // BR-04, not rejected: rejecting would break a plain "toggle follow-up off" edit.
        const result = normalizeAndValidate(
            { followUpRequired: false },
            {
                description: VALID_BASE.description,
                result: VALID_BASE.result,
                followUpRequired: true,
                followUpNote: "Check again after 24h under load.",
                attachmentNotes: null,
            }
        );

        expect(result.fields).toEqual({});
        expect(result.followUpNote).toBeNull();
    });

    it("still inherits the existing note for an unrelated update while follow-up stays on", () => {
        const result = normalizeAndValidate(
            { result: "Connection stable after replacement." },
            {
                description: VALID_BASE.description,
                result: "Port re-tested.",
                followUpRequired: true,
                followUpNote: "Check again after 24h under load.",
                attachmentNotes: null,
            }
        );

        expect(result.fields).toEqual({});
        expect(result.followUpNote).toBe("Check again after 24h under load.");
    });
});
