import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { useAuth } from "../context/AuthContext";
import "./RequesterBadge.css";

// Ref: docs/lab-03/ui-spec.md section 3.1 (Authenticated App Shell)
// - Replaces Dev Requester display: shows user's name + role badge, top-right.
// - "Logout" button replaces "Change Requester" — clears session, redirects to /login.

export function RequesterBadge() {
    const { selectedRequester, changeRequester } = useRequester();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Hide shell on Login and Dev Requester Selection screens
    if (location.pathname === "/select-requester" || location.pathname === "/login") return null;

    async function handleLogout() {
        await logout();
        changeRequester();
        navigate("/login");
    }

    function handleChange() {
        changeRequester();
        navigate("/select-requester");
    }

    // Authenticated user shell (Lab 3)
    if (user) {
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
                    <div className="requester-badge" data-testid="auth-badge">
                        <span className="requester-badge-name me-2">{user.name}</span>
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
        );
    }

    // Fallback for Lab 2 dev requester flow
    if (!selectedRequester) return null;

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