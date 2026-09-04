import { Link } from "react-router-dom";
import { Badge } from "./Badge";
import type { TicketListItem } from "../api/tickets.api";
import "./TicketList.css";

// Ref: docs/lab-02/ui-spec.md section 13 (My Tickets — desktop table / mobile card layout)

interface TicketListProps {
    tickets: TicketListItem[];
    categoryNamesById?: Record<number, string>;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

export function TicketList({ tickets, categoryNamesById }: TicketListProps) {
    return (
        <table className="ticket-list" role="table">
            <thead>
                <tr>
                    <th>Ticket #</th>
                    <th>Summary</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                </tr>
            </thead>
            <tbody>
                {tickets.map((ticket) => (
                    <tr key={ticket.id} className="ticket-list-row" data-testid="ticket-row">
                        <td data-label="Ticket #">
                            <Link to={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link>
                        </td>
                        <td data-label="Summary">{ticket.summary}</td>
                        <td data-label="Category">{ticket.category?.name ?? categoryNamesById?.[(ticket as any).categoryId] ?? "—"}</td>
                        <td data-label="Status">
                            <Badge kind="status" value={ticket.currentStatus} />
                        </td>
                        <td data-label="Created">{formatDate(ticket.createdAt)}</td>
                        <td data-label="Updated">{formatDate(ticket.updatedAt)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}