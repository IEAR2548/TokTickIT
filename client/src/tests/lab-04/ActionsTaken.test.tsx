import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ActionsTaken } from "../../components/ActionsTaken";
import { RequesterTicketDetail } from "../../pages/RequesterTicketDetail";
import { AuthProvider } from "../../context/AuthContext";
import { RequesterProvider } from "../../context/RequesterContext";
import * as authApi from "../../api/auth.api";
import * as ticketsApi from "../../api/tickets.api";
import * as actionsApi from "../../api/actionsTaken.api";
import { ActionsTakenApiError, ActionTaken } from "../../api/actionsTaken.api";

// Ref: docs/lab-04/ui-spec.md Section 3 (Actions Taken Panel), Section 5, Section 7
// Ref: docs/lab-04/specification.md Section 4 (Roles & Authorization Matrix), FR-02, FR-03, FR-05, BR-10
// Ref: docs/lab-04/tests.md UI-04, UI-05, UI-06, UI-09, STYLE-02

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

function makeAction(overrides: Partial<ActionTaken> = {}): ActionTaken {
    return {
        id: 101,
        ticketId: 5,
        actionDateTime: "2026-09-27T09:30:00.000Z",
        description: "Replaced the failed drive in the NAS array",
        result: "Array rebuilt and healthy",
        performedBy: { id: 20, name: "Samira Chen" },
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        createdAt: minutesAgo(5),
        updatedAt: minutesAgo(5),
        ...overrides,
    };
}

function renderPanel(
    props: Partial<{ ticketId: number; ticketStatus: string; role: string; currentUserId: number }> = {}
) {
    return render(
        <ActionsTaken
            ticketId={props.ticketId ?? 5}
            ticketStatus={props.ticketStatus ?? "OPEN"}
            role={(props.role as any) ?? "IT_STAFF"}
            currentUserId={props.currentUserId ?? 20}
        />
    );
}

async function openCreateForm() {
    // Let the mount-time list request settle before interacting, so the render is
    // fully flushed and React does not warn about an un-acted update.
    await screen.findByTestId("actions-taken-table");
    fireEvent.click(screen.getByTestId("actions-taken-add-btn"));
    return screen.getByTestId("actions-taken-form");
}

