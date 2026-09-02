import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Requester } from "../api/requesters.api";

const STORAGE_KEY = "toktickit.devRequester";

interface RequesterContextValue {
    selectedRequester: Requester | null;
    selectRequester: (requester: Requester) => void;
    changeRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function loadFromStorage(): Requester | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Requester) : null;
    } catch {
        return null;
    }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
    const [selectedRequester, setSelectedRequester] = useState<Requester | null>(loadFromStorage);

    const selectRequester = useCallback((requester: Requester) => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
        setSelectedRequester(requester);
    }, []);

    // Ref: BR-09 — changing requester invalidates/reloads all requester-scoped data.
    // Consumers (My Tickets, Ticket Detail) key their data-fetching effects off
    // `selectedRequester?.id`, so clearing/resetting it here is sufficient to trigger reload.
    const changeRequester = useCallback(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setSelectedRequester(null);
    }, []);

    return (
        <RequesterContext.Provider value={{ selectedRequester, selectRequester, changeRequester }}>
            {children}
        </RequesterContext.Provider>
    );
}

export function useRequester(): RequesterContextValue {
    const ctx = useContext(RequesterContext);
    if (!ctx) {
        throw new Error("useRequester must be used within a RequesterProvider");
    }
    return ctx;
}