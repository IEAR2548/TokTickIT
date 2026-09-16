import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware";
import {
    listAdminUsersHandler,
    createAdminUserHandler,
    updateAdminUserHandler,
    setAdminUserPasswordHandler,
} from "../controllers/adminUsers.controller";

const router = Router();

// Blanket role requirement for all /api/admin/users endpoints: ADMINISTRATOR only
// (SEC-01, SEC-04, AC-22 — server-side enforcement independent of any UI state).
router.use(requireRole("ADMINISTRATOR"));

// Endpoint 26: GET /api/admin/users
router.get("/", listAdminUsersHandler);

// Endpoint 27: POST /api/admin/users
router.post("/", createAdminUserHandler);

// Endpoint 28: PATCH /api/admin/users/:id
router.patch("/:id", updateAdminUserHandler);

// Endpoint 29: PATCH /api/admin/users/:id/password
router.patch("/:id/password", setAdminUserPasswordHandler);

export default router;
