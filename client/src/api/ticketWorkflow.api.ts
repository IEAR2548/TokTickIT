// Ref: docs/lab-04/api-spec.md §2.1, §2.2, §4 (error codes)
// Ref: docs/lab-04/ui-spec.md §4 (Ticket Status Control)

export interface StatusChangeResult {
    id: number;
    status: string;
    updatedAt: string;
    resolutionSummary: string | null;
    appearsResolved: boolean;
}

export interface CurrentTicketState {
    status: string;
    updatedAt: string;
}

export interface ChangeStatusPayload {
    status: string;
    resolutionSummary?: string;
    expectedUpdatedAt?: string;
}

export interface SetAppearsResolvedPayload {
    appearsResolved: boolean;
    expectedUpdatedAt?: string;
}

export type TicketWorkflowErrorCode =
    | "VALIDATION_ERROR"
    | "INVALID_TRANSITION"
    | "STALE_UPDATE"
    | "RESOLUTION_SUMMARY_REQUIRED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "TICKET_CANCELLED";

interface ApiErrorBody {
    // Lab 4 endpoints return the nested RFC-consistent envelope; the Lab 3 `appears-resolved`
    // route kept its older string-code envelope (api-spec §4: generic codes reuse Lab 2/3
    // conventions). Accept both so a code is never silently lost.
    error?: string | {
        code?: string;
        message?: string;
        fields?: Record<string, string>;
        data?: { current?: CurrentTicketState };
    };
    message?: string;
}

export class TicketWorkflowApiError extends Error {
    status: number;
    code: string;
    fields?: Record<string, string>;
    current?: CurrentTicketState;

    constructor(status: number, body: ApiErrorBody) {
        const nested = typeof body.error === "object" && body.error !== null ? body.error : undefined;
        const code = typeof body.error === "string" ? body.error : nested?.code ?? "UNKNOWN";
        super(nested?.message ?? body.message ?? "Request failed");
        this.status = status;
        this.code = code;
        this.fields = nested?.fields;
        this.current = nested?.data?.current;
    }
}

async function throwFromResponse(res: Response): Promise<never> {
    let body: ApiErrorBody = {};
    try {
        body = await res.json();
    } catch {
        body = {};
    }
    throw new TicketWorkflowApiError(res.status, body);
}

export async function changeTicketStatus(
    ticketId: number,
    payload: ChangeStatusPayload
): Promise<StatusChangeResult> {
    const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) await throwFromResponse(res);
    const body = await res.json();
    return body.data;
}

export async function setAppearsResolved(
    ticketId: number,
    payload: SetAppearsResolvedPayload
): Promise<{ id: number; appearsResolved: boolean; status: string; updatedAt: string }> {
    const res = await fetch(`/api/tickets/${ticketId}/appears-resolved`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) await throwFromResponse(res);
    const body = await res.json();
    return body.data;
}
