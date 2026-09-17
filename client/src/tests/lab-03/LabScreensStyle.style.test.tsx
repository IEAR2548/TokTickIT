import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import { Login } from "../../pages/Login";
import { ChangePassword } from "../../pages/ChangePassword";
import { StaffTicketDetail } from "../../pages/StaffTicketDetail";
import { RequesterTicketDetail } from "../../pages/RequesterTicketDetail";
import { UserManagement } from "../../pages/UserManagement";
import * as authApi from "../../api/auth.api";
import * as staffTicketsApi from "../../api/staffTickets.api";
import * as ticketsApi from "../../api/tickets.api";
import * as adminUsersApi from "../../api/adminUsers.api";

// Ref: docs/lab-03/ui-spec.md sections 2, 3, 4, 6, 7
// Ref: docs/lab-03/tests.md STYLE-02..06 (this file), STYLE-01 (Badges.style.test.tsx — untouched)
//
// Style-contract tests: jsdom cannot compute real CSS, so each test asserts the
// className contract that maps a component to its theme.css token class (verified
// by grep against the page CSS files). Real computed-style/token checks run in
// e2e/lab-03/visual-inspection.spec.ts (VISUAL-CHK-01..03).

function renderAt(route: string, element: React.ReactNode) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <AuthProvider>
                <RequesterProvider>
                    <Routes>
                        <Route path={route} element={element} />
                    </Routes>
                </RequesterProvider>
            </AuthProvider>
        </MemoryRouter>
    );
}

const TICKET_DETAIL = {
    id: 5,
    ticketNumber: "TKT-0005",
    summary: "Cannot access network drive",
    description: "Detailed description of the issue.",
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 2, name: "VPN" },
    requester: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "OPEN",
    resolutionSummary: null,
    appearsResolved: false,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    attachments: [],
} as any;

const STAFF_TICKET_DETAIL = {
    ...TICKET_DETAIL,
    requester: { id: 3, name: "Alice Tanaka", email: "alice@example.com" },
    owner: null,
    ownerId: null,
    commentsCount: 0,
    notesCount: 0,
    attachmentsCount: 0,
    appearsResolved: true,
} as any;

