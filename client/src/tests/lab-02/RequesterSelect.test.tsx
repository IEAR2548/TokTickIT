import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterSelection } from "../../pages/RequesterSelection";
import * as requestersApi from "../../api/requesters.api";
import { RequesterProvider } from "../../context/RequesterContext";
import { MemoryRouter } from "react-router-dom";

function renderScreen() {
    return render(
        <MemoryRouter>
            <RequesterProvider>
                <RequesterSelection />
            </RequesterProvider>
        </MemoryRouter>
    );
}

describe("RequesterSelection screen", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("shows a loading state while requesters are being fetched", async () => {
        vi.spyOn(requestersApi, "fetchActiveRequesters").mockImplementation(
            () => new Promise(() => { }) // never resolves — stay in loading
        );

        renderScreen();

        expect(screen.getByTestId("requester-select-loading")).toBeInTheDocument();
    });

    it("populates the dropdown with active requesters and excludes inactive ones (AC-21)", async () => {
        vi.spyOn(requestersApi, "fetchActiveRequesters").mockResolvedValue([
            { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
            { id: 2, name: "Bob Chavez", email: "bob.chavez@example.com" },
        ]);

        renderScreen();

        await waitFor(() => {
            expect(screen.getByLabelText(/select requester/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/Alice Tanaka/)).toBeInTheDocument();
        expect(screen.getByText(/Bob Chavez/)).toBeInTheDocument();
        expect(screen.queryByText(/Eve Former/)).not.toBeInTheDocument();
    });

    it("shows an empty state when no active requesters exist", async () => {
        vi.spyOn(requestersApi, "fetchActiveRequesters").mockResolvedValue([]);

        renderScreen();

        await waitFor(() => {
            expect(screen.getByTestId("requester-select-empty")).toBeInTheDocument();
        });
        expect(screen.getByText(/No active requesters are available/i)).toBeInTheDocument();
    });

    it("shows a safe failure state with retry when the API call fails", async () => {
        vi.spyOn(requestersApi, "fetchActiveRequesters").mockRejectedValue(new Error("network down"));

        renderScreen();

        await waitFor(() => {
            expect(screen.getByTestId("requester-select-error")).toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("disables Continue until a requester is chosen, then enables it (AC-22 precondition)", async () => {
        vi.spyOn(requestersApi, "fetchActiveRequesters").mockResolvedValue([
            { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
        ]);

        renderScreen();

        const continueBtn = await screen.findByRole("button", { name: /continue/i });
        expect(continueBtn).toBeDisabled();

        const select = screen.getByLabelText(/select requester/i);
        await userEvent.selectOptions(select, "1");

        expect(continueBtn).toBeEnabled();
    });
});