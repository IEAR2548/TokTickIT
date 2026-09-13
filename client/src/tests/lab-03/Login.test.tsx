import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../../pages/Login";
import * as authApi from "../../api/auth.api";

function renderLogin() {
    return render(
        <MemoryRouter>
            <Login />
        </MemoryRouter>
    );
}

describe("Login Screen (UI-01, UI-02)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("renders email, password inputs and submit button with required data-testids", () => {
        renderLogin();

        expect(screen.getByTestId("login-email")).toBeInTheDocument();
        expect(screen.getByTestId("login-password")).toBeInTheDocument();
        expect(screen.getByTestId("login-submit")).toBeInTheDocument();
    });

    it("UI-01: shows exact failure copy on invalid login submission (AC-05, AC-06, BR-06, BR-10)", async () => {
        vi.spyOn(authApi, "login").mockRejectedValue(new Error("Invalid email or password."));

        renderLogin();

        await userEvent.type(screen.getByTestId("login-email"), "wrong@example.com");
        await userEvent.type(screen.getByTestId("login-password"), "WrongPass123!");
        await userEvent.click(screen.getByTestId("login-submit"));

        const errorBanner = await screen.findByTestId("login-error");
        expect(errorBanner).toBeInTheDocument();
        expect(errorBanner).toHaveTextContent("Invalid email or password. Please try again.");
    });

    it("UI-02: disables submit button and shows spinner during authentication request", async () => {
        let resolveLogin: (value: any) => void;
        vi.spyOn(authApi, "login").mockImplementation(() => new Promise((resolve) => {
            resolveLogin = resolve;
        }));

        renderLogin();

        await userEvent.type(screen.getByTestId("login-email"), "user@example.com");
        await userEvent.type(screen.getByTestId("login-password"), "Password123!");

        const submitBtn = screen.getByTestId("login-submit");
        await userEvent.click(submitBtn);

        // While request is pending
        expect(submitBtn).toBeDisabled();
        expect(submitBtn.querySelector(".spinner-border, [role='status']")).toBeInTheDocument();

        // Resolve
        resolveLogin!({ data: { id: 1, name: "Test User", role: "REQUESTER" } });
        await waitFor(() => {
            expect(submitBtn).not.toBeDisabled();
        });
    });
});
