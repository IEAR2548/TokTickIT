import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRequester } from "../context/RequesterContext";

interface AuthGuardProps {
    children: ReactNode;
    allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const { user, isLoading } = useAuth();
    const { selectedRequester, selectRequester } = useRequester();
    const location = useLocation();

    useEffect(() => {
        if (
            user &&
            user.role === "REQUESTER" &&
            (!selectedRequester || selectedRequester.id !== user.id)
        ) {
            selectRequester({ id: user.id, name: user.name, email: user.email });
        }
    }, [user, selectedRequester, selectRequester]);

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading session...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.mustChangePassword && location.pathname !== "/change-password") {
        return <Navigate to="/change-password" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === "REQUESTER") {
            return <Navigate to="/my-tickets" replace />;
        }
        return <Navigate to="/staff/queue" replace />;
    }

    return <>{children}</>;
}
