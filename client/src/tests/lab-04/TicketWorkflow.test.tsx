import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TicketWorkflow } from "../../components/TicketWorkflow";
import * as workflowApi from "../../api/ticketWorkflow.api";
import { TicketWorkflowApiError } from "../../api/ticketWorkflow.api";

// Ref: docs/lab-04/ui-spec.md §4 (Ticket Status Control), §7 (data-testids), §5
// Ref: docs/lab-04/specification.md §5.1 (matrix), §10.1 (STALE_UPDATE client branching), FR-07, AC-07, AC-16
// Ref: docs/lab-04/tests.md UI-07, UI-08, UI-10, UI-11

const TICKET_ID = 5;
const UPDATED_AT = "2026-09-27T09:30:00.000Z";

type WorkflowProps = {
    ticketId?: number;
    status?: string;
    role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    isOwner?: boolean;
    appearsResolved?: boolean;
    updatedAt?: string;
};

function renderWorkflow(props: WorkflowProps = {}) {
    return render(
        <TicketWorkflow
            ticketId={props.ticketId ?? TICKET_ID}
            status={props.status ?? "IN_PROGRESS"}
            role={props.role ?? "IT_STAFF"}
            isOwner={props.isOwner ?? false}
            appearsResolved={props.appearsResolved ?? false}
            updatedAt={props.updatedAt ?? UPDATED_AT}
        />
    );
}

async function submitResolved() {
    fireEvent.change(screen.getByTestId("ticket-status-select"), { target: { value: "RESOLVED" } });
    const dialog = await screen.findByTestId("ticket-status-confirm-dialog");
    fireEvent.change(within(dialog).getByTestId("ticket-status-resolution-summary-input"), {
        target: { value: "Replaced the cable and verified stability." },
    });
    fireEvent.click(within(dialog).getByTestId("ticket-status-confirm-btn"));
}

