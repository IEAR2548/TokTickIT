import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { RequesterDashboard } from "../../pages/RequesterDashboard";
import * as dashboardApi from "../../api/dashboard.api";

// Ref: docs/lab-04/ui-spec.md §2 (Requester Dashboard), §2.1 structure, §2.2 ownership, §2.3 states, §7 data-testids
// Ref: docs/lab-04/specification.md FR-11, BR-11, AC-15
// Ref: docs/lab-04/tests.md UI-03

const REQUESTER_DATA: dashboardApi.RequesterDashboardData = {
    counts: { open: 3, inProgress: 2, resolved: 5, closed: 12 },
    recentTickets: [
        {
            id: 12,
            ticketNumber: "TK-20260920-0012",
            summary: "Laptop battery drains quickly",
            status: "IN_PROGRESS",
            updatedAt: "2026-09-20T09:00:00.000Z",
        },
    ],
};

function renderDashboard() {
    return render(
        <MemoryRouter>
            <RequesterDashboard />
        </MemoryRouter>
    );
}

describe("RequesterDashboard (UI-03)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("UI-03a: renders the 4 mutually-exclusive metric cards and recent Tickets from the fetched response (FR-11)", async () => {
        const fetchMock = vi.spyOn(dashboardApi, "fetchRequesterDashboard").mockResolvedValue(REQUESTER_DATA);

        renderDashboard();

        await screen.findByTestId("requester-dashboard-card-open");

        expect(screen.getByTestId("requester-dashboard-card-open")).toHaveTextContent("3");
        expect(screen.getByTestId("requester-dashboard-card-in-progress")).toHaveTextContent("2");
        expect(screen.getByTestId("requester-dashboard-card-resolved")).toHaveTextContent("5");
        expect(screen.getByTestId("requester-dashboard-card-closed")).toHaveTextContent("12");

        const recent = screen.getByTestId("requester-dashboard-recent-tickets");
        expect(recent).toHaveTextContent("TK-20260920-0012");
        expect(recent).toHaveTextContent("Laptop battery drains quickly");

        expect(screen.getByTestId("requester-dashboard-quick-action-create")).toBeInTheDocument();
        expect(screen.getByTestId("requester-dashboard-quick-action-my-tickets")).toBeInTheDocument();

        // Ownership guarantee reflected client-side: the fetch is called with NO Requester id —
        // the backend derives it from the session (ui-spec §2.2).
        expect(fetchMock).toHaveBeenCalledWith();
    });

    it("UI-03b: an all-zero Requester renders four 0 cards and the empty recent Tickets block, not an error (AC-15)", async () => {
        vi.spyOn(dashboardApi, "fetchRequesterDashboard").mockResolvedValue({
            counts: { open: 0, inProgress: 0, resolved: 0, closed: 0 },
            recentTickets: [],
        });

        renderDashboard();

        await screen.findByTestId("requester-dashboard-card-open");

        expect(screen.getByTestId("requester-dashboard-card-open")).toHaveTextContent("0");
        expect(screen.getByTestId("requester-dashboard-card-in-progress")).toHaveTextContent("0");
        expect(screen.getByTestId("requester-dashboard-card-resolved")).toHaveTextContent("0");
        expect(screen.getByTestId("requester-dashboard-card-closed")).toHaveTextContent("0");

        expect(screen.queryByTestId("requester-dashboard-error")).toBeNull();
        expect(screen.getByTestId("requester-dashboard-recent-tickets-empty")).toBeInTheDocument();
        expect(within(screen.getByTestId("requester-dashboard-recent-tickets-empty")).getByRole("link")).toBeInTheDocument();
    });
});
