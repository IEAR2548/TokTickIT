import { Router } from "express";
import { requireRole } from "../middleware/auth.middleware";
import { downloadAttachmentHandler, removeAttachmentHandler } from "../controllers/attachments.controller";

const router = Router();

router.use(requireRole("REQUESTER"));

// /api/attachments/:id/download
router.get("/:id/download", downloadAttachmentHandler);

// /api/attachments/:id/remove
router.patch("/:id/remove", removeAttachmentHandler);

export default router;