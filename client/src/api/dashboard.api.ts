// Ref: docs/lab-04/api-spec.md §3.1, §3.2
// Ref: docs/lab-04/specification.md FR-10, FR-11, BR-11, BR-12, BR-13, AC-02

export interface DashboardRecentTicket {
    id: number;
    ticketNumber: string;
    summary: string;
    status: string;
    updatedAt: string;
}

export interface StaffDashboardCounts {
    new: number;
    open: number;
    inProgress: number;
    waitingForRequester: number;
    myAssigned: number;
}

export interface RequesterDashboardCounts {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
}

export interface StaffDashboardData {
    counts: StaffDashboardCounts;
    recentTickets: DashboardRecentTicket[];
}

export interface RequesterDashboardData {
    counts: RequesterDashboardCounts;
    recentTickets: DashboardRecentTicket[];
}

async function getDashboard<T>(path: string): Promise<T> {
    const res = await fetch(path);
    if (!res.ok) {
        let message = "Failed to load your dashboard";
        try {
            const body = await res.json();
            message = body?.error?.message ?? body?.message ?? message;
        } catch {
            // keep the default message
        }
        throw new Error(message);
    }
    const body = await res.json();
    return body.data as T;
}

/**
 * IT Staff/Admin dashboard. The backend derives the caller from the session; no user id is
 * ever sent (Admin reuses this same endpoint, Assumption #6).
 */
export async function fetchStaffDashboard(): Promise<StaffDashboardData> {
    return getDashboard<StaffDashboardData>("/api/dashboard/staff");
}

/**
 * Requester dashboard. Deliberately takes NO arguments — ownership is derived server-side
 * from the session and is never accepted from the client (ui-spec §2.2, AC-02).
 */
export async function fetchRequesterDashboard(): Promise<RequesterDashboardData> {
    return getDashboard<RequesterDashboardData>("/api/dashboard/requester");
}
