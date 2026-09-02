import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterBadge } from "../../components/RequesterBadge";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";
import { useEffect } from "react";

function Seed({ children }: { children: React.ReactNode }) {
    const { selectRequester } = useRequester();
    useEffect(() => {
        selectRequester({ id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" });
    }, []);
    return <>{children}</>;
}

describe("RequesterBadge", () => {
    it("shows the current requester name and navigates to selection on Change Requester", async () => {
        render(
            <MemoryRouter initialEntries={["/my-tickets"]}>
                <RequesterProvider>
                    <Seed>
                        <Routes>
                            <Route path="/select-requester" element={<div>Requester Selection Screen</div>} />
                            <Route path="/my-tickets" element={<RequesterBadge />} />
                        </Routes>
                    </Seed>
                </RequesterProvider>
            </MemoryRouter>
        );

        expect(await screen.findByText("Alice Tanaka")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /change requester/i }));

        expect(await screen.findByText(/Requester Selection Screen/i)).toBeInTheDocument();
    });
});