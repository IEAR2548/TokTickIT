import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ChangePassword } from "../../pages/ChangePassword";

function renderChangePassword() {
    return render(
        <MemoryRouter>
            <ChangePassword />
        </MemoryRouter>
    );
}

describe("Change Password Screen (UI-03, UI-04)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("renders required fields, live checklist items, and submit button with proper testids", () => {
        renderChangePassword();

        expect(screen.getByTestId("change-password-current")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-new")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-confirm")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-rule-length")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-rule-case")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-rule-number-special")).toBeInTheDocument();
        expect(screen.getByTestId("change-password-submit")).toBeInTheDocument();
    });

    it("UI-03: live checklist updates dynamically as user types password meeting rules", async () => {
        renderChangePassword();

        const newPassInput = screen.getByTestId("change-password-new");
        const ruleLength = screen.getByTestId("change-password-rule-length");
        const ruleCase = screen.getByTestId("change-password-rule-case");
        const ruleNumSpecial = screen.getByTestId("change-password-rule-number-special");

        // Initially rules are not satisfied
        expect(ruleLength).not.toHaveClass("satisfied");
        expect(ruleCase).not.toHaveClass("satisfied");
        expect(ruleNumSpecial).not.toHaveClass("satisfied");

        // Type 8 chars lower case
        await userEvent.type(newPassInput, "abcdefgh");
        expect(ruleLength).toHaveClass("satisfied");
        expect(ruleCase).not.toHaveClass("satisfied");

        // Add uppercase
        await userEvent.type(newPassInput, "A");
        expect(ruleCase).toHaveClass("satisfied");
        expect(ruleNumSpecial).not.toHaveClass("satisfied");

        // Add number and special
        await userEvent.type(newPassInput, "1!");
        expect(ruleNumSpecial).toHaveClass("satisfied");
        expect(ruleLength).toHaveClass("satisfied");
        expect(ruleCase).toHaveClass("satisfied");
    });

    it("UI-04: shows field-level mismatch error and keeps Continue disabled until all rules match", async () => {
        renderChangePassword();

        const currentInput = screen.getByTestId("change-password-current");
        const newInput = screen.getByTestId("change-password-new");
        const confirmInput = screen.getByTestId("change-password-confirm");
        const submitBtn = screen.getByTestId("change-password-submit");

        // Initially disabled
        expect(submitBtn).toBeDisabled();

        // Fill current password and valid new password
        await userEvent.type(currentInput, "TempPassword1!");
        await userEvent.type(newInput, "NewValidPass123!");
        expect(submitBtn).toBeDisabled();

        // Fill non-matching confirm password
        await userEvent.type(confirmInput, "MismatchPass456!");
        expect(submitBtn).toBeDisabled();

        // Field-level error appears
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();

        // Clear and type matching confirm password
        await userEvent.clear(confirmInput);
        await userEvent.type(confirmInput, "NewValidPass123!");

        // Submit button should now be enabled
        expect(submitBtn).not.toBeDisabled();
        expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
});
