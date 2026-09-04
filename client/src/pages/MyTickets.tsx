import { useCallback, useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { fetchMyTickets, TicketListItem, PaginationMeta } from "../api/tickets.api";
import { fetchCategories, ReferenceItem } from "../api/referenceData.api";
import { TicketList } from "../components/TicketList";
import { Pagination } from "../components/Pagination";
import { Button } from "../components/form/Button";
import "./MyTickets.css";

type ScreenState = "loading" | "ready" | "error";

const DEFAULT_FILTERS = {
    search: "",
    categoryId: "",
    status: "",
    sortBy: "createdAt" as "createdAt" | "updatedAt",
    sortOrder: "desc" as "asc" | "desc",
};

export function MyTickets() {
    const { selectedRequester } = useRequester();
    const [state, setState] = useState<ScreenState>("loading");
    const [tickets, setTickets] = useState<TicketListItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const [categories, setCategories] = useState<ReferenceItem[]>([]);
    const [hasEverHadTickets, setHasEverHadTickets] = useState<boolean | null>(null);

    const categoryNamesById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    const requesterId = selectedRequester?.id;

    const load = useCallback(async () => {
        if (!requesterId) return;
        setState("loading");
        try {
            const result = await fetchMyTickets(requesterId, {
                search: filters.search,
                categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
                status: filters.status || undefined,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder,
                page,
                pageSize: 10,
            });
            setTickets(result.tickets);
            setMeta(result.pagination);

            const isUnfiltered = !filters.search && !filters.categoryId && !filters.status;
            if (isUnfiltered) {
                setHasEverHadTickets(result.pagination.total > 0);
            }

            setState("ready");
        } catch {
            setState("error");
        }
    }, [requesterId, filters, page]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        fetchCategories().then(setCategories).catch(() => setCategories([]));
    }, []);

    // Reset to page 1 whenever the selected requester changes
    useEffect(() => {
        setPage(1);
    }, [selectedRequester?.id]);

    function commitSearch() {
        setFilters((prev) => ({ ...prev, search: searchInput }));
        setPage(1);
    }

    function handleSearchSubmit(e: FormEvent) {
        e.preventDefault();
        commitSearch();
    }

    function updateFilter<K extends keyof typeof DEFAULT_FILTERS>(key: K, value: (typeof DEFAULT_FILTERS)[K]) {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    }

    function clearFilters() {
        setFilters(DEFAULT_FILTERS);
        setSearchInput("");
        setPage(1);
    }

    const isEmpty = state === "ready" && meta.total === 0 && hasEverHadTickets === false;
    const isNoResults = state === "ready" && meta.total === 0 && hasEverHadTickets === true;

    return (
        <div className="my-tickets-page">
            <div className="my-tickets-header">
                <div>
                    <h1>My Tickets</h1>
                    <p className="my-tickets-subtitle">View and track all of your support requests.</p>
                </div>
                <div className="my-tickets-header-actions">
                    <Button type="button" variant="tertiary" onClick={clearFilters}>
                        Clear Filters
                    </Button>
                    <Link to="/create-ticket">
                        <Button type="button" variant="primary">
                            + Create Ticket
                        </Button>
                    </Link>
                </div>
            </div>

            <form className="my-tickets-filters" onSubmit={handleSearchSubmit}>
                <label htmlFor="ticket-search" className="visually-hidden">
                    Search
                </label>
                <input
                    id="ticket-search"
                    type="search"
                    role="searchbox"
                    aria-label="Search"
                    placeholder="Search by ticket number or summary…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            commitSearch();
                        }
                    }}
                />

                <select
                    aria-label="Category"
                    value={filters.categoryId}
                    onChange={(e) => updateFilter("categoryId", e.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Current Status"
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="NEW">New</option>
                </select>

                <select
                    aria-label="Sort by"
                    value={filters.sortBy}
                    onChange={(e) => updateFilter("sortBy", e.target.value as "createdAt" | "updatedAt")}
                >
                    <option value="createdAt">Created Date</option>
                    <option value="updatedAt">Last Updated</option>
                </select>

                <select
                    aria-label="Order"
                    value={filters.sortOrder}
                    onChange={(e) => updateFilter("sortOrder", e.target.value as "asc" | "desc")}
                >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                </select>
            </form>

            {state === "loading" && (
                <div className="my-tickets-loading" data-testid="my-tickets-loading">
                    Loading tickets…
                </div>
            )}

            {state === "error" && (
                <div className="my-tickets-error" data-testid="my-tickets-error">
                    <p>Failed to load tickets. Please try again.</p>
                    <Button type="button" variant="secondary" onClick={load}>
                        Retry
                    </Button>
                </div>
            )}

            {isEmpty && (
                <div className="my-tickets-empty" data-testid="my-tickets-empty">
                    <p>You haven't created any tickets yet.</p>
                    <Link to="/create-ticket">
                        <Button type="button" variant="primary">
                            Create Ticket
                        </Button>
                    </Link>
                </div>
            )}

            {isNoResults && (
                <div className="my-tickets-no-results" data-testid="my-tickets-no-results">
                    <p>No tickets match your search or filters.</p>
                    <Button type="button" variant="tertiary" onClick={clearFilters}>
                        Clear filters
                    </Button>
                </div>
            )}

            {state === "ready" && tickets.length > 0 && (
                <>
                    <TicketList tickets={tickets} categoryNamesById={categoryNamesById} />
                    <Pagination
                        page={meta.page}
                        pageSize={meta.pageSize}
                        totalItems={meta.total}
                        totalPages={meta.totalPages}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}