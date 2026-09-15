import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import { StaffTicketDetail } from "../../pages/StaffTicketDetail";
import * as authApi from "../../api/auth.api";
import * as ticketsApi from "../../api/tickets.api";

// Ref: docs/lab-03/ui-spec.md Section 6 (IT Staff Ticket Detail)
// Ref: docs/lab-03/specification.md BR-21, FR-19, AC-16, BR-27
// Ref: docs/lab-03/tests.md UI-07, UI-08, UI-12, UI-13

describe("Staff Ticket Detail Screen (UI-07, UI-08, UI-12)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });
    });

    it("UI-07: Status dropdown renders only permitted-transition options per BR-21 (AC-11, BR-21)", async () => {
        render(
            <MemoryRouter initialEntries={["/staff/tickets/5"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <Routes>
                            <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
                        </Routes>
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        const statusSelect = await screen.findByTestId("staff-ticket-status-select");
        expect(statusSelect).toBeInTheDocument();

        // For a ticket currently in OPEN, permitted transitions per BR-21 are:
        // IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
        const options = Array.from((statusSelect as HTMLSelectElement).options).map(o => o.value);
        expect(options).toContain("IN_PROGRESS");
        expect(options).toContain("WAITING_FOR_REQUESTER");
        expect(options).toContain("CANCELLED");
        expect(options).not.toContain("CLOSED");
        expect(options).not.toContain("RESOLVED");
    });

    it("UI-08: Internal Notes tab has distinct background class/styling from Public Comments (FR-19, ui-spec §6)", async () => {
        render(
            <MemoryRouter initialEntries={["/staff/tickets/5"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <Routes>
                            <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
                        </Routes>
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        const notesTab = await screen.findByTestId("tab-internal-notes");
        expect(notesTab).toBeInTheDocument();

        // Activate the Internal Notes tab — panels render only for the active tab
        fireEvent.click(notesTab);

        // The notes panel container must have the warning/distinct styling class
        const notesPanel = await screen.findByTestId("internal-notes-panel");
        expect(notesPanel).toBeInTheDocument();
        expect(notesPanel.className).toMatch(/internal-notes-warning/);
    });

    it("UI-12: Staff Ticket Detail renders appears-resolved badge when appearsResolved is true (AC-16, ui-spec §6)", async () => {
        render(
            <MemoryRouter initialEntries={["/staff/tickets/5"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <Routes>
                            <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
                        </Routes>
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        const badge = await screen.findByTestId("staff-ticket-appears-resolved-badge");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent(/problem appears resolved/i);
    });

    it("UI-13: comment content renders as plain text — stored content cannot execute as HTML (BR-27)", async () => {
        const xssContent = '<img src=x onerror="window.__xssExecuted = true"><script>window.__xssExecuted = true</script>';
        vi.spyOn(ticketsApi, "fetchPublicComments").mockResolvedValue([
            {
                id: 1,
                ticketId: 5,
                authorId: 1,
                authorName: "Alice Tanaka",
                authorRole: "REQUESTER",
                content: xssContent,
                createdAt: "2026-09-01T10:00:00Z",
            },
        ]);

        render(
            <MemoryRouter initialEntries={["/staff/tickets/5"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <Routes>
                            <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
                        </Routes>
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        const panel = await screen.findByTestId("public-comments-panel");

        // Raw markup is present only as escaped text content, never as elements
        expect(panel.textContent).toContain('<img src=x onerror="window.__xssExecuted = true">');
        expect(panel.querySelector("script")).toBeNull();
        expect(panel.querySelector("img")).toBeNull();
        expect((window as any).__xssExecuted).toBeUndefined();
    });
});
