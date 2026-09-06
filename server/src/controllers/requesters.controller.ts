import { Request, Response } from "express";
import { getActiveRequesters } from "../services/requesters.service";

export async function listRequesters(_req: Request, res: Response) {
    try {
        const requesters = await getActiveRequesters();
        return res.status(200).json({ requesters });
    } catch (err) {
        // Log full error server-side for debugging, but never leak it to the client
        console.error("[requesters.controller] Failed to load requesters:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unable to load Development Requesters. Please try again.",
        });
    }
}