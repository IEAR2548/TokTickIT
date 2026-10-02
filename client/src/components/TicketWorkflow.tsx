import { useEffect, useState } from "react";
import { Badge } from "./Badge";
import { STATUS_LABELS, permittedTransitionsFor, TicketStatus } from "../utils/statusTransitions";
import {
    changeTicketStatus,
    setAppearsResolved,
    TicketWorkflowApiError,
    StatusChangeResult,
} from "../api/ticketWorkflow.api";
import "./TicketWorkflow.css";

// Ref: docs/lab-04/ui-spec.md §4 (Ticket Status Control), §4.2 (advisory looks-resolved), §5, §7
// Ref: docs/lab-04/specification.md §5.1 (matrix), §5.2 (resolution gate), §10.1 (client branching),
//      FR-07, FR-08, FR-09, AC-06, AC-07, AC-16, BR-15

export type TicketWorkflowRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

interface TicketWorkflowProps {
    ticketId: number;
    /** Current server status (raw enum value). */
    status: string;
    role: TicketWorkflowRole;
    /** True when the current user owns this Ticket (only meaningful for a Requester). */
    isOwner?: boolean;
    /** Current server `appearsResolved` value. */
    appearsResolved?: boolean;
    /** Last-known `updatedAt`, echoed back as the BR-14 concurrency token. */
    updatedAt?: string;
    /** Test id for the status select — overridable for Lab 3 screen back-compatibility. */
    selectTestId?: string;
    /** Render the secondary appears-resolved toggle (Requester on their own Ticket). */
    showAppearsResolved?: boolean;
    onStatusChange?: (result: StatusChangeResult) => void;
    onAppearsResolvedChange?: (value: boolean) => void;
}

/** Transitions that get a confirmation step before they apply (§4.1). */
const CONFIRM_REQUIRED = new Set<TicketStatus>(["RESOLVED", "CLOSED", "CANCELLED"]);
const SUMMARY_REQUIRED = new Set<TicketStatus>(["RESOLVED", "CLOSED"]);

