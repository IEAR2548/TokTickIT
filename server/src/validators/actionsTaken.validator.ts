// Ref: docs/lab-04/specification.md BR-04 (Follow-up Note required iff Follow-Up Required = Yes),
//      FR-05, BR-03 (server-set fields are never client-editable)
// Ref: docs/lab-04/api-spec.md §1.2 (request body + field errors), §1.3 (omitted field = unchanged)

export const MAX_TEXT_LENGTH = 4000;
export const MAX_ATTACHMENT_NOTES_LENGTH = 1000;

export interface ExistingActionFields {
    description: string;
    result: string;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
}

export interface NormalizedActionFields {
    fields: Record<string, string>;
    description: string;
    result: string;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
}

export function normalizeAndValidate(
    body: Record<string, unknown>,
    existing?: ExistingActionFields
): NormalizedActionFields {
    const fields: Record<string, string> = {};

    const rawDescription = body.description !== undefined ? body.description : existing?.description ?? "";
    const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
    if (description.length < 1 || description.length > MAX_TEXT_LENGTH) {
        fields.description = description.length < 1 ? "Description is required." : `Description must be at most ${MAX_TEXT_LENGTH} characters.`;
    }

    const rawResult = body.result !== undefined ? body.result : existing?.result ?? "";
    const result = typeof rawResult === "string" ? rawResult.trim() : "";
    if (result.length < 1 || result.length > MAX_TEXT_LENGTH) {
        fields.result = result.length < 1 ? "Result is required." : `Result must be at most ${MAX_TEXT_LENGTH} characters.`;
    }

    const followUpRequired =
        body.followUpRequired === undefined ? existing?.followUpRequired ?? false : body.followUpRequired === true;

    // BR-04 is a two-way rule. "Required iff Follow-Up Required = Yes" is checked against the
    // effective value; "otherwise it must be empty" can only ever be violated by a value the
    // client actually sent, because an omitted field means "unchanged" on update (§1.3) — so an
    // updated record simply has its inherited note cleared rather than being rejected for a
    // value this request never supplied.
    const noteSupplied = body.followUpNote !== undefined;
    const rawNote = noteSupplied ? body.followUpNote : existing?.followUpNote ?? "";
    const followUpNote = typeof rawNote === "string" ? rawNote.trim() : "";
    if (followUpRequired && followUpNote.length === 0) {
        fields.followUpNote = "Required when Follow-Up Required is Yes.";
    }
    if (!followUpRequired && noteSupplied && followUpNote.length > 0) {
        fields.followUpNote = "Must be empty when Follow-Up Required is No.";
    }

    const rawAttachment = body.attachmentNotes !== undefined ? body.attachmentNotes : existing?.attachmentNotes ?? null;
    const attachmentNotes =
        rawAttachment === null || rawAttachment === undefined || rawAttachment === ""
            ? null
            : String(rawAttachment);
    if (attachmentNotes !== null && attachmentNotes.length > MAX_ATTACHMENT_NOTES_LENGTH) {
        fields.attachmentNotes = `Attachment notes must be at most ${MAX_ATTACHMENT_NOTES_LENGTH} characters.`;
    }

    return {
        fields,
        description,
        result,
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote : null,
        attachmentNotes,
    };
}
