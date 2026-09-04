import { ButtonHTMLAttributes } from "react";

// Ref: docs/lab-02/ui-spec.md section 6 (Button Hierarchy and States)

type Variant = "primary" | "secondary" | "tertiary" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    busy?: boolean;
    busyLabel?: string;
}

export function Button({
    variant = "primary",
    busy = false,
    busyLabel = "Submitting…",
    disabled,
    children,
    className,
    ...rest
}: ButtonProps) {
    return (
        <button
            className={`btn btn-${variant} ${busy ? "btn-busy" : ""} ${className ?? ""}`}
            disabled={disabled || busy}
            aria-busy={busy}
            {...rest}
        >
            {busy ? busyLabel : children}
        </button>
    );
}