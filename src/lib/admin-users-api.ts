import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/lib/auth";
import type { AdminRole } from "@/lib/permissions";

/**
 * Admin role & permission management, client layer.
 *
 * Reads (list / my permissions) go straight to Supabase (RLS-gated: admins may
 * read `admin_users`). Mutations (create / reset password / delete / update)
 * CANNOT run in the browser (they need the Auth admin API + service role), so
 * they POST to the `/api/admin-users` server route.
 */

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole | string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface MyPermissions {
  role: AdminRole | string | null;
  permissions: string[];
  isActive: boolean;
}

/** Admin: list every managed admin (joined with their profile). */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, role, permissions, is_active, created_at, profiles!admin_users_id_fkey(full_name, email)");
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    id: r.id,
    email: r.profiles?.email || "",
    fullName: r.profiles?.full_name || "",
    role: r.role || "admin",
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
    isActive: !!r.is_active,
    createdAt: r.created_at || "",
  }));
}

/**
 * Current user's role + permissions.
 *
 * Back-compat/bootstrap: an existing `profiles.role === 'admin'` with NO
 * admin_users row is treated as super_admin ONLY while the admin_users table is
 * still empty (fresh system). Once the table is configured, every admin must
 * have a row, an admin without one gets no page access (forces proper setup).
 */
export async function getMyPermissions(): Promise<MyPermissions> {
  const profile = await fetchMyProfile();
  if (!profile || !profile.id) {
    return { role: null, permissions: [], isActive: false };
  }

  const { data } = await supabase
    .from("admin_users")
    .select("role, permissions, is_active")
    .eq("id", profile.id)
    .maybeSingle();

  if (data) {
    // A disabled admin keeps the row (for audit) but opens no admin page.
    if (!data.is_active) return { role: null, permissions: [], isActive: false };
    return {
      role: data.role || "admin",
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      isActive: !!data.is_active,
    };
  }

  // Also check if user is registered in website_team
  try {
    const cleanEmail = (profile.email || "").trim().toLowerCase();
    // Match by user_id first, then by the exact email (LIKE wildcards escaped so
    // "a_b@x.com" cannot match another member's row; no raw text in an .or() filter).
    let { data: teamData } = await supabase
      .from("website_team")
      .select("system_role, permissions, status")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!teamData && cleanEmail) {
      ({ data: teamData } = await supabase
        .from("website_team")
        .select("system_role, permissions, status")
        .ilike("email", cleanEmail.replace(/[\\%_]/g, (c) => `\\${c}`))
        .maybeSingle());
    }

    if (teamData && teamData.status !== "inactive") {
      return {
        role: teamData.system_role || "team",
        permissions: Array.isArray(teamData.permissions) ? teamData.permissions : [],
        isActive: true,
      };
    }
  } catch (err) {
    console.warn("Could not query website_team for permissions:", err);
  }

  // No row: bootstrap check.
  let adminCount: number | null = null;
  try {
    const { count } = await supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true });
    adminCount = count ?? 0;
  } catch {
    adminCount = null;
  }

  // Bootstrap only on a confirmed-empty table (a failed count must not grant super_admin).
  if (profile.role === "admin" && adminCount === 0) {
    return { role: "super_admin", permissions: [], isActive: true };
  }
  // Once admin_users is configured, an admin without a row gets no page access
  // (never an implicit super_admin).
  return { role: null, permissions: [], isActive: false };
}

// ---------------------------------------------------------------------------
// Server-backed mutations (POST /api/admin-users)
// ---------------------------------------------------------------------------

interface AdminResult {
  ok: boolean;
  email?: string;
  tempPassword?: string;
  userId?: string;
  message?: string;
}

async function adminRequest<T extends AdminResult = AdminResult>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("You must be signed in as an admin.");
  // Admin-role ops are served by the /api/razorpay/admin gateway (one function,
  // many actions) to stay within the serverless-function budget.
  const res = await fetch("/api/razorpay/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, action: `adminUsers.${action}`, ...payload }),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export function createAdminUser(p: {
  email: string;
  fullName?: string;
  role: AdminRole | string;
  permissions?: string[];
}): Promise<AdminResult> {
  return adminRequest("create", p);
}

export function updateAdminUser(p: {
  userId: string;
  role?: AdminRole | string;
  permissions?: string[];
  isActive?: boolean;
}): Promise<AdminResult> {
  return adminRequest("update", p);
}

export function resetAdminPassword(userId: string): Promise<AdminResult> {
  return adminRequest("resetPassword", { userId });
}

export function deleteAdminUser(userId: string): Promise<AdminResult> {
  return adminRequest("delete", { userId });
}
