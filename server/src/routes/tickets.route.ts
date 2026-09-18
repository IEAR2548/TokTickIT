import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware";
import { createTicketHandler, listTicketsHandler, getTicketDetailHandler } from "../controllers/tickets.controller";
import { uploadMiddleware, uploadAttachmentHandler, getAttachmentsByTicketHandler } from "../controllers/attachments.controller";
import {
    createPublicCommentHandler,
    getPublicCommentsHandler,
    createInternalNoteHandler,
    getInternalNotesHandler,
    markAppearsResolvedHandler,
} from "../controllers/commentsNotes.controller";

const router = Router();

// Endpoint 1: GET /api/tickets
router.get("/", requireRole("REQUESTER"), listTicketsHandler);

// Endpoint 2: POST /api/tickets
router.post("/", requireRole("REQUESTER"), createTicketHandler);

// Endpoint 15: POST /api/tickets/:id/comments
router.post("/:id/comments", requireRole("REQUESTER", "IT_STAFF", "ADMINISTRATOR"), createPublicCommentHandler);

// Endpoint 16: GET /api/tickets/:id/comments
router.get("/:id/comments", requireRole("REQUESTER", "IT_STAFF", "ADMINISTRATOR"), getPublicCommentsHandler);

// Endpoint 17: POST /api/tickets/:id/notes
router.post("/:id/notes", requireRole("IT_STAFF", "ADMINISTRATOR"), createInternalNoteHandler);

// Endpoint 18: GET /api/tickets/:id/notes
router.get("/:id/notes", requireRole("IT_STAFF", "ADMINISTRATOR"), getInternalNotesHandler);

// Endpoint 19: PATCH /api/tickets/:id/appears-resolved
router.patch("/:id/appears-resolved", requireRole("REQUESTER"), markAppearsResolvedHandler);

// Endpoint 3: GET /api/tickets/:id
router.get("/:id", requireRole("REQUESTER"), getTicketDetailHandler);

// Attachments: POST /api/tickets/:id/attachments
router.post("/:id/attachments", requireRole("REQUESTER"), uploadMiddleware, uploadAttachmentHandler);

// Attachments: GET /api/tickets/:id/attachments
router.get("/:id/attachments", requireRole("REQUESTER", "IT_STAFF", "ADMINISTRATOR"), getAttachmentsByTicketHandler);

export default router;

