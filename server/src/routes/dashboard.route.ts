import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware";
import {
    getRequesterDashboardHandler,
    getStaffDashboardHandler,
} from "../controllers/dashboard.controller";

// Ref: docs/lab-04/api-spec.md §3, §4 (Roles & Authorization Matrix)

const router = Router();

// Requester Dashboard — Requester only, scoped to the session actor (never client-supplied).
router.get("/requester", requireRole("REQUESTER"), getRequesterDashboardHandler);

// IT Staff Dashboard — IT Staff/Admin (Admin reuses the same endpoint, Assumption #6).
router.get("/staff", requireRole("IT_STAFF", "ADMINISTRATOR"), getStaffDashboardHandler);

export default router;
