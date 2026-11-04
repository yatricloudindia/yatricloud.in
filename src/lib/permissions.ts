import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";

/**
 * Admin role & page-permission model.
 *
 * A privileged user's `admin_users.role` is one of:
 *   super_admin · admin · manager · support · auditor
 * and `permissions` is an array of admin page paths they may open.
 *
 * super_admin and admin are FULL-ACCESS roles (they see every admin page;
 * the difference is enforced server-side, only super_admin can manage other
 * super_admins). manager / support / auditor get a curated default subset that
 * an admin can override per user.
 */

export type AdminRole = "super_admin" | "admin" | "manager" | "support" | "auditor";

export const ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "manager", "support", "auditor"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  support: "Support",
  auditor: "Auditor",
};

/** All admin page paths (leaf items across every nav group), the permission keys. */
export const ADMIN_PATHS: string[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.path));

/** Roles that implicitly see every admin page EXCEPT payment-restricted pages (only super_admin sees payments). */
const FULL_ACCESS_ROLES: AdminRole[] = ["super_admin", "admin"];

/** Strictly restricted paths: ONLY super_admin can open or see these. */
export const PAYMENT_RESTRICTED_PATHS: string[] = [
  "/admin/payments",
  "/admin/transactions",
  "/admin/coupons",
  "/admin/training/review", // financial review & pricing control
];

/** Super admin exclusive management pages. */
export const SUPER_ADMIN_ONLY_PATHS: string[] = [
  "/admin/roles",
  "/admin/team",
  ...PAYMENT_RESTRICTED_PATHS,
];

/**
 * Default page set per role (excluding full-access roles, which are "all").
 * These are the paths an admin can tweak per user in the role-management UI.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [],
  admin: [],
  manager: [
    "/admin/yatris",
    "/admin/tickets",
    "/admin/training",
    "/admin/training/create",
    "/admin/training/attendance",
    "/admin/enrollments",
    "/admin/training/reviews",
    "/admin/providers",
    "/admin/trainers",
    "/admin/events",
    "/admin/scheduling",
    "/admin/attendees",
    "/admin/submissions",
    "/admin/products",
    "/admin/exam-dumps",
    "/admin/udemy",
  ],
  support: [
    "/admin/yatris",
    "/admin/inquiries",
    "/admin/tickets",
    "/admin/reviews",
    "/admin/content-reviews",
    "/admin/resumes",
    "/admin/subscribers",
    "/admin/events",
  ],
  auditor: [
    "/admin/reviews",
    "/admin/sitemap",
  ],
};

/** The role-management page itself, only granted explicitly (super_admin). */
export const ADMIN_ROLES_PATH = "/admin/roles";
export const ADMIN_TEAM_PATH = "/admin/team";

export function isFullAccessRole(role?: AdminRole | string | null): boolean {
  return role === "super_admin";
}

export function isSuperAdmin(role?: AdminRole | string | null): boolean {
  return role === "super_admin";
}

/**
 * Can this role+permissions open `path`?
 * 1. Payment paths & Super Admin paths REQUIRE super_admin role.
 * 2. Super admin opens everything.
 * 3. Others are allowed a path if it is in their permissions array.
 */
export function canAccessPath(
  role: AdminRole | string | null | undefined,
  permissions: string[] | null | undefined,
  path: string,
): boolean {
  // Strict super_admin lockout for payments and team/role management
  const isSuperOnly = SUPER_ADMIN_ONLY_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
  if (isSuperOnly) {
    return role === "super_admin";
  }

  // Super admin can open any other route
  if (role === "super_admin") return true;

  // Regular admin (if any) can open non-financial, non-super-admin routes
  if (role === "admin") return true;

  const perms = permissions || [];
  if (perms.some((p) => path === p || (p && path.startsWith(`${p}/`)))) {
    return true;
  }

  // Map granular team feature keys to admin routes
  if ((perms.includes("calendar:schedule_only") || perms.includes("calendar:manage")) && path === "/admin/scheduling") return true;
  if (perms.includes("calendar:manage") && path === "/admin/contacts") return true;
  if (perms.includes("leads:manage") && (path === "/admin/leads" || path === "/admin/inquiries")) return true;
  if (perms.includes("training:manage") && path.startsWith("/admin/training")) return true;
  if (perms.includes("resources:manage") && (path.startsWith("/admin/resources") || path.startsWith("/admin/exam-dumps") || path === "/admin/products")) return true;
  if (perms.includes("events:manage") && (path === "/admin/events" || path === "/admin/attendees" || path === "/admin/submissions")) return true;
  if (perms.includes("support:manage") && (path === "/admin/tickets" || path === "/admin/inquiries")) return true;
  if (perms.includes("yatris:view") && path === "/admin/yatris") return true;
  if ((perms.includes("blog:write") || perms.includes("blog:review")) && path === "/admin/blog") return true;

  return false;
}

/** Default permissions for a role (used when creating a new admin of that role). */
export function defaultPermissionsForRole(role: AdminRole | string): string[] {
  return ROLE_DEFAULT_PERMISSIONS[role as AdminRole] || [];
}

/** Whether this role+permissions can open at least one admin page (gates "Admin Console" links). */
export function hasAnyAdminAccess(
  role: AdminRole | string | null | undefined,
  permissions: string[] | null | undefined,
): boolean {
  if (!role) return false;
  return ADMIN_PATHS.some((path) => canAccessPath(role, permissions, path));
}
