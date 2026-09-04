import { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
    addAttachment,
    UnsupportedFileTypeError,
    FileTooLargeError,
    AttachmentLimitReachedError,
    TicketNotFoundError,
    TicketNotOwnedError,
    MAX_FILE_SIZE_BYTES,
} from "../services/attachments.service";

// Ref: docs/lab-02/api-spec.md Section 7 "POST /api/tickets/:id/attachments"

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