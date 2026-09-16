import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware";
import {
    listStaffTicketsHandler,
    getStaffTicketDetailHandler,
    claimStaffTicketHandler,
    assignStaffTicketHandler,
    updateStaffTicketPriorityHandler,
    updateStaffTicketStatusHandler,
} from "../controllers/staffTickets.controller";

const router = Router();

// Blanket role requirement for all /api/staff/tickets endpoints: IT_STAFF or ADMINISTRATOR
router.use(requireRole("IT_STAFF", "ADMINISTRATOR"));

// Endpoint 20: GET /api/staff/tickets
router.get("/", listStaffTicketsHandler);

// Endpoint 21: GET /api/staff/tickets/:id
router.get("/:id", getStaffTicketDetailHandler);

// Endpoint 22: PATCH /api/staff/tickets/:id/claim
router.patch("/:id/claim", claimStaffTicketHandler);

// Endpoint 23: PATCH /api/staff/tickets/:id/assign
router.patch("/:id/assign", assignStaffTicketHandler);

// Endpoint 24: PATCH /api/staff/tickets/:id/it-priority
router.patch("/:id/it-priority", updateStaffTicketPriorityHandler);

// Endpoint 25: PATCH /api/staff/tickets/:id/status
router.patch("/:id/status", updateStaffTicketStatusHandler);

export default router;

