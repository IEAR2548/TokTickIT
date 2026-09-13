import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/lib/password";
import bcrypt from "bcryptjs";

// Ref: docs/lab-03/specification.md BR-08, Decision D-7
// Ref: docs/lab-03/tests.md UNIT-02
// "bcryptjs (pure JavaScript), 10 salt rounds — never native bcrypt"

describe("UNIT-02: Password hashing (BR-08, Decision D-7)", () => {
    it("hash never equals the plaintext password", async () => {
        const plain = "Sup3r$ecret!";
        const hash = await hashPassword(plain);
        expect(hash).not.toBe(plain);
        expect(hash.length).toBeGreaterThan(20);
    });

    it("uses 10 salt rounds in the hash prefix", async () => {
        const plain = "SaltRounds10!";
        const hash = await hashPassword(plain);
        // bcrypt hash format: $2a$10$ or $2b$10$
        expect(hash).toMatch(/^\$2[ab]\$10\$/);
    });

    it("verifyPassword returns true for the correct password", async () => {
        const plain = "Correct-Horse7!";
        const hash = await hashPassword(plain);
        expect(await verifyPassword(plain, hash)).toBe(true);
    });

    it("verifyPassword returns false for an incorrect password", async () => {
        const hash = await hashPassword("RealPassword1!");
        expect(await verifyPassword("WrongPassword1!", hash)).toBe(false);
    });

    it("hashing the same password twice produces different hashes (random salt)", async () => {
        const plain = "SamePassword1!";
        const hashA = await hashPassword(plain);
        const hashB = await hashPassword(plain);
        expect(hashA).not.toBe(hashB);
        expect(await verifyPassword(plain, hashA)).toBe(true);
        expect(await verifyPassword(plain, hashB)).toBe(true);
    });

    it("is compatible with bcryptjs directly and does not require native bindings", async () => {
        const plain = "PureJsBcrypt1!";
        const hash = await hashPassword(plain);
        // Should verify cleanly using standard bcryptjs
        expect(await bcrypt.compare(plain, hash)).toBe(true);
    });
});