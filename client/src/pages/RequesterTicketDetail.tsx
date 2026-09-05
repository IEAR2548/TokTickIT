import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { fetchTicketDetail, TicketDetail } from "../api/tickets.api";
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

export function RequesterTicketDetail() {
    const { id } = useParams<{ id: string }>();
    const ticketId = Number(id);
    const { selectedRequester } = useRequester();
    const requesterId = selectedRequester?.id ?? 0;

    const [state, setState] = useState<ScreenState>("loading");
    const [ticket, setTicket] = useState<TicketDetail | null>(null);

    useEffect(() => {
        let cancelled = false;
        setState("loading");
        fetchTicketDetail(requesterId, ticketId)
            .then((data) => {
                if (cancelled) return;
                setTicket(data);
                setState("ready");
            })
            .catch(() => {
                if (cancelled) return;
                setState("error");
            });
        return () => {
            cancelled = true;
        };
    }, [requesterId, ticketId]);

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
                            <Badge kind="status" value={ticket.currentStatus} />
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

            <AttachmentSection ticketId={ticket.id} requesterId={requesterId} />
        </div>
    );
}