import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterGuard } from "../../components/RequesterGuard";
import { RequesterProvider } from "../../context/RequesterContext";

function renderWithRoute(initialPath: string) {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <RequesterProvider>
                <Routes>
                    <Route path="/select-requester" element={<div>Requester Selection Screen</div>} />
                    <Route
                        path="/my-tickets"
                        element={
                            <RequesterGuard>
                                <div>My Tickets Page</div>
                            </RequesterGuard>
                        }
                    />
                </Routes>
            </RequesterProvider>
        </MemoryRouter>
    );
}

describe("RequesterGuard", () => {
    it("redirects to the Requester Selection screen when no requester is selected (AC-02)", () => {
        renderWithRoute("/my-tickets");

        expect(screen.getByText(/Requester Selection Screen/i)).toBeInTheDocument();
        expect(screen.queryByText(/My Tickets Page/i)).not.toBeInTheDocument();
    });
});