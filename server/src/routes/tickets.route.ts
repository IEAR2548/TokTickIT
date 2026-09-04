import { Router } from "express";
import { createTicketHandler, listTicketsHandler } from "../controllers/tickets.controller";
import { uploadMiddleware, uploadAttachmentHandler } from "../controllers/attachments.controller";

const router = Router();

// /api/tickets
router.get("/", listTicketsHandler);

// /api/tickets
router.post("/", createTicketHandler);

// /api/tickets/:id/attachments
router.post("/:id/attachments", uploadMiddleware, uploadAttachmentHandler);

export default router;
