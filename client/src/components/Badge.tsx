type BadgeKind = "status" | "priority";

const STATUS_LABELS: Record<string, string> = { NEW: "NEW" };
const PRIORITY_LABELS: Record<string, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
};

interface BadgeProps {
    kind: BadgeKind;
    value: string;
}

export function Badge({ kind, value }: BadgeProps) {
    const label = kind === "status" ? STATUS_LABELS[value] ?? value : PRIORITY_LABELS[value] ?? value;
    const className = `badge badge-${kind}-${value.toLowerCase()}`;

    return (
        <span className={className} data-testid={`badge-${kind}`}>
            {label}
        </span>
    );
}