describe("Actions Taken panel (UI-04, UI-05, UI-06, UI-09, STYLE-02)", () => {
    beforeEach(() => {
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([makeAction()]);
    });

    it("UI-04: Requester sees the panel read-only — no create or edit affordance anywhere (FR-03)", async () => {
        // The action belongs to the same user id as the viewer, so a role-based
        // mistake would surface an Edit button rather than one hidden by the window.
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ performedBy: { id: 20, name: "Samira Chen" }, createdAt: minutesAgo(1) }),
        ]);

        renderPanel({ role: "REQUESTER", currentUserId: 20 });

        const table = await screen.findByTestId("actions-taken-table");
        expect(table).toBeInTheDocument();

        expect(screen.queryByTestId("actions-taken-add-btn")).toBeNull();
        expect(screen.queryByTestId("actions-taken-form")).toBeNull();
        expect(document.querySelector("[data-testid^='actions-taken-edit-btn-']")).toBeNull();

        // The read-only row still expands to expose the full record.
        fireEvent.click(screen.getByTestId("actions-taken-row-101"));
        const details = await screen.findByTestId("actions-taken-details-101");
        expect(details).toHaveTextContent("Replaced the failed drive in the NAS array");
        expect(details).toHaveTextContent("Array rebuilt and healthy");
    });

    it("UI-05: Follow-Up Note is visible and required only while the toggle is on (FR-05)", async () => {
        renderPanel();
        await openCreateForm();

        const toggle = screen.getByTestId("actions-taken-follow-up-toggle") as HTMLInputElement;
        expect(toggle.checked).toBe(false);

        // Toggle OFF by default -> note field must not be rendered at all.
        expect(screen.queryByTestId("actions-taken-follow-up-note-input")).toBeNull();

        fireEvent.click(toggle);
        expect(toggle.checked).toBe(true);
        const note = screen.getByTestId("actions-taken-follow-up-note-input");
        expect(
            (note as HTMLTextAreaElement).required || note.getAttribute("aria-required") === "true"
        ).toBe(true);

        fireEvent.click(toggle);
        expect(toggle.checked).toBe(false);
        expect(screen.queryByTestId("actions-taken-follow-up-note-input")).toBeNull();
    });

    it("UI-06: a 400 validation error renders inline field errors, keeps entered values, and leaves the form open (§3.3)", async () => {
        vi.spyOn(actionsApi, "createActionTaken").mockRejectedValue(
            new ActionsTakenApiError(400, {
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Request failed validation.",
                    fields: {
                        description: "Description is required.",
                        followUpNote: "Required when Follow-Up Required is Yes.",
                    },
                },
            })
        );

        renderPanel();
        await openCreateForm();

        fireEvent.click(screen.getByTestId("actions-taken-follow-up-toggle"));
        fireEvent.change(screen.getByTestId("actions-taken-result-input"), {
            target: { value: "Disk replaced" },
        });
        fireEvent.change(screen.getByTestId("actions-taken-follow-up-note-input"), {
            target: { value: "Recheck next week" },
        });
        fireEvent.change(screen.getByTestId("actions-taken-attachment-notes-input"), {
            target: { value: "RMA slip attached" },
        });

        fireEvent.click(screen.getByTestId("actions-taken-submit-btn"));

        await waitFor(() => {
            expect(screen.getByText("Description is required.")).toBeInTheDocument();
        });
        expect(screen.getByText("Required when Follow-Up Required is Yes.")).toBeInTheDocument();

        // Form stays open with the user's values intact.
        expect(screen.getByTestId("actions-taken-form")).toBeInTheDocument();
        expect((screen.getByTestId("actions-taken-result-input") as HTMLTextAreaElement).value).toBe(
            "Disk replaced"
        );
        expect(
            (screen.getByTestId("actions-taken-follow-up-note-input") as HTMLTextAreaElement).value
        ).toBe("Recheck next week");
        expect(
            (screen.getByTestId("actions-taken-attachment-notes-input") as HTMLTextAreaElement).value
        ).toBe("RMA slip attached");
    });

    it("UI-09: submit button is disabled with a spinner while in flight and blocks a second submit (§3.3)", async () => {
        let resolveCreate: (value: ActionTaken) => void = () => {};
        const pending = new Promise<ActionTaken>((resolve) => {
            resolveCreate = resolve;
        });
        const createSpy = vi.spyOn(actionsApi, "createActionTaken").mockReturnValue(pending);

        renderPanel();
        await openCreateForm();

        fireEvent.change(screen.getByTestId("actions-taken-description-input"), {
            target: { value: "Replaced drive" },
        });
        fireEvent.change(screen.getByTestId("actions-taken-result-input"), {
            target: { value: "Rebuilt" },
        });

        const submit = screen.getByTestId("actions-taken-submit-btn") as HTMLButtonElement;
        fireEvent.click(submit);

        await waitFor(() => {
            expect(submit.disabled).toBe(true);
        });
        expect(submit.getAttribute("aria-busy")).toBe("true");
        expect(submit.querySelector(".actions-taken-spinner")).not.toBeNull();

        // A second click must not fire another request.
        fireEvent.click(submit);
        fireEvent.click(submit);
        expect(createSpy).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveCreate(makeAction({ id: 202, description: "Replaced drive" }));
        });
        await waitFor(() => {
            expect(screen.getByTestId("actions-taken-row-202")).toBeInTheDocument();
        });
    });

    it("STYLE-02: the follow-up badge carries an icon and text, never colour alone (§5 ui-spec)", async () => {
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ id: 303, followUpRequired: true, followUpNote: "Check the backup job" }),
        ]);

        const first = renderPanel();

        const badge = await screen.findByTestId("actions-taken-followup-badge-303");
        expect(badge).toHaveTextContent(/follow-up/i);

        // Non-colour indicators: an aria-hidden glyph plus readable text.
        expect(badge.querySelector("[aria-hidden='true']")).not.toBeNull();
        expect(badge).toMatchSnapshot();

        first.unmount();

        // No badge at all when follow-up is not required.
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([makeAction({ id: 304 })]);
        renderPanel();
        await screen.findByTestId("actions-taken-row-304");
        expect(screen.queryByTestId("actions-taken-followup-badge-304")).toBeNull();
    });

    it("BR-10 / FR-02: Edit is offered to a creator inside the 15-minute window, to an Admin at any time, and never as a disabled control once expired", async () => {
        // Creator, 5 minutes old -> Edit available.
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ id: 401, createdAt: minutesAgo(5) }),
        ]);
        const first = renderPanel({ role: "IT_STAFF", currentUserId: 20 });
        await screen.findByTestId("actions-taken-row-401");
        expect(screen.getByTestId("actions-taken-edit-btn-401")).toBeInTheDocument();
        first.unmount();

        // Creator, 16 minutes old -> no button, no disabled control, explanatory tooltip.
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ id: 402, createdAt: minutesAgo(16) }),
        ]);
        const second = renderPanel({ role: "IT_STAFF", currentUserId: 20 });
        const expiredRow = await screen.findByTestId("actions-taken-row-402");
        expect(screen.queryByTestId("actions-taken-edit-btn-402")).toBeNull();
        expect(expiredRow.getAttribute("title")).toMatch(/edit window has passed/i);
        second.unmount();

        // Administrator, 16 minutes old -> Edit still available.
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ id: 403, createdAt: minutesAgo(16) }),
        ]);
        renderPanel({ role: "ADMINISTRATOR", currentUserId: 21 });
        await screen.findByTestId("actions-taken-row-403");
        expect(screen.getByTestId("actions-taken-edit-btn-403")).toBeInTheDocument();
    });

    it("AC-12 / §3.2: a Cancelled Ticket replaces the add button with an inline notice", async () => {
        renderPanel({ ticketStatus: "CANCELLED" });

        await screen.findByTestId("actions-taken-table");
        expect(screen.queryByTestId("actions-taken-add-btn")).toBeNull();

        const notice = screen.getByTestId("actions-taken-cancelled-notice");
        expect(notice).toHaveTextContent(/cancelled/i);
    });

    it("§3.1: a row expands to the full Description, Result, Follow-up Note and Attachment Notes", async () => {
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({
                id: 601,
                description: "Flashed dock firmware to 3.4.1 and re-seated the ribbon cable",
                result: "Dock re-enumerated, charging at full rate",
                followUpRequired: true,
                followUpNote: "Ask the requester to confirm after one week",
                attachmentNotes: "Vendor RMA slip filed under ticket number",
            }),
            makeAction({ id: 602, followUpRequired: false, followUpNote: null, attachmentNotes: null }),
        ]);

        renderPanel();

        fireEvent.click(await screen.findByTestId("actions-taken-row-601"));
        const details = screen.getByTestId("actions-taken-details-601");
        expect(details).toHaveTextContent("Follow-up Note");
        expect(details).toHaveTextContent("Ask the requester to confirm after one week");
        expect(details).toHaveTextContent("Attachment Notes");
        expect(details).toHaveTextContent("Vendor RMA slip filed under ticket number");

        // Absent optional fields read as an explicit placeholder rather than blank space.
        fireEvent.click(screen.getByTestId("actions-taken-row-602"));
        const bare = screen.getByTestId("actions-taken-details-602");
        expect(within(bare).getAllByText("—")).toHaveLength(2);
    });

    it("§3.1: Action Date/Time and Performed By are never editable inputs", async () => {
        renderPanel();
        const form = await openCreateForm();

        expect(form.querySelectorAll("input[type='text'], input[type='date'], input[type='datetime-local']").length).toBe(0);
        expect(within(form).queryByLabelText(/action date/i)).toBeNull();
        expect(within(form).queryByLabelText(/performed by/i)).toBeNull();
        expect(form).toHaveTextContent(/recorded by the system/i);

        // Edit mode surfaces the server-set values as read-only labels — still no inputs.
        fireEvent.click(screen.getByTestId("actions-taken-cancel-btn"));
        fireEvent.click(screen.getByTestId("actions-taken-edit-btn-101"));
        const editForm = screen.getByTestId("actions-taken-form");
        expect(editForm).toHaveTextContent("2026-09-27 09:30");
        expect(editForm).toHaveTextContent("Samira Chen");
        expect(
            editForm.querySelectorAll("input[type='text'], input[type='date'], input[type='datetime-local']").length
        ).toBe(0);
    });

    it("§3.4: the table exposes exactly the five documented columns", async () => {
        renderPanel();
        await screen.findByTestId("actions-taken-table");

        const headers = Array.from(screen.getByTestId("actions-taken-thead").querySelectorAll("th")).map(
            (th) => th.textContent?.trim()
        );
        expect(headers).toEqual(["Date/Time", "Description", "Result", "Performed By", "Follow-up"]);
    });

    it("FR-05 / api-spec §1.2: a create with the toggle on and no note is caught inline with the API's wording, with no request sent", async () => {
        const createSpy = vi.spyOn(actionsApi, "createActionTaken").mockResolvedValue(makeAction());

        renderPanel();
        await openCreateForm();

        fireEvent.change(screen.getByTestId("actions-taken-description-input"), {
            target: { value: "Replaced drive" },
        });
        fireEvent.change(screen.getByTestId("actions-taken-result-input"), {
            target: { value: "Rebuilt" },
        });
        fireEvent.click(screen.getByTestId("actions-taken-follow-up-toggle"));
        fireEvent.click(screen.getByTestId("actions-taken-submit-btn"));

        expect(await screen.findByText("Required when Follow-Up Required is Yes.")).toBeInTheDocument();
        expect(createSpy).not.toHaveBeenCalled();
        // §3.3: the form stays open and the entered values survive the validation error.
        expect(screen.getByTestId("actions-taken-form")).toBeInTheDocument();
        expect((screen.getByTestId("actions-taken-description-input") as HTMLTextAreaElement).value).toBe(
            "Replaced drive"
        );
    });

    it("api-spec §1.2/§1.3: the payload sends strings only, with an empty note when the toggle is off, and always carries an Idempotency-Key (BR-17)", async () => {
        const createSpy = vi.spyOn(actionsApi, "createActionTaken").mockResolvedValue(makeAction({ id: 999 }));

        renderPanel();
        await openCreateForm();

        fireEvent.change(screen.getByTestId("actions-taken-description-input"), {
            target: { value: "Replaced drive" },
        });
        fireEvent.change(screen.getByTestId("actions-taken-result-input"), {
            target: { value: "Rebuilt" },
        });
        fireEvent.click(screen.getByTestId("actions-taken-submit-btn"));

        await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
        const [calledTicketId, payload, idempotencyKey] = createSpy.mock.calls[0];

        expect(calledTicketId).toBe(5);
        expect(payload).toEqual({
            description: "Replaced drive",
            result: "Rebuilt",
            followUpRequired: false,
            followUpNote: "",
            attachmentNotes: "",
        });
        expect(Object.values(payload)).not.toContain(null);
        expect(typeof idempotencyKey).toBe("string");
        expect(idempotencyKey.length).toBeGreaterThan(0);
    });
});

