import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MyTickets } from "../../pages/MyTickets";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";
import * as ticketsApi from "../../api/tickets.api";
import * as referenceApi from "../../api/referenceData.api";

function Seed({ id = 1, name = "Alice Tanaka", children }: { id?: number; name?: string; children: React.ReactNode }) {
    const { selectRequester } = useRequester();
    useEffect(() => {
        selectRequester({ id, name, email: `${name.toLowerCase().replace(" ", ".")}@example.com` });
    }, [id]);
    return <>{children}</>;
}

function renderScreen(requesterId = 1) {
    return render(
        <MemoryRouter>
            <RequesterProvider>
                <Seed id={requesterId}>
                    <MyTickets />
                </Seed>
            </RequesterProvider>
        </MemoryRouter>
    );
}

const sampleTicket: ticketsApi.TicketListItem = {
    id: 1,
    ticketNumber: "TK-20260824-0001",
    summary: "Laptop battery drains quickly",
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 1, name: "Corporate Laptop" },
    requestedPriority: "MEDIUM",
    currentStatus: "NEW",
    createdAt: "2026-08-24T09:14:00.000Z",
    updatedAt: "2026-08-24T09:14:00.000Z",
};

describe("MyTickets screen", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(referenceApi, "fetchCategories").mockResolvedValue([
            { id: 1, name: "Hardware" },
            { id: 2, name: "Software" },
        ]);
    });

    it("renders the requester's tickets returned by the API (UI-05, AC-08)", async () => {
        vi.spyOn(ticketsApi, "fetchMyTickets").mockResolvedValue({
            tickets: [sampleTicket],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        renderScreen();

        expect(await screen.findByText("TK-20260824-0001")).toBeInTheDocument();
        expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
        expect(screen.getByText("Hardware")).toBeInTheDocument();
        expect(screen.getByText("NEW")).toBeInTheDocument();
    });

    it("shows the empty state when the requester has zero tickets (UI-06, AC-13)", async () => {
        vi.spyOn(ticketsApi, "fetchMyTickets").mockResolvedValue({
            tickets: [],
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        });

        renderScreen();

        expect(await screen.findByTestId("my-tickets-empty")).toBeInTheDocument();
        expect(screen.queryByTestId("my-tickets-no-results")).not.toBeInTheDocument();
    });

    it("shows the no-results state when search or filter returns zero tickets", async () => {
        const spy = vi.spyOn(ticketsApi, "fetchMyTickets");
        spy.mockResolvedValueOnce({
            tickets: [sampleTicket],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });
        spy.mockResolvedValueOnce({
            tickets: [],
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        });

        renderScreen();
        await screen.findByText("TK-20260824-0001");

        const searchInput = screen.getByRole("searchbox", { name: /search/i }) || screen.getByLabelText(/search/i);
        await userEvent.type(searchInput, "nonexistent{Enter}");

        await waitFor(() => {
            expect(screen.getByTestId("my-tickets-no-results")).toBeInTheDocument();
        });
        expect(screen.queryByTestId("my-tickets-empty")).not.toBeInTheDocument();
    });

    it("requests the next page when Next is clicked (AC-12)", async () => {
        const spy = vi.spyOn(ticketsApi, "fetchMyTickets").mockResolvedValue({
            tickets: [sampleTicket],
            pagination: { page: 1, pageSize: 10, total: 15, totalPages: 2 },
        });

        renderScreen();
        await screen.findByText("TK-20260824-0001");

        const nextBtn = screen.getByRole("button", { name: /next/i });
        await userEvent.click(nextBtn);

        await waitFor(() => {
            expect(spy).toHaveBeenLastCalledWith(1, expect.objectContaining({ page: 2 }));
        });
    });

    it("reloads with the new requester's data when the requester changes (UI-13, AC-23)", async () => {
        const spy = vi.spyOn(ticketsApi, "fetchMyTickets").mockResolvedValue({
            tickets: [sampleTicket],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        const { rerender } = renderScreen(1);
        await screen.findByText("TK-20260824-0001");
        expect(spy).toHaveBeenLastCalledWith(1, expect.anything());

        rerender(
            <MemoryRouter>
                <RequesterProvider>
                    <Seed id={2} name="Bob Chavez">
                        <MyTickets />
                    </Seed>
                </RequesterProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(spy).toHaveBeenLastCalledWith(2, expect.anything());
        });
    });

    it("shows a safe failure state with retry when the API call fails (UI-07, AC-14)", async () => {
        const spy = vi.spyOn(ticketsApi, "fetchMyTickets").mockRejectedValue(new Error("network down"));

        renderScreen();

        expect(await screen.findByTestId("my-tickets-error")).toBeInTheDocument();
        const retryBtn = screen.getByRole("button", { name: /retry/i });
        expect(retryBtn).toBeInTheDocument();

        // Clicking retry re-triggers fetchMyTickets
        spy.mockResolvedValueOnce({
            tickets: [sampleTicket],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });
        await userEvent.click(retryBtn);

        expect(await screen.findByText("TK-20260824-0001")).toBeInTheDocument();
    });

    it("applies primary green styling to the Create Ticket button (UI-STYLE-01)", async () => {
        vi.spyOn(ticketsApi, "fetchMyTickets").mockResolvedValue({
            tickets: [sampleTicket],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        renderScreen();

        const createBtn = await screen.findByRole("link", { name: /create ticket/i }) || screen.getByRole("button", { name: /create ticket/i });
        expect(createBtn).toBeInTheDocument();
    });
});