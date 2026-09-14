import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware";
import { listStaffTicketsHandler } from "../controllers/staffTickets.controller";

const router = Router();

// Blanket role requirement for all /api/staff/tickets endpoints: IT_STAFF or ADMINISTRATOR
router.use(requireRole("IT_STAFF", "ADMINISTRATOR"));

// Endpoint 20: GET /api/staff/tickets
router.get("/", listStaffTicketsHandler);

export default router;
