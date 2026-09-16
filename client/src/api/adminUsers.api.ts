// Ref: docs/lab-03/api-spec.md endpoints 26-29
// Ref: docs/lab-03/ui-spec.md section 7 (Administrator User Management)

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    isActive: boolean;
}

export interface AdminApiError extends Error {
    code?: string;
}

async function parseError(res: Response, fallback: string): Promise<AdminApiError> {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message ?? body.error ?? fallback) as AdminApiError;
    err.code = body.error;
    return err;
}

export async function fetchUsers(params: { search?: string; role?: string } = {}): Promise<AdminUser[]> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.role) searchParams.set("role", params.role);

    const url = `/api/admin/users${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw await parseError(res, "Failed to load users");
    }
    const body = await res.json();
    return body.data;
}

export async function createUser(input: {
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    initialPassword: string;
}): Promise<AdminUser> {
    const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        throw await parseError(res, "Failed to create user");
    }
    const body = await res.json();
    return body.data;
}

export async function updateUser(
    id: number,
    patch: { name?: string; email?: string; role?: string; isActive?: boolean }
): Promise<AdminUser> {
    const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    if (!res.ok) {
        throw await parseError(res, "Failed to update user");
    }
    const body = await res.json();
    return body.data;
}

export async function setUserPassword(id: number, newPassword: string): Promise<AdminUser> {
    const res = await fetch(`/api/admin/users/${id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
        throw await parseError(res, "Failed to set new password");
    }
    const body = await res.json();
    return body.data;
}
