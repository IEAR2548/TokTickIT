import { describe, it, expect } from "vitest";
import { validatePassword } from "../../../src/validators/password.validator";

// Ref: docs/lab-03/specification.md BR-07
// Ref: docs/lab-03/tests.md UNIT-01
// "Passwords must be at least 8 characters, include upper and lower case letters,
//  at least one number, and at least one special character"

describe("UNIT-01: Password rule validator (BR-07)", () => {
    it("accepts a password meeting all four rules", () => {
        const result = validatePassword("ValidPass123!");
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("rejects passwords shorter than 8 characters", () => {
        const result = validatePassword("Sh0rt!");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Password must be at least 8 characters");
    });

    it("rejects passwords without uppercase letters", () => {
        const result = validatePassword("alllowercase1!");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Password must include upper and lower case letters");
    });

    it("rejects passwords without lowercase letters", () => {
        const result = validatePassword("ALLUPPERCASE1!");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Password must include upper and lower case letters");
    });

    it("rejects passwords without numbers", () => {
        const result = validatePassword("NoNumbersHere!");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Password must include at least one number");
    });

    it("rejects passwords without special characters", () => {
        const result = validatePassword("NoSpecialChars123");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Password must include at least one special character");
    });

    it("returns multiple errors when multiple rules are violated", () => {
        const result = validatePassword("short");
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
    });
});
