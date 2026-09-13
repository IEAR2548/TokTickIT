import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./Badge";
import "./RequesterBadge.css";

// Ref: docs/lab-03/ui-spec.md section 3.1 (Authenticated App Shell)
// - Replaces Dev Requester display: shows user's name + role badge, top-right.
// - "Logout" button replaces "Change Requester" — clears session, redirects to /login.
// - Role-filtered navigation (Decision D-5):
//   Requester: My Tickets, Create Ticket
//   IT Staff: My Queue
//   Administrator: My Queue, Users (Admin)

export function RequesterBadge() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Hide shell on Login and Change Password screens
    if (location.pathname === "/login" || location.pathname === "/change-password") return null;

    if (!user) return null;

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    const isRequester = user.role === "REQUESTER";
    const isStaffOrAdmin = user.role === "IT_STAFF" || user.role === "ADMINISTRATOR";
    const isAdmin = user.role === "ADMINISTRATOR";

    const brandDestination = isRequester ? "/my-tickets" : "/staff/queue";

    return (
        <header className="app-shell-header">
            <div className="app-shell-container">
                <div className="app-shell-left">
                    <Link to={brandDestination} className="app-brand">
                        TokTickIT
                    </Link>
                    <nav className="app-nav" aria-label="Main Navigation">
                        {isRequester && (
                            <>
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
                            </>
                        )}
                        {isStaffOrAdmin && (
                            <Link
                                to="/staff/queue"
                                className={`app-nav-link ${location.pathname.startsWith("/staff") ? "active" : ""}`}
                            >
                                My Queue
                            </Link>
                        )}
                        {isAdmin && (
                            <Link
                                to="/admin/users"
                                className={`app-nav-link ${location.pathname.startsWith("/admin") ? "active" : ""}`}
                            >
                                Users (Admin)
                            </Link>
                        )}
                    </nav>
                </div>
                <div className="requester-badge" data-testid="auth-badge">
                    <span className="requester-badge-name me-2">{user.name}</span>
                    <Badge kind="role" value={user.role} />
                    <button
                        type="button"
                        className="btn btn-outline-light btn-sm ms-2"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}