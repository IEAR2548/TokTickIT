// Ref: docs/lab-02/specification.md BR-07 through BR-11
// Ref: docs/lab-02/api-spec.md Section 4

export interface CreateTicketInput {
    requesterId: number;
    categoryId: number;
    relatedSystemId: number;
    summary: string;
    description: string;
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface FieldErrors {
    [field: string]: string;
}

const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function validateCreateTicket(input: Partial<CreateTicketInput>): FieldErrors {
    const errors: FieldErrors = {};

    if (
        input.requesterId === undefined ||
        input.requesterId === null ||
        typeof input.requesterId !== "number" ||
        !Number.isInteger(input.requesterId) ||
        input.requesterId <= 0
    ) {
        errors.requesterId = "Requester is required.";
    }

    if (
        input.categoryId === undefined ||
        input.categoryId === null ||
        typeof input.categoryId !== "number" ||
        !Number.isInteger(input.categoryId) ||
        input.categoryId <= 0
    ) {
        errors.categoryId = "Category is required.";
    }

    if (
        input.relatedSystemId === undefined ||
        input.relatedSystemId === null ||
        typeof input.relatedSystemId !== "number" ||
        !Number.isInteger(input.relatedSystemId) ||
        input.relatedSystemId <= 0
    ) {
        errors.relatedSystemId = "Related System is required.";
    }

    const summary = typeof input.summary === "string" ? input.summary.trim() : "";
    if (typeof input.summary !== "string" || summary.length < 5 || summary.length > 200) {
        errors.summary = "Summary must be between 5 and 200 characters.";
    }

    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (typeof input.description !== "string" || description.length < 10 || description.length > 5000) {
        errors.description = "Description must be between 10 and 5000 characters.";
    }

    if (!input.requestedPriority || !ALLOWED_PRIORITIES.includes(input.requestedPriority as any)) {
        errors.requestedPriority = "Requested Priority must be LOW, MEDIUM, HIGH, or CRITICAL.";
    }

    return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
    return Object.keys(errors).length > 0;
}