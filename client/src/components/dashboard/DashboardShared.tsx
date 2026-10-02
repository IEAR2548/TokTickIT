import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../Badge";
import { DashboardRecentTicket } from "../../api/dashboard.api";
import "./DashboardShared.css";

// Ref: docs/lab-04/ui-spec.md §1.1/§2.1 (structure), §1.3/§2.3 (feedback states), §7 (data-testids)
// Ref: docs/lab-04/specification.md FR-12 (metric cards and rows are links)

interface MetricCardProps {
    testId: string;
    label: string;
    value: number;
    /** Ticket Queue / My Tickets destination pre-filtered to this card's status or ownership. */
    to: string;
}

/** A dashboard metric card. It is always a navigation link (FR-12) and always renders its value,
 * including a real `0` (ui-spec §1.3). */
export function MetricCard({ testId, label, value, to }: MetricCardProps) {
    return (
        <Link to={to} className="dashboard-card" data-testid={testId}>
            <span className="dashboard-card-label">{label}</span>
            <span className="dashboard-card-value">{value}</span>
        </Link>
    );
}

interface RecentTicketsPanelProps {
    testId: string;
    emptyTestId: string;
    tickets: DashboardRecentTicket[];
    /** Builds the detail-screen destination for a row. */
    detailPath: (ticketId: number) => string;
    viewAllTo: string;
    emptyCta: { to: string; label: string };
}

/** "My Recent Tickets" list (up to 5, already ordered by the server) with an empty-state block
 * that still offers a way forward. */
export function RecentTicketsPanel({
    testId,
    emptyTestId,
    tickets,
    detailPath,
    viewAllTo,
    emptyCta,
}: RecentTicketsPanelProps) {
    return (
        <section className="dashboard-panel" data-testid={testId}>
            <div className="dashboard-panel-header">
                <h2 className="dashboard-panel-title">My Recent Tickets</h2>
                <Link to={viewAllTo} className="dashboard-view-all">
                    View all
                </Link>
            </div>

            {tickets.length === 0 ? (
                <div className="dashboard-empty" data-testid={emptyTestId}>
                    <span className="dashboard-empty-icon" aria-hidden="true">
                        🗂️
                    </span>
                    <p className="dashboard-empty-title">No recent tickets</p>
                    <p className="dashboard-empty-hint">Tickets you update will show up here.</p>
                    <Link to={emptyCta.to} className="dashboard-empty-cta">
                        {emptyCta.label}
                    </Link>
                </div>
            ) : (
                <ul className="dashboard-recent-list">
                    {tickets.map((ticket) => (
                        <li key={ticket.id}>
                            <Link to={detailPath(ticket.id)} className="dashboard-recent-row">
                                <span className="dashboard-recent-number">{ticket.ticketNumber}</span>
                                <span className="dashboard-recent-summary">{ticket.summary}</span>
                                <Badge kind="status" value={ticket.status} />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** First-load skeleton cards, matching the Lab 2/3 skeleton convention. */
export function DashboardSkeleton({ cards, testId }: { cards: number; testId: string }) {
    return (
        <div className="dashboard-skeleton" data-testid={testId} aria-hidden="true">
            {Array.from({ length: cards }).map((_, index) => (
                <div key={index} className="dashboard-skeleton-card" />
            ))}
        </div>
    );
}

/** Standard safe-failure banner with a Retry action (ui-spec §1.3). */
export function DashboardError({ testId, onRetry }: { testId: string; onRetry: () => void }) {
    return (
        <div className="dashboard-error" role="alert" data-testid={testId}>
            <p className="dashboard-error-message">Couldn't load your dashboard. Try again.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
                Retry
            </button>
        </div>
    );
}

interface DashboardHeaderProps {
    title: string;
    subtitle: string;
    refreshTestId: string;
    refreshing: boolean;
    onRefresh: () => void;
}

/** Shared header: greeting/subtitle plus the Refresh control (re-fetches without a reload). */
export function DashboardHeader({
    title,
    subtitle,
    refreshTestId,
    refreshing,
    onRefresh,
}: DashboardHeaderProps) {
    return (
        <header className="dashboard-header">
            <div>
                <h1 className="dashboard-title">{title}</h1>
                <p className="dashboard-subtitle">{subtitle}</p>
            </div>
            <button
                type="button"
                className="dashboard-refresh btn btn-outline-primary"
                data-testid={refreshTestId}
                onClick={onRefresh}
                disabled={refreshing}
            >
                {refreshing ? "Refreshing…" : "Refresh"}
            </button>
        </header>
    );
}

/** Two-column content row wrapper (recent tickets + quick actions). */
export function DashboardContent({ children }: { children: ReactNode }) {
    return <div className="dashboard-content">{children}</div>;
}

interface QuickActionsProps {
    children: ReactNode;
}

export function QuickActions({ children }: QuickActionsProps) {
    return (
        <aside className="dashboard-panel dashboard-quick-actions">
            <div className="dashboard-panel-header">
                <h2 className="dashboard-panel-title">Quick Actions</h2>
            </div>
            <div className="dashboard-quick-actions-grid">{children}</div>
        </aside>
    );
}

interface QuickActionProps {
    testId: string;
    to: string;
    icon: string;
    label: string;
}

export function QuickAction({ testId, to, icon, label }: QuickActionProps) {
    return (
        <Link to={to} className="dashboard-quick-action" data-testid={testId}>
            <span className="dashboard-quick-action-icon" aria-hidden="true">
                {icon}
            </span>
            <span className="dashboard-quick-action-label">{label}</span>
        </Link>
    );
}
