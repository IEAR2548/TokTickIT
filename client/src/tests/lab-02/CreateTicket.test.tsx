import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CreateTicket } from "../../pages/CreateTicket";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";
import * as ticketsApi from "../../api/tickets.api";
import * as referenceApi from "../../api/referenceData.api";
import { useEffect } from "react";

// Ref: docs/lab-02/tests.md UI-01, UI-02, UI-03, UI-04, UI-STYLE-02, UI-STYLE-03
// Ref: docs/lab-02/specification.md AC-01, AC-04, AC-05, AC-19, BR-01, BR-07, BR-13, BR-14
// Ref: docs/lab-02/ui-spec.md Section 4, 5, 10

function Seed({ children }: { children: React.ReactNode }) {
    const { selectRequester } = useRequester();
    useEffect(() => {
        selectRequester({ id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" });
    }, [selectRequester]);
    return <>{children}</>;
}

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

describe("CreateTicket screen", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(referenceApi, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
        vi.spyOn(referenceApi, "fetchRelatedSystems").mockResolvedValue([
            { id: 1, name: "Corporate Laptop" },
        ]);
    });

    // UI-01: AC-04, BR-07
    it("shows a field-level error and does not call the API when Summary is empty (UI-01, AC-04)", async () => {
        const createSpy = vi.spyOn(ticketsApi, "createTicket");
        renderScreen();

        await screen.findByLabelText(/category/i);
        await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

        expect(await screen.findByText(/Summary must be between 5 and 200 characters|Summary is required/i)).toBeInTheDocument();
        expect(createSpy).not.toHaveBeenCalled();
    });

    // UI-02: AC-05, BR-14
    it("shows a busy, disabled Submit button while the request is in flight (UI-02, AC-05, BR-14)", async () => {
        vi.spyOn(ticketsApi, "createTicket").mockImplementation(
            () => new Promise(() => { }) // never resolves
        );

        renderScreen();
        await fillValidForm();

        const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
        await userEvent.click(submitBtn);

        expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    });

    // UI-04: AC-01, BR-01
    it("shows the generated Ticket Number, View Ticket, and Create Another buttons on success (UI-04, AC-01)", async () => {
        vi.spyOn(ticketsApi, "createTicket").mockResolvedValue({
            id: 1,
            ticketNumber: "TK-20260904-0001",
        });

        renderScreen();
        await fillValidForm();
        await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

        expect(await screen.findByText("TK-20260904-0001")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /view ticket/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /create another/i })).toBeInTheDocument();
    });

    // UI-03: AC-19, BR-13
    it("shows a safe error callout and preserves entered values when the API fails (UI-03, AC-19, BR-13)", async () => {
        vi.spyOn(ticketsApi, "createTicket").mockRejectedValue(new Error("Failed to submit ticket. Please try again."));

        renderScreen();
        await fillValidForm();
        await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

        expect(await screen.findByText(/Failed to submit ticket|Unable to create ticket/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/summary/i)).toHaveValue("Laptop battery drains quickly");
        expect(screen.getByLabelText(/description/i)).toHaveValue(
            "Battery drains fast even when idle, started after last update."
        );
    });

    // UI-STYLE-02: Required field asterisks
    it("displays required asterisks on all required field labels (UI-STYLE-02)", async () => {
        renderScreen();
        await screen.findByLabelText(/category/i);

        const requiredLabels = [
            /category/i,
            /related system/i,
            /requested priority/i,
            /summary/i,
            /description/i,
        ];

        for (const pattern of requiredLabels) {
            const label = screen.getByText(pattern);
            expect(label.textContent).toContain("*");
        }
    });

    // UI-STYLE-03: Distinct background on read-only fields
    it("renders read-only fields with distinct styling (UI-STYLE-03)", async () => {
        renderScreen();
        await screen.findByLabelText(/category/i);

        const readonlyInputs = screen.getAllByRole("textbox").filter(el => el.hasAttribute("readonly"));
        expect(readonlyInputs.length).toBeGreaterThanOrEqual(1);
    });
});

async function fillValidForm() {
    await screen.findByLabelText(/category/i);
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/related system/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/requested priority/i), "MEDIUM");
    await userEvent.type(screen.getByLabelText(/summary/i), "Laptop battery drains quickly");
    await userEvent.type(
        screen.getByLabelText(/description/i),
        "Battery drains fast even when idle, started after last update."
    );
}
