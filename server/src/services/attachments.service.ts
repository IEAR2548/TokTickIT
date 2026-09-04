import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../lib/prisma";

// Ref: docs/lab-02/specification.md BR-15, BR-16, BR-17, BR-18, BR-19, BR-22
// Ref: docs/lab-02/api-spec.md Section 7

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ACTIVE_ATTACHMENTS = 5;

export class UnsupportedFileTypeError extends Error {}
export class FileTooLargeError extends Error {}
export class AttachmentLimitReachedError extends Error {}
export class TicketNotFoundError extends Error {}
export class TicketNotOwnedError extends Error {}

const STORAGE_DIR = path.join(process.cwd(), "storage", "attachments");

async function ensureStorageDir() {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
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

    // BR-22: sanitize filename, store under a generated UUID key, keep original name as metadata
    await ensureStorageDir();
    const storageKey = `${randomUUID()}${path.extname(file.originalname)}`;
    await fs.writeFile(path.join(STORAGE_DIR, storageKey), file.buffer);

    const attachment = await prisma.attachment.create({
        data: {
            ticketId,
            originalName: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        },
    });

    return attachment;
}