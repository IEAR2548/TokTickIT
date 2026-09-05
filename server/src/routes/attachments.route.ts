import { Router } from "express";
import { downloadAttachmentHandler, removeAttachmentHandler } from "../controllers/attachments.controller";

const router = Router();

// /api/attachments/:id/download
router.get("/:id/download", downloadAttachmentHandler);

// /api/attachments/:id/remove
router.patch("/:id/remove", removeAttachmentHandler);

export default router;