import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import { RequesterBadge } from "../../components/RequesterBadge";
import * as authApi from "../../api/auth.api";

// Ref: docs/lab-03/specification.md Decision D-5, AC-27
// Ref: docs/lab-03/ui-spec.md Section 3.1 (Authenticated App Shell)
// Ref: docs/lab-03/tests.md UI-05: Nav hides Create Ticket for IT Staff / Admin

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
