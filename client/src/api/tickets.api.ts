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

// Ref: docs/lab-02/api-spec.md Section 4 POST /api/tickets
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

// Ref: docs/lab-02/api-spec.md Section 7 POST /api/tickets/:id/attachments
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