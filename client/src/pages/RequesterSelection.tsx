import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchActiveRequesters, Requester } from "../api/requesters.api";
import { useRequester } from "../context/RequesterContext";
import "./RequesterSelection.css";

type ScreenState = "loading" | "empty" | "error" | "ready";

export function RequesterSelection() {
    const [state, setState] = useState<ScreenState>("loading");
    const [requesters, setRequesters] = useState<Requester[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const { selectRequester } = useRequester();
    const navigate = useNavigate();

    const load = useCallback(async () => {
        setState("loading");
        try {
            const data = await fetchActiveRequesters();
            if (data.length === 0) {
                setState("empty");
            } else {
                setRequesters(data);
                setState("ready");
            }
        } catch {
            setState("error");
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function handleContinue() {
        const requester = requesters.find((r) => String(r.id) === selectedId);
        if (!requester) return;
        selectRequester(requester);
        navigate("/my-tickets");
    }

    return (
        <div className="requester-select-page">
            <div className="requester-select-card">
                <h1 className="requester-select-title">TokTickIT</h1>
                <p className="requester-select-subtitle">
                    Select a Development Requester to test requester-specific ticket behavior.
                    This is not a login screen. Authentication and role-based access will be
                    introduced in Lab 3.
                </p>

                {state === "loading" && (
                    <div data-testid="requester-select-loading" className="requester-select-loading">
                        Loading requesters…
                    </div>
                )}

                {state === "empty" && (
                    <div data-testid="requester-select-empty" className="requester-select-empty">
                        No active requesters are available. Contact your administrator.
                    </div>
                )}

                {state === "error" && (
                    <div data-testid="requester-select-error" className="requester-select-error">
                        <p>Failed to load requesters. Please try again.</p>
                        <button type="button" className="btn btn-secondary" onClick={load}>
                            Retry
                        </button>
                    </div>
                )}

                {state === "ready" && (
                    <div className="requester-select-form">
                        <label htmlFor="requester-select" className="field-label">
                            Select Requester
                        </label>
                        <select
                            id="requester-select"
                            aria-label="Select Requester"
                            className="field-select"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                        >
                            <option value="">Choose a requester…</option>
                            {requesters.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name} — {r.email}
                                </option>
                            ))}
                        </select>

                        <p className="requester-select-info">Only active development requesters are shown.</p>

                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!selectedId}
                            onClick={handleContinue}
                        >
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}