describe("TicketWorkflow status control (UI-07, UI-08, UI-10, UI-11)", () => {
    it("UI-07: only role/status-valid options render — never disabled; no control at all when none are valid (FR-07)", () => {
        // IT Staff on a New Ticket: Open and Cancelled are valid; Resolved/Closed are not.
        const staff = renderWorkflow({ status: "NEW", role: "IT_STAFF" });
        const select = screen.getByTestId("ticket-status-select") as HTMLSelectElement;
        const staffOptions = Array.from(select.options);
        const staffValues = staffOptions.map((o) => o.value);
        expect(staffValues).toContain("OPEN");
        expect(staffValues).toContain("CANCELLED");
        expect(staffValues).not.toContain("RESOLVED");
        expect(staffValues).not.toContain("CLOSED");
        // Invalid transitions are omitted entirely — never rendered disabled.
        staffOptions.forEach((o) => expect(o.disabled).toBe(false));
        expect(screen.getByTestId("ticket-status-badge")).toBeInTheDocument();
        staff.unmount();

        // Requester on their own New Ticket: only Cancelled is offered.
        const requester = renderWorkflow({ status: "NEW", role: "REQUESTER", isOwner: true });
        const reqSelect = screen.getByTestId("ticket-status-select") as HTMLSelectElement;
        const reqValues = Array.from(reqSelect.options).map((o) => o.value);
        expect(reqValues).toContain("CANCELLED");
        expect(reqValues).not.toContain("OPEN");
        expect(reqValues).not.toContain("IN_PROGRESS");
        requester.unmount();

        // Requester on an In Progress Ticket they can no longer cancel: no control at all.
        renderWorkflow({ status: "IN_PROGRESS", role: "REQUESTER", isOwner: true });
        expect(screen.queryByTestId("ticket-status-select")).toBeNull();
        expect(screen.getByTestId("ticket-status-badge")).toBeInTheDocument();
    });

    it("UI-08: a successful change refreshes the badge from the response, with no reload (§4.1)", async () => {
        const change = vi.spyOn(workflowApi, "changeTicketStatus").mockResolvedValue({
            id: TICKET_ID,
            status: "IN_PROGRESS",
            updatedAt: "2026-09-27T10:00:00.000Z",
            resolutionSummary: null,
            appearsResolved: false,
        });

        renderWorkflow({ status: "OPEN", role: "IT_STAFF" });

        fireEvent.change(screen.getByTestId("ticket-status-select"), { target: { value: "IN_PROGRESS" } });

        await waitFor(() =>
            expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("In Progress")
        );
        expect(change).toHaveBeenCalledTimes(1);
        // In Progress applies immediately — no confirmation step.
        expect(screen.queryByTestId("ticket-status-confirm-dialog")).toBeNull();
    });

    it("UI-10: STALE_UPDATE with a DIFFERENT current status shows the conflict banner and refreshes the badge (AC-07)", async () => {
        vi.spyOn(workflowApi, "changeTicketStatus").mockRejectedValue(
            new TicketWorkflowApiError(409, {
                error: {
                    code: "STALE_UPDATE",
                    message: "This ticket was changed by someone else.",
                    data: {
                        current: { status: "WAITING_FOR_REQUESTER", updatedAt: "2026-09-27T10:05:00.000Z" },
                    },
                },
            })
        );

        renderWorkflow({ status: "IN_PROGRESS", role: "IT_STAFF" });
        await submitResolved();

        const banner = await screen.findByTestId("ticket-status-conflict-banner");
        expect(banner).toHaveTextContent(/changed elsewhere/i);
        expect(banner).toHaveTextContent(/reload/i);

        await waitFor(() =>
            expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Waiting for Requester")
        );
    });

    it("UI-11: STALE_UPDATE whose current status EQUALS the requested status resyncs silently — no banner, no toast (AC-16)", async () => {
        vi.spyOn(workflowApi, "changeTicketStatus").mockRejectedValue(
            new TicketWorkflowApiError(409, {
                error: {
                    code: "STALE_UPDATE",
                    message: "This ticket was changed by someone else.",
                    data: {
                        // Equal to the status just requested: the server already holds it.
                        current: { status: "RESOLVED", updatedAt: "2026-09-27T10:05:00.000Z" },
                    },
                },
            })
        );

        renderWorkflow({ status: "IN_PROGRESS", role: "IT_STAFF" });
        await submitResolved();

        await waitFor(() =>
            expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Resolved")
        );
        expect(screen.queryByTestId("ticket-status-conflict-banner")).toBeNull();
        expect(screen.queryByTestId("ticket-status-error-toast")).toBeNull();
    });

    it("§4.1: INVALID_TRANSITION gets its own distinct toast and refreshes the status", async () => {
        vi.spyOn(workflowApi, "changeTicketStatus").mockRejectedValue(
            new TicketWorkflowApiError(400, {
                error: {
                    code: "INVALID_TRANSITION",
                    message: "Cannot move from New directly to Resolved.",
                    data: { current: { status: "NEW", updatedAt: UPDATED_AT } },
                },
            })
        );

        renderWorkflow({ status: "IN_PROGRESS", role: "IT_STAFF" });
        await submitResolved();

        const toast = await screen.findByTestId("ticket-status-error-toast");
        expect(toast).toHaveTextContent(/isn't allowed|not allowed/i);
    });

    it("§4.1/§5.2: Resolved/Closed require a non-empty resolutionSummary, and a server RESOLUTION_SUMMARY_REQUIRED renders inline on that field", async () => {
        // Client-side guard: confirm is blocked until the summary is non-empty.
        renderWorkflow({ status: "IN_PROGRESS", role: "IT_STAFF" });
        fireEvent.change(screen.getByTestId("ticket-status-select"), { target: { value: "RESOLVED" } });

        const dialog = await screen.findByTestId("ticket-status-confirm-dialog");
        const confirm = within(dialog).getByTestId("ticket-status-confirm-btn") as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);
        expect(within(dialog).getByTestId("ticket-status-resolution-summary-input")).toBeInTheDocument();

        // A race server response still surfaces as an inline field error, not a generic toast.
        const change = vi.spyOn(workflowApi, "changeTicketStatus").mockRejectedValue(
            new TicketWorkflowApiError(400, {
                error: {
                    code: "RESOLUTION_SUMMARY_REQUIRED",
                    message: "A resolution summary is required.",
                },
            })
        );
        fireEvent.change(within(dialog).getByTestId("ticket-status-resolution-summary-input"), {
            target: { value: "Racing the other client." },
        });
        fireEvent.click(confirm);

        await waitFor(() => expect(change).toHaveBeenCalledTimes(1));
        expect(await within(dialog).findByTestId("ticket-status-resolution-summary-error")).toHaveTextContent(
            /resolution summary is required/i
        );
    });

    it("BR-14: a successful change refreshes the concurrency token so a second change is not rejected as stale", async () => {
        const change = vi
            .spyOn(workflowApi, "changeTicketStatus")
            .mockResolvedValueOnce({
                id: TICKET_ID,
                status: "IN_PROGRESS",
                updatedAt: "2026-09-27T10:00:00.000Z",
                resolutionSummary: null,
                appearsResolved: false,
            })
            .mockResolvedValueOnce({
                id: TICKET_ID,
                status: "WAITING_FOR_REQUESTER",
                updatedAt: "2026-09-27T10:05:00.000Z",
                resolutionSummary: null,
                appearsResolved: false,
            });

        renderWorkflow({ status: "OPEN", role: "IT_STAFF" });

        fireEvent.change(screen.getByTestId("ticket-status-select"), { target: { value: "IN_PROGRESS" } });
        await waitFor(() => expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("In Progress"));

        fireEvent.change(screen.getByTestId("ticket-status-select"), {
            target: { value: "WAITING_FOR_REQUESTER" },
        });
        await waitFor(() =>
            expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Waiting for Requester")
        );

        expect(change).toHaveBeenCalledTimes(2);
        // The second request must echo the refreshed updatedAt, not the mount-time token.
        expect(change.mock.calls[1][1]).toMatchObject({
            status: "WAITING_FOR_REQUESTER",
            expectedUpdatedAt: "2026-09-27T10:00:00.000Z",
        });
    });

    it("§10.1: a same-status STALE_UPDATE also refreshes the token from data.current", async () => {
        const change = vi
            .spyOn(workflowApi, "changeTicketStatus")
            .mockRejectedValueOnce(
                new TicketWorkflowApiError(409, {
                    error: {
                        code: "STALE_UPDATE",
                        message: "This ticket was changed by someone else.",
                        data: {
                            current: { status: "RESOLVED", updatedAt: "2026-09-27T10:09:00.000Z" },
                        },
                    },
                })
            )
            .mockResolvedValueOnce({
                id: TICKET_ID,
                status: "CLOSED",
                updatedAt: "2026-09-27T10:10:00.000Z",
                resolutionSummary: "Closing.",
                appearsResolved: false,
            });

        renderWorkflow({ status: "IN_PROGRESS", role: "IT_STAFF" });
        await submitResolved();
        await waitFor(() => expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Resolved"));

        fireEvent.change(screen.getByTestId("ticket-status-select"), { target: { value: "CLOSED" } });
        const dialog = await screen.findByTestId("ticket-status-confirm-dialog");
        fireEvent.change(within(dialog).getByTestId("ticket-status-resolution-summary-input"), {
            target: { value: "Closing." },
        });
        fireEvent.click(within(dialog).getByTestId("ticket-status-confirm-btn"));

        await waitFor(() => expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Closed"));
        expect(change.mock.calls[1][1]).toMatchObject({
            status: "CLOSED",
            expectedUpdatedAt: "2026-09-27T10:09:00.000Z",
        });
    });

    it("§4.2: a Requester on their own Ticket gets the secondary appears-resolved toggle reflecting the server value", async () => {
        const setFlag = vi.spyOn(workflowApi, "setAppearsResolved").mockResolvedValue({
            id: TICKET_ID,
            status: "IN_PROGRESS",
            appearsResolved: true,
            updatedAt: "2026-09-27T10:06:00.000Z",
        });

        renderWorkflow({ status: "IN_PROGRESS", role: "REQUESTER", isOwner: true, appearsResolved: false });

        const toggle = screen.getByTestId("appears-resolved-toggle") as HTMLInputElement;
        expect(toggle.checked).toBe(false);
        expect(screen.getByTestId("appears-resolved-helper-text")).toHaveTextContent(/IT Staff/i);

        fireEvent.click(toggle);
        await waitFor(() => expect(setFlag).toHaveBeenCalledTimes(1));
        await waitFor(() => expect((screen.getByTestId("appears-resolved-toggle") as HTMLInputElement).checked).toBe(true));
    });
});