describe("Requester Ticket Detail integration (UI-04)", () => {
    beforeEach(() => {
        vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
            id: 1,
            name: "Alice Tanaka",
            email: "alice.tanaka@example.com",
            role: "REQUESTER",
            mustChangePassword: false,
        });
        vi.spyOn(ticketsApi, "fetchTicketDetail").mockResolvedValue({
            id: 5,
            ticketNumber: "TKT-0005",
            summary: "Cannot access network drive",
            description: "Detailed description of the issue.",
            category: { id: 1, name: "Network" },
            relatedSystem: { id: 2, name: "VPN" },
            requester: { id: 1, name: "Alice Tanaka", email: "alice.tanaka@example.com" },
            requestedPriority: "MEDIUM",
            currentStatus: "OPEN",
            appearsResolved: false,
            createdAt: "2026-09-01T10:00:00Z",
            updatedAt: "2026-09-01T10:00:00Z",
        } as any);
        vi.spyOn(ticketsApi, "fetchPublicComments").mockResolvedValue([]);
    });

    it("UI-04: the real Requester Ticket Detail screen mounts the panel with no write affordance", async () => {
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ performedBy: { id: 20, name: "Samira Chen" }, createdAt: minutesAgo(1) }),
        ]);

        render(
            <MemoryRouter initialEntries={["/tickets/5"]}>
                <AuthProvider>
                    <RequesterProvider>
                        <Routes>
                            <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
                        </Routes>
                    </RequesterProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // Wait for the ticket screen itself, then the panel it renders.
        await screen.findByTestId("ticket-number");
        expect(await screen.findByTestId("actions-taken-row-101")).toBeInTheDocument();

        expect(screen.queryByTestId("actions-taken-add-btn")).toBeNull();
        expect(document.querySelector("[data-testid^='actions-taken-edit-btn-']")).toBeNull();
    });
});