export function TicketWorkflow({
    ticketId,
    status,
    role,
    isOwner = false,
    appearsResolved = false,
    updatedAt,
    selectTestId = "ticket-status-select",
    showAppearsResolved = true,
    onStatusChange,
    onAppearsResolvedChange,
}: TicketWorkflowProps) {
    const [currentStatus, setCurrentStatus] = useState(status);
    // BR-14 token: every successful response (and every error that carries `current`)
    // refreshes this, so a second change from the same mounted control is not rejected as
    // a stale update. Props are re-synced below so a parent refresh still takes effect.
    const [currentUpdatedAt, setCurrentUpdatedAt] = useState(updatedAt);
    const [pending, setPending] = useState<TicketStatus | null>(null);
    const [resolutionSummary, setResolutionSummary] = useState("");
    const [fieldError, setFieldError] = useState("");
    const [conflict, setConflict] = useState(false);
    const [toast, setToast] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [flag, setFlag] = useState(appearsResolved);
    const [flagBusy, setFlagBusy] = useState(false);
    const [flagError, setFlagError] = useState("");

    // Keep the local view in step with the server-derived props on a parent refresh,
    // without clobbering a local resync that the parent has not picked up yet.
    useEffect(() => setCurrentStatus(status), [status]);
    useEffect(() => setCurrentUpdatedAt(updatedAt), [updatedAt]);
    useEffect(() => setFlag(appearsResolved), [appearsResolved]);

    const statusEnum = currentStatus as TicketStatus;
    const options = permittedTransitionsFor(statusEnum, role, isOwner);
    const confirmNeedsSummary = pending !== null && SUMMARY_REQUIRED.has(pending);
    const confirmBlocked = submitting || (confirmNeedsSummary && resolutionSummary.trim().length === 0);

    function resetFeedback() {
        setConflict(false);
        setToast("");
        setFieldError("");
    }

    function closePending() {
        setPending(null);
        setResolutionSummary("");
        setFieldError("");
    }

    function applySuccess(result: StatusChangeResult) {
        setCurrentStatus(result.status);
        if (result.updatedAt) setCurrentUpdatedAt(result.updatedAt);
        closePending();
        setConflict(false);
        setToast("");
        onStatusChange?.(result);
    }

    function handleApiError(err: unknown, requested: TicketStatus) {
        if (err instanceof TicketWorkflowApiError) {
            if (err.code === "RESOLUTION_SUMMARY_REQUIRED") {
                // A race with another client — surface it inline on the same field, not as a toast.
                setFieldError(err.message || "A resolution summary is required.");
                return;
            }
            if (err.code === "STALE_UPDATE") {
                // §10.1: branch on the resulting state, not on who caused it.
                const serverStatus = err.current?.status;
                if (serverStatus) setCurrentStatus(serverStatus);
                if (err.current?.updatedAt) setCurrentUpdatedAt(err.current.updatedAt);
                closePending();
                resetFeedback();
                // Already applied (own retry, or a coincidental identical target): resync
                // silently. Only a genuinely different current status is a real conflict.
                if (serverStatus !== requested) setConflict(true);
                return;
            }
            if (err.code === "INVALID_TRANSITION") {
                if (err.current?.status) setCurrentStatus(err.current.status);
                if (err.current?.updatedAt) setCurrentUpdatedAt(err.current.updatedAt);
                closePending();
                resetFeedback();
                setToast("That change isn't allowed.");
                return;
            }
            closePending();
            resetFeedback();
            setToast(err.message || "Something went wrong. Please try again.");
            return;
        }
        closePending();
        resetFeedback();
        setToast(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }

    function submitStatus(requested: TicketStatus, summary?: string) {
        setSubmitting(true);
        setFieldError("");
        setToast("");
        changeTicketStatus(ticketId, {
            status: requested,
            ...(summary !== undefined ? { resolutionSummary: summary } : {}),
            ...(currentUpdatedAt ? { expectedUpdatedAt: currentUpdatedAt } : {}),
        })
            .then(applySuccess)
            .catch((err) => handleApiError(err, requested))
            .finally(() => setSubmitting(false));
    }

    function handleSelectChange(next: string) {
        const target = next as TicketStatus;
        if (target === currentStatus) return;
        resetFeedback();
        if (CONFIRM_REQUIRED.has(target)) {
            setResolutionSummary("");
            setPending(target);
        } else {
            // In Progress / Waiting for Requester / Reopened apply immediately — make sure any
            // previously-open confirmation dialog is dismissed first.
            closePending();
            submitStatus(target);
        }
    }

    function confirmPending() {
        if (!pending) return;
        if (SUMMARY_REQUIRED.has(pending) && resolutionSummary.trim().length === 0) {
            setFieldError("A resolution summary is required.");
            return;
        }
        submitStatus(pending, resolutionSummary.trim());
    }

    function handleFlagToggle(e: React.ChangeEvent<HTMLInputElement>) {
        const next = e.target.checked;
        setFlagBusy(true);
        setFlagError("");
        setAppearsResolved(ticketId, {
            appearsResolved: next,
            ...(currentUpdatedAt ? { expectedUpdatedAt: currentUpdatedAt } : {}),
        })
            .then((res) => {
                const value = typeof res.appearsResolved === "boolean" ? res.appearsResolved : next;
                // Always reflect the server value — never assume client state persists (BR-16).
                setFlag(value);
                if (res.updatedAt) setCurrentUpdatedAt(res.updatedAt);
                onAppearsResolvedChange?.(value);
            })
            .catch((err) => setFlagError(err?.message ?? "Couldn't update. Try again."))
            .finally(() => setFlagBusy(false));
    }

    return (
        <div className="ticket-workflow">
            <div className="ticket-workflow-status">
                <span data-testid="ticket-status-badge">
                    <Badge kind="status" value={currentStatus} />
                </span>

                {options.length > 0 ? (
                    <select
                        data-testid={selectTestId}
                        className="ticket-workflow-select"
                        aria-label="Change ticket status"
                        value={currentStatus}
                        disabled={submitting}
                        onChange={(e) => handleSelectChange(e.target.value)}
                    >
                        <option value={currentStatus}>{STATUS_LABELS[statusEnum] ?? currentStatus}</option>
                        {options.map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABELS[s] ?? s}
                            </option>
                        ))}
                    </select>
                ) : (
                    // FR-07: no valid transitions for this role/status -> no control at all.
                    null
                )}
            </div>

            {conflict && (
                <div className="ticket-workflow-conflict" role="alert" data-testid="ticket-status-conflict-banner">
                    This ticket was changed elsewhere. Reload to see the latest version.
                </div>
            )}

            {toast && (
                <div className="ticket-workflow-toast" role="alert" data-testid="ticket-status-error-toast">
                    {toast}
                </div>
            )}

            {pending && (
                <div
                    className="ticket-workflow-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Confirm status change to ${STATUS_LABELS[pending] ?? pending}`}
                    data-testid="ticket-status-confirm-dialog"
                >
                    <p className="ticket-workflow-dialog-title">
                        Change status to {STATUS_LABELS[pending] ?? pending}?
                    </p>

                    {confirmNeedsSummary && (
                        <div className="ticket-workflow-field">
                            <label htmlFor="ticket-status-resolution-summary-input">Resolution Summary</label>
                            <textarea
                                id="ticket-status-resolution-summary-input"
                                data-testid="ticket-status-resolution-summary-input"
                                className="ticket-workflow-textarea"
                                rows={3}
                                required
                                aria-invalid={fieldError ? "true" : "false"}
                                aria-describedby={
                                    fieldError ? "ticket-status-resolution-summary-error" : undefined
                                }
                                value={resolutionSummary}
                                onChange={(e) => {
                                    setResolutionSummary(e.target.value);
                                    if (fieldError) setFieldError("");
                                }}
                            />
                            {fieldError && (
                                <p
                                    id="ticket-status-resolution-summary-error"
                                    data-testid="ticket-status-resolution-summary-error"
                                    className="ticket-workflow-field-error"
                                    role="alert"
                                >
                                    {fieldError}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="ticket-workflow-dialog-actions">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            data-testid="ticket-status-confirm-btn"
                            disabled={confirmBlocked}
                            onClick={confirmPending}
                        >
                            {submitting ? "Saving…" : "Confirm"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            data-testid="ticket-status-cancel-btn"
                            onClick={closePending}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {role === "REQUESTER" && isOwner && showAppearsResolved && (
                <div className="ticket-workflow-appears-resolved">
                    <label htmlFor="appears-resolved-toggle" className="ticket-workflow-toggle-label">
                        <input
                            id="appears-resolved-toggle"
                            data-testid="appears-resolved-toggle"
                            type="checkbox"
                            checked={flag}
                            disabled={flagBusy}
                            onChange={handleFlagToggle}
                        />{" "}
                        Mark as looks resolved
                    </label>
                    <p className="ticket-workflow-helper" data-testid="appears-resolved-helper-text">
                        This lets IT Staff know you think it's fixed — they'll still confirm and close it.
                    </p>
                    {flagError && (
                        <p className="ticket-workflow-field-error" role="alert">
                            {flagError}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
