import { Request, Response } from "express";
import { getActiveRelatedSystems } from "../services/relatedSystems.service";

// Ref: docs/lab-02/api-spec.md Section 3 "GET /api/related-systems"

export async function listRelatedSystems(_req: Request, res: Response) {
    try {
        const relatedSystems = await getActiveRelatedSystems();
        return res.status(200).json({ relatedSystems });
    } catch (err) {
        console.error("[relatedSystems.controller] Failed to load related systems:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unable to load related systems. Please try again.",
        });
    }
}
