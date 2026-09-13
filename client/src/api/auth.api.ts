export interface User {
    id: number;
    name: string;
    email: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    mustChangePassword: boolean;
}

export interface AuthResponse {
    data: User;
}

export async function login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
    });

    const body = await res.json();
    if (!res.ok) {
        throw new Error(body.message || "Invalid email or password.");
    }

    return body as AuthResponse;
}

export async function logout(): Promise<void> {
    const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to logout");
    }
}

export async function fetchCurrentUser(): Promise<User> {
    const res = await fetch("/api/auth/me", {
        credentials: "include",
    });
    const body = await res.json();

    if (!res.ok) {
        throw new Error(body.message || "Unauthenticated");
    }

    return body.data as User;
}

export async function changePassword(passwords: { currentPassword: string; newPassword: string }): Promise<{ changed: boolean }> {
    const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwords),
    });

    const body = await res.json();
    if (!res.ok) {
        throw new Error(body.message || "Failed to change password");
    }

    return body.data;
}
