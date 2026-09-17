import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { useRequester } from "../context/RequesterContext";
import "./RequesterSelection.css";
import "./Login.css";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const navigate = useNavigate();
    const { setUser } = useAuth();
    const { selectRequester } = useRequester();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMessage(null);

        if (!email.trim() || !password) {
            setErrorMessage("Invalid email or password. Please try again.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await login({ email: email.trim(), password });
            const user = res.data;
            setUser(user);
            selectRequester({ id: user.id, name: user.name, email: user.email });

            if (user.mustChangePassword) {
                navigate("/change-password");
            } else if (user.role === "IT_STAFF") {
                navigate("/staff/queue");
            } else if (user.role === "ADMINISTRATOR") {
                navigate("/admin/users");
            } else {
                navigate("/my-tickets");
            }
        } catch {
            setErrorMessage("Invalid email or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="requester-select-page">
            {/* STYLE-02: login-card testid required by LabScreensStyle.style.test.tsx —
                .requester-select-card is the --color-surface token class */}
            <div className="requester-select-card" data-testid="login-card" style={{ maxWidth: 440 }}>
                <h1 className="requester-select-title">TokTickIT</h1>
                <p className="requester-select-subtitle">Sign in to your account</p>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3 text-start">
                        <label htmlFor="login-email" className="form-label fw-semibold">
                            Email
                        </label>
                        <input
                            id="login-email"
                            data-testid="login-email"
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div className="mb-3 text-start">
                        <label htmlFor="login-password" className="form-label fw-semibold">
                            Password
                        </label>
                        {/* Eye toggle sits INSIDE the input box (overlaid right edge) */}
                        <div className="password-input-wrapper">
                            <input
                                id="login-password"
                                data-testid="login-password"
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                            >
                                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>

                    {errorMessage && (
                        <div
                            data-testid="login-error"
                            className="alert alert-danger py-2 text-start mb-3"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    {/* STYLE-02: btn-primary binds --color-primary (required by LabScreensStyle.style.test.tsx) */}
                    <button
                        type="submit"
                        data-testid="login-submit"
                        className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center"
                        disabled={isLoading}
                    >
                        {isLoading && (
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                        )}
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
