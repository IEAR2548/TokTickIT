import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import {
    fetchTicketDetail,
    TicketDetail,
    fetchPublicComments,
    postPublicComment,
    patchAppearsResolved,
    PublicComment,
} from "../api/tickets.api";
import { Badge } from "../components/Badge";
import { AttachmentSection } from "../components/AttachmentSection";
import "./RequesterTicketDetail.css";

type ScreenState = "loading" | "ready" | "error";

function formatDate(iso: string): string {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toISOString().slice(0, 10);
    } catch {
        return iso;
    }
}

function formatDateTime(iso: string): string {
    try {
        const d = new Date(iso);
        return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
    } catch {
        return iso;
    }
}

export function RequesterTicketDetail() {
    const { id } = useParams<{ id: string }>();
    const ticketId = Number(id);
    const { selectedRequester } = useRequester();
    const requesterId = selectedRequester?.id ?? 0;

    const [state, setState] = useState<ScreenState>("loading");
    const [ticket, setTicket] = useState<TicketDetail | null>(null);

    // Appears-resolved state (persisted from ticket.appearsResolved)
    const [appearsResolved, setAppearsResolved] = useState(false);
    const [appearsResolvedError, setAppearsResolvedError] = useState<string | null>(null);

    // Public comments
    const [comments, setComments] = useState<PublicComment[]>([]);
    const [commentInput, setCommentInput] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setState("loading");
        fetchTicketDetail(requesterId, ticketId)
            .then((data) => {
                if (cancelled) return;
                setTicket(data);
                setAppearsResolved(data.appearsResolved ?? false);
                setState("ready");
            })
            .catch(() => {
                if (cancelled) return;
                setState("error");
            });
        return () => { cancelled = true; };
    }, [requesterId, ticketId]);

    useEffect(() => {
        if (state !== "ready" || !ticket) return;
        fetchPublicComments(ticketId)
            .then(setComments)
            .catch(() => { /* non-fatal */ });
    }, [ticketId, state, ticket]);

    async function handleAppearsResolved() {
        if (appearsResolved) return;
        setAppearsResolvedError(null);
        try {
            // ui-spec §8.6: the success indicator must reflect a real saved state —
            // show safe-failure feedback instead if the API call does not succeed.
            await patchAppearsResolved(ticketId);
            setAppearsResolved(true);
        } catch (err: any) {
            setAppearsResolvedError(err.message ?? "Failed to update. Please try again.");
        }
    }

    async function handlePostComment(e: React.FormEvent) {
        e.preventDefault();
        if (!commentInput.trim()) return;
        setPostingComment(true);
        setPostError(null);
        try {
            const newComment = await postPublicComment(ticketId, commentInput.trim());
            setComments((prev) => [...prev, newComment]);
            setCommentInput("");
        } catch (err: any) {
            setPostError(err.message ?? "Failed to post comment");
        } finally {
            setPostingComment(false);
        }
    }

    if (state === "loading") {
        return (
            <div className="container mt-4 ticket-detail-page" data-testid="ticket-detail-loading">
                Loading ticket…
            </div>
        );
    }

    if (state === "error" || !ticket) {
        // BR-06 / API-06,07: a nonexistent ticket and one owned by another
        // requester are both presented identically here — never disclose which.
        return (
            <div className="container mt-4 ticket-detail-page" data-testid="ticket-not-found">
                <div className="alert alert-danger" role="alert">
                    Ticket not found or access denied
                </div>
                <Link to="/my-tickets" className="btn btn-secondary">
                    Back to My Tickets
                </Link>
            </div>
        );
    }

    return (
        <div className="container mt-4 ticket-detail-page">
            <Link to="/my-tickets" className="ticket-back-link" data-testid="ticket-back-link">
                ← Back to My Tickets
            </Link>

            <h1 className="fs-4 fw-bold mb-3 ticket-title">
                Ticket <span data-testid="ticket-number">{ticket.ticketNumber}</span>
            </h1>

            <section data-testid="ticket-header" className="ticket-header mb-4">
                <dl className="ticket-header-grid">
                    <div className="ticket-header-field">
                        <dt>Requester</dt>
                        <dd data-testid="ticket-requester-name" className="ticket-field-value">
                            {ticket.requester.name}
                        </dd>
                    </div>
                    <div className="ticket-header-field">
                        <dt>Requester Email</dt>
                        <dd>
                            <input
                                readOnly
                                aria-label="Requester Email"
                                value={ticket.requester.email}
                                className="ticket-readonly-input"
                                onChange={() => { }}
                            />
                        </dd>
                    </div>
                    <div className="ticket-header-field">
                        <dt>Category</dt>
                        <dd data-testid="ticket-category" className="ticket-field-value">
                            {ticket.category.name}
                        </dd>
                    </div>
                    <div className="ticket-header-field">
                        <dt>Related System</dt>
                        <dd data-testid="ticket-related-system" className="ticket-field-value">
                            {ticket.relatedSystem.name}
                        </dd>
                    </div>
                    <div className="ticket-header-field">
                        <dt>Requested Priority</dt>
                        <dd>
                            <Badge kind="priority" value={ticket.requestedPriority} />
                        </dd>
                    </div>
                    <div className="ticket-header-field">
                        <dt>Status</dt>
                        <dd>
                            <span data-testid="ticket-status-badge">
                                <Badge kind="status" value={ticket.currentStatus} />
                            </span>
                        </dd>
                    </div>
                    <div className="ticket-header-field">
                        <dt>Ticket Date</dt>
                        <dd data-testid="ticket-date" className="ticket-field-value">
                            {formatDate(ticket.createdAt)}
                        </dd>
                    </div>
                    <div className="ticket-header-field ticket-header-summary">
                        <dt>Summary</dt>
                        <dd data-testid="ticket-summary" className="ticket-field-value">
                            {ticket.summary}
                        </dd>
                    </div>
                    <div className="ticket-header-field ticket-header-description">
                        <dt>Description</dt>
                        <dd data-testid="ticket-description" className="ticket-field-value">
                            {ticket.description}
                        </dd>
                    </div>
                </dl>
            </section>

            {/* Problem Appears Resolved — ui-spec §4, AC-16, BR-05, BR-20 */}
            <section className="ticket-appears-resolved-section mb-4">
                {!appearsResolved ? (
                    <>
                        <button
                            type="button"
                            className="ticket-appears-resolved-btn"
                            data-testid="requester-ticket-appears-resolved-btn"
                            onClick={handleAppearsResolved}
                        >
                            Problem Appears Resolved
                        </button>
                        {appearsResolvedError && (
                            <p role="alert" className="ticket-comment-error">{appearsResolvedError}</p>
                        )}
                    </>
                ) : (
                    <div
                        className="ticket-appears-resolved-indicator"
                        data-testid="requester-ticket-appears-resolved-indicator"
                    >
                        ✓ Problem Appears Resolved
                    </div>
                )}
            </section>

            {/* Public Comments — ui-spec §4 */}
            <section className="ticket-comments-section mb-4">
                <h2 className="ticket-section-title">Public Comments</h2>
                <form onSubmit={handlePostComment} className="ticket-comment-form mb-3">
                    <textarea
                        data-testid="requester-ticket-comment-input"
                        className="ticket-comment-textarea"
                        placeholder="Write a comment…"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        rows={3}
                        maxLength={2000}
                    />
                    {postError && <p className="ticket-comment-error">{postError}</p>}
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary mt-2"
                        disabled={postingComment || !commentInput.trim()}
                        data-testid="requester-ticket-comment-submit"
                    >
                        {postingComment ? "Posting…" : "Post Comment"}
                    </button>
                </form>
                <ul className="ticket-comment-list">
                    {comments.map((c) => (
                        <li key={c.id} className="ticket-comment-item">
                            <div className="ticket-comment-meta">
                                <strong>{c.authorName}</strong>
                                {" "}<Badge kind="role" value={c.authorRole} />
                                <span className="ticket-comment-time"> · {formatDateTime(c.createdAt)}</span>
                            </div>
                            <p className="ticket-comment-content">{c.content}</p>
                        </li>
                    ))}
                    {comments.length === 0 && (
                        <li className="ticket-comment-empty">No comments yet.</li>
                    )}
                </ul>
            </section>

            <AttachmentSection ticketId={ticket.id} requesterId={requesterId} />
        </div>
    );
}
