export interface StaffTicketOwner {
    id: number;
    name: string;
    role: string;
}

export interface StaffTicketItem {
    id: number;
    ticketNumber: string;
    summary: string;
    description: string;
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    itPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
    currentStatus: string;
    appearsResolved: boolean;
    resolutionSummary: string | null;
    ownerId: number | null;
    owner: StaffTicketOwner | null;
    category: { id: number; name: string };
    relatedSystem: { id: number; name: string };
    requester: { id: number; name: string };
    createdAt: string;
    updatedAt: string;
}

export interface StaffTicketMeta {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface StaffTicketsResponse {
    data: StaffTicketItem[];
    meta: StaffTicketMeta;
}

export interface FetchStaffTicketsParams {
    search?: string;
    status?: string;
    itPriority?: string;
    ownerId?: number | "unassigned";
    sortBy?: "createdAt" | "updatedAt" | "itPriority" | "requestedPriority" | "currentStatus" | "ownerName";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}

export async function fetchStaffTickets(params: FetchStaffTicketsParams = {}): Promise<StaffTicketsResponse> {
    const searchParams = new URLSearchParams();

    if (params.search) searchParams.set("search", params.search);
    if (params.status) searchParams.set("status", params.status);
    if (params.itPriority) searchParams.set("itPriority", params.itPriority);
    if (params.ownerId !== undefined) searchParams.set("ownerId", String(params.ownerId));
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortDir) searchParams.set("sortDir", params.sortDir);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

    const url = `/api/staff/tickets${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const res = await fetch(url);

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Failed to fetch staff queue");
    }

    return res.json();
}

export interface StaffTicketDetail extends StaffTicketItem {
    commentsCount: number;
    notesCount: number;
    attachmentsCount: number;
}

export async function fetchStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
    const res = await fetch(`/api/staff/tickets/${ticketId}`);
    const body = await res.json();
    if (!res.ok) {
        if (res.status === 404) throw new Error("Ticket not found");
        if (res.status === 403) throw new Error("Access denied");
        throw new Error(body.message ?? body.error ?? "Failed to load ticket");
    }
    return body.data;
}

export async function claimStaffTicket(ticketId: number): Promise<{ id: number; ownerId: number; owner: StaffTicketOwner }> {
    const res = await fetch(`/api/staff/tickets/${ticketId}/claim`, { method: "PATCH" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? body.error ?? "Failed to claim ticket");
    return body.data;
}

export async function assignStaffTicket(ticketId: number, ownerId: number | null): Promise<{ id: number; ownerId: number | null; owner: StaffTicketOwner | null }> {
    const res = await fetch(`/api/staff/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? body.error ?? "Failed to assign ticket");
    return body.data;
}

export async function updateStaffTicketPriority(ticketId: number, itPriority: string): Promise<{ id: number; itPriority: string }> {
    const res = await fetch(`/api/staff/tickets/${ticketId}/it-priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itPriority }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? body.error ?? "Failed to update IT priority");
    return body.data;
}

export async function updateStaffTicketStatus(
    ticketId: number,
    status: string,
    resolutionSummary?: string
): Promise<{ id: number; currentStatus: string; resolutionSummary: string | null }> {
    const res = await fetch(`/api/staff/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionSummary }),
    });
    const body = await res.json();
    if (!res.ok) {
        const err = new Error(body.message ?? body.error ?? "Failed to update status") as any;
        err.code = body.error;
        throw err;
    }
    return body.data;
}

