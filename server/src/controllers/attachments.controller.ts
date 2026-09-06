import { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
    addAttachment,
    getAttachmentsByTicket,
    downloadAttachment,
    removeAttachment,
    UnsupportedFileTypeError,
    FileTooLargeError,
    AttachmentLimitReachedError,
    TicketNotFoundError,
    TicketNotOwnedError,
    AttachmentNotFoundError,
    AttachmentForbiddenError,
    AttachmentRemovedError,
    AttachmentAlreadyRemovedError,
    MAX_FILE_SIZE_BYTES,
} from "../services/attachments.service";

// "POST /api/tickets/:id/attachments"

const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single("file");

export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    multerUpload(req, res, (err: any) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    error: "FILE_TOO_LARGE",
                    message: "File exceeds 5 MB",
                });
            }
            return res.status(400).json({
                error: "VALIDATION_ERROR",
                message: err.message || "File upload error",
            });
        }
        next();
    });
};


export async function uploadAttachmentHandler(req: Request, res: Response) {
    const requesterIdRaw = req.body.requesterId;
    const requesterId = Number(requesterIdRaw);
    if (!requesterIdRaw || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "requesterId is required and must be an integer",
        });
    }

    const ticketIdParam = req.params.ticketId || req.params.id;
    const ticketId = Number(ticketIdParam);
    if (!ticketIdParam || !Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Invalid ticket id",
        });
    }

    if (!req.file) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "file is required",
        });
    }

    if (req.file.size > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
            error: "FILE_TOO_LARGE",
            message: "File exceeds 5 MB limit",
        });
    }

    try {
        const attachment = await addAttachment(requesterId, ticketId, {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer,
        });
        return res.status(201).json({ attachment });
    } catch (err) {
        if (err instanceof TicketNotFoundError) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket ID does not exist",
            });
        }
        if (err instanceof TicketNotOwnedError) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Ticket belongs to a different Requester",
            });
        }
        if (err instanceof UnsupportedFileTypeError) {
            return res.status(400).json({
                error: "UNSUPPORTED_FILE_TYPE",
                message: "File MIME type not permitted",
            });
        }
        if (err instanceof FileTooLargeError) {
            return res.status(400).json({
                error: "FILE_TOO_LARGE",
                message: "File exceeds 5 MB",
            });
        }
        if (err instanceof AttachmentLimitReachedError) {
            return res.status(400).json({
                error: "ATTACHMENT_LIMIT_REACHED",
                message: "Ticket already has 5 active attachments",
            });
        }
        console.error("[attachments.controller] uploadAttachmentHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

export async function getAttachmentsByTicketHandler(req: Request, res: Response) {
    const requesterIdRaw = req.query.requesterId;
    const requesterId = Number(requesterIdRaw);
    if (!requesterIdRaw || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "requesterId is required and must be a positive integer",
        });
    }

    const ticketIdParam = req.params.ticketId || req.params.id;
    const ticketId = Number(ticketIdParam);
    if (!ticketIdParam || !Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Ticket ID does not exist",
        });
    }

    try {
        const attachments = await getAttachmentsByTicket(requesterId, ticketId);
        return res.status(200).json({ attachments });
    } catch (err) {
        if (err instanceof TicketNotFoundError) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Ticket ID does not exist",
            });
        }
        if (err instanceof TicketNotOwnedError) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Ticket belongs to a different Requester",
            });
        }
        console.error("[attachments.controller] getAttachmentsByTicketHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

/**
 * GET /api/attachments/:id/download — proxied binary stream, ownership-checked.
 * Order: 400 validation -> 404 NOT_FOUND -> 403 FORBIDDEN -> 404 ATTACHMENT_REMOVED -> 200 stream.
 */
export async function downloadAttachmentHandler(req: Request, res: Response) {
    const requesterIdRaw = req.query.requesterId;
    const requesterId = Number(requesterIdRaw);
    if (!requesterIdRaw || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "requesterId is required and must be a positive integer",
        });
    }

    const attachmentId = Number(req.params.id);
    if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Attachment ID does not exist",
        });
    }

    try {
        const { filePath, mimeType, originalName } = await downloadAttachment(requesterId, attachmentId);

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`);
        return res.sendFile(filePath, (err) => {
            if (err && !res.headersSent) {
                console.error("[attachments.controller] downloadAttachmentHandler stream failed:", err);
                res.status(500).json({
                    error: "INTERNAL_ERROR",
                    message: "Unexpected server error",
                });
            }
        });
    } catch (err) {
        if (err instanceof AttachmentNotFoundError) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Attachment ID does not exist",
            });
        }
        if (err instanceof AttachmentForbiddenError) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Attachment belongs to a different Requester",
            });
        }
        if (err instanceof AttachmentRemovedError) {
            return res.status(404).json({
                error: "ATTACHMENT_REMOVED",
                message: "Attachment has been soft-removed and cannot be downloaded",
            });
        }
        console.error("[attachments.controller] downloadAttachmentHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}

/**
 * PATCH /api/attachments/:id/remove — soft-remove.
 * Order: 400 validation -> 404 NOT_FOUND -> 403 FORBIDDEN -> 400 ALREADY_REMOVED -> 200.
 */
export async function removeAttachmentHandler(req: Request, res: Response) {
    const requesterIdRaw = req.body.requesterId;
    const requesterId = Number(requesterIdRaw);
    if (!requesterIdRaw || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "requesterId is required and must be a positive integer",
        });
    }

    const removalReasonRaw = req.body.removalReason;
    const removalReason = typeof removalReasonRaw === "string" ? removalReasonRaw.trim() : "";
    if (!removalReason) {
        return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "removalReason is required and cannot be empty",
        });
    }

    const attachmentId = Number(req.params.id);
    if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
        return res.status(404).json({
            error: "NOT_FOUND",
            message: "Attachment ID does not exist",
        });
    }

    try {
        const attachment = await removeAttachment(requesterId, attachmentId, removalReason);
        return res.status(200).json({ attachment });
    } catch (err) {
        if (err instanceof AttachmentNotFoundError) {
            return res.status(404).json({
                error: "NOT_FOUND",
                message: "Attachment ID does not exist",
            });
        }
        if (err instanceof AttachmentForbiddenError) {
            return res.status(403).json({
                error: "FORBIDDEN",
                message: "Attachment belongs to a different Requester",
            });
        }
        if (err instanceof AttachmentAlreadyRemovedError) {
            return res.status(400).json({
                error: "ALREADY_REMOVED",
                message: "Attachment is already soft-removed",
            });
        }
        console.error("[attachments.controller] removeAttachmentHandler failed:", err);
        return res.status(500).json({
            error: "INTERNAL_ERROR",
            message: "Unexpected server error",
        });
    }
}