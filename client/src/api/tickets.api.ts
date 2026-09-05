export interface CreateTicketPayload {
    categoryId: number;
    relatedSystemId: number;
    summary: string;
    description: string;
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface CreateTicketFieldErrors {
    [field: string]: string;
}

export class TicketValidationError extends Error {
    fields: CreateTicketFieldErrors;
    constructor(fields: CreateTicketFieldErrors) {
        super("Validation failed");
        this.fields = fields;
    }
}

export async function createTicket(requesterId: number, payload: CreateTicketPayload) {
    const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ requesterId, ...payload }),
    });

    const body = await res.json();

    if (res.status === 400 && body.fields) {
        throw new TicketValidationError(body.fields);
    }
    if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Unable to create ticket. Please try again.");
    }

    return body.ticket ?? body.data;
}

export async function uploadAttachment(requesterId: number, ticketId: number, file: File) {
    const form = new FormData();
    form.append("requesterId", String(requesterId));
    form.append("file", file);

    const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: form,
    });

    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Upload failed. Please try again.");
    }

    return body.attachment ?? body.data;
}

export interface TicketListItem {
    id: number;
    ticketNumber: string;
    summary: string;
    category: { id: number; name: string };
    relatedSystem: { id: number; name: string };
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    currentStatus: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface MyTicketsResponse {
    tickets: TicketListItem[];
    pagination: PaginationMeta;
}

export interface FetchMyTicketsParams {
    search?: string;
    categoryId?: number | string;
    status?: string;
    sortBy?: "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}

export async function fetchMyTickets(
    requesterId: number,
    params: FetchMyTicketsParams = {}
): Promise<MyTicketsResponse> {
    const query = new URLSearchParams();
    query.set("requesterId", String(requesterId));

    if (params.search && params.search.trim()) {
        query.set("search", params.search.trim());
    }
    if (params.categoryId !== undefined && params.categoryId !== null && String(params.categoryId) !== "") {
        query.set("categoryId", String(params.categoryId));
    }
    if (params.status && params.status.trim()) {
        query.set("status", params.status.trim());
    }
    if (params.sortBy) {
        query.set("sortBy", params.sortBy);
    }
    if (params.sortOrder) {
        query.set("sortOrder", params.sortOrder);
    }
    if (params.page !== undefined && params.page !== null) {
        query.set("page", String(params.page));
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
        query.set("pageSize", String(params.pageSize));
    }

    const res = await fetch(`/api/tickets?${query.toString()}`);
    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Failed to fetch tickets");
    }

    return {
        tickets: body.tickets ?? [],
        pagination: body.pagination ?? {
            page: Number(params.page) || 1,
            pageSize: Number(params.pageSize) || 10,
            total: 0,
            totalPages: 0,
        },
    };
}

export interface AttachmentItem {
    id: number;
    ticketId: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    isRemoved: boolean;
    removalReason: string | null;
    removedAt: string | null;
    uploadedAt: string;
}

export async function fetchTicketAttachments(requesterId: number, ticketId: number): Promise<AttachmentItem[]> {
    const query = new URLSearchParams({ requesterId: String(requesterId) });
    const res = await fetch(`/api/tickets/${ticketId}/attachments?${query.toString()}`);
    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Failed to load attachments. Please try again.");
    }

    return body.attachments ?? [];
}

export async function removeAttachment(
    requesterId: number,
    attachmentId: number,
    removalReason: string
): Promise<AttachmentItem> {
    const res = await fetch(`/api/attachments/${attachmentId}/remove`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ requesterId, removalReason }),
    });

    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message ?? body.error ?? "Failed to remove attachment. Please try again.");
    }

    return body.attachment;
}

/** Direct link target for downloading an attachment (GET, ownership-checked server-side). */
export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
    const query = new URLSearchParams({ requesterId: String(requesterId) });
    return `/api/attachments/${attachmentId}/download?${query.toString()}`;
}