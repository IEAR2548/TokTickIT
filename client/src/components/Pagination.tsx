import { Button } from "./form/Button";

// Ref: docs/lab-02/ui-spec.md section 13 (My Tickets pagination footer)

interface PaginationProps {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, totalItems, totalPages, onPageChange }: PaginationProps) {
    if (totalItems === 0) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    return (
        <div className="pagination" data-testid="pagination">
            <span className="pagination-summary">
                Showing {from} to {to} of {totalItems} tickets
            </span>
            <div className="pagination-controls">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Previous
                </Button>
                <span className="pagination-current">
                    Page {page} of {totalPages}
                </span>
                <Button
                    type="button"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}