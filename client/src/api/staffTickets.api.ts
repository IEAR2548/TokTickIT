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
