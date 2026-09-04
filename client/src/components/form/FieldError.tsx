// Ref: docs/lab-02/ui-spec.md section 5 (Validation Message Placement)
// "Validation messages appear immediately below the associated field, not grouped at
//  the top of the form."

interface FieldErrorProps {
    id: string;
    message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
    return (
        <p id={id} role="alert" className="field-error" style={{ minHeight: 16 }}>
            {message ?? ""}
        </p>
    );
}