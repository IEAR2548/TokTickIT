import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { validatePassword } from "../validators/password.validator";
import { UpdateUserPatch, PermittedRole } from "../validators/adminUsers.validator";

// Ref: docs/lab-03/api-spec.md endpoints 26-29
// Ref: docs/lab-03/specification.md FR-20..FR-24, BR-08, BR-11, BR-29..BR-34
// Safety rules: BR-32 (cannot deactivate self), BR-33 (system must always retain
// at least one active Administrator — enforced for BOTH deactivation and
// role-changes away from Administrator) — checked before any write so the system
// can never end up with zero active Administrators through any code path here.

/** Public user shape — never includes passwordHash (BR-08/BR-12).
 * mustChangePassword is included: it is non-credential state the UI needs
 * (same field the login response exposes).
 */
function toSafeUser(user: {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
}) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
    };
}

// ---------------------------------------------------------------------------
// Endpoint 26: GET /api/admin/users
// Search by name/email substring + optional exact role filter.
// No pagination by design (Decision D-4).
// ---------------------------------------------------------------------------
export async function listAdminUsers(options: { search?: string; role?: string }) {
    const where: any = {};

    if (options.search && options.search.trim().length > 0) {
        const needle = options.search.trim();
        where.OR = [
            { name: { contains: needle } },
            { email: { contains: needle } },
        ];
    }

    if (options.role) {
        where.role = options.role;
    }

    const users = await prisma.user.findMany({
        where,
        orderBy: { id: "asc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
        },
    });

    return users;
}

// ---------------------------------------------------------------------------
// Endpoint 27: POST /api/admin/users
// BR-11 duplicate email -> null (controller maps to 409 DUPLICATE_EMAIL)
// ---------------------------------------------------------------------------
export async function createAdminUser(input: {
    name: string;
    email: string;
    role: PermittedRole;
    isActive: boolean;
    initialPassword: string;
}): Promise<{ conflict?: true; user?: ReturnType<typeof toSafeUser> }> {
    const email = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return { conflict: true };
    }

    // BR-07/BR-08: hash before storage, never persist plaintext
    const passwordHash = await bcrypt.hash(input.initialPassword, 10);

    // BR-31 analog: a user created with an initial password must change it at
    // first login (AC-30 — mustChangePassword initialized true).
    const created = await prisma.user.create({
        data: {
            name: input.name.trim(),
            email,
            passwordHash,
            role: input.role,
            isActive: input.isActive,
            mustChangePassword: true,
        },
    });

    return { user: toSafeUser(created) };
}

// ---------------------------------------------------------------------------
// Endpoint 28: PATCH /api/admin/users/:id
// BR-32 / BR-33 are evaluated against the CURRENT database state before the
// write, so no partial failure can leave zero active Administrators.
// ---------------------------------------------------------------------------
export async function updateAdminUser(
    targetId: number,
    patch: UpdateUserPatch,
    callerUserId: number
): Promise<{
    notFound?: true;
    conflict?: true;
    cannotDeactivateSelf?: true;
    lastActiveAdmin?: true;
    user?: ReturnType<typeof toSafeUser>;
}> {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
        return { notFound: true };
    }

    // BR-11 (email uniqueness, excluding the target itself)
    if (patch.email !== undefined) {
        const clash = await prisma.user.findUnique({ where: { email: patch.email } });
        if (clash && clash.id !== targetId) {
            return { conflict: true };
        }
    }

    // BR-33 is evaluated BEFORE BR-32: the system-integrity invariant (at least
    // one active Administrator must always remain) is the more specific/systemic
    // condition, so when a request violates both it is reported as
    // LAST_ACTIVE_ADMIN. With a single-Administrator seed every last-admin
    // deactivation attempt is necessarily also self-deactivation (the caller
    // must be an active Administrator), so the precedence is what keeps the two
    // rules distinguishable.
    // BR-33: the system must always retain at least one active Administrator.
    // Applies when deactivating an active Administrator OR role-changing an
    // active Administrator away from ADMINISTRATOR.
    const losesActiveAdmin =
        target.role === "ADMINISTRATOR" &&
        target.isActive &&
        (patch.isActive === false || (patch.role !== undefined && patch.role !== "ADMINISTRATOR"));

    if (losesActiveAdmin) {
        const otherActiveAdmins = await prisma.user.count({
            where: {
                role: "ADMINISTRATOR",
                isActive: true,
                id: { not: targetId },
            },
        });
        if (otherActiveAdmins === 0) {
            return { lastActiveAdmin: true };
        }
    }

    // BR-32: an Administrator cannot deactivate their own account
    if (patch.isActive === false && target.id === callerUserId) {
        return { cannotDeactivateSelf: true };
    }

    const updated = await prisma.user.update({
        where: { id: targetId },
        data: {
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.email !== undefined ? { email: patch.email } : {}),
            ...(patch.role !== undefined ? { role: patch.role } : {}),
            ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        },
    });

    return { user: toSafeUser(updated) };
}

// ---------------------------------------------------------------------------
// Endpoint 29: PATCH /api/admin/users/:id/password  (BR-31)
// Sets a new initial password and flags the target mustChangePassword=true.
// ---------------------------------------------------------------------------
export async function setAdminUserPassword(
    targetId: number,
    newPassword: string
): Promise<{ notFound?: true; invalidPassword?: true; user?: ReturnType<typeof toSafeUser> }> {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
        return { notFound: true };
    }

    // BR-07: enforce password rules
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
        return { invalidPassword: true };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
        where: { id: targetId },
        data: { passwordHash, mustChangePassword: true },
    });

    return { user: toSafeUser(updated) };
}
