import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    fetchStaffTicketDetail,
    StaffTicketDetail as TicketData,
    updateStaffTicketPriority,
    claimStaffTicket,
    assignStaffTicket,
} from "../api/staffTickets.api";
import {
    fetchPublicComments,
    postPublicComment,
    PublicComment,
    fetchInternalNotes,
    postInternalNote,
    InternalNote,
} from "../api/tickets.api";
import { useAuth } from "../context/AuthContext";
import { AttachmentSection } from "../components/AttachmentSection";
import { ActionsTaken, ActionsTakenRole } from "../components/ActionsTaken";
import { TicketWorkflow, TicketWorkflowRole } from "../components/TicketWorkflow";
import { Badge } from "../components/Badge";
import "./StaffTicketDetail.css";

type TabId = "public-comments" | "internal-notes" | "actions-taken" | "attachments";

function formatDateTime(iso: string): string {
    try {
        const d = new Date(iso);
        return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
    } catch {
        return iso;
    }
}

export function StaffTicketDetail() {
    const { id } = useParams<{ id: string }>();
    const ticketId = Number(id);
    const { user } = useAuth();

    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [screenState, setScreenState] = useState<"loading" | "ready" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    // Editable field states
    const [selectedItPriority, setSelectedItPriority] = useState<string>("");
    const [savingPriority, setSavingPriority] = useState(false);
    const [priorityError, setPriorityError] = useState<string>("");

    // Tabs
    const [activeTab, setActiveTab] = useState<TabId>("public-comments");

    // Public comments
    const [comments, setComments] = useState<PublicComment[]>([]);
    const [commentInput, setCommentInput] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [commentError, setCommentError] = useState("");

    // Internal notes (IT Staff/Admin only — api-spec endpoints 17-18)
    const [notes, setNotes] = useState<InternalNote[]>([]);
    const [noteInput, setNoteInput] = useState("");
    const [postingNote, setPostingNote] = useState(false);
    const [noteError, setNoteError] = useState("");

    // Ownership actions
    const [claimError, setClaimError] = useState("");
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setScreenState("loading");

        fetchStaffTicketDetail(ticketId)
            .then((data) => {
                if (cancelled) return;
                setTicket(data);
                setSelectedItPriority(data.itPriority ?? data.requestedPriority);
                setScreenState("ready");
            })
            .catch((err) => {
                if (cancelled) return;
                setErrorMsg(err.message ?? "Failed to load ticket");
                setScreenState("error");
            });

        return () => { cancelled = true; };
    }, [ticketId]);

    useEffect(() => {
        if (screenState !== "ready") return;
        fetchPublicComments(ticketId)
            .then(setComments)
            .catch(() => { /* non-fatal */ });

        fetchInternalNotes(ticketId)
            .then(setNotes)
            .catch(() => { /* non-fatal */ });
    }, [ticketId, screenState]);

    function handleStatusChange(result: { status: string; resolutionSummary: string | null; updatedAt: string; appearsResolved: boolean }) {
        setTicket((prev) =>
            prev
                ? {
                      ...prev,
                      currentStatus: result.status,
                      resolutionSummary: result.resolutionSummary,
                      updatedAt: result.updatedAt,
                      appearsResolved: result.appearsResolved,
                  }
                : prev
        );
    }

    async function handlePrioritySave() {
        if (!ticket) return;
        setSavingPriority(true);
        setPriorityError("");
        try {
            const updated = await updateStaffTicketPriority(ticketId, selectedItPriority);
            setTicket((prev) => prev ? { ...prev, itPriority: updated.itPriority as any } : prev);
        } catch (err: any) {
            // Safe-failure feedback (ui-spec §8.6) — surface the API error, revert selection
            setPriorityError(err.message ?? "Failed to update IT priority");
            setSelectedItPriority(ticket.itPriority ?? ticket.requestedPriority);
        } finally {
            setSavingPriority(false);
        }
    }

    async function handleClaim() {
        setClaiming(true);
        setClaimError("");
        try {
            const updated = await claimStaffTicket(ticketId);
            setTicket((prev) => prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner } : prev);
        } catch (err: any) {
            // api-spec endpoint 22: 409 CONFLICT if already claimed by someone else (BR-14)
            setClaimError(err.message ?? "Failed to claim ticket");
        } finally {
            setClaiming(false);
        }
    }

    async function handleAssignToMe() {
        if (!user) return;
        setClaiming(true);
        setClaimError("");
        try {
            // api-spec endpoint 23: reassign to an active IT Staff/Administrator (BR-15)
            const updated = await assignStaffTicket(ticketId, user.id);
            setTicket((prev) => prev ? { ...prev, ownerId: updated.ownerId, owner: updated.owner } : prev);
        } catch (err: any) {
            setClaimError(err.message ?? "Failed to assign ticket");
        } finally {
            setClaiming(false);
        }
    }

    async function handlePostComment(e: React.FormEvent) {
        e.preventDefault();
        if (!commentInput.trim()) return;
        setPostingComment(true);
        setCommentError("");
        try {
            const newComment = await postPublicComment(ticketId, commentInput.trim());
            setComments((prev) => [...prev, newComment]);
            setCommentInput("");
        } catch (err: any) {
            setCommentError(err.message ?? "Failed to post comment");
        } finally {
            setPostingComment(false);
        }
    }

    async function handlePostNote(e: React.FormEvent) {
        e.preventDefault();
        if (!noteInput.trim()) return;
        setPostingNote(true);
        setNoteError("");
        try {
            const newNote = await postInternalNote(ticketId, noteInput.trim());
            setNotes((prev) => [...prev, newNote]);
            setNoteInput("");
        } catch (err: any) {
            setNoteError(err.message ?? "Failed to add note");
        } finally {
            setPostingNote(false);
        }
    }

    if (screenState === "loading") {
        return (
            <div className="container mt-4 staff-ticket-detail-page" data-testid="staff-ticket-detail-loading">
                Loading ticket…
            </div>
        );
    }

    if (screenState === "error" || !ticket) {
        return (
            <div className="container mt-4 staff-ticket-detail-page" data-testid="staff-ticket-detail-error">
                <div className="alert alert-danger" role="alert">{errorMsg || "Ticket not found"}</div>
                <Link to="/staff/queue" className="btn btn-secondary">Back to Queue</Link>
            </div>
        );
    }

    return (
        <div className="container mt-4 staff-ticket-detail-page">
            <Link to="/staff/queue" className="staff-ticket-back-link">← Back to Queue</Link>

            <h1 className="fs-4 fw-bold mb-3 staff-ticket-title">
                Ticket <span data-testid="staff-ticket-number">{ticket.ticketNumber}</span>
            </h1>

            {/* Header grid */}
            <section className="staff-ticket-header mb-4">
                <dl className="staff-ticket-header-grid">
                    <div className="staff-ticket-header-field">
                        <dt>Ticket No.</dt>
                        <dd className="staff-ticket-field-value">{ticket.ticketNumber}</dd>
                    </div>
                    <div className="staff-ticket-header-field">
                        <dt>Category</dt>
                        <dd className="staff-ticket-field-value">{ticket.category?.name ?? "—"}</dd>
                    </div>
                    <div className="staff-ticket-header-field">
                        <dt>Related System</dt>
                        <dd className="staff-ticket-field-value">{ticket.relatedSystem?.name ?? "—"}</dd>
                    </div>
                    <div className="staff-ticket-header-field">
                        <dt>Requester</dt>
                        <dd className="staff-ticket-field-value">{ticket.requester?.name ?? "—"}</dd>
                    </div>
                    <div className="staff-ticket-header-field">
                        <dt>Requested Priority</dt>
                        <dd><Badge kind="priority" value={ticket.requestedPriority} /></dd>
                    </div>

                    {/* Current Status — the consolidated Lab 4 status control (§5.1 matrix, FR-07).
                        The select keeps its Lab 3 test id during migration so existing
                        screen-level tests and clients are not broken. */}
                    <div className="staff-ticket-header-field">
                        <dt>Current Status</dt>
                        <dd>
                            <div className="staff-ticket-status-row">
                                <TicketWorkflow
                                    ticketId={ticket.id}
                                    status={ticket.currentStatus}
                                    role={(user?.role ?? "IT_STAFF") as TicketWorkflowRole}
                                    updatedAt={ticket.updatedAt}
                                    selectTestId="staff-ticket-status-select"
                                    onStatusChange={handleStatusChange}
                                />
                            </div>
                            {ticket.appearsResolved && (
                                <span
                                    className="staff-ticket-appears-resolved-badge"
                                    data-testid="staff-ticket-appears-resolved-badge"
                                >
                                    Requester marked: Problem Appears Resolved
                                </span>
                            )}
                        </dd>
                    </div>

                    {/* IT Priority — editable */}
                    <div className="staff-ticket-header-field">
                        <dt>IT Priority</dt>
                        <dd>
                            <div className="staff-ticket-status-row">
                                <select
                                    data-testid="staff-ticket-priority-select"
                                    value={selectedItPriority}
                                    onChange={(e) => {
                                        setSelectedItPriority(e.target.value);
                                        setPriorityError("");
                                    }}
                                    className="staff-ticket-select"
                                    aria-label="Change IT priority"
                                >
                                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                                        <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                                {selectedItPriority !== (ticket.itPriority ?? ticket.requestedPriority) && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-primary ms-2"
                                        onClick={handlePrioritySave}
                                        disabled={savingPriority}
                                    >
                                        {savingPriority ? "Saving…" : "Save"}
                                    </button>
                                )}
                            </div>
                            {priorityError && <p className="staff-ticket-field-error">{priorityError}</p>}
                        </dd>
                    </div>

                    {/* Owner — claim when unassigned, reassign when owned (api-spec endpoints 22-23) */}
                    <div className="staff-ticket-header-field">
                        <dt>Owner</dt>
                        <dd>
                            <div className="staff-ticket-status-row">
                                <span
                                    className="staff-ticket-field-value staff-ticket-owner-value"
                                    data-testid="staff-ticket-owner-value"
                                >
                                    {ticket.owner ? ticket.owner.name : "Unassigned"}
                                </span>
                                {!ticket.ownerId && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary ms-2"
                                        onClick={handleClaim}
                                        disabled={claiming}
                                    >
                                        {claiming ? "Claiming…" : "Claim"}
                                    </button>
                                )}
                                {ticket.ownerId && user && ticket.ownerId !== user.id && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary ms-2"
                                        onClick={handleAssignToMe}
                                        disabled={claiming}
                                    >
                                        {claiming ? "Assigning…" : "Assign to Me"}
                                    </button>
                                )}
                            </div>
                            {claimError && <p className="staff-ticket-field-error">{claimError}</p>}
                        </dd>
                    </div>
                </dl>
            </section>

            {/* Summary & Description */}
            <section className="staff-ticket-body mb-4">
                <div className="staff-ticket-body-field">
                    <h2 className="staff-ticket-body-label">Summary</h2>
                    <p className="staff-ticket-field-value" data-testid="staff-ticket-summary">{ticket.summary}</p>
                </div>
                <div className="staff-ticket-body-field mt-2">
                    <h2 className="staff-ticket-body-label">Description</h2>
                    <p className="staff-ticket-field-value" data-testid="staff-ticket-description">{ticket.description}</p>
                </div>
            </section>

            {/* Resolution Summary — recorded through the status confirmation step (§5.2). */}
            {ticket.resolutionSummary && (
                <section className="mb-4">
                    <h2 className="staff-ticket-body-label">Resolution Summary</h2>
                    <p className="staff-ticket-field-value" data-testid="staff-ticket-resolution-summary">
                        {ticket.resolutionSummary}
                    </p>
                </section>
            )}

            {/* Tabs */}
            <section className="staff-ticket-tabs">
                <div className="staff-ticket-tab-bar" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "public-comments"}
                        data-testid="tab-public-comments"
                        className={`staff-ticket-tab-btn ${activeTab === "public-comments" ? "active" : ""}`}
                        onClick={() => setActiveTab("public-comments")}
                    >
                        Public Comments ({comments.length})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "internal-notes"}
                        data-testid="tab-internal-notes"
                        className={`staff-ticket-tab-btn ${activeTab === "internal-notes" ? "active" : ""}`}
                        onClick={() => setActiveTab("internal-notes")}
                    >
                        Internal Notes ({notes.length})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "actions-taken"}
                        data-testid="tab-actions-taken"
                        className={`staff-ticket-tab-btn ${activeTab === "actions-taken" ? "active" : ""}`}
                        onClick={() => setActiveTab("actions-taken")}
                    >
                        Actions Taken
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "attachments"}
                        data-testid="tab-attachments"
                        className={`staff-ticket-tab-btn ${activeTab === "attachments" ? "active" : ""}`}
                        onClick={() => setActiveTab("attachments")}
                    >
                        Attachments ({ticket.attachmentsCount ?? 0})
                    </button>
                </div>

                {/* Public Comments panel */}
                {activeTab === "public-comments" && (
                    <div className="staff-ticket-tab-panel" data-testid="public-comments-panel">
                        <form onSubmit={handlePostComment} className="staff-ticket-comment-form mb-3">
                            <textarea
                                data-testid="staff-ticket-comment-input"
                                className="staff-ticket-textarea"
                                placeholder="Write a public comment…"
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                rows={3}
                                maxLength={2000}
                            />
                            {commentError && <p className="staff-ticket-field-error" role="alert">{commentError}</p>}
                            <button
                                type="submit"
                                className="btn btn-sm btn-primary mt-2"
                                disabled={postingComment || !commentInput.trim()}
                                data-testid="staff-ticket-comment-submit"
                            >
                                {postingComment ? "Posting…" : "Post Comment"}
                            </button>
                        </form>
                        <ul className="staff-ticket-comment-list">
                            {comments.map((c) => (
                                <li key={c.id} className="staff-ticket-comment-item">
                                    <div className="staff-ticket-comment-meta">
                                        <strong>{c.authorName}</strong>
                                        {" "}<Badge kind="role" value={c.authorRole} />
                                        <span className="staff-ticket-comment-time"> · {formatDateTime(c.createdAt)}</span>
                                    </div>
                                    <p className="staff-ticket-comment-content">{c.content}</p>
                                </li>
                            ))}
                        </ul>
                        {comments.length === 0 && (
                            <p className="text-muted">No public comments yet.</p>
                        )}
                    </div>
                )}

                {/* Internal Notes panel — warning background keeps it visually distinct (FR-19, ui-spec §6) */}
                {activeTab === "internal-notes" && (
                    <div
                        className="staff-ticket-tab-panel internal-notes-warning"
                        data-testid="internal-notes-panel"
                    >
                        <p className="internal-notes-visibility-note" data-testid="internal-notes-visibility-note">
                            🔒 Internal — visible to IT Staff and Administrators only. The requester cannot see these notes.
                        </p>
                        <form onSubmit={handlePostNote} className="staff-ticket-comment-form mb-3">
                            <textarea
                                data-testid="staff-ticket-note-input"
                                className="staff-ticket-textarea"
                                placeholder="Write an internal note…"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                rows={3}
                                maxLength={2000}
                            />
                            {noteError && <p className="staff-ticket-field-error" role="alert">{noteError}</p>}
                            <button
                                type="submit"
                                className="btn btn-sm btn-warning mt-2"
                                disabled={postingNote || !noteInput.trim()}
                                data-testid="staff-ticket-note-submit"
                            >
                                {postingNote ? "Adding…" : "Add Internal Note"}
                            </button>
                        </form>
                        <ul className="staff-ticket-comment-list">
                            {notes.map((n) => (
                                <li key={n.id} className="staff-ticket-comment-item">
                                    <div className="staff-ticket-comment-meta">
                                        <strong>{n.authorName}</strong>
                                        {" "}<Badge kind="role" value={n.authorRole} />
                                        <span className="staff-ticket-comment-time"> · {formatDateTime(n.createdAt)}</span>
                                    </div>
                                    <p className="staff-ticket-comment-content">{n.content}</p>
                                </li>
                            ))}
                        </ul>
                        {notes.length === 0 && (
                            <p className="text-muted">No internal notes yet.</p>
                        )}
                    </div>
                )}

                {/* Actions Taken panel — IT Staff/Admin create + edit per the Lab 4
                    authorization matrix (specification.md §4, BR-10) */}
                {activeTab === "actions-taken" && (
                    <div className="staff-ticket-tab-panel" data-testid="actions-taken-tab-panel">
                        <ActionsTaken
                            ticketId={ticket.id}
                            ticketStatus={ticket.currentStatus}
                            role={(user?.role ?? "REQUESTER") as ActionsTakenRole}
                            currentUserId={user?.id ?? 0}
                        />
                    </div>
                )}

                {/* Attachments panel — staff view is read-only: upload/download/remove
                    are Requester-only per the Lab 3 authorization matrix */}
                {activeTab === "attachments" && (
                    <div className="staff-ticket-tab-panel" data-testid="attachments-panel">
                        <AttachmentSection ticketId={ticket.id} requesterId={ticket.requester?.id ?? 0} readOnly />
                    </div>
                )}
            </section>
        </div>
    );
}
