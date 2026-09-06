import path from "path";

// Ref: docs/lab-02/specification.md BR-22
// Ref: docs/lab-02/tests.md UNIT-04

/**
 * Sanitizes an uploaded filename to prevent path traversal.
 * Strips directory sequences (both POSIX and Windows), absolute paths,
 * and dangerous traversal tokens.
 */
export function sanitizeFilename(rawFilename: string): string {
    if (!rawFilename || typeof rawFilename !== "string") {
        return "attachment";
    }

    // Extract base name using path.basename to strip directory components
    let cleaned = path.basename(rawFilename);

    // Remove any Windows drive letters (e.g. C:)
    cleaned = cleaned.replace(/^[a-zA-Z]:/, "");

    // Remove any leading/trailing/embedded slashes and path traversal sequences
    cleaned = cleaned.replace(/[\/\\]/g, "").replace(/\.\.+/g, "");

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned || "attachment";
}
