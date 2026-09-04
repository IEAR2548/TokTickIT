import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { fetchCategories, fetchRelatedSystems, ReferenceItem } from "../api/referenceData.api";
import { createTicket, uploadAttachment, TicketValidationError } from "../api/tickets.api";
import { FieldLabel } from "../components/form/FieldLabel";
import { FieldError } from "../components/form/FieldError";
import { Button } from "../components/form/Button";
import { AttachmentUploader } from "../components/AttachmentUploader";
import "./CreateTicket.css";

// Ref: docs/lab-02/ui-spec.md section 10 (Create Ticket Screen Layout)
// Ref: docs/lab-02/specification.md BR-01 through BR-14, BR-21 through BR-24
// Ref: docs/lab-02/tests.md UI-01 through UI-04, UI-STYLE-02, UI-STYLE-03

type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "";

interface FormState {
    categoryId: string;
    relatedSystemId: string;
    requestedPriority: Priority;
    summary: string;
    description: string;
}

const INITIAL_FORM: FormState = {
    categoryId: "",
    relatedSystemId: "",
    requestedPriority: "",
    summary: "",
    description: "",
};

export function CreateTicket() {
    const navigate = useNavigate();
    const { selectedRequester } = useRequester();
    const [categories, setCategories] = useState<ReferenceItem[]>([]);
    const [relatedSystems, setRelatedSystems] = useState<ReferenceItem[]>([]);
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [successTicket, setSuccessTicket] = useState<{ id: number; ticketNumber: string } | null>(
        null
    );
    const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
    const [attachmentWarnings, setAttachmentWarnings] = useState<string[]>([]);

    useEffect(() => {
        fetchCategories().then(setCategories).catch(() => setCategories([]));
        fetchRelatedSystems().then(setRelatedSystems).catch(() => setRelatedSystems([]));
    }, []);

    function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    // BR-07, BR-08, BR-11 client-side mirror for immediate feedback; backend is authoritative
    function validateClientSide(): Record<string, string> {
        const errors: Record<string, string> = {};
        if (!form.categoryId) errors.categoryId = "Category is required.";
        if (!form.relatedSystemId) errors.relatedSystemId = "Related System is required.";
        if (!form.requestedPriority) errors.requestedPriority = "Requested Priority is required.";
        const summary = form.summary.trim();
        if (summary.length < 5 || summary.length > 200) {
            errors.summary = "Summary must be between 5 and 200 characters.";
        }
        const description = form.description.trim();
        if (description.length < 10 || description.length > 5000) {
            errors.description = "Description must be between 10 and 5000 characters.";
        }
        return errors;
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!selectedRequester) return;

        const errors = validateClientSide();
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setApiError(null);
        setAttachmentWarnings([]);
        setSubmitting(true); // BR-14/AC-05: busy + disabled during in-flight request

        try {
            const ticket = await createTicket(selectedRequester.id, {
                categoryId: Number(form.categoryId),
                relatedSystemId: Number(form.relatedSystemId),
                summary: form.summary,
                description: form.description,
                requestedPriority: form.requestedPriority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            });

            // BR-21: attachments are attempted after ticket creation; failures don't roll back the ticket
            const failedFiles: string[] = [];
            for (const file of pendingAttachments) {
                try {
                    await uploadAttachment(selectedRequester.id, ticket.id, file);
                } catch {
                    failedFiles.push(file.name);
                }
            }

            setAttachmentWarnings(failedFiles);
            setSuccessTicket(ticket);
        } catch (err) {
            if (err instanceof TicketValidationError) {
                setFieldErrors(err.fields);
            } else {
                setApiError((err as Error).message);
            }
        } finally {
            setSubmitting(false);
        }
    }

    const todayDateString = new Date().toISOString().slice(0, 10);

    if (successTicket) {
        return (
            <div className="create-ticket-success">
                <h2>Ticket Created</h2>
                <p className="success-ticket-number">{successTicket.ticketNumber}</p>
                {attachmentWarnings.length > 0 && (
                    <div className="attachment-warning-box" role="alert">
                        <p className="attachment-warning-title">
                            Ticket created successfully, but the following attachment(s) failed to upload:
                        </p>
                        <ul className="attachment-warning-list">
                            {attachmentWarnings.map((name) => (
                                <li key={name}>{name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="success-actions">
                    <Button variant="secondary" onClick={() => navigate("/my-tickets")}>
                        View Ticket
                    </Button>
                    <Button
                        variant="tertiary"
                        onClick={() => {
                            setForm(INITIAL_FORM);
                            setPendingAttachments([]);
                            setAttachmentWarnings([]);
                            setSuccessTicket(null);
                        }}
                    >
                        Create Another
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form className="create-ticket-form" onSubmit={handleSubmit}>
            <h1>Create Ticket</h1>

            {/* System Info: 2-column grid per ui-spec.md Section 10 */}
            <section className="readonly-section">
                <div>
                    <FieldLabel htmlFor="ticketNumber">Ticket Number</FieldLabel>
                    <input id="ticketNumber" className="field-readonly" readOnly value="Will be assigned" />
                </div>
                <div>
                    <FieldLabel htmlFor="ticketDate">Ticket Date</FieldLabel>
                    <input id="ticketDate" className="field-readonly" readOnly value={todayDateString} />
                </div>
                <div>
                    <FieldLabel htmlFor="currentStatus">Current Status</FieldLabel>
                    <input id="currentStatus" className="field-readonly" readOnly value="New" />
                </div>
                <div>
                    <FieldLabel htmlFor="requester">Requester</FieldLabel>
                    <input id="requester" className="field-readonly" readOnly value={selectedRequester?.name ?? ""} />
                </div>
            </section>

            <section className="classification-section">
                <div>
                    <FieldLabel htmlFor="category" required>
                        Category
                    </FieldLabel>
                    <select
                        id="category"
                        aria-label="Category"
                        value={form.categoryId}
                        onChange={(e) => updateField("categoryId", e.target.value)}
                        aria-invalid={!!fieldErrors.categoryId}
                        aria-describedby="category-error"
                    >
                        <option value="">Select…</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <FieldError id="category-error" message={fieldErrors.categoryId} />
                </div>

                <div>
                    <FieldLabel htmlFor="relatedSystem" required>
                        Related System
                    </FieldLabel>
                    <select
                        id="relatedSystem"
                        aria-label="Related System"
                        value={form.relatedSystemId}
                        onChange={(e) => updateField("relatedSystemId", e.target.value)}
                        aria-invalid={!!fieldErrors.relatedSystemId}
                        aria-describedby="relatedSystem-error"
                    >
                        <option value="">Select…</option>
                        {relatedSystems.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                    <FieldError id="relatedSystem-error" message={fieldErrors.relatedSystemId} />
                </div>

                <div>
                    <FieldLabel htmlFor="requestedPriority" required>
                        Requested Priority
                    </FieldLabel>
                    <select
                        id="requestedPriority"
                        aria-label="Requested Priority"
                        value={form.requestedPriority}
                        onChange={(e) => updateField("requestedPriority", e.target.value as Priority)}
                        aria-invalid={!!fieldErrors.requestedPriority}
                        aria-describedby="priority-error"
                    >
                        <option value="">Select…</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                    </select>
                    <FieldError id="priority-error" message={fieldErrors.requestedPriority} />
                </div>
            </section>

            <div>
                <FieldLabel htmlFor="summary" required>
                    Summary
                </FieldLabel>
                <input
                    id="summary"
                    aria-label="Summary"
                    value={form.summary}
                    onChange={(e) => updateField("summary", e.target.value)}
                    aria-invalid={!!fieldErrors.summary}
                    aria-describedby="summary-error"
                />
                <FieldError id="summary-error" message={fieldErrors.summary} />
            </div>

            <div>
                <FieldLabel htmlFor="description" required>
                    Description
                </FieldLabel>
                <textarea
                    id="description"
                    aria-label="Description"
                    rows={6}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    aria-invalid={!!fieldErrors.description}
                    aria-describedby="description-error"
                />
                <FieldError id="description-error" message={fieldErrors.description} />
            </div>

            <AttachmentUploader files={pendingAttachments} onChange={setPendingAttachments} />

            {apiError && (
                <div className="create-ticket-api-error" role="alert">
                    {apiError}
                </div>
            )}

            <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" busy={submitting}>
                    Submit Ticket
                </Button>
            </div>
        </form>
    );
}