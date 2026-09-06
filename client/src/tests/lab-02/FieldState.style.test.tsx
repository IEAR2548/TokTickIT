import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CreateTicket } from "../../pages/CreateTicket";
import { RequesterTicketDetail } from "../../pages/RequesterTicketDetail";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";
import * as ticketsApi from "../../api/tickets.api";
import * as referenceApi from "../../api/referenceData.api";

function Seed({ children }: { children: React.ReactNode }) {
    const { selectRequester } = useRequester();
    useEffect(() => {
        selectRequester({ id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" });
    }, [selectRequester]);
    return <>{children}</>;
}

describe("Field read-only/editable styling contract", () => {
    describe("CreateTicket screen", () => {
        beforeEach(() => {
            vi.restoreAllMocks();
            vi.spyOn(referenceApi, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
            vi.spyOn(referenceApi, "fetchRelatedSystems").mockResolvedValue([
                { id: 1, name: "Corporate Laptop" },
            ]);
        });

        function renderScreen() {
            return render(
                <MemoryRouter>
                    <RequesterProvider>
                        <Seed>
                            <CreateTicket />
                        </Seed>
                    </RequesterProvider>
                </MemoryRouter>
            );
        }

        it("marks the system-info fields (Ticket Number, Ticket Date, Current Status, Requester) as read-only", async () => {
            renderScreen();
            await screen.findByRole("option", { name: "Hardware" });

            const readonlyLabels = [/ticket number/i, /ticket date/i, /current status/i, /requester/i];
            for (const pattern of readonlyLabels) {
                const field = screen.getByLabelText(pattern) as HTMLInputElement;
                expect(field).toHaveAttribute("readonly");
                expect(field.className).toContain("field-readonly");
            }
        });

        it("does NOT mark the editable classification/content fields as read-only", async () => {
            renderScreen();
            await screen.findByRole("option", { name: "Hardware" });
            await screen.findByRole("option", { name: "Corporate Laptop" });

            const editableLabels = [/category/i, /related system/i, /requested priority/i, /summary/i, /description/i];
            for (const pattern of editableLabels) {
                const field = screen.getByLabelText(pattern) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                expect(field).not.toHaveAttribute("readonly");
                expect(field.className).not.toContain("field-readonly");
            }
        });
    });

    describe("RequesterTicketDetail screen", () => {
        const sampleTicket = {
            id: 42,
            ticketNumber: "TK-20260824-0001",
            requester: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
            category: { id: 2, name: "Hardware" },
            relatedSystem: { id: 7, name: "Corporate Laptop" },
            summary: "Laptop battery drains quickly",
            description: "The battery drains fast even when idle.",
            requestedPriority: "MEDIUM" as const,
            currentStatus: "NEW",
            createdAt: "2026-08-24T07:00:00.000Z",
            updatedAt: "2026-08-24T07:00:00.000Z",
        };

        beforeEach(() => {
            vi.restoreAllMocks();
            vi.spyOn(ticketsApi, "fetchTicketAttachments").mockResolvedValue([]);
            vi.spyOn(ticketsApi, "fetchTicketDetail").mockResolvedValue(sampleTicket as any);
        });

        function renderScreen() {
            return render(
                <MemoryRouter initialEntries={["/tickets/42"]}>
                    <RequesterProvider>
                        <Seed>
                            <Routes>
                                <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
                            </Routes>
                        </Seed>
                    </RequesterProvider>
                </MemoryRouter>
            );
        }

        it("marks every displayed text field as read-only styled (entire screen is view-only)", async () => {
            renderScreen();

            const requesterEmailField = await screen.findByLabelText(/requester email/i);
            expect(requesterEmailField).toHaveAttribute("readonly");
            expect(requesterEmailField.className).toContain("ticket-readonly-input");

            const readonlyValueTestIds = [
                "ticket-requester-name",
                "ticket-category",
                "ticket-related-system",
                "ticket-date",
                "ticket-summary",
                "ticket-description",
            ];
            for (const testId of readonlyValueTestIds) {
                const el = await screen.findByTestId(testId);
                expect(el.className).toContain("ticket-field-value");
            }
        });
    });
});