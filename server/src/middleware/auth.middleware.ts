import { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE_NAME, verifySessionToken, SessionPayload } from "../lib/session";

declare global {
    namespace Express {
        interface Request {
            user?: SessionPayload;
        }
    }
}

export function parseSession(req: Request, res: Response, next: NextFunction) {
    const rawCookie = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.cookie;
    let token: string | undefined;

    if (req.cookies?.[SESSION_COOKIE_NAME]) {
        token = req.cookies[SESSION_COOKIE_NAME];
    } else if (typeof rawCookie === "string") {
        const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
        if (match) {
            token = match[1];
        }
    }

    if (token) {
        const payload = verifySessionToken(token);
        if (payload) {
            req.user = payload;
        }
    }

    next();
}

export function enforceRestrictedSession(req: Request, res: Response, next: NextFunction) {
    if (!req.user || !req.user.mustChangePassword) {
        return next();
    }

    const url = req.originalUrl || req.url;
    const path = url.split("?")[0];
    const method = req.method;

    // Allowed endpoints while mustChangePassword is true:
    // 1. POST /api/auth/change-password
    // 2. POST /api/auth/logout
    // 3. GET /api/auth/me
    // (Also allow GET /api/health and POST /api/auth/login)
    const isAllowed =
        (method === "POST" && (path === "/api/auth/change-password" || path === "/api/auth/logout" || path === "/api/auth/login")) ||
        (method === "GET" && (path === "/api/auth/me" || path === "/api/health"));

    if (!isAllowed) {
        return res.status(403).json({
            error: "PASSWORD_CHANGE_REQUIRED",
            message: "Password change required",
        });
    }

    next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({
            error: "UNAUTHENTICATED",
            message: "Authentication required",
        });
    }
    next();
}

export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: "UNAUTHENTICATED",
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Access denied",
            });
        }

        next();
    };
}
