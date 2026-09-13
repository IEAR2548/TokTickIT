import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/lib/password";

describe("password hashing (BR-08, Decision D-7)", () => {
    it("hash never equals the plaintext password", async () => {
        const plain = "Sup3r$ecret!";
        const hash = await hashPassword(plain);
        expect(hash).not.toBe(plain);
        expect(hash.length).toBeGreaterThan(20); // bcrypt hashes are ~60 chars
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
        // both must still verify correctly despite being different strings
        expect(await verifyPassword(plain, hashA)).toBe(true);
        expect(await verifyPassword(plain, hashB)).toBe(true);
    });
});