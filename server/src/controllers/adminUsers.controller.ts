import { Request, Response } from "express";
import {
    listAdminUsers,
    createAdminUser,
    updateAdminUser,
    setAdminUserPassword,
} from "../services/adminUsers.service";
import { validateCreateUserBody, validateUpdateUserBody, PermittedRole } from "../validators/adminUsers.validator";
import { validatePassword } from "../validators/password.validator";
// Ref: docs/lab-03/api-spec.md endpoints 26-29
// Authorization is handled by the route-level requireRole("ADMINISTRATOR")
// middleware from Issue #32 — controllers assume an authenticated Administrator.

// Endpoint 26: GET /api/admin/users
export async function listAdminUsersHandler(req: Request, res: Response) {
    const search = req.query.search ? String(req.query.search) : undefined;
    const role = req.query.role ? String(req.query.role).toUpperCase() : undefined;
    // Exact-active-state filter (per ui-spec §7: All/Active/Inactive). Combinable
    // with search and/or role — they are independent predicates (AND semantics).
    const rawIsActive = req.query.isActive ? String(req.query.isActive).toLowerCase() : undefined;
    const isActive =
        rawIsActive === "true" ? true : rawIsActive === "false" ? false : undefined;

    try {
        const users = await listAdminUsers({ search, role, isActive });
        // No pagination metadata by design (Decision D-4)
        return res.status(200).json({ data: users });
    } catch (err) {
        console.error("[adminUsers.controller] listAdminUsersHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

// Endpoint 27: POST /api/admin/users
export async function createAdminUserHandler(req: Request, res: Response) {
    const validation = validateCreateUserBody(req.body);
    if (!validation.valid) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: validation.message ?? "Invalid user data",
        });
    }

    // BR-07: initial password must satisfy the password rules
    const passwordCheck = validatePassword(req.body.initialPassword);
    if (!passwordCheck.isValid) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: passwordCheck.errors.join("; "),
        });
    }

    try {
        const result = await createAdminUser({
            name: req.body.name,
            email: req.body.email,
            // validateCreateUserBody already guaranteed role is a permitted role
            role: req.body.role as PermittedRole,
            isActive: req.body.isActive,
            initialPassword: req.body.initialPassword,
        });

        if (result.conflict) {
            return res.status(409).json({
                error: "DUPLICATE_EMAIL",
                message: "Email address is already in use",
            });
        }

        return res.status(201).json({ data: result.user });
    } catch (err) {
        console.error("[adminUsers.controller] createAdminUserHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

// Endpoint 28: PATCH /api/admin/users/:id
export async function updateAdminUserHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "User not found",
        });
    }

    const validation = validateUpdateUserBody(req.body);
    if (!validation.valid) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: validation.message ?? "Invalid user data",
        });
    }

    try {
        const result = await updateAdminUser(id, validation.patch!, req.user!.userId);

        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "User not found",
            });
        }
        if (result.conflict) {
            return res.status(409).json({
                error: "DUPLICATE_EMAIL",
                message: "Email address is already in use",
            });
        }
        if (result.cannotDeactivateSelf) {
            return res.status(403).json({
                error: "CANNOT_DEACTIVATE_SELF",
                message: "You cannot deactivate your own account",
            });
        }
        if (result.lastActiveAdmin) {
            return res.status(403).json({
                error: "LAST_ACTIVE_ADMIN",
                message: "The system must retain at least one active Administrator",
            });
        }

        return res.status(200).json({ data: result.user });
    } catch (err) {
        console.error("[adminUsers.controller] updateAdminUserHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

// Endpoint 29: PATCH /api/admin/users/:id/password
export async function setAdminUserPasswordHandler(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "User not found",
        });
    }

    const { newPassword } = req.body ?? {};
    if (typeof newPassword !== "string" || newPassword.length === 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "newPassword is required",
        });
    }

    try {
        const result = await setAdminUserPassword(id, newPassword);

        if (result.notFound) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "User not found",
            });
        }
        if (result.invalidPassword) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "newPassword fails the password rules",
            });
        }

        return res.status(200).json({ data: result.user });
    } catch (err) {
        console.error("[adminUsers.controller] setAdminUserPasswordHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}
