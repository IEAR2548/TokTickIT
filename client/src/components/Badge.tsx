type BadgeKind = "status" | "priority" | "role";

// Ref: docs/lab-03/specification.md BR-18 — the 8 permitted statuses.
// NEW keeps its Lab 2 label; unknown values fall back to the raw enum text.
const STATUS_LABELS: Record<string, string> = {
    NEW: "NEW",
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    WAITING_FOR_REQUESTER: "Waiting for Requester",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    REOPENED: "Reopened",
    CANCELLED: "Cancelled",
};
const PRIORITY_LABELS: Record<string, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
};
const ROLE_LABELS: Record<string, string> = {
    REQUESTER: "Requester",
    IT_STAFF: "IT Staff",
    ADMINISTRATOR: "Administrator",
};

interface BadgeProps {
    kind: BadgeKind;
    value: string;
}

export function Badge({ kind, value }: BadgeProps) {
    const label =
        kind === "status"
            ? STATUS_LABELS[value] ?? value
            : kind === "priority"
            ? PRIORITY_LABELS[value] ?? value
            : ROLE_LABELS[value] ?? value;
    const className = `badge badge-${kind}-${value.toLowerCase()}`;

    return (
        <span className={className} data-testid={`badge-${kind}`}>
            {label}
        </span>
    );
}