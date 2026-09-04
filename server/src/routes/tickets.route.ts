import { Router } from "express";
import { createTicketHandler } from "../controllers/tickets.controller";
import { uploadMiddleware, uploadAttachmentHandler } from "../controllers/attachments.controller";

const router = Router();

// POST /api/tickets — Ref: docs/lab-02/api-spec.md section 4
router.post("/", createTicketHandler);

// POST /api/tickets/:id/attachments — Ref: docs/lab-02/api-spec.md section 7
router.post("/:id/attachments", uploadMiddleware, uploadAttachmentHandler);

export default router;