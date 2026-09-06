import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import "./RequesterBadge.css";

// Ref: docs/lab-02/ui-spec.md section 8 (Application Shell)

export function RequesterBadge() {
    const { selectedRequester, changeRequester } = useRequester();
    const navigate = useNavigate();
    const location = useLocation();

    // Hide shell on Requester Selection screen
    if (!selectedRequester || location.pathname === "/select-requester") return null;

    function handleChange() {
        changeRequester();
        navigate("/select-requester");
    }

    return (
        <header className="app-shell-header">
            <div className="app-shell-container">
                <div className="app-shell-left">
                    <Link to="/my-tickets" className="app-brand">
                        TokTickIT
                    </Link>
                    <nav className="app-nav" aria-label="Main Navigation">
                        <Link
                            to="/my-tickets"
                            className={`app-nav-link ${location.pathname === "/my-tickets" ? "active" : ""}`}
                        >
                            My Tickets
                        </Link>
                        <Link
                            to="/create-ticket"
                            className={`app-nav-link ${location.pathname === "/create-ticket" ? "active" : ""}`}
                        >
                            Create Ticket
                        </Link>
                    </nav>
                </div>
                <div className="requester-badge" data-testid="requester-badge">
                    <span className="requester-badge-name">{selectedRequester.name}</span>
                    <button type="button" className="requester-badge-change" onClick={handleChange}>
                        Change Requester
                    </button>
                </div>
            </div>
        </header>
    );
}