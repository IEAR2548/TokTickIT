import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "../../src/utils/fileSanitizer";

// Ref: docs/lab-02/specification.md BR-22
// Ref: docs/lab-02/tests.md UNIT-04

describe("fileSanitizer (UNIT-04, BR-22)", () => {
    it("removes path traversal sequences like ../ and ..\\", () => {
        expect(sanitizeFilename("../../evil.png")).toBe("evil.png");
        expect(sanitizeFilename("..\\..\\windows.png")).toBe("windows.png");
        expect(sanitizeFilename("folder/../../../secret.pdf")).toBe("secret.pdf");
    });

    it("removes absolute path indicators", () => {
        expect(sanitizeFilename("/etc/passwd.png")).toBe("passwd.png");
        expect(sanitizeFilename("C:\\Users\\Admin\\Documents\\test.png")).toBe("test.png");
    });

    it("preserves safe filenames and extensions", () => {
        expect(sanitizeFilename("screenshot.png")).toBe("screenshot.png");
        expect(sanitizeFilename("my-report-2026.pdf")).toBe("my-report-2026.pdf");
    });

    it("falls back to attachment when empty or traversal-only", () => {
        expect(sanitizeFilename("")).toBe("attachment");
        expect(sanitizeFilename("../../..")).toBe("attachment");
    });
});
