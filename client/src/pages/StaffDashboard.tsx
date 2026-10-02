import { useAuth } from "../context/AuthContext";
import { fetchStaffDashboard } from "../api/dashboard.api";
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

// Ref: docs/lab-04/ui-spec.md §1 (IT Staff Dashboard), §1.1 structure, §1.2 interaction,
//      §1.3 feedback states, §1.4 responsive, §7 data-testids
// Ref: docs/lab-04/specification.md FR-10, FR-12, AC-09, BR-12; Lab 3 Decision D-5/SEC-09
//      (only Requesters create Tickets — no "Create Ticket" quick action here)

export function StaffDashboard() {
    const { user } = useAuth();
    const { state, data, refreshing, load } = useDashboardResource(fetchStaffDashboard);

    const firstName = user?.name?.split(" ")[0] ?? "";

    return (
        <div className="dashboard-page" data-testid="staff-dashboard">
            <DashboardHeader
                title={`Welcome back${firstName ? `, ${firstName}` : ""}!`}
                subtitle="Here is what needs your attention across the service desk."
                refreshTestId="staff-dashboard-refresh-btn"
                refreshing={refreshing}
                onRefresh={() => load(true)}
            />

            {state === "loading" && <DashboardSkeleton cards={5} testId="staff-dashboard-loading" />}

            {state === "error" && (
                <DashboardError testId="staff-dashboard-error" onRetry={() => load()} />
            )}

            {state === "ready" && data && (
                <>
                    <div className="dashboard-cards" data-testid="staff-dashboard-cards">
                        <MetricCard
                            testId="staff-dashboard-card-new"
                            label="New"
                            value={data.counts.new}
                            to="/staff/queue?status=NEW"
                        />
                        <MetricCard
                            testId="staff-dashboard-card-open"
                            label="Open"
                            value={data.counts.open}
                            to="/staff/queue?status=OPEN"
                        />
                        <MetricCard
                            testId="staff-dashboard-card-in-progress"
                            label="In Progress"
                            value={data.counts.inProgress}
                            to="/staff/queue?status=IN_PROGRESS"
                        />
                        <MetricCard
                            testId="staff-dashboard-card-waiting"
                            label="Waiting for Requester"
                            value={data.counts.waitingForRequester}
                            to="/staff/queue?status=WAITING_FOR_REQUESTER"
                        />
                        <MetricCard
                            testId="staff-dashboard-card-my-assigned"
                            label="My Assigned"
                            value={data.counts.myAssigned}
                            to="/staff/queue?owner=me"
                        />
                    </div>

                    <DashboardContent>
                        <RecentTicketsPanel
                            testId="staff-dashboard-recent-tickets"
                            emptyTestId="staff-dashboard-recent-tickets-empty"
                            tickets={data.recentTickets}
                            detailPath={(id) => `/staff/tickets/${id}`}
                            viewAllTo="/staff/queue?owner=me"
                            emptyCta={{ to: "/staff/queue", label: "Browse the queue" }}
                        />

                        <QuickActions>
                            <QuickAction
                                testId="staff-dashboard-quick-action-search"
                                to="/staff/queue?focus=search"
                                icon="🔍"
                                label="Search Tickets"
                            />
                            <QuickAction
                                testId="staff-dashboard-quick-action-queue"
                                to="/staff/queue?owner=me"
                                icon="📋"
                                label="My Queue"
                            />
                        </QuickActions>
                    </DashboardContent>
                </>
            )}
        </div>
    );
}
