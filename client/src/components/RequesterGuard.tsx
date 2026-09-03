import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";

interface RequesterGuardProps {
    children: ReactNode;
}

export function RequesterGuard({ children }: RequesterGuardProps) {
    const { selectedRequester } = useRequester();

    if (!selectedRequester) {
        return <Navigate to="/select-requester" replace />;
    }

    return <>{children}</>;
}