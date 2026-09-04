import { useRef, useState, ChangeEvent } from "react";
import { FieldLabel } from "./form/FieldLabel";

// Ref: docs/lab-02/specification.md BR-25, BR-26, BR-27 (client-side mirror; backend authoritative)
// Ref: docs/lab-02/ui-spec.md section 6 (Attachment Selection & Error Presentation)

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

interface AttachmentUploaderProps {
    files: File[];
    onChange: (files: File[]) => void;
}

export function AttachmentUploader({ files, onChange }: AttachmentUploaderProps) {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    function handleSelect(e: ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        setError(null);

        for (const file of selected) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                setError(`"${file.name}" is not an allowed type. Allowed: JPG, JPEG, PNG, WEBP, PDF.`);
                return;
            }
            if (file.size > MAX_SIZE_BYTES) {
                setError(`"${file.name}" exceeds the 5MB limit.`);
                return;
            }
        }

        if (files.length + selected.length > MAX_FILES) {
            setError(`You can attach a maximum of ${MAX_FILES} files per ticket.`);
            return;
        }

        onChange([...files, ...selected]);
        if (inputRef.current) inputRef.current.value = "";
    }

    function removeFile(index: number) {
        onChange(files.filter((_, i) => i !== index));
    }

    return (
        <div className="attachment-uploader">
            <FieldLabel htmlFor="attachments">Attachments</FieldLabel>
            <p className="attachment-helper">Allowed: JPG, JPEG, PNG, WEBP, PDF. Max 5MB each, up to 5 files.</p>

            <input
                id="attachments"
                ref={inputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleSelect}
                disabled={files.length >= MAX_FILES}
            />

            {error && (
                <p className="attachment-error" role="alert">
                    {error}
                </p>
            )}

            {files.length > 0 && (
                <ul className="attachment-file-list">
                    {files.map((file, i) => (
                        <li key={`${file.name}-${i}`}>
                            <span>{file.name}</span>
                            <span className="attachment-file-size">
                                {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(i)}>
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}