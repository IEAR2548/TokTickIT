import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import { UserManagement } from "../../pages/UserManagement";
import * as authApi from "../../api/auth.api";
import * as adminUsersApi from "../../api/adminUsers.api";

// Ref: docs/lab-03/ui-spec.md section 7 (Administrator User Management)
// Ref: docs/lab-03/specification.md AC-18, AC-20, AC-21, BR-32, BR-33
// Ref: docs/lab-03/tests.md UI-10, UI-11
//
// UI-10: duplicate email on create -> field-level error below the email field.
// UI-11: "Deactivate User" is disabled + tooltip (not hidden) when the edited user
//        is the caller's own account (BR-32) or the last active Administrator (BR-33).

const ADMIN_USER = {
    id: 30,
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
};

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/admin/users"]}>
            <AuthProvider>
                <RequesterProvider>
                    <UserManagement />
                </RequesterProvider>
            </AuthProvider>
        </MemoryRouter>
    );
}

describe("Admin User Management (UI-10, UI-11)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(ADMIN_USER);
    });

    describe("UI-10: duplicate email in create form shows a field-level error (AC-18)", () => {
        it("shows the duplicate-email error below the email field after a 409 DUPLICATE_EMAIL response", async () => {
            const user = userEvent.setup();

            vi.spyOn(adminUsersApi, "fetchUsers").mockResolvedValue([
                {
                    id: 1,
                    name: "Alice Tanaka",
                    email: "alice.tanaka@example.com",
                    role: "REQUESTER",
                    isActive: true,
                },
                ADMIN_USER,
            ] as any);

            // API layer maps 409 responses to an error carrying the DUPLICATE_EMAIL code
            // (same pattern as updateStaffTicketStatus in staffTickets.api.ts).
            vi.spyOn(adminUsersApi, "createUser").mockRejectedValue(
                Object.assign(new Error("Email address is already in use"), {
                    code: "DUPLICATE_EMAIL",
                })
            );

            renderPage();

            // Wait for the user list to load
            expect(await screen.findByTestId("admin-user-row-1")).toBeInTheDocument();

            // Open the create-user slide-over
            await user.click(screen.getByTestId("admin-create-user-button"));
            const form = await screen.findByTestId("admin-user-form");

            // Fill the form with an email that already exists
            await user.type(within(form).getByTestId("admin-user-form-name"), "Dup Email Try");
            await user.type(
                within(form).getByTestId("admin-user-form-email"),
                "alice.tanaka@example.com"
            );
            await user.selectOptions(within(form).getByTestId("admin-user-form-role"), "REQUESTER");
            await user.type(
                within(form).getByTestId("admin-user-form-password"),
                "ValidPass@2026!"
            );

            await user.click(within(form).getByTestId("admin-user-form-save"));

            // Field-level error appears directly under the email field (Lab 2 convention),
            // not just a banner — and no user was added to the list.
            const emailError = await screen.findByTestId("admin-user-form-email-error");
            expect(emailError).toBeVisible();
            expect(emailError).toHaveTextContent(/already in use/i);

            // The role filter / list state was not disturbed by the failed submit
            expect(screen.getByTestId("admin-user-row-1")).toBeInTheDocument();
        });
    });

    describe("UI-11: Deactivate button disabled + tooltip for self or last active Administrator (AC-20, AC-21, BR-32, BR-33)", () => {
        it("disables Deactivate with a self-account tooltip when editing the caller's own account (BR-32)", async () => {
            const user = userEvent.setup();

            vi.spyOn(adminUsersApi, "fetchUsers").mockResolvedValue([
                {
                    id: 31,
                    name: "Second Admin",
                    email: "second.admin@example.com",
                    role: "ADMINISTRATOR",
                    isActive: true,
                },
                ADMIN_USER,
            ] as any);

            renderPage();

            // Open edit mode on the caller's own row (id 30)
            const ownRow = await screen.findByTestId("admin-user-row-30");
            await user.click(within(ownRow).getByRole("button", { name: /edit/i }));

            const form = await screen.findByTestId("admin-user-form");
            const deactivateBtn = within(form).getByTestId("admin-user-form-deactivate");

            // Disabled, NOT hidden
            expect(deactivateBtn).toBeVisible();
            expect(deactivateBtn).toBeDisabled();

            // Tooltip explains why (self-account rule)
            expect(deactivateBtn).toHaveAttribute("title");
            expect(deactivateBtn.getAttribute("title")).toMatch(/own account/i);
        });

        it("disables Deactivate with a last-active-Administrator tooltip when editing the only active Administrator who is not the caller (BR-33)", async () => {
            const user = userEvent.setup();

            // Caller is admin id 30; row 31 is a DIFFERENT user but the last active Administrator
            // (caller's active flag irrelevant to the rule — the system must always keep one).
            vi.spyOn(adminUsersApi, "fetchUsers").mockResolvedValue([
                {
                    id: 31,
                    name: "Last Admin Standing",
                    email: "last.admin@example.com",
                    role: "ADMINISTRATOR",
                    isActive: true,
                },
                { ...ADMIN_USER, isActive: false },
            ] as any);

            renderPage();

            const targetRow = await screen.findByTestId("admin-user-row-31");
            await user.click(within(targetRow).getByRole("button", { name: /edit/i }));

            const form = await screen.findByTestId("admin-user-form");
            const deactivateBtn = within(form).getByTestId("admin-user-form-deactivate");

            expect(deactivateBtn).toBeVisible();
            expect(deactivateBtn).toBeDisabled();
            expect(deactivateBtn.getAttribute("title")).toMatch(/last active administrator/i);
        });

        it("keeps Deactivate ENABLED for a regular user who is neither self nor the last active Administrator", async () => {
            const user = userEvent.setup();

            vi.spyOn(adminUsersApi, "fetchUsers").mockResolvedValue([
                {
                    id: 1,
                    name: "Alice Tanaka",
                    email: "alice.tanaka@example.com",
                    role: "REQUESTER",
                    isActive: true,
                },
                ADMIN_USER,
            ] as any);

            renderPage();

            const row = await screen.findByTestId("admin-user-row-1");
            await user.click(within(row).getByRole("button", { name: /edit/i }));

            const form = await screen.findByTestId("admin-user-form");
            const deactivateBtn = within(form).getByTestId("admin-user-form-deactivate");

            await waitFor(() => expect(deactivateBtn).toBeEnabled());
        });
    });
});
