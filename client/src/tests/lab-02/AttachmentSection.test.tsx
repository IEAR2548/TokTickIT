import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentSection } from "../../components/AttachmentSection";
import * as ticketsApi from "../../api/tickets.api";

// Ref: HANDOVER.md (Issue #16) Section 6 layout mockup "Attachment Section" + Removal Modal
// Ref: docs/lab-02/tests.md UI-09, UI-10, UI-11
//
// Contract this test assumes (not yet implemented — TDD Red):
// - client/src/components/AttachmentSection.tsx takes `ticketId` and `requesterId`
//   as props (does NOT read RequesterContext itself), so no Router/Provider wrapping
//   is needed here.
// - It calls ticketsApi.fetchTicketAttachments(requesterId, ticketId) on mount,
//   returning a flat array (active + removed) of attachment objects.
// - New uploads go through the existing ticketsApi.uploadAttachment(requesterId, ticketId, file).
// - The file input is exposed via aria-label "Add Attachment" (same accessible-name
//   pattern as AttachmentUploader.tsx's `getByLabelText(/attachments/i)`), disabled
//   once there are 5 active (non-removed) attachments.
// - Each active row has a "Remove" button that opens a modal with a "Removal Reason"
//   field and a "Confirm Remove" button, calling
//   ticketsApi.removeAttachment(requesterId, attachmentId, removalReason).
// - Removed attachments render in a separate section with the filename inside an
//   <s> element and the reason shown as text, with no Download/Remove actions.

function activeAttachment(overrides: Partial<any> = {}) {
    return {
        id: 10,
        ticketId: 42,
        originalName: "battery-screenshot.png",
        mimeType: "image/png",
        sizeBytes: 204800,
        isRemoved: false,
        removalReason: null,
        removedAt: null,
        uploadedAt: "2026-08-24T07:05:00.000Z",
        ...overrides,
    };
}

describe("AttachmentSection", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("shows a new row after a successful upload (UI-09)", async () => {
        vi.spyOn(ticketsApi, "fetchTicketAttachments").mockResolvedValue([]);
        vi.spyOn(ticketsApi, "uploadAttachment").mockResolvedValue(
            activeAttachment({ id: 11, originalName: "new-photo.png" }) as any
        );

        render(<AttachmentSection ticketId={42} requesterId={1} />);

        const fileInput = await screen.findByLabelText(/add attachment/i);
        const testFile = new File(["dummy content"], "new-photo.png", { type: "image/png" });
        await userEvent.upload(fileInput, testFile);

        expect(await screen.findByText("new-photo.png")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: /download/i }) ?? screen.getByRole("button", { name: /download/i })
        ).toBeInTheDocument();
    });

    it("soft-removes an attachment via the reason dialog, moving it to the removed list (UI-10)", async () => {
        vi.spyOn(ticketsApi, "fetchTicketAttachments").mockResolvedValue([activeAttachment()] as any);
        const removeSpy = vi.spyOn(ticketsApi, "removeAttachment").mockResolvedValue(
            activeAttachment({
                isRemoved: true,
                removalReason: "Uploaded wrong file version",
                removedAt: "2026-08-24T08:00:00.000Z",
            }) as any
        );

        render(<AttachmentSection ticketId={42} requesterId={1} />);

        await screen.findByText("battery-screenshot.png");

        await userEvent.click(screen.getByRole("button", { name: /remove/i }));

        const reasonInput = await screen.findByLabelText(/removal reason/i);
        await userEvent.type(reasonInput, "Uploaded wrong file version");
        await userEvent.click(screen.getByRole("button", { name: /confirm remove/i }));

        expect(removeSpy).toHaveBeenCalledWith(1, 10, "Uploaded wrong file version");

        // Moved to the removed list: filename struck through, reason visible, no actions left.
        const removedName = await screen.findByText("battery-screenshot.png");
        expect(removedName.tagName.toLowerCase()).toBe("s");
        expect(screen.getByText(/Uploaded wrong file version/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    });

    it("disables Add Attachment once the ticket has 5 active attachments (UI-11)", async () => {
        const fiveActive = Array.from({ length: 5 }, (_, i) =>
            activeAttachment({ id: 100 + i, originalName: `file-${i}.png` })
        );
        vi.spyOn(ticketsApi, "fetchTicketAttachments").mockResolvedValue(fiveActive as any);

        render(<AttachmentSection ticketId={42} requesterId={1} />);

        await screen.findByText("file-0.png");

        const fileInput = screen.getByLabelText(/add attachment/i);
        expect(fileInput).toBeDisabled();
    });
});