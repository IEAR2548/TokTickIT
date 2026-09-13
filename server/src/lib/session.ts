import jwt from "jsonwebtoken";
import { Response } from "express";

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_DURATION_HOURS = 4;
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;

export interface SessionPayload {
    userId: number;
    role: string;
    mustChangePassword: boolean;
}

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not defined");
    }
    return secret;
}

export function signSessionToken(payload: SessionPayload): string {
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: `${SESSION_DURATION_HOURS}h`,
    });
}

export function verifySessionToken(token: string): SessionPayload | null {
    try {
        const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
        if (typeof decoded.userId === "number" && decoded.role && typeof decoded.mustChangePassword === "boolean") {
            return {
                userId: decoded.userId,
                role: decoded.role,
                mustChangePassword: decoded.mustChangePassword,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function setSessionCookie(res: Response, payload: SessionPayload): void {
    const token = signSessionToken(payload);
    res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_DURATION_MS,
        path: "/",
    });
}

export function clearSessionCookie(res: Response): void {
    res.cookie(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });
}
