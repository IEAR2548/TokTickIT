import { Fragment, useCallback, useEffect, useState } from "react";
import { FieldLabel } from "./form/FieldLabel";
import { FieldError } from "./form/FieldError";
import {
    listActionsTaken,
    createActionTaken,
    updateActionTaken,
    ActionsTakenApiError,
    ActionTaken,
    ActionTakenPayload,
} from "../api/actionsTaken.api";
import "./ActionsTaken.css";

// Ref: docs/lab-04/ui-spec.md §3 (Actions Taken Panel), §3.3 (feedback states), §3.4 (responsive), §7 (data-testids)
// Ref: docs/lab-04/specification.md §4 (authorization matrix), FR-01..FR-06, BR-10, BR-14, BR-17

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type ActionsTakenRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

interface ActionsTakenProps {
    ticketId: number;
    ticketStatus: string;
    role: ActionsTakenRole;
    currentUserId: number;
}

type ListState = "loading" | "ready" | "error";
type FormMode = "closed" | "create" | "edit";

interface FormFields {
    description: string;
    result: string;
    followUpRequired: boolean;
    followUpNote: string;
    attachmentNotes: string;
}

const EMPTY_FORM: FormFields = {
    description: "",
    result: "",
    followUpRequired: false,
    followUpNote: "",
    attachmentNotes: "",
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

function sortActions(items: ActionTaken[]): ActionTaken[] {
    return [...items].sort((a, b) => {
        const diff = new Date(b.actionDateTime).getTime() - new Date(a.actionDateTime).getTime();
        return diff !== 0 ? diff : b.id - a.id;
    });
}

function newIdempotencyKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID();
    return `actions-taken-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formFrom(action: ActionTaken): FormFields {
    return {
        description: action.description,
        result: action.result,
        followUpRequired: action.followUpRequired,
        followUpNote: action.followUpNote ?? "",
        attachmentNotes: action.attachmentNotes ?? "",
    };
}

export function ActionsTaken({ ticketId, ticketStatus, role, currentUserId }: ActionsTakenProps) {
    const isAdmin = role === "ADMINISTRATOR";
    const canWrite = role !== "REQUESTER";
    const isCancelled = ticketStatus.toUpperCase() === "CANCELLED";

    const [actions, setActions] = useState<ActionTaken[]>([]);
    const [listState, setListState] = useState<ListState>("loading");
    const [listError, setListError] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const [mode, setMode] = useState<FormMode>("closed");
    const [editing, setEditing] = useState<ActionTaken | null>(null);
    const [fields, setFields] = useState<FormFields>(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [conflictOpen, setConflictOpen] = useState(false);

    const load = useCallback(() => {
        let cancelled = false;
        setListState("loading");
        setListError("");
        listActionsTaken(ticketId)
            .then((data) => {
                if (cancelled) return;
                setActions(sortActions(data));
                setListState("ready");
            })
            .catch((err) => {
                if (cancelled) return;
                setListError(err?.message ?? "Couldn't load actions. Try again.");
                setListState("error");
            });
        return () => {
            cancelled = true;
        };
    }, [ticketId]);

    useEffect(() => load(), [load]);

    const canEditAction = useCallback(
        (action: ActionTaken) => {
            if (!canWrite) return false;
            if (isAdmin) return true;
            if (action.performedBy.id !== currentUserId) return false;
            const age = Date.now() - new Date(action.createdAt).getTime();
            return age <= EDIT_WINDOW_MS;
        },
        [canWrite, isAdmin, currentUserId]
    );

    const isExpiredForViewer = useCallback(
        (action: ActionTaken) => {
            if (!canWrite || isAdmin) return false;
            return action.performedBy.id === currentUserId && !canEditAction(action);
        },
        [canWrite, isAdmin, currentUserId, canEditAction]
    );

    function openCreate() {
        setMode("create");
        setEditing(null);
        setFields(EMPTY_FORM);
        setFieldErrors({});
        setSubmitError("");
        setConflictOpen(false);
    }

    function openEdit(action: ActionTaken) {
        setMode("edit");
        setEditing(action);
        setFields(formFrom(action));
        setFieldErrors({});
        setSubmitError("");
        setConflictOpen(false);
    }

    function closeForm() {
        setMode("closed");
        setEditing(null);
        setFields(EMPTY_FORM);
        setFieldErrors({});
        setSubmitError("");
        setConflictOpen(false);
    }

    function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
        setFields((prev) => ({ ...prev, [key]: value }));
        if (fieldErrors[key as string]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[key as string];
                return next;
            });
        }
    }

    function handleApiError(err: unknown) {
        if (err instanceof ActionsTakenApiError) {
            if (err.code === "VALIDATION_ERROR" && err.fields) {
                setFieldErrors(err.fields);
                return;
            }
            if (err.code === "STALE_UPDATE") {
                setConflictOpen(true);
                setSubmitError("");
                return;
            }
            if (err.code === "TICKET_CANCELLED") {
                setSubmitError("This Ticket is cancelled; no further actions can be recorded.");
                return;
            }
            if (err.code === "EDIT_WINDOW_EXPIRED") {
                setSubmitError("The 15-minute edit window for this action has passed.");
                return;
            }
            setSubmitError(err.message);
            return;
        }
        setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;

        // Follow-up Note is the one field the client may pre-empt: the ui-spec calls it
        // out as a required-when-visible field (§3.3). Everything else is server-authoritative.
        if (fields.followUpRequired && fields.followUpNote.trim().length === 0) {
            // Same wording the API returns for this field, so one error reads one way
            // whichever side catches it (api-spec.md §1.2).
            setFieldErrors({ followUpNote: "Required when Follow-Up Required is Yes." });
            return;
        }

        // api-spec.md §1.2: `followUpNote` is "required iff followUpRequired=true, else
        // must be omitted/empty", and `attachmentNotes` is a plain optional string — both
        // are sent as strings, never null, and every key is always present so an empty
        // value clears the field rather than being read as "leave unchanged" (§1.3).
        const payload: ActionTakenPayload = {
            description: fields.description,
            result: fields.result,
            followUpRequired: fields.followUpRequired,
            followUpNote: fields.followUpRequired ? fields.followUpNote : "",
            attachmentNotes: fields.attachmentNotes,
        };

        setSubmitting(true);
        setFieldErrors({});
        setSubmitError("");

        const request =
            mode === "edit" && editing
                ? updateActionTaken(ticketId, editing.id, {
                      ...payload,
                      expectedUpdatedAt: editing.updatedAt,
                  })
                : createActionTaken(ticketId, payload, newIdempotencyKey());

        request
            .then((saved) => {
                setActions((prev) => {
                    const without = prev.filter((a) => a.id !== saved.id);
                    return sortActions([saved, ...without]);
                });
                setExpandedId(saved.id);
                closeForm();
            })
            .catch(handleApiError)
            .finally(() => setSubmitting(false));
    }

    function handleReloadAfterConflict() {
        // Keep the draft: refetch the list, re-point the edit at the fresh server record
        // (so a resubmit can succeed) without touching the user's entered values.
        listActionsTaken(ticketId)
            .then((data) => {
                const fresh = sortActions(data);
                setActions(fresh);
                setListState("ready");
                if (editing) {
                    const updated = fresh.find((a) => a.id === editing.id);
                    if (updated) setEditing(updated);
                }
                setConflictOpen(false);
            })
            .catch(() => {
                setSubmitError("Couldn't reload. Check your connection and try again.");
            });
    }

    return (
        <section className="actions-taken" data-testid="actions-taken-panel" aria-labelledby="actions-taken-heading">
            <div className="actions-taken-header">
                <h2 className="actions-taken-title" id="actions-taken-heading">
                    Actions Taken
                </h2>

                {canWrite && !isCancelled && mode === "closed" && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        data-testid="actions-taken-add-btn"
                        onClick={openCreate}
                    >
                        Add Action Taken
                    </button>
                )}
            </div>

            {isCancelled && (
                <p className="actions-taken-cancelled-notice" data-testid="actions-taken-cancelled-notice">
                    This Ticket is cancelled; no further actions can be recorded.
                </p>
            )}

            {conflictOpen && (
                <div className="actions-taken-conflict" role="alert" data-testid="actions-taken-conflict-banner">
                    <span>This action was updated elsewhere. Reload to see the latest version.</span>
                    <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        data-testid="actions-taken-reload-btn"
                        onClick={handleReloadAfterConflict}
                    >
                        Reload
                    </button>
                </div>
            )}

            {listState === "loading" && (
                <div className="actions-taken-skeletons" data-testid="actions-taken-loading">
                    <div className="actions-taken-skeleton-row" />
                    <div className="actions-taken-skeleton-row" />
                    <div className="actions-taken-skeleton-row" />
                </div>
            )}

            {listState === "error" && (
                <div className="actions-taken-error" data-testid="actions-taken-error" role="alert">
                    <p>{listError}</p>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => load()}>
                        Retry
                    </button>
                </div>
            )}

            {listState === "ready" && actions.length === 0 && (
                <p className="actions-taken-empty" data-testid="actions-taken-empty-state">
                    No actions recorded yet.
                </p>
            )}

            {listState === "ready" && actions.length > 0 && (
                <div className="actions-taken-table-wrapper">
                    <table className="actions-taken-table" data-testid="actions-taken-table">
                        <thead data-testid="actions-taken-thead">
                            <tr>
                                <th scope="col">Date/Time</th>
                                <th scope="col">Description</th>
                                <th scope="col">Result</th>
                                <th scope="col">Performed By</th>
                                <th scope="col">Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            {actions.map((action) => {
                                const expanded = expandedId === action.id;
                                const canEdit = canEditAction(action);
                                const expired = isExpiredForViewer(action);

                                return (
                                    <Fragment key={action.id}>
                                        <tr
                                            className="actions-taken-row"
                                            data-testid={`actions-taken-row-${action.id}`}
                                            title={expired ? "Edit window has passed." : undefined}
                                            onClick={() => setExpandedId(expanded ? null : action.id)}
                                        >
                                            <td data-label="Date/Time">{formatDateTime(action.actionDateTime)}</td>
                                            <td data-label="Description" className="actions-taken-truncate" title={action.description}>
                                                {action.description}
                                            </td>
                                            <td data-label="Result" className="actions-taken-truncate" title={action.result}>
                                                {action.result}
                                            </td>
                                            <td data-label="Performed By">{action.performedBy.name}</td>
                                            {/* Expand + Edit live in the last documented column; ui-spec
                                                §3.4 lists exactly five columns for this table. */}
                                            <td data-label="Follow-up" className="actions-taken-followup-cell">
                                                {action.followUpRequired && (
                                                    <span
                                                        className="actions-taken-followup-badge"
                                                        data-testid={`actions-taken-followup-badge-${action.id}`}
                                                    >
                                                        <span aria-hidden="true">⚑</span> Follow-up needed
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="actions-taken-details-btn"
                                                    data-testid={`actions-taken-expand-btn-${action.id}`}
                                                    aria-expanded={expanded}
                                                    aria-controls={`actions-taken-details-${action.id}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedId(expanded ? null : action.id);
                                                    }}
                                                >
                                                    {expanded ? "Hide details" : "Show details"}
                                                    <span className="visually-hidden">
                                                        {" "}
                                                        for action recorded {formatDateTime(action.actionDateTime)}
                                                    </span>
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary actions-taken-edit-btn"
                                                        data-testid={`actions-taken-edit-btn-${action.id}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEdit(action);
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expanded && (
                                            <tr
                                                className="actions-taken-details-row"
                                                data-testid={`actions-taken-details-${action.id}`}
                                                id={`actions-taken-details-${action.id}`}
                                            >
                                                <td colSpan={5}>
                                                    <dl className="actions-taken-details-grid">
                                                        <div>
                                                            <dt>Description</dt>
                                                            <dd>{action.description}</dd>
                                                        </div>
                                                        <div>
                                                            <dt>Result</dt>
                                                            <dd>{action.result}</dd>
                                                        </div>
                                                        <div>
                                                            <dt>Follow-up Note</dt>
                                                            <dd>{action.followUpNote ?? "—"}</dd>
                                                        </div>
                                                        <div>
                                                            <dt>Attachment Notes</dt>
                                                            <dd>{action.attachmentNotes ?? "—"}</dd>
                                                        </div>
                                                    </dl>
                                                    {expired && (
                                                        <p className="actions-taken-expired-note">Edit window has passed.</p>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {canWrite && mode !== "closed" && (
                <form
                    className="actions-taken-form"
                    data-testid="actions-taken-form"
                    noValidate
                    onSubmit={handleSubmit}
                >
                    <h3 className="actions-taken-form-title">
                        {mode === "edit" ? "Edit Action Taken" : "Add Action Taken"}
                    </h3>

                    {submitError && (
                        <p className="actions-taken-form-error" role="alert">
                            {submitError}
                        </p>
                    )}

                    {/* Server-set fields on an existing record are surfaced read-only, never as
                        editable inputs (ui-spec §3.1, BR-03). */}
                    {mode === "edit" && editing && (
                        <dl className="actions-taken-readonly-fields">
                            <div>
                                <dt>Action Date/Time</dt>
                                <dd>{formatDateTime(editing.actionDateTime)}</dd>
                            </div>
                            <div>
                                <dt>Performed By</dt>
                                <dd>{editing.performedBy.name}</dd>
                            </div>
                        </dl>
                    )}

                    <div className="actions-taken-field">
                        <FieldLabel htmlFor="actions-taken-description-input" required>
                            Description
                        </FieldLabel>
                        <textarea
                            id="actions-taken-description-input"
                            data-testid="actions-taken-description-input"
                            className="actions-taken-textarea"
                            rows={3}
                            required
                            aria-invalid={!!fieldErrors.description}
                            aria-describedby="actions-taken-description-error"
                            value={fields.description}
                            onChange={(e) => updateField("description", e.target.value)}
                        />
                        <FieldError id="actions-taken-description-error" message={fieldErrors.description} />
                    </div>

                    <div className="actions-taken-field">
                        <FieldLabel htmlFor="actions-taken-result-input" required>
                            Result
                        </FieldLabel>
                        <textarea
                            id="actions-taken-result-input"
                            data-testid="actions-taken-result-input"
                            className="actions-taken-textarea"
                            rows={3}
                            required
                            aria-invalid={!!fieldErrors.result}
                            aria-describedby="actions-taken-result-error"
                            value={fields.result}
                            onChange={(e) => updateField("result", e.target.value)}
                        />
                        <FieldError id="actions-taken-result-error" message={fieldErrors.result} />
                    </div>

                    <div className="actions-taken-field actions-taken-toggle-field">
                        <label htmlFor="actions-taken-follow-up-toggle">
                            <input
                                id="actions-taken-follow-up-toggle"
                                data-testid="actions-taken-follow-up-toggle"
                                type="checkbox"
                                checked={fields.followUpRequired}
                                onChange={(e) => updateField("followUpRequired", e.target.checked)}
                            />{" "}
                            Follow-Up Required?
                        </label>
                    </div>

                    {fields.followUpRequired && (
                        <div className="actions-taken-field">
                            <FieldLabel htmlFor="actions-taken-follow-up-note-input" required>
                                Follow-up Note
                            </FieldLabel>
                            <textarea
                                id="actions-taken-follow-up-note-input"
                                data-testid="actions-taken-follow-up-note-input"
                                className="actions-taken-textarea"
                                rows={3}
                                required
                                aria-invalid={!!fieldErrors.followUpNote}
                                aria-describedby="actions-taken-follow-up-note-error"
                                value={fields.followUpNote}
                                onChange={(e) => updateField("followUpNote", e.target.value)}
                            />
                            <FieldError id="actions-taken-follow-up-note-error" message={fieldErrors.followUpNote} />
                        </div>
                    )}

                    <div className="actions-taken-field">
                        <FieldLabel htmlFor="actions-taken-attachment-notes-input">
                            Attachment Notes (optional)
                        </FieldLabel>
                        <textarea
                            id="actions-taken-attachment-notes-input"
                            data-testid="actions-taken-attachment-notes-input"
                            className="actions-taken-textarea"
                            rows={2}
                            aria-invalid={!!fieldErrors.attachmentNotes}
                            aria-describedby="actions-taken-attachment-notes-error"
                            value={fields.attachmentNotes}
                            onChange={(e) => updateField("attachmentNotes", e.target.value)}
                        />
                        <FieldError id="actions-taken-attachment-notes-error" message={fieldErrors.attachmentNotes} />
                    </div>

                    <p className="actions-taken-readonly-note">
                        Action Date/Time and Performed By are recorded by the system.
                    </p>

                    <div className="actions-taken-form-actions">
                        <button
                            type="submit"
                            className="btn btn-sm btn-primary"
                            data-testid="actions-taken-submit-btn"
                            disabled={submitting}
                            aria-busy={submitting ? "true" : undefined}
                        >
                            {submitting && <span className="actions-taken-spinner" aria-hidden="true" />}
                            {submitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Record Action"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            data-testid="actions-taken-cancel-btn"
                            onClick={closeForm}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}
