import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import {
    AdminUser,
    fetchUsers,
    createUser,
    updateUser,
    setUserPassword,
    AdminApiError,
} from "../api/adminUsers.api";
import { Badge } from "../components/Badge";
import "./UserManagement.css";

// Ref: docs/lab-03/ui-spec.md section 7 (Administrator User Management)
// Ref: docs/lab-03/specification.md FR-20..FR-24, AC-17..AC-21, AC-30, AC-31,
//      BR-29..BR-34, Decision D-2 (no email delivery), D-4 (no pagination)

type PanelMode = "closed" | "create" | "edit";

const ROLES = [
    { value: "REQUESTER", label: "Requester" },
    { value: "IT_STAFF", label: "IT Staff" },
    { value: "ADMINISTRATOR", label: "Administrator" },
] as const;

/** BR-07-compliant random password generated client-side (Decision D-2 helper). */
function generatePassword(): string {
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const specials = "!@#$%^&*";
    const all = uppers + lowers + numbers + specials;

    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    // Guarantee one of each required class, then pad to 14 chars
    const chars = [pick(uppers), pick(lowers), pick(numbers), pick(specials)];
    while (chars.length < 14) {
        chars.push(pick(all));
    }
    // Fisher-Yates shuffle so required characters are not positionally predictable
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

export function UserManagement() {
    const { user: caller, isLoading: authLoading } = useAuth();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [hasEverHadUsers, setHasEverHadUsers] = useState<boolean | null>(null);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("");

    const [panelMode, setPanelMode] = useState<PanelMode>("closed");
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    // Form fields
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formRole, setFormRole] = useState("REQUESTER");
    const [formActive, setFormActive] = useState(true);
    const [formPassword, setFormPassword] = useState("");

    // Form feedback
    const [saving, setSaving] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const requestSeqRef = useRef(0);

    const isFiltered = Boolean(search || roleFilter || activeFilter);

    const loadUsers = useCallback(async () => {
        const seq = ++requestSeqRef.current;
        setStatus("loading");
        setErrorMessage("");

        try {
            const data = await fetchUsers({
                search: search || undefined,
                role: roleFilter || undefined,
                isActive: activeFilter === "" ? undefined : activeFilter === "true",
            });
            if (seq !== requestSeqRef.current) return;

            setUsers(data);
            if (!isFiltered) {
                setHasEverHadUsers(data.length > 0);
            }
            setStatus("ready");
        } catch (err: any) {
            if (seq !== requestSeqRef.current) return;
            setErrorMessage(err.message || "Failed to load users.");
            setStatus("error");
        }
    }, [search, roleFilter, activeFilter, isFiltered]);

    useEffect(() => {
        if (!authLoading) {
            loadUsers();
        }
    }, [loadUsers, authLoading]);

    function openCreate() {
        setPanelMode("create");
        setEditingUser(null);
        setFormName("");
        setFormEmail("");
        setFormRole("REQUESTER");
        setFormActive(true);
        setFormPassword("");
        setEmailError("");
        setFormError("");
        setSuccessMessage("");
    }

    function openEdit(target: AdminUser) {
        setPanelMode("edit");
        setEditingUser(target);
        setFormName(target.name);
        setFormEmail(target.email);
        setFormRole(target.role);
        setFormActive(target.isActive);
        setFormPassword("");
        setEmailError("");
        setFormError("");
        setSuccessMessage("");
    }

    function closePanel() {
        setPanelMode("closed");
        setEditingUser(null);
        setEmailError("");
        setFormError("");
    }

    function clearFilters() {
        setSearchInput("");
        setSearch("");
        setRoleFilter("");
        setActiveFilter("");
    }

    function handleSearchSubmit(e: FormEvent) {
        e.preventDefault();
        setSearch(searchInput.trim());
    }

    // BR-32/BR-33 (UI-11): the Deactivate button is disabled + tooltip — never
    // hidden — when the target is the caller's own account, or the last active
    // Administrator among the loaded users.
    const isSelf = Boolean(editingUser && caller && editingUser.id === caller.id);
    const isLastActiveAdmin = Boolean(
        editingUser &&
            editingUser.role === "ADMINISTRATOR" &&
            editingUser.isActive &&
            users.filter(
                (u) => u.role === "ADMINISTRATOR" && u.isActive && u.id !== editingUser.id
            ).length === 0
    );
    const deactivateDisabled = Boolean(editingUser) && (isSelf || isLastActiveAdmin);
    const deactivateTooltip = isSelf
        ? "You cannot deactivate your own account."
        : isLastActiveAdmin
        ? "Cannot deactivate the last active Administrator."
        : undefined;

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        if (!panelMode || panelMode === "closed") return;

        setSaving(true);
        setEmailError("");
        setFormError("");
        setSuccessMessage("");

        try {
            if (panelMode === "create") {
                await createUser({
                    name: formName.trim(),
                    email: formEmail.trim(),
                    role: formRole,
                    isActive: formActive,
                    initialPassword: formPassword,
                });
                setSuccessMessage("User created successfully.");
            } else if (editingUser) {
                await updateUser(editingUser.id, {
                    name: formName.trim(),
                    email: formEmail.trim(),
                    role: formRole,
                    isActive: formActive,
                });
                // Optional: setting a new initial password during edit (BR-31)
                if (formPassword.length > 0) {
                    await setUserPassword(editingUser.id, formPassword);
                }
                setSuccessMessage("User saved successfully.");
            }

            setPanelMode("closed");
            setEditingUser(null);
            await loadUsers();
        } catch (err: any) {
            const apiErr = err as AdminApiError;
            if (apiErr.code === "DUPLICATE_EMAIL") {
                setEmailError("Email address is already in use.");
            } else {
                setFormError(apiErr.message || "Failed to save user.");
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleDeactivate() {
        if (!editingUser || deactivateDisabled) return;
        setSaving(true);
        setFormError("");
        try {
            await updateUser(editingUser.id, { isActive: false });
            setSuccessMessage("User deactivated.");
            setPanelMode("closed");
            setEditingUser(null);
            await loadUsers();
        } catch (err: any) {
            setFormError(err.message || "Failed to deactivate user.");
        } finally {
            setSaving(false);
        }
    }

    const isEmpty = status === "ready" && users.length === 0 && !isFiltered && hasEverHadUsers === false;
    const isNoResults = status === "ready" && users.length === 0 && (isFiltered || hasEverHadUsers === true);

    return (
        <div className="admin-users-container" data-testid="admin-users-container">
            <header className="admin-users-header">
                <h1 className="admin-users-title">User Management</h1>
                <button
                    type="button"
                    className="btn btn-primary admin-users-create-btn"
                    data-testid="admin-create-user-button"
                    onClick={openCreate}
                >
                    + Create User
                </button>
            </header>

            {successMessage && (
                <div className="admin-users-banner admin-users-banner-success" role="status">
                    {successMessage}
                </div>
            )}

            <div className="admin-users-controls">
                <form className="admin-users-search-form" onSubmit={handleSearchSubmit}>
                    <input
                        type="search"
                        className="admin-users-search-input"
                        data-testid="admin-user-search"
                        placeholder="Search by name or email…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </form>
                <select
                    className="admin-users-role-filter"
                    data-testid="admin-user-role-filter"
                    aria-label="Filter by role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="">All Roles</option>
                    {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <select
                    className="admin-users-status-filter"
                    data-testid="admin-user-status-filter"
                    aria-label="Filter by status"
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>
            </div>

            {status === "loading" && (
                <div data-testid="admin-user-list-loading">
                    <div className="admin-users-skeleton-row" />
                    <div className="admin-users-skeleton-row" />
                    <div className="admin-users-skeleton-row" />
                </div>
            )}

            {status === "error" && (
                <div className="admin-users-state-box" data-testid="admin-user-list-error">
                    <div className="admin-users-state-title text-danger">Unable to load users</div>
                    <div className="admin-users-state-desc">{errorMessage}</div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={loadUsers}>
                        Retry
                    </button>
                </div>
            )}

            {isEmpty && (
                <div className="admin-users-state-box" data-testid="admin-user-list-empty">
                    <div className="admin-users-state-title">No users yet</div>
                    <p className="admin-users-state-desc">Create the first user to get started.</p>
                </div>
            )}

            {isNoResults && (
                <div className="admin-users-state-box" data-testid="admin-user-list-no-results">
                    <div className="admin-users-state-title">No users match your search</div>
                    <p className="admin-users-state-desc">
                        Try adjusting or clearing your search and filters.
                    </p>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                        Clear filters
                    </button>
                </div>
            )}

            {/* Table stays in the DOM whenever the list is loaded (stable testids) */}
            {status === "ready" && users.length > 0 && (
                <div className="admin-users-table-wrapper">
                    <table className="admin-users-table" data-testid="admin-user-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} data-testid={`admin-user-row-${u.id}`}>
                                    <td data-label="Name">{u.name}</td>
                                    <td data-label="Email">{u.email}</td>
                                    <td data-label="Role">
                                        <Badge kind="role" value={u.role} />
                                    </td>
                                    <td data-label="Status">
                                        <span
                                            className={`admin-users-status-pill ${
                                                u.isActive ? "active" : "inactive"
                                            }`}
                                        >
                                            {u.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td data-label="Actions">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => openEdit(u)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {panelMode !== "closed" && (
                <aside
                    className={`admin-user-slideover ${panelMode === "edit" ? "edit-mode" : ""}`}
                    data-testid="admin-user-form"
                    aria-label={panelMode === "create" ? "Create User" : "Edit User"}
                >
                    <h2 className="admin-user-slideover-title">
                        {panelMode === "create" ? "Create User" : `Edit User: ${editingUser?.name}`}
                    </h2>

                    {formError && (
                        <div className="admin-users-banner admin-users-banner-error" role="alert" data-testid="admin-user-form-error">
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSave} noValidate>
                        <div className="admin-user-field">
                            <label htmlFor="admin-user-form-name-input">Full Name *</label>
                            <input
                                id="admin-user-form-name-input"
                                type="text"
                                data-testid="admin-user-form-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="admin-user-field">
                            <label htmlFor="admin-user-form-email-input">Email Address *</label>
                            <input
                                id="admin-user-form-email-input"
                                type="text"
                                data-testid="admin-user-form-email"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                aria-invalid={Boolean(emailError)}
                                aria-describedby={emailError ? "admin-user-form-email-error" : undefined}
                                required
                            />
                            {emailError && (
                                <p
                                    id="admin-user-form-email-error"
                                    role="alert"
                                    className="admin-user-field-error"
                                    data-testid="admin-user-form-email-error"
                                >
                                    {emailError}
                                </p>
                            )}
                        </div>

                        <div className="admin-user-field">
                            <label htmlFor="admin-user-form-role-input">Role *</label>
                            <select
                                id="admin-user-form-role-input"
                                data-testid="admin-user-form-role"
                                value={formRole}
                                onChange={(e) => setFormRole(e.target.value)}
                            >
                                {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="admin-user-field admin-user-field-toggle">
                            <label htmlFor="admin-user-form-active-input">Active</label>
                            <input
                                id="admin-user-form-active-input"
                                type="checkbox"
                                data-testid="admin-user-form-active"
                                checked={formActive}
                                onChange={(e) => setFormActive(e.target.checked)}
                            />
                        </div>

                        {/* Initial Password — plain text field, no email-delivery checkbox (D-2) */}
                        <fieldset className="admin-user-password-section">
                            <legend>Initial Password</legend>
                            <div className="admin-user-field">
                                <label htmlFor="admin-user-form-password-input">
                                    {panelMode === "create"
                                        ? "Initial Password *"
                                        : "New Initial Password (optional)"}
                                </label>
                                <div className="admin-user-password-row">
                                    <input
                                        id="admin-user-form-password-input"
                                        type="text"
                                        autoComplete="off"
                                        data-testid="admin-user-form-password"
                                        value={formPassword}
                                        onChange={(e) => setFormPassword(e.target.value)}
                                        required={panelMode === "create"}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        data-testid="admin-user-form-generate-password"
                                        onClick={() => setFormPassword(generatePassword())}
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>
                        </fieldset>

                        <div className="admin-user-actions">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                data-testid="admin-user-form-save"
                                disabled={saving}
                            >
                                {saving ? "Saving…" : "Save User"}
                            </button>
                            {panelMode === "edit" && (
                                <button
                                    type="button"
                                    className="btn btn-destructive"
                                    data-testid="admin-user-form-deactivate"
                                    onClick={handleDeactivate}
                                    disabled={deactivateDisabled || saving}
                                    title={deactivateTooltip}
                                >
                                    Deactivate User
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                data-testid="admin-user-form-cancel"
                                onClick={closePanel}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </aside>
            )}
        </div>
    );
}
