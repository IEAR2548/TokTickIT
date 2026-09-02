import React from "react";
import { useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";

export function RequesterBadge() {
    const { selectedRequester, changeRequester } = useRequester();
    const navigate = useNavigate();

    if (!selectedRequester) return null;

    function handleChange() {
        changeRequester();
        navigate("/select-requester");
    }

    return (
        <div className="requester-badge" data-testid="requester-badge">
            <span className="requester-badge-name">{selectedRequester.name}</span>
            <button type="button" className="requester-badge-change" onClick={handleChange}>
                Change Requester
            </button>
        </div>
    );
}