describe("Actions Taken panel feedback states (§3.3)", () => {
    beforeEach(() => {
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([]);
    });

    it("renders skeleton rows while loading and the empty state when no actions exist", async () => {
        let resolveList: (value: ActionTaken[]) => void = () => {};
        vi.spyOn(actionsApi, "listActionsTaken").mockReturnValue(
            new Promise<ActionTaken[]>((resolve) => {
                resolveList = resolve;
            })
        );

        renderPanel();
        expect(screen.getByTestId("actions-taken-loading")).toBeInTheDocument();

        await act(async () => {
            resolveList([]);
        });
        const empty = await screen.findByTestId("actions-taken-empty-state");
        expect(empty).toHaveTextContent(/no actions recorded yet/i);
    });

    it("keeps in-progress edits recoverable and shows a reload banner on 409 STALE_UPDATE", async () => {
        vi.spyOn(actionsApi, "listActionsTaken").mockResolvedValue([
            makeAction({ id: 501, createdAt: minutesAgo(1) }),
        ]);
        vi.spyOn(actionsApi, "updateActionTaken").mockRejectedValue(
            new ActionsTakenApiError(409, {
                error: {
                    code: "STALE_UPDATE",
                    message: "This action was changed by someone else.",
                    data: { current: makeAction({ id: 501, result: "Changed elsewhere" }) },
                },
            })
        );

        renderPanel();

        fireEvent.click(await screen.findByTestId("actions-taken-edit-btn-501"));

        const resultInput = await screen.findByTestId("actions-taken-result-input");
        fireEvent.change(resultInput, { target: { value: "My unsaved local edit" } });

        fireEvent.click(screen.getByTestId("actions-taken-submit-btn"));

        const banner = await screen.findByTestId("actions-taken-conflict-banner");
        expect(banner).toHaveTextContent(/updated elsewhere/i);
        expect(within(banner).getByTestId("actions-taken-reload-btn")).toBeInTheDocument();

        // The edit is not discarded.
        expect((screen.getByTestId("actions-taken-result-input") as HTMLTextAreaElement).value).toBe(
            "My unsaved local edit"
        );
    });
});
