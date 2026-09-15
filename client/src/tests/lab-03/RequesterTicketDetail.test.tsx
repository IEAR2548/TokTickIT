import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import { RequesterTicketDetail } from "../../pages/RequesterTicketDetail";
import * as authApi from "../../api/auth.api";
import * as ticketsApi from "../../api/tickets.api";

// Ref: docs/lab-03/ui-spec.md Section 4 (Requester Ticket Detail additions)
// Ref: docs/lab-03/specification.md AC-16, BR-05, BR-20
// Ref: docs/lab-03/tests.md UI-09

describe("Requester Ticket Detail Appears-Resolved Flow (UI-09)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 1,
            name: "Alice Tanaka",
            email: "alice.tanaka@example.com",
            role: "REQUESTER",
            mustChangePassword: false,
        });
    });

    it("UI-09: shows Problem Appears Resolved button, clicking updates indicator while status badge remains unchanged (AC-16, ui-spec §4)", async () => {
        vi.spyOn(ticketsApi, "fetchTicketDetail").mockResolvedValue({
            id: 5,
            ticketNumber: "TKT-0005",
            summary: "Cannot access network drive",
            description: "Detailed description of the issue.",
            category: { id: 1, name: "Network" },
            relatedSystem: { id: 2, name: "VPN" },
            requester: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
            requestedPriority: "MEDIUM",
            itPriority: "MEDIUM",
            currentStatus: "OPEN",
            resolutionSummary: null,
            appearsResolved: false,
            createdAt: "2026-09-01T10:00:00Z",
            updatedAt: "2026-09-01T10:00:00Z",
            attachments: [],
        } as any);

        render(
            <MemoryRouter initialEntries={["/tickets/5"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <Routes>
                            <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
                        </Routes>
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Expect "Problem Appears Resolved" button
        const btn = await screen.findByTestId("requester-ticket-appears-resolved-btn");
        expect(btn).toBeInTheDocument();

        // Indicator is not yet shown
        expect(screen.queryByTestId("requester-ticket-appears-resolved-indicator")).not.toBeInTheDocument();

        // Click button
        fireEvent.click(btn);

        // Indicator should appear
        const indicator = await screen.findByTestId("requester-ticket-appears-resolved-indicator");
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveTextContent(/problem appears resolved/i);

        // Status badge remains unchanged ("OPEN")
        const statusBadge = screen.getByTestId("ticket-status-badge");
        expect(statusBadge).toHaveTextContent(/open/i);
    });
});
