import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import "./RequesterSelection.css";
import "./ChangePassword.css";

export function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const navigate = useNavigate();
    const { user, setUser } = useAuth();

    // Rule checks
    const hasLength = newPassword.length >= 8;
    const hasCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasNumberAndSpecial = /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
    const allRulesSatisfied = hasLength && hasCase && hasNumberAndSpecial;

    const hasConfirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const isConfirmValid = confirmPassword.length > 0 && newPassword === confirmPassword;

    const canSubmit = currentPassword.length > 0 && allRulesSatisfied && isConfirmValid && !isLoading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;

        setIsLoading(true);
        setServerError(null);

        try {
            await changePassword({ currentPassword, newPassword });
            if (user) {
                setUser({ ...user, mustChangePassword: false });
            }
            if (user?.role === "IT_STAFF") {
                navigate("/staff/queue");
            } else if (user?.role === "ADMINISTRATOR") {
                navigate("/admin/users");
            } else {
                navigate("/my-tickets");
            }
        } catch (err: any) {
            setServerError(err.message || "Failed to change password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="requester-select-page">
            <div className="requester-select-card" style={{ maxWidth: 480 }}>
                <h1 className="requester-select-title">TokTickIT</h1>
                <p className="requester-select-subtitle">
                    Password change required. Please choose a strong password to continue.
                </p>

                {serverError && (
                    <div className="alert alert-danger py-2 text-start mb-3" role="alert">
                        {serverError}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3 text-start">
                        <label htmlFor="change-password-current" className="form-label fw-semibold">
                            Current (Temporary) Password
                        </label>
                        <input
                            id="change-password-current"
                            data-testid="change-password-current"
                            type="password"
                            className="form-control"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="Enter current password"
                            required
                        />
                    </div>

                    <div className="mb-3 text-start">
                        <label htmlFor="change-password-new" className="form-label fw-semibold">
                            New Password
                        </label>
                        <input
                            id="change-password-new"
                            data-testid="change-password-new"
                            type="password"
                            className="form-control"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="Enter new password"
                            required
                        />

                        {/* Live checklist */}
                        <div className="mt-2 p-2 bg-light rounded text-muted small">
                            <div
                                data-testid="change-password-rule-length"
                                /* STYLE-03: rule-met / rule-unmet classes required by
                                   LabScreensStyle.style.test.tsx (visible pass/fail indicator) */
                                className={`d-flex align-items-center mb-1 password-rule ${hasLength ? "rule-met satisfied text-success fw-semibold" : "rule-unmet"}`}
                            >
                                <i className={`bi me-2 ${hasLength ? "bi-check-circle-fill" : "bi-circle"}`}></i>
                                Be at least 8 characters
                            </div>
                            <div
                                data-testid="change-password-rule-case"
                                className={`d-flex align-items-center mb-1 password-rule ${hasCase ? "rule-met satisfied text-success fw-semibold" : "rule-unmet"}`}
                            >
                                <i className={`bi me-2 ${hasCase ? "bi-check-circle-fill" : "bi-circle"}`}></i>
                                Include upper and lower case letters
                            </div>
                            <div
                                data-testid="change-password-rule-number-special"
                                className={`d-flex align-items-center password-rule ${hasNumberAndSpecial ? "rule-met satisfied text-success fw-semibold" : "rule-unmet"}`}
                            >
                                <i className={`bi me-2 ${hasNumberAndSpecial ? "bi-check-circle-fill" : "bi-circle"}`}></i>
                                Include a number and a special character
                            </div>
                        </div>
                    </div>

                    <div className="mb-3 text-start">
                        <label htmlFor="change-password-confirm" className="form-label fw-semibold">
                            Confirm New Password
                        </label>
                        <input
                            id="change-password-confirm"
                            data-testid="change-password-confirm"
                            type="password"
                            className={`form-control ${hasConfirmMismatch ? "is-invalid" : ""}`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="Confirm new password"
                            required
                        />
                        {hasConfirmMismatch && (
                            <div className="invalid-feedback d-block mt-1">
                                Passwords do not match
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        data-testid="change-password-submit"
                        className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center"
                        disabled={!canSubmit}
                    >
                        {isLoading && (
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                        )}
                        Continue
                    </button>
                </form>
            </div>
        </div>
    );
}
