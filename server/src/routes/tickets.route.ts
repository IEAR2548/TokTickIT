import { Router } from "express";
import { createTicketHandler, listTicketsHandler, getTicketDetailHandler } from "../controllers/tickets.controller";
import { uploadMiddleware, uploadAttachmentHandler, getAttachmentsByTicketHandler } from "../controllers/attachments.controller";

const router = Router();

// /api/tickets
router.get("/", listTicketsHandler);

// /api/tickets
router.post("/", createTicketHandler);

// /api/tickets/:id
router.get("/:id", getTicketDetailHandler);

// /api/tickets/:id/attachments
router.post("/:id/attachments", uploadMiddleware, uploadAttachmentHandler);

// /api/tickets/:id/attachments
router.get("/:id/attachments", getAttachmentsByTicketHandler);

export default router;
