import { useAuth } from "../context/AuthContext";
import { fetchRequesterDashboard } from "../api/dashboard.api";
import {
    DashboardContent,
    DashboardError,
    DashboardHeader,
    DashboardSkeleton,
    MetricCard,
    QuickAction,
    QuickActions,
    RecentTicketsPanel,
} from "../components/dashboard/DashboardShared";
import { useDashboardResource } from "../components/dashboard/useDashboardResource";
import "./Dashboard.css";

// Ref: docs/lab-04/ui-spec.md §2 (Requester Dashboard), §2.1 structure, §2.2 ownership,
//      §2.3 feedback states, §2.4 responsive, §7 data-testids
// Ref: docs/lab-04/specification.md FR-11, BR-11, FR-12, AC-15
//
// Ownership guarantee (ui-spec §2.2): `fetchRequesterDashboard()` takes no arguments — the
// backend derives the Requester from the session, so the client never sends a Requester id.

export function RequesterDashboard() {
    const { user } = useAuth();
    const { state, data, refreshing, load } = useDashboardResource(fetchRequesterDashboard);

    const firstName = user?.name?.split(" ")[0] ?? "";

    return (
        <div className="dashboard-page" data-testid="requester-dashboard">
            <DashboardHeader
                title={`Welcome${firstName ? `, ${firstName}` : ""}!`}
                subtitle="Track the support requests you have raised."
                refreshTestId="requester-dashboard-refresh-btn"
                refreshing={refreshing}
                onRefresh={() => load(true)}
            />

            {state === "loading" && <DashboardSkeleton cards={4} testId="requester-dashboard-loading" />}

            {state === "error" && (
                <DashboardError testId="requester-dashboard-error" onRetry={() => load()} />
            )}

            {state === "ready" && data && (
                <>
                    <div
                        className="dashboard-cards dashboard-cards--requester"
                        data-testid="requester-dashboard-cards"
                    >
                        <MetricCard
                            testId="requester-dashboard-card-open"
                            label="My Open Tickets"
                            value={data.counts.open}
                            to="/my-tickets"
                        />
                        <MetricCard
                            testId="requester-dashboard-card-in-progress"
                            label="In Progress"
                            value={data.counts.inProgress}
                            to="/my-tickets?status=IN_PROGRESS"
                        />
                        <MetricCard
                            testId="requester-dashboard-card-resolved"
                            label="Resolved"
                            value={data.counts.resolved}
                            to="/my-tickets?status=RESOLVED"
                        />
                        <MetricCard
                            testId="requester-dashboard-card-closed"
                            label="Closed"
                            value={data.counts.closed}
                            to="/my-tickets?status=CLOSED"
                        />
                    </div>

                    <DashboardContent>
                        <RecentTicketsPanel
                            testId="requester-dashboard-recent-tickets"
                            emptyTestId="requester-dashboard-recent-tickets-empty"
                            tickets={data.recentTickets}
                            detailPath={(id) => `/tickets/${id}`}
                            viewAllTo="/my-tickets"
                            emptyCta={{ to: "/create-ticket", label: "Create Ticket" }}
                        />

                        <QuickActions>
                            <QuickAction
                                testId="requester-dashboard-quick-action-create"
                                to="/create-ticket"
                                icon="➕"
                                label="Create Ticket"
                            />
                            <QuickAction
                                testId="requester-dashboard-quick-action-my-tickets"
                                to="/my-tickets"
                                icon="🎫"
                                label="View My Tickets"
                            />
                        </QuickActions>
                    </DashboardContent>
                </>
            )}
        </div>
    );
}
