import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from "./context/AuthContext";
import { AuthGuard } from "./components/AuthGuard";
import { RequesterProvider } from "./context/RequesterContext";
import { RequesterGuard } from "./components/RequesterGuard";
import { RequesterBadge } from "./components/RequesterBadge";
import { Login } from "./pages/Login";
import { ChangePassword } from "./pages/ChangePassword";
import { RequesterSelection } from "./pages/RequesterSelection";
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

            {/* Dev Requester selector (Lab 2 compatibility) */}
            <Route path="/select-requester" element={<RequesterSelection />} />

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
            <Route path="/create-ticket" element={<AuthGuard><RequesterGuard><CreateTicket /></RequesterGuard></AuthGuard>} />
            <Route path="/my-tickets" element={<AuthGuard><RequesterGuard><MyTickets /></RequesterGuard></AuthGuard>} />
            <Route path="/tickets/:id" element={<AuthGuard><RequesterGuard><RequesterTicketDetail /></RequesterGuard></AuthGuard>} />

            {/* Catch-all: redirect unknown/unauthenticated URLs to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </RequesterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}