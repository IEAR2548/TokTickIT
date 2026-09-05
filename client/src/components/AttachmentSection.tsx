import { useEffect, useState, ChangeEvent } from "react";
import {
    fetchTicketAttachments,
    uploadAttachment,
    removeAttachment as removeAttachmentApi,
    getAttachmentDownloadUrl,
    AttachmentItem,
} from "../api/tickets.api";
import "./AttachmentSection.css";

interface AttachmentSectionProps {
    ticketId: number;
    requesterId: number;
}

const MAX_ACTIVE_ATTACHMENTS = 5;

const MIME_LABELS: Record<string, string> = {
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "image/webp": "WEBP",
    "application/pdf": "PDF",
};

function formatFileType(mimeType: string): string {
    return MIME_LABELS[mimeType] ?? mimeType;
}

function formatSize(sizeBytes: number): string {
    return `${Math.round(sizeBytes / 1024)} KB`;
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
}

function formatDateTime(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function AttachmentSection({ ticketId, requesterId }: AttachmentSectionProps) {
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [removalTarget, setRemovalTarget] = useState<AttachmentItem | null>(null);
    const [removalReason, setRemovalReason] = useState("");
    const [removalError, setRemovalError] = useState<string | null>(null);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchTicketAttachments(requesterId, ticketId)
            .then((data) => {
                if (!cancelled) setAttachments(data);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [requesterId, ticketId]);

    const activeAttachments = attachments.filter((a) => !a.isRemoved);
    const removedAttachments = attachments.filter((a) => a.isRemoved);
    const atLimit = activeAttachments.length >= MAX_ACTIVE_ATTACHMENTS;

    async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setUploadError(null);
        try {
            const uploaded = await uploadAttachment(requesterId, ticketId, file);
            setAttachments((prev) => [...prev, uploaded]);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
        }
    }

    function openRemovalDialog(attachment: AttachmentItem) {
        setRemovalTarget(attachment);
        setRemovalReason("");
        setRemovalError(null);
    }

    function closeRemovalDialog() {
        setRemovalTarget(null);
        setRemovalReason("");
        setRemovalError(null);
    }

    async function confirmRemoval() {
        if (!removalTarget) return;
        const reason = removalReason.trim();
        if (!reason) {
            setRemovalError("Removal reason is required.");
            return;
        }

        setRemoving(true);
        setRemovalError(null);
        try {
            const updated = await removeAttachmentApi(requesterId, removalTarget.id, reason);
            setAttachments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            closeRemovalDialog();
        } catch (err) {
            setRemovalError(err instanceof Error ? err.message : "Failed to remove attachment. Please try again.");
        } finally {
            setRemoving(false);
        }
    }

    return (
        <section data-testid="attachment-section" className="attachment-section">
            <h2 className="fs-5 fw-bold">Attachments</h2>

            <div className="attachment-add">
                <input
                    type="file"
                    aria-label="Add Attachment"
                    data-testid="attachment-add-input"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelected}
                    disabled={atLimit}
                    title={atLimit ? `Maximum of ${MAX_ACTIVE_ATTACHMENTS} active attachments reached` : undefined}
                />
                {atLimit && (
                    <p className="attachment-limit-note" data-testid="attachment-limit-note">
                        Maximum of {MAX_ACTIVE_ATTACHMENTS} active attachments reached.
                    </p>
                )}
                {uploadError && (
                    <p role="alert" className="attachment-error">
                        {uploadError}
                    </p>
                )}
            </div>

            {!loading && activeAttachments.length > 0 && (
                <ul className="attachment-active-list" data-testid="attachment-active-list">
                    {activeAttachments.map((a) => (
                        <li key={a.id} data-testid={`attachment-row-${a.id}`} className="attachment-row">
                            <span className="attachment-name">{a.originalName}</span>
                            <span className="attachment-meta">
                                ({formatFileType(a.mimeType)}, {formatSize(a.sizeBytes)}, {formatDate(a.uploadedAt)})
                            </span>
                            <a
                                href={getAttachmentDownloadUrl(a.id, requesterId)}
                                className="attachment-download-btn"
                                data-testid={`attachment-download-link-${a.id}`}
                            >
                                Download
                            </a>
                            <button
                                type="button"
                                className="attachment-remove-btn"
                                data-testid={`attachment-remove-button-${a.id}`}
                                onClick={() => openRemovalDialog(a)}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {removedAttachments.length > 0 && (
                <ul className="attachment-removed-list" data-testid="attachment-removed-list">
                    {removedAttachments.map((a) => (
                        <li
                            key={a.id}
                            data-testid={`attachment-row-${a.id}`}
                            className="attachment-row attachment-row-removed"
                        >
                            <s className="attachment-name">{a.originalName}</s>
                            <span className="attachment-removed-at">Removed on {formatDateTime(a.removedAt)}</span>
                            <span className="attachment-removal-reason">Reason: "{a.removalReason}"</span>
                        </li>
                    ))}
                </ul>
            )}

            {removalTarget && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Remove attachment"
                    data-testid="attachment-removal-modal"
                    className="attachment-removal-modal"
                >
                    <div className="attachment-removal-panel">
                        <label htmlFor="removal-reason">Removal Reason</label>
                        <textarea
                            id="removal-reason"
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                            disabled={removing}
                        />
                        {removalError && (
                            <p role="alert" className="attachment-error">
                                {removalError}
                            </p>
                        )}
                        <div className="attachment-removal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-testid="attachment-removal-cancel-button"
                                onClick={closeRemovalDialog}
                                disabled={removing}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="attachment-remove-btn"
                                data-testid="attachment-removal-confirm-button"
                                onClick={confirmRemoval}
                                disabled={removing}
                            >
                                {removing ? "Removing…" : "Confirm Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}