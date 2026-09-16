// Ref: docs/lab-03/api-spec.md endpoints 26-29
// Ref: docs/lab-03/specification.md BR-29 (exactly one role from the permitted set)
// and BR-07 password rules via the shared password validator (used by auth too).

const PERMITTED_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
export type PermittedRole = (typeof PERMITTED_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPermittedRole(role: unknown): role is PermittedRole {
    return typeof role === "string" && (PERMITTED_ROLES as readonly string[]).includes(role);
}

export function validateCreateUserBody(body: any): { valid: boolean; message?: string } {
    const { name, email, role, isActive, initialPassword } = body ?? {};

    if (typeof name !== "string" || name.trim().length === 0) {
        return { valid: false, message: "name is required" };
    }
    if (name.trim().length > 100) {
        return { valid: false, message: "name must be at most 100 characters" };
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
        return { valid: false, message: "a valid email address is required" };
    }
    if (!isValidPermittedRole(role)) {
        return {
            valid: false,
            message: `role must be one of: ${PERMITTED_ROLES.join(", ")}`,
        };
    }
    if (typeof isActive !== "boolean") {
        return { valid: false, message: "isActive must be a boolean" };
    }
    // initialPassword validated against BR-07 separately (validatePassword)
    if (typeof initialPassword !== "string" || initialPassword.length === 0) {
        return { valid: false, message: "initialPassword is required" };
    }

    return { valid: true };
}

export interface UpdateUserPatch {
    name?: string;
    email?: string;
    role?: PermittedRole;
    isActive?: boolean;
}

export function validateUpdateUserBody(body: any): {
    valid: boolean;
    message?: string;
    patch?: UpdateUserPatch;
} {
    if (!body || typeof body !== "object") {
        return { valid: false, message: "Request body is required" };
    }

    const allowedKeys = ["name", "email", "role", "isActive"];
    for (const key of Object.keys(body)) {
        if (!allowedKeys.includes(key)) {
            return { valid: false, message: `Unknown field: ${key}` };
        }
    }
    if (Object.keys(body).length === 0) {
        return { valid: false, message: "At least one of name, email, role, isActive is required" };
    }

    const patch: UpdateUserPatch = {};

    if (body.name !== undefined) {
        if (typeof body.name !== "string" || body.name.trim().length === 0) {
            return { valid: false, message: "name must be a non-empty string" };
        }
        if (body.name.trim().length > 100) {
            return { valid: false, message: "name must be at most 100 characters" };
        }
        patch.name = body.name.trim();
    }

    if (body.email !== undefined) {
        if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
            return { valid: false, message: "email must be a valid email address" };
        }
        patch.email = body.email.trim().toLowerCase();
    }

    if (body.role !== undefined) {
        if (!isValidPermittedRole(body.role)) {
            return {
                valid: false,
                message: `role must be one of: ${PERMITTED_ROLES.join(", ")}`,
            };
        }
        patch.role = body.role;
    }

    if (body.isActive !== undefined) {
        if (typeof body.isActive !== "boolean") {
            return { valid: false, message: "isActive must be a boolean" };
        }
        patch.isActive = body.isActive;
    }

    return { valid: true, patch };
}
