import { useCallback, useEffect, useState } from "react";

// Ref: docs/lab-04/ui-spec.md §1.3 / §2.3 (loading, ready, error + Refresh without a reload)
//
// Both dashboards share the same feedback-state machine; this hook keeps that lifecycle in one
// place so the two pages only describe their own content.

export type DashboardScreenState = "loading" | "ready" | "error";

export interface DashboardResource<T> {
    state: DashboardScreenState;
    data: T | null;
    /** True only while a Refresh re-fetch is in flight (the previous values stay on screen). */
    refreshing: boolean;
    load: (isRefresh?: boolean) => Promise<void>;
}

export function useDashboardResource<T>(fetcher: () => Promise<T>): DashboardResource<T> {
    const [state, setState] = useState<DashboardScreenState>("loading");
    const [data, setData] = useState<T | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setState("loading");
            }
            try {
                const next = await fetcher();
                setData(next);
                setState("ready");
            } catch {
                setState("error");
            } finally {
                setRefreshing(false);
            }
        },
        [fetcher]
    );

    useEffect(() => {
        load();
    }, [load]);

    return { state, data, refreshing, load };
}
