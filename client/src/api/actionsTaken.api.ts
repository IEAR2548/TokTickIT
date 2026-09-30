export interface ActionTaken {
    id: number;
    ticketId: number;
    actionDateTime: string;
    description: string;
    result: string;
    performedBy: { id: number; name: string };
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ActionTakenPayload {
    description: string;
    result: string;
    followUpRequired: boolean;
    followUpNote?: string | null;
    attachmentNotes?: string | null;
}

export type ActionsTakenErrorCode =
    | "VALIDATION_ERROR"
    | "TICKET_CANCELLED"
    | "EDIT_WINDOW_EXPIRED"
    | "STALE_UPDATE"
    | "FORBIDDEN"
    | "NOT_FOUND";

interface ApiErrorBody {
    error?: {
        code?: string;
        message?: string;
        fields?: Record<string, string>;
        data?: { current?: ActionTaken };
    };
}

export class ActionsTakenApiError extends Error {
    status: number;
    code: string;
    fields?: Record<string, string>;
    current?: ActionTaken;

    constructor(status: number, body: ApiErrorBody) {
        super(body.error?.message ?? "Request failed");
        this.status = status;
        this.code = body.error?.code ?? "UNKNOWN";
        this.fields = body.error?.fields;
        this.current = body.error?.data?.current;
    }
}

async function throwFromResponse(res: Response): Promise<never> {
    let body: ApiErrorBody = {};
    try {
        body = await res.json();
    } catch {
        body = {};
    }
    throw new ActionsTakenApiError(res.status, body);
}

export async function listActionsTaken(ticketId: number): Promise<ActionTaken[]> {
    const res = await fetch(`/api/tickets/${ticketId}/actions`);
    if (!res.ok) await throwFromResponse(res);
    const body = await res.json();
    return body.data ?? [];
}

export async function createActionTaken(
    ticketId: number,
    payload: ActionTakenPayload,
    idempotencyKey: string
): Promise<ActionTaken> {
    const res = await fetch(`/api/tickets/${ticketId}/actions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) await throwFromResponse(res);
    const body = await res.json();
    return body.data;
}

export async function updateActionTaken(
    ticketId: number,
    actionId: number,
    payload: ActionTakenPayload & { expectedUpdatedAt: string }
): Promise<ActionTaken> {
    const res = await fetch(`/api/tickets/${ticketId}/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) await throwFromResponse(res);
    const body = await res.json();
    return body.data;
}
