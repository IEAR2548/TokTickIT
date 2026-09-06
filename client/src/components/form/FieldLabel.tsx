import { ReactNode } from "react";

// Ref: docs/lab-02/ui-spec.md section 4
// "Required fields show a red asterisk. The asterisk does not replace the validation message."

interface FieldLabelProps {
    htmlFor: string;
    required?: boolean;
    children: ReactNode;
}

export function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
    return (
        <label htmlFor={htmlFor} className="field-label">
            {children}
            {required && (
                <span aria-hidden="true" className="field-required-asterisk">
                    {" *"}
                </span>
            )}
        </label>
    );
}