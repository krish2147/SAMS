/**
 * Staff roles and what they may do. Shared by the server and the console so they cannot drift.
 *
 * "developer" is the system developer's own account. It has every permission an Academy
 * Partner (super_admin) has, which is every staff permission, but is shown as Developer and
 * can only be created or removed by another developer.
 */
export const STAFF_ROLES = ["developer", "super_admin", "admin", "staff", "receptionist", "coach"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const isStaffRole = (role: unknown): role is StaffRole => STAFF_ROLES.includes(String(role) as StaffRole);

/** The role a permission check should use. A developer passes every check a super_admin passes. */
export const accessRole = (role: unknown): string => (role === "developer" ? "super_admin" : String(role ?? ""));

/** Admin-level access: developer, super_admin or admin. */
export const hasAdminAccess = (role: unknown) => ["super_admin", "admin"].includes(accessRole(role));

export const roleLabel = (role: unknown): string =>
  ({
    developer: "Developer",
    super_admin: "Academy Partner",
    admin: "Admin",
    staff: "Reception",
    receptionist: "Receptionist",
    coach: "Coach",
  } as Record<string, string>)[String(role)] || String(role ?? "");
