import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { RequesterBadge } from "../../components/RequesterBadge";

// Mock AuthContext so we don't need a real session
vi.mock("../../context/AuthContext", () => ({
    useAuth: vi.fn(),
}));

// Mock auth API so AuthProvider doesn't fire real HTTP calls
vi.mock("../../api/auth.api", () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
}));

import { useAuth } from "../../context/AuthContext";
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function renderBadge(path = "/my-tickets") {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <RequesterBadge />
        </MemoryRouter>
    );
}

describe("RequesterBadge (Authenticated App Shell)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders null when no authenticated user", () => {
        mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
        const { container } = renderBadge();
        expect(container.firstChild).toBeNull();
    });

    it("shows the authenticated user's name", () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com", role: "REQUESTER", mustChangePassword: false },
            logout: vi.fn(),
        });
        renderBadge();
        expect(screen.getByText("Alice Tanaka")).toBeInTheDocument();
    });

    it("shows Logout button for an authenticated user", () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com", role: "REQUESTER", mustChangePassword: false },
            logout: vi.fn(),
        });
        renderBadge();
        expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });

    it("shows My Tickets and Create Ticket links for REQUESTER role", () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com", role: "REQUESTER", mustChangePassword: false },
            logout: vi.fn(),
        });
        renderBadge();
        expect(screen.getByRole("link", { name: /my tickets/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /create ticket/i })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /my queue/i })).not.toBeInTheDocument();
    });

    it("hides Create Ticket and shows My Queue for IT_STAFF role (Decision D-5)", () => {
        mockUseAuth.mockReturnValue({
            user: { id: 2, name: "Samira Chen", email: "samira.chen@example.com", role: "IT_STAFF", mustChangePassword: false },
            logout: vi.fn(),
        });
        renderBadge("/staff/queue");
        expect(screen.queryByRole("link", { name: /create ticket/i })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /my queue/i })).toBeInTheDocument();
    });

    it("shows My Queue and Users (Admin) for ADMINISTRATOR role, no Create Ticket", () => {
        mockUseAuth.mockReturnValue({
            user: { id: 3, name: "Alex Morgan", email: "alex.morgan@example.com", role: "ADMINISTRATOR", mustChangePassword: false },
            logout: vi.fn(),
        });
        renderBadge("/admin/users");
        expect(screen.queryByRole("link", { name: /create ticket/i })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /my queue/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /users \(admin\)/i })).toBeInTheDocument();
    });

    it("calls logout and renders null after logout", async () => {
        const mockLogout = vi.fn().mockResolvedValue(undefined);
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com", role: "REQUESTER", mustChangePassword: false },
            logout: mockLogout,
        });
        renderBadge();

        await userEvent.click(screen.getByRole("button", { name: /logout/i }));
        expect(mockLogout).toHaveBeenCalledOnce();
    });

    it("renders null on /login path (shell is hidden on auth screens)", () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com", role: "REQUESTER", mustChangePassword: false },
            logout: vi.fn(),
        });
        const { container } = renderBadge("/login");
        expect(container.firstChild).toBeNull();
    });
});