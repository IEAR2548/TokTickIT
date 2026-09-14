type BadgeKind = "status" | "priority" | "role";

const STATUS_LABELS: Record<string, string> = { NEW: "NEW" };
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