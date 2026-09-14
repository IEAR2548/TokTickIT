import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Global fetch stub for jsdom / vitest environment.
//
// Problem 1: jsdom throws "Failed to parse URL" for relative-path fetch calls.
// Problem 2: vi.fn() created mocks get their implementation cleared by
//   vi.restoreAllMocks(), which tests call in their own beforeEach.
//   After restoreAllMocks(), the vi.fn() still exists as globalThis.fetch
//   but returns undefined — fetch callers crash silently.
//
// Solution: assign a plain (non-vi.fn) async function to globalThis.fetch so
//   vi.restoreAllMocks() has no effect on it.  Save & restore manually.
// ---------------------------------------------------------------------------

function fakeFetch(body: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (_k: string) => 'application/json' },
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
        clone() { return this; },
    } as unknown as Response;
}

const STAFF_QUEUE_EMPTY = {
    data: [],
    meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
};

// Capture original fetch once at module load time (may be undefined in jsdom)
const _originalFetch = globalThis.fetch;

beforeEach(() => {
    // Plain async function — NOT a vi.fn() — so vi.restoreAllMocks() leaves it alone.
    (globalThis as any).fetch = async function mockFetch(
        input: RequestInfo | URL,
        _init?: RequestInit,
    ): Promise<Response> {
        const url =
            typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.href
                    : (input as Request).url;

        if (url.includes('/api/auth/me')) {
            return fakeFetch(
                { error: 'UNAUTHENTICATED', message: 'Authentication required' },
                401,
            );
        }

        if (url.includes('/api/staff/tickets')) {
            return fakeFetch(STAFF_QUEUE_EMPTY, 200);
        }

        return fakeFetch({}, 200);
    };
});

afterEach(() => {
    (globalThis as any).fetch = _originalFetch;
    vi.restoreAllMocks();
});