describe("Lab 3 screens style contract (STYLE-02..06)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    // ------------------------------------------------------------------
    // STYLE-02 — Login screen: --color-surface card + --color-primary submit
    // The card class (.requester-select-card) is the class whose CSS binds
    // background to var(--color-surface); .btn-primary binds to
    // var(--color-primary) (RequesterSelection.css).
    // ------------------------------------------------------------------
    it("STYLE-02: Login renders a surface-token card and a primary-token submit button", () => {
        renderAt("/login", <Login />);

        // Card wrapper carries the surface-background class (ui-spec §2 "centered Zen Green card")
        const card = screen.getByTestId("login-card");
        expect(card.className).toContain("requester-select-card");

        // Submit button uses the primary token class
        const submit = screen.getByTestId("login-submit");
        expect(submit.className).toMatch(/btn-primary/);
    });

    // ------------------------------------------------------------------
    // STYLE-03 — Change Password checklist: visible pass/fail indicator class
    // that flips between rule-unmet and rule-met as the rule is satisfied.
    // ------------------------------------------------------------------
    it("STYLE-03: rule checklist items toggle rule-unmet -> rule-met with a visible indicator", () => {
        renderAt("/change-password", <ChangePassword />);

        const ruleLength = screen.getByTestId("change-password-rule-length");
        const ruleCase = screen.getByTestId("change-password-rule-case");
        const ruleSpecial = screen.getByTestId("change-password-rule-number-special");

        // Unmet state: explicit rule-unmet class (not merely the absence of a met class)
        expect(ruleLength.className).toContain("rule-unmet");
        expect(ruleCase.className).toContain("rule-unmet");
        expect(ruleSpecial.className).toContain("rule-unmet");

        // Type a password satisfying all three rules
        fireEvent.change(screen.getByTestId("change-password-new"), {
            target: { value: "StrongPass@2026" },
        });

        expect(ruleLength.className).toContain("rule-met");
        expect(ruleCase.className).toContain("rule-met");
        expect(ruleSpecial.className).toContain("rule-met");
        expect(ruleLength.className).not.toContain("rule-unmet");
    });

    // ------------------------------------------------------------------
    // STYLE-04 — Staff Ticket Detail Internal Notes panel carries the
    // --color-warning-bg token class, distinct from the Public Comments panel.
    // (UI-08 already asserts existence; this asserts the token class itself.)
    // ------------------------------------------------------------------
    it("STYLE-04: Internal Notes panel carries the warning-bg token class, distinct from Public Comments", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 20,
            name: "Samira Chen",
            email: "samira.chen@example.com",
            role: "IT_STAFF",
            mustChangePassword: false,
        });
        vi.spyOn(staffTicketsApi, "fetchStaffTicketDetail").mockResolvedValue(STAFF_TICKET_DETAIL);
        vi.spyOn(ticketsApi, "fetchPublicComments").mockResolvedValue([]);
        vi.spyOn(ticketsApi, "fetchInternalNotes").mockResolvedValue([]);

        renderAt("/staff/tickets/5", <StaffTicketDetail />);

        fireEvent.click(await screen.findByTestId("tab-internal-notes"));
        const notesPanel = await screen.findByTestId("internal-notes-panel");

        // The warning-background token class (StaffTicketDetail.css binds it to
        // var(--color-warning-bg)) must be present on the notes panel…
        expect(notesPanel.className).toContain("internal-notes-warning");

        // …and the two tab panels must not share a class set.
        fireEvent.click(screen.getByTestId("tab-public-comments"));
        const publicPanel = await screen.findByTestId("public-comments-panel");
        expect(publicPanel.className).not.toContain("internal-notes-warning");
    });

    // ------------------------------------------------------------------
    // STYLE-05 — Requester Ticket Detail "appears resolved" indicator uses
    // the --color-pale-green token class.
    // ------------------------------------------------------------------
    it("STYLE-05: appears-resolved indicator carries the pale-green token class", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 1,
            name: "Alice Tanaka",
            email: "alice.tanaka@example.com",
            role: "REQUESTER",
            mustChangePassword: false,
        });
        vi.spyOn(ticketsApi, "fetchTicketDetail").mockResolvedValue(TICKET_DETAIL);
        vi.spyOn(ticketsApi, "fetchPublicComments").mockResolvedValue([]);

        renderAt("/tickets/5", <RequesterTicketDetail />);

        fireEvent.click(await screen.findByTestId("requester-ticket-appears-resolved-btn"));

        const indicator = await screen.findByTestId("requester-ticket-appears-resolved-indicator");
        // The pale-green token class (RequesterTicketDetail.css binds it to
        // var(--color-pale-green)) — currently missing -> Red.
        expect(indicator.className).toContain("appears-resolved-indicator");
    });

    // ------------------------------------------------------------------
    // STYLE-06 — Admin User Management: role filter and user-row role badge
    // render the full role label without truncating styles (375px contract;
    // real overflow proof is RESP-02/RESP-06 in Playwright).
    // ------------------------------------------------------------------
    it("STYLE-06: admin role filter and row badge render full role labels with no truncation styles", async () => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 30,
            name: "Alex Morgan",
            email: "alex.morgan@example.com",
            role: "ADMINISTRATOR",
            mustChangePassword: false,
        });
        vi.spyOn(adminUsersApi, "fetchUsers").mockResolvedValue([
            { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com", role: "REQUESTER", isActive: true },
            { id: 20, name: "Samira Chen", email: "samira.chen@example.com", role: "IT_STAFF", isActive: true },
            { id: 30, name: "Alex Morgan", email: "alex.morgan@example.com", role: "ADMINISTRATOR", isActive: true },
        ] as any);

        renderAt("/admin/users", <UserManagement />);

        // Role filter offers every role at full label
        const roleFilter = await screen.findByTestId("admin-user-role-filter") as HTMLSelectElement;
        const labels = Array.from(roleFilter.options).map((o) => o.textContent);
        expect(labels).toContain("Administrator");

        // The longest label must survive intact on a row badge — no ellipsis/truncation
        const adminRow = await screen.findByTestId("admin-user-row-30");
        const badge = adminRow.querySelector("[data-testid='badge-role']") as HTMLElement;
        expect(badge).not.toBeNull();
        expect(badge.textContent).toBe("Administrator");
        expect(badge.className).toContain("badge-role-administrator");
        expect(badge.style.textOverflow).not.toBe("ellipsis");
        expect(badge.className).not.toMatch(/text-truncate|ellipsis/);
    });
});
