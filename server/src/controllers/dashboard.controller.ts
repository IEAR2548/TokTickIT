import { Request, Response } from "express";
import { getRequesterDashboard, getStaffDashboard } from "../services/dashboard.service";

// Ref: docs/lab-04/api-spec.md §3.1, §3.2, §4 (error envelope)

function errorBody(code: string, message: string) {
    return { error: { code, message } };
}

export async function getRequesterDashboardHandler(req: Request, res: Response) {
    try {
        // Scoped to the session actor only — the endpoint accepts no Requester id (AC-02).
        const data = await getRequesterDashboard(req.user!.userId);
        return res.status(200).json({ data });
    } catch (err) {
        console.error("[dashboard.controller] getRequesterDashboardHandler failed:", err);
        return res.status(500).json(errorBody("INTERNAL_ERROR", "Unexpected server error"));
    }
}

export async function getStaffDashboardHandler(req: Request, res: Response) {
    try {
        const data = await getStaffDashboard(req.user!.userId);
        return res.status(200).json({ data });
    } catch (err) {
        console.error("[dashboard.controller] getStaffDashboardHandler failed:", err);
        return res.status(500).json(errorBody("INTERNAL_ERROR", "Unexpected server error"));
    }
}
