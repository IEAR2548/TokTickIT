import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyPassword, hashPassword } from "../lib/password";
import { setSessionCookie, clearSessionCookie } from "../lib/session";
import { requireAuth } from "../middleware/auth.middleware";
import { validatePassword } from "../validators/password.validator";
import { recordFailedAttempt, recordSuccessfulLogin } from "../services/loginAttempts.service";

// Ref: docs/lab-03/api-spec.md Endpoints 1-4

const router = Router();

const GENERIC_AUTH_ERROR = {
    error: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
};

// 1. POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        // Unknown email (FR-03, AC-05)
        if (!user) {
            recordFailedAttempt(normalizedEmail);
            return res.status(401).json(GENERIC_AUTH_ERROR);
        }

        // Inactive account (BR-10, FR-02, AC-06) - check BEFORE or with password, returns identical generic message
        if (!user.isActive) {
            recordFailedAttempt(normalizedEmail);
            return res.status(401).json(GENERIC_AUTH_ERROR);
        }

        // Verify password (BR-08, FR-03)
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            recordFailedAttempt(normalizedEmail);
            return res.status(401).json(GENERIC_AUTH_ERROR);
        }

        // Login succeeded
        recordSuccessfulLogin(normalizedEmail);

        // Set session cookie
        setSessionCookie(res, {
            userId: user.id,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
        });

        return res.status(200).json({
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            },
        });
    } catch (err) {
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        });
    }
});

// 2. POST /api/auth/logout
router.post("/logout", requireAuth, (req: Request, res: Response) => {
    clearSessionCookie(res);
    return res.status(200).json({
        data: {
            loggedOut: true,
        },
    });
});

// 3. GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                mustChangePassword: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            clearSessionCookie(res);
            return res.status(401).json({
                error: "UNAUTHENTICATED",
                message: "Authentication required",
            });
        }

        return res.status(200).json({
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            },
        });
    } catch {
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        });
    }
});

// 4. POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: "Current password and new password are required",
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                error: "UNAUTHENTICATED",
                message: "Authentication required",
            });
        }

        // Verify current password
        const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isCurrentValid) {
            return res.status(401).json({
                error: "INVALID_CREDENTIALS",
                message: "Current password incorrect",
            });
        }

        // Validate new password rules (BR-07)
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: validation.errors.join(", "),
            });
        }

        // Hash new password
        const newHash = await hashPassword(newPassword);

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newHash,
                mustChangePassword: false,
            },
        });

        // Issue fresh non-restricted session cookie
        setSessionCookie(res, {
            userId: updatedUser.id,
            role: updatedUser.role,
            mustChangePassword: false,
        });

        return res.status(200).json({
            data: {
                changed: true,
            },
        });
    } catch {
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        });
    }
});

export default router;
