import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StaffDashboard } from "../../pages/StaffDashboard";
import * as dashboardApi from "../../api/dashboard.api";

// Ref: docs/lab-04/ui-spec.md §1 (IT Staff Dashboard), §1.1 structure, §1.3 feedback states, §7 data-testids
// Ref: docs/lab-04/specification.md FR-10, AC-09, BR-12
// Ref: docs/lab-04/tests.md UI-01, UI-02

const STAFF_DATA: dashboardApi.StaffDashboardData = {
    counts: { new: 14, open: 23, inProgress: 18, waitingForRequester: 7, myAssigned: 16 },
    recentTickets: [
        {
            id: 8,
            ticketNumber: "TK-20260920-0008",
            summary: "Laptop battery drains quickly",
            status: "IN_PROGRESS",
            updatedAt: "2026-09-20T09:14:00.000Z",
        },
        {
            id: 9,
            ticketNumber: "TK-20260919-0009",
            summary: "VPN tunnel drops intermittently",
            status: "REOPENED",
            updatedAt: "2026-09-19T11:00:00.000Z",
        },
    ],
};

function renderDashboard() {
    return render(
        <MemoryRouter>
            <StaffDashboard />
        </MemoryRouter>
    );
}

describe("StaffDashboard (UI-01, UI-02)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("UI-01: renders the 5 metric cards with fetched values, recent Tickets, and the correct quick actions (FR-10)", async () => {
        vi.spyOn(dashboardApi, "fetchStaffDashboard").mockResolvedValue(STAFF_DATA);

        renderDashboard();

        await screen.findByTestId("staff-dashboard-card-new");

        // Metric card values from the fetched response.
        expect(screen.getByTestId("staff-dashboard-card-new")).toHaveTextContent("14");
        expect(screen.getByTestId("staff-dashboard-card-open")).toHaveTextContent("23");
        expect(screen.getByTestId("staff-dashboard-card-in-progress")).toHaveTextContent("18");
        expect(screen.getByTestId("staff-dashboard-card-waiting")).toHaveTextContent("7");
        expect(screen.getByTestId("staff-dashboard-card-my-assigned")).toHaveTextContent("16");

        // Recent Tickets list shows ticketNumber + summary and links each row to its detail.
        const recent = screen.getByTestId("staff-dashboard-recent-tickets");
        expect(recent).toHaveTextContent("TK-20260920-0008");
        expect(recent).toHaveTextContent("Laptop battery drains quickly");
        const rowLink = within(recent).getAllByRole("link");
        expect(rowLink.length).toBeGreaterThan(0);

        // Refresh control and the two permitted quick actions exist; Create Ticket does not.
        expect(screen.getByTestId("staff-dashboard-refresh-btn")).toBeInTheDocument();
        expect(screen.getByTestId("staff-dashboard-quick-action-search")).toBeInTheDocument();
        expect(screen.getByTestId("staff-dashboard-quick-action-queue")).toBeInTheDocument();
        expect(screen.queryByTestId("staff-dashboard-quick-action-create")).toBeNull();
    });

    it("UI-02: a 0-value card renders a real 0, not an empty or error state (AC-09)", async () => {
        vi.spyOn(dashboardApi, "fetchStaffDashboard").mockResolvedValue({
            counts: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0 },
            recentTickets: [],
        });

        renderDashboard();

        const newCard = await screen.findByTestId("staff-dashboard-card-new");
        expect(newCard).toHaveTextContent("0");
        expect(screen.getByTestId("staff-dashboard-card-open")).toHaveTextContent("0");
        expect(screen.getByTestId("staff-dashboard-card-my-assigned")).toHaveTextContent("0");

        // Zero is real data: no error banner is shown.
        expect(screen.queryByTestId("staff-dashboard-error")).toBeNull();
        // The empty recent-tickets block replaces the list.
        expect(screen.getByTestId("staff-dashboard-recent-tickets-empty")).toBeInTheDocument();
    });

    it("shows the error banner with a Retry action when the API fails, and retry re-fetches", async () => {
        const fetchMock = vi
            .spyOn(dashboardApi, "fetchStaffDashboard")
            .mockRejectedValueOnce(new Error("boom"))
            .mockResolvedValueOnce(STAFF_DATA);

        renderDashboard();

        const banner = await screen.findByTestId("staff-dashboard-error");
        expect(banner).toHaveTextContent(/couldn't load your dashboard/i);

        const retry = within(banner).getByRole("button", { name: /retry/i });
        fireEvent.click(retry);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(await screen.findByTestId("staff-dashboard-card-new")).toHaveTextContent("14");
    });
});
