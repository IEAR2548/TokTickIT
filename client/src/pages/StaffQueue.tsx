import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchStaffTickets, StaffTicketItem, StaffTicketMeta } from "../api/staffTickets.api";
import { Badge } from "../components/Badge";
import "./StaffQueue.css";

type SortField = "createdAt" | "updatedAt" | "itPriority" | "requestedPriority" | "currentStatus" | "ownerName";
type SortDir = "asc" | "desc";

export function StaffQueue() {
    const { user, isLoading: authLoading } = useAuth();
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
    const [meta, setMeta] = useState<StaffTicketMeta>({
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
    });
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");

    // Filter and search states (initialize search from query param if provided)
    const initialSearch = searchParams.get("search") || "";
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [statusFilter, setStatusFilter] = useState("");
    const [itPriorityFilter, setItPriorityFilter] = useState("");
    const [ownerFilter, setOwnerFilter] = useState<"" | "me" | "unassigned">("");
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Sorting state (Step 1 Option b: all 5 UI headers supported)
    const [sortBy, setSortBy] = useState<SortField>("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // Pagination state
    const [page, setPage] = useState(1);

    // Track whether there were any tickets globally before filters were applied
    const [hasEverHadTickets, setHasEverHadTickets] = useState<boolean | null>(null);

    // Sequence guard: ignore stale responses that resolve out of order
    // (e.g. the initial unfiltered fetch resolving after a search fetch)
    const requestSeqRef = useRef(0);

    const isFiltered = Boolean(search || statusFilter || itPriorityFilter || ownerFilter);
    const isFilteredRef = useRef(isFiltered);
    useEffect(() => { isFilteredRef.current = isFiltered; }, [isFiltered]);

    const loadTickets = useCallback(async () => {
        const seq = ++requestSeqRef.current;
        setStatus("loading");
        setErrorMessage("");

        let ownerIdParam: number | "unassigned" | undefined;
        if (ownerFilter === "me" && userRef.current?.id) {
            ownerIdParam = userRef.current.id;
        } else if (ownerFilter === "unassigned") {
            ownerIdParam = "unassigned";
        }

        try {
            const res = await fetchStaffTickets({
                search: search || undefined,
                status: statusFilter || undefined,
                itPriority: itPriorityFilter || undefined,
                ownerId: ownerIdParam,
                sortBy,
                sortDir,
                page,
                pageSize: 10,
            });

            // A newer request has been issued meanwhile — discard this stale result
            if (seq !== requestSeqRef.current) return;

            setTickets(res.data);
            setMeta(res.meta);

            if (!isFilteredRef.current) {
                setHasEverHadTickets(res.meta.totalCount > 0);
            }

            setStatus("ready");
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to load staff queue.");
            setStatus("error");
        }
    }, [search, statusFilter, itPriorityFilter, ownerFilter, sortBy, sortDir, page]);

    useEffect(() => {
        // Wait for auth to resolve before loading (prevents double-fetch on mount)
        if (!authLoading) {
            loadTickets();
        }
    }, [loadTickets, authLoading]);

    function handleSearchSubmit(e: FormEvent) {
        e.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    }

    function clearFilters() {
        setSearchInput("");
        setSearch("");
        setStatusFilter("");
        setItPriorityFilter("");
        setOwnerFilter("");
        setPage(1);
    }

    function handleSort(field: SortField) {
        if (sortBy === field) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortDir("asc");
        }
        setPage(1);
    }

    function getSortIndicator(field: SortField) {
        if (sortBy !== field) return "↕";
        return sortDir === "asc" ? "↑" : "↓";
    }

    function handleRowClick(ticketId: number) {
        navigate(`/staff/tickets/${ticketId}`);
    }

    // Determine empty vs no-results
    const isEmpty = status === "ready" && meta.totalCount === 0 && !isFiltered && hasEverHadTickets === false;
    const isNoResults = status === "ready" && meta.totalCount === 0 && (isFiltered || hasEverHadTickets === true);

    const startItem = meta.totalCount > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
    const endItem = meta.totalCount > 0 ? Math.min(meta.page * meta.pageSize, meta.totalCount) : 0;

    return (
        <div className="staff-queue-container" data-testid="staff-queue-container">
            <header className="staff-queue-header">
                <h1 className="staff-queue-title">IT Staff Ticket Queue</h1>

                <div className="staff-queue-controls">
                    <form className="staff-queue-search-form" onSubmit={handleSearchSubmit}>
                        <input
                            type="search"
                            className="staff-queue-search-input"
                            data-testid="staff-queue-search"
                            placeholder="Search by ticket number or summary…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </form>

                    <button
                        type="button"
                        className={`staff-queue-filter-btn ${filtersOpen || isFiltered ? "active" : ""}`}
                        data-testid="staff-queue-filters-button"
                        onClick={() => setFiltersOpen((prev) => !prev)}
                        aria-expanded={filtersOpen}
                    >
                        Filters {isFiltered && "(Active)"}
                    </button>
                </div>

                {filtersOpen && (
                    <div className="staff-queue-filter-panel">
                        <div className="staff-queue-filter-group">
                            <label htmlFor="staff-filter-status">Status</label>
                            <select
                                id="staff-filter-status"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Statuses</option>
                                <option value="NEW">New</option>
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="CLOSED">Closed</option>
                                <option value="REOPENED">Reopened</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="staff-queue-filter-group">
                            <label htmlFor="staff-filter-priority">IT Priority</label>
                            <select
                                id="staff-filter-priority"
                                value={itPriorityFilter}
                                onChange={(e) => {
                                    setItPriorityFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Priorities</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>

                        <div className="staff-queue-filter-group">
                            <label htmlFor="staff-filter-owner">Owner</label>
                            <select
                                id="staff-filter-owner"
                                value={ownerFilter}
                                onChange={(e) => {
                                    setOwnerFilter(e.target.value as "" | "me" | "unassigned");
                                    setPage(1);
                                }}
                            >
                                <option value="">Anyone</option>
                                <option value="me">Assigned to me</option>
                                <option value="unassigned">Unassigned</option>
                            </select>
                        </div>

                        <div>
                            <button
                                type="button"
                                className="staff-queue-filter-clear"
                                onClick={clearFilters}
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                )}

                {status === "ready" && meta.totalCount > 0 && (
                    <div className="staff-queue-meta-bar">
                        <span className="staff-queue-count-line">
                            Showing {startItem} to {endItem} of {meta.totalCount} tickets
                        </span>
                    </div>
                )}
            </header>

            {status === "loading" && (
                <div data-testid="staff-queue-loading">
                    <div className="staff-queue-skeleton-row" />
                    <div className="staff-queue-skeleton-row" />
                    <div className="staff-queue-skeleton-row" />
                    <div className="staff-queue-skeleton-row" />
                    <div className="staff-queue-skeleton-row" />
                </div>
            )}

            {status === "error" && (
                <div className="staff-queue-state-box" data-testid="staff-queue-error">
                    <div className="staff-queue-state-title text-danger">Unable to load queue</div>
                    <div className="staff-queue-state-desc">{errorMessage}</div>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={loadTickets}
                    >
                        Retry
                    </button>
                </div>
            )}

            {isEmpty && (
                <div className="staff-queue-state-box" data-testid="staff-queue-empty">
                    <div className="staff-queue-state-icon">📥</div>
                    <h2 className="staff-queue-state-title">No tickets in the queue</h2>
                    <p className="staff-queue-state-desc">The staff ticket queue is currently empty.</p>
                </div>
            )}

            {isNoResults && (
                <div className="staff-queue-state-box" data-testid="staff-queue-no-results">
                    <div className="staff-queue-state-icon">🔍</div>
                    <h2 className="staff-queue-state-title">No tickets match your filters</h2>
                    <p className="staff-queue-state-desc">Try adjusting or clearing your filters to see more tickets.</p>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={clearFilters}
                    >
                        Clear filters
                    </button>
                </div>
            )}

            {/* Table is ALWAYS in the DOM so synchronous getByTestId('staff-queue-table') works
                immediately after findByTestId('staff-queue-search') resolves (RESP-01). */}
            <div className="staff-queue-table-wrapper">
                <table className="staff-queue-table" data-testid="staff-queue-table">
                            <thead data-testid="staff-queue-thead">
                                <tr>
                                    <th>Ticket No.</th>
                                    <th>
                                        <button
                                            type="button"
                                            className="staff-queue-sort-btn"
                                            onClick={() => handleSort("createdAt")}
                                            aria-label="Sort by Created Date"
                                            data-testid="sort-created-at"
                                        >
                                            Created Date <span className="staff-queue-sort-icon">{getSortIndicator("createdAt")}</span>
                                        </button>
                                    </th>
                                    <th>Summary</th>
                                    <th>Category</th>
                                    <th>
                                        <button
                                            type="button"
                                            className="staff-queue-sort-btn"
                                            onClick={() => handleSort("requestedPriority")}
                                            aria-label="Sort by Requested Priority"
                                            data-testid="sort-req-priority"
                                        >
                                            Req. Priority <span className="staff-queue-sort-icon">{getSortIndicator("requestedPriority")}</span>
                                        </button>
                                    </th>
                                    <th>
                                        <button
                                            type="button"
                                            className="staff-queue-sort-btn"
                                            onClick={() => handleSort("itPriority")}
                                            aria-label="Sort by IT Priority"
                                            data-testid="sort-it-priority"
                                        >
                                            IT Priority <span className="staff-queue-sort-icon">{getSortIndicator("itPriority")}</span>
                                        </button>
                                    </th>
                                    <th>
                                        <button
                                            type="button"
                                            className="staff-queue-sort-btn"
                                            onClick={() => handleSort("currentStatus")}
                                            aria-label="Sort by Status"
                                            data-testid="sort-status"
                                        >
                                            Status <span className="staff-queue-sort-icon">{getSortIndicator("currentStatus")}</span>
                                        </button>
                                    </th>
                                    <th className="staff-queue-col-owner" data-testid="col-owner">
                                        <button
                                            type="button"
                                            className="staff-queue-sort-btn"
                                            onClick={() => handleSort("ownerName")}
                                            aria-label="Sort by Owner"
                                            data-testid="sort-owner"
                                        >
                                            Owner <span className="staff-queue-sort-icon">{getSortIndicator("ownerName")}</span>
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => {
                                    const createdDate = new Date(ticket.createdAt).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    });

                                    return (
                                        <tr
                                            key={ticket.id}
                                            className="staff-queue-row"
                                            data-testid={`staff-queue-row-${ticket.id}`}
                                            onClick={() => handleRowClick(ticket.id)}
                                        >
                                            <td data-label="Ticket No.">
                                                <Link
                                                    to={`/staff/tickets/${ticket.id}`}
                                                    className="staff-queue-ticket-link"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {ticket.ticketNumber}
                                                </Link>
                                            </td>
                                            <td data-label="Created Date">{createdDate}</td>
                                            <td data-label="Summary" className="staff-queue-summary-cell" title={ticket.summary}>
                                                {ticket.summary}
                                            </td>
                                            <td data-label="Category">{ticket.category?.name || "—"}</td>
                                            <td data-label="Req. Priority">
                                                <Badge kind="priority" value={ticket.requestedPriority} />
                                            </td>
                                            <td data-label="IT Priority">
                                                {ticket.itPriority ? (
                                                    <Badge kind="priority" value={ticket.itPriority} />
                                                ) : (
                                                    <span className="text-muted">—</span>
                                                )}
                                            </td>
                                            <td data-label="Status">
                                                <Badge kind="status" value={ticket.currentStatus} />
                                            </td>
                                            <td data-label="Owner" className="staff-queue-col-owner">
                                                {ticket.owner ? (
                                                    <span>{ticket.owner.name}</span>
                                                ) : (
                                                    <span className="staff-queue-owner-unassigned">Unassigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {meta.totalPages > 1 && (
                        <nav className="staff-queue-pagination" aria-label="Queue pagination">
                            <button
                                type="button"
                                className="staff-queue-page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </button>

                            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`staff-queue-page-btn staff-queue-page-number ${p === page ? "active" : ""}`}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                type="button"
                                className="staff-queue-page-btn"
                                disabled={page >= meta.totalPages}
                                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                            >
                                Next
                            </button>
                        </nav>
                    )}

        </div>
    );
}
