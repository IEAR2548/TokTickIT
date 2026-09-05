import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterTicketDetail } from "../../pages/RequesterTicketDetail";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";
import * as ticketsApi from "../../api/tickets.api";

function Seed({ id = 1, name = "Alice Tanaka", children }: { id?: number; name?: string; children: React.ReactNode }) {
    const { selectRequester } = useRequester();
    useEffect(() => {
        selectRequester({ id, name, email: `${name.toLowerCase().replace(" ", ".")}@example.com` });
    }, [id]);
    return <>{children}</>;
}

function renderScreen(ticketId = 42, requesterId = 1) {
    return render(
        <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
            <RequesterProvider>
                <Seed id={requesterId}>
                    <Routes>
                        <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
                    </Routes>
                </Seed>
            </RequesterProvider>
        </MemoryRouter>
    );
}

const sampleTicket = {
    id: 42,
    ticketNumber: "TK-20260824-0001",
    requester: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 7, name: "Corporate Laptop" },
    summary: "Laptop battery drains quickly",
    description: "The battery of my corporate laptop goes from 100% to 0% in under 2 hours during normal use.",
    requestedPriority: "MEDIUM" as const,
    currentStatus: "NEW",
    createdAt: "2026-08-24T07:00:00.000Z",
    updatedAt: "2026-08-24T07:00:00.000Z",
};

describe("RequesterTicketDetail screen", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(ticketsApi, "fetchTicketAttachments").mockResolvedValue([]);
    });

    it("renders all Ticket Information fields as read-only (UI-08)", async () => {
        vi.spyOn(ticketsApi, "fetchTicketDetail").mockResolvedValue(sampleTicket as any);

        renderScreen();

        expect(await screen.findByText("TK-20260824-0001")).toBeInTheDocument();
        expect(screen.getByText("Alice Tanaka")).toBeInTheDocument();
        expect(screen.getByText("Hardware")).toBeInTheDocument();
        expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
        expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
        expect(
            screen.getByText(
                "The battery of my corporate laptop goes from 100% to 0% in under 2 hours during normal use."
            )
        ).toBeInTheDocument();
        // Ticket Date, formatted the same way TicketList.tsx's formatDate() does (YYYY-MM-DD)
        expect(screen.getByText("2026-08-24")).toBeInTheDocument();

        // Mirrors CreateTicket's UI-STYLE-03 pattern: read-only fields carry the `readonly` attribute
        const readonlyFields = screen.getAllByRole("textbox").filter((el) => el.hasAttribute("readonly"));
        expect(readonlyFields.length).toBeGreaterThanOrEqual(1);
    });

    it("shows the NEW status badge with the Zen Green pale-green/primary token pairing (UI-STYLE-04)", async () => {
        vi.spyOn(ticketsApi, "fetchTicketDetail").mockResolvedValue(sampleTicket as any);

        renderScreen();

        const badge = await screen.findByTestId("badge-status");
        expect(badge).toHaveTextContent("NEW");
        // "badge-status-new" is already styled in TicketList.css with
        // background var(--color-pale-green, #eaf6ef) / color var(--color-primary, #006b3c) —
        // exactly the Zen Green tokens UI-STYLE-04 requires. This assumes
        // RequesterTicketDetail reuses the existing shared <Badge kind="status" />.
        expect(badge.className).toContain("badge-status-new");
    });
});