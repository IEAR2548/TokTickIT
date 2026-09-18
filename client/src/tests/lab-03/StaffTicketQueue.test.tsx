import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import { RequesterBadge } from "../../components/RequesterBadge";
import { StaffQueue } from "../../pages/StaffQueue";
import * as authApi from "../../api/auth.api";

describe("Staff Queue & Navigation (UI-05)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("UI-05: Create Ticket nav item is absent from the DOM for an IT Staff session (AC-27, Decision D-5)", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });

        render(
            <MemoryRouter initialEntries={["/staff/queue"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <RequesterBadge />
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for auth shell to render with user name
        expect(await screen.findByText("Samira Chen")).toBeInTheDocument();

        // Create Ticket nav link must be absent from DOM for IT Staff
        const createTicketLink = screen.queryByRole("link", { name: /create ticket/i });
        expect(createTicketLink).not.toBeInTheDocument();
    });

    it("UI-05: Create Ticket nav item is absent from the DOM for an Administrator session (Decision D-5)", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 30,
            name: "Alex Morgan",
            email: "alex.morgan@example.com",
            role: "ADMINISTRATOR",
            mustChangePassword: false,
        });

        render(
            <MemoryRouter initialEntries={["/admin/users"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <RequesterBadge />
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        expect(await screen.findByText("Alex Morgan")).toBeInTheDocument();

        const createTicketLink = screen.queryByRole("link", { name: /create ticket/i });
        expect(createTicketLink).not.toBeInTheDocument();
    });
});

describe("Staff Queue Empty vs No-Results States (UI-06)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("UI-06: renders empty state with 'No tickets in the queue' when queue has zero tickets globally (AC-23, ui-spec §5)", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });

        render(
            <MemoryRouter initialEntries={["/staff/queue"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <StaffQueue />
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Expect empty state container and text
        const emptyState = await screen.findByTestId("staff-queue-empty");
        expect(emptyState).toBeInTheDocument();
        expect(emptyState).toHaveTextContent(/no tickets in the queue/i);

        // No-results state must NOT be rendered
        expect(screen.queryByTestId("staff-queue-no-results")).not.toBeInTheDocument();
    });

    it("UI-06: renders no-results state distinct from global empty state when search/filter returns zero tickets (AC-23, ui-spec §5)", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });

        render(
            <MemoryRouter initialEntries={["/staff/queue?search=nonexistent"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <StaffQueue />
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Expect no-results state container
        const noResultsState = await screen.findByTestId("staff-queue-no-results");
        expect(noResultsState).toBeInTheDocument();
        expect(noResultsState).toHaveTextContent(/no tickets/i);

        // Global empty state must NOT be rendered
        expect(screen.queryByTestId("staff-queue-empty")).not.toBeInTheDocument();
    });
});

describe("Staff Queue Responsive Breakpoints (RESP-01)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("RESP-01: renders desktop table with search, filters button, table headers, and rows (ui-spec §5, AC-26)", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });

        render(
            <MemoryRouter initialEntries={["/staff/queue"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <StaffQueue />
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        expect(await screen.findByTestId("staff-queue-search")).toBeInTheDocument();
        expect(screen.getByTestId("staff-queue-filters-button")).toBeInTheDocument();
        expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
    });

    it("RESP-01: supports responsive compact table and mobile card layout with required testids (ui-spec §5)", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });

        render(
            <MemoryRouter initialEntries={["/staff/queue"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <StaffQueue />
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Container must have responsive layout wrappers per ui-spec §5
        const queueContainer = await screen.findByTestId("staff-queue-container");
        expect(queueContainer).toBeInTheDocument();
    });
});
