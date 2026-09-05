import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../lib/prisma";
import { sanitizeFilename } from "../utils/fileSanitizer";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ACTIVE_ATTACHMENTS = 5;

export class UnsupportedFileTypeError extends Error { }
export class FileTooLargeError extends Error { }
export class AttachmentLimitReachedError extends Error { }
export class TicketNotFoundError extends Error { }
export class TicketNotOwnedError extends Error { }
export class AttachmentNotFoundError extends Error { }
export class AttachmentForbiddenError extends Error { }
export class AttachmentRemovedError extends Error { }
export class AttachmentAlreadyRemovedError extends Error { }

const STORAGE_DIR = path.join(process.cwd(), "storage", "attachments");

async function ensureStorageDir() {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export function getAttachmentFilePath(storageKey: string): string {
    return path.join(STORAGE_DIR, storageKey);
}

export async function addAttachment(
    requesterId: number,
    ticketId: number,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer }
) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
        throw new TicketNotFoundError();
    }
    if (ticket.requesterId !== requesterId) {
        throw new TicketNotOwnedError();
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new UnsupportedFileTypeError();
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new FileTooLargeError();
    }

    const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
    });
    if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
        throw new AttachmentLimitReachedError();
    }

    // sanitize filename, store under a generated UUID key, keep original name as metadata
    await ensureStorageDir();
    const sanitizedName = sanitizeFilename(file.originalname);
    const storageKey = `${randomUUID()}${path.extname(sanitizedName)}`;
    await fs.writeFile(path.join(STORAGE_DIR, storageKey), file.buffer);

    const attachment = await prisma.attachment.create({
        data: {
            ticketId,
            originalName: sanitizedName,
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        },
    });

    return attachment;
}

const ATTACHMENT_LIST_SELECT = {
    id: true,
    ticketId: true,
    originalName: true,
    mimeType: true,
    sizeBytes: true,
    isRemoved: true,
    removalReason: true,
    removedAt: true,
    uploadedAt: true,
} as const;

export async function getAttachmentsByTicket(requesterId: number, ticketId: number) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
        throw new TicketNotFoundError();
    }
    if (ticket.requesterId !== requesterId) {
        throw new TicketNotOwnedError();
    }

    return prisma.attachment.findMany({
        where: { ticketId },
        select: ATTACHMENT_LIST_SELECT,
        orderBy: { uploadedAt: "asc" },
    });
}

async function findAttachmentWithOwnership(attachmentId: number) {
    return prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: { select: { requesterId: true } } },
    });
}

export async function downloadAttachment(requesterId: number, attachmentId: number) {
    const attachment = await findAttachmentWithOwnership(attachmentId);
    if (!attachment) {
        throw new AttachmentNotFoundError();
    }
    if (attachment.ticket.requesterId !== requesterId) {
        throw new AttachmentForbiddenError();
    }
    if (attachment.isRemoved) {
        throw new AttachmentRemovedError();
    }

    return {
        filePath: getAttachmentFilePath(attachment.storageKey),
        mimeType: attachment.mimeType,
        originalName: attachment.originalName,
    };
}

// soft remove
export async function removeAttachment(requesterId: number, attachmentId: number, removalReason: string) {
    const attachment = await findAttachmentWithOwnership(attachmentId);
    if (!attachment) {
        throw new AttachmentNotFoundError();
    }
    if (attachment.ticket.requesterId !== requesterId) {
        throw new AttachmentForbiddenError();
    }
    if (attachment.isRemoved) {
        throw new AttachmentAlreadyRemovedError();
    }

    return prisma.attachment.update({
        where: { id: attachmentId },
        data: {
            isRemoved: true,
            removalReason: removalReason,
            removedAt: new Date(),
        },
        select: ATTACHMENT_LIST_SELECT,
    });
}