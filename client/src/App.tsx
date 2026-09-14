import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from "./context/AuthContext";
import { AuthGuard } from "./components/AuthGuard";
import { RequesterProvider } from "./context/RequesterContext";
import { RequesterBadge } from "./components/RequesterBadge";
import { Login } from "./pages/Login";
import { ChangePassword } from "./pages/ChangePassword";
import { SystemCheck } from "./pages/SystemCheck";
import { CreateTicket } from "./pages/CreateTicket";
import { MyTickets } from "./pages/MyTickets";
import { RequesterTicketDetail } from "./pages/RequesterTicketDetail";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RequesterProvider>
          <RequesterBadge />
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Root — Lab 1 system check, protected */}
            <Route
              path="/"
              element={
                <AuthGuard>
                  <SystemCheck />
                </AuthGuard>
              }
            />

            {/* Requester screens */}
            <Route path="/create-ticket" element={<AuthGuard><CreateTicket /></AuthGuard>} />
            <Route path="/my-tickets" element={<AuthGuard><MyTickets /></AuthGuard>} />
            <Route path="/tickets/:id" element={<AuthGuard><RequesterTicketDetail /></AuthGuard>} />

            {/* Catch-all: redirect unknown/unauthenticated URLs to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </RequesterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}