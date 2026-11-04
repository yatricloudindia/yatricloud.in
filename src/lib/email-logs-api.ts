/**
 * Email Logs API
 * CRUD helpers for the email_logs table (admin-only via RLS).
 */

import { supabase } from "@/lib/supabase";

export interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  template_key: string | null;
  status: "sent" | "failed";
  error: string | null;
  metadata: Record<string, unknown>;
  sent_at: string;
  created_at: string;
}

export interface EmailLogFilters {
  status?: "sent" | "failed";
  templateKey?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/** Insert a log row, call after every sendEmail(). Non-blocking on error. */
export async function logEmail(params: {
  to: string;
  subject: string;
  templateKey?: string;
  status: "sent" | "failed";
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      return; // Skip client-side insert for unauthenticated guests (RLS restricts to authenticated users)
    }

    await (supabase as any)
      .from("email_logs")
      .insert({
        to_email: params.to,
        subject: params.subject,
        template_key: params.templateKey ?? null,
        status: params.status,
        error: params.error ?? null,
        metadata: params.metadata ?? {},
      });
  } catch (e) {
    // Non-fatal, logging should never break the main flow
    console.warn("[email-logs] Failed to insert log:", e);
  }
}

/** Fetch logs with optional filters for the admin table. */
export async function fetchEmailLogs(
  filters: EmailLogFilters = {},
  limit = 200
): Promise<EmailLog[]> {
  let query = (supabase as any)
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.templateKey) query = query.eq("template_key", filters.templateKey);
  if (filters.dateFrom) query = query.gte("sent_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("sent_at", filters.dateTo);
  // Strip characters that would break out of the PostgREST .or() filter.
  const term = (filters.search ?? "").replace(/[,()*%\\]/g, " ").trim();
  if (term) {
    query = query.or(`to_email.ilike.%${term}%,subject.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchEmailLogs error:", error.message);
    return [];
  }
  return (data ?? []) as EmailLog[];
}

/** Count logs grouped by status. */
export async function countEmailLogs(): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  // Head counts: selecting rows would be capped at PostgREST's 1000-row limit.
  const countWhere = (status?: "sent" | "failed") => {
    let q = (supabase as any)
      .from("email_logs")
      .select("id", { count: "exact", head: true });
    if (status) q = q.eq("status", status);
    return q;
  };
  const [totalRes, sentRes, failedRes] = await Promise.all([
    countWhere(),
    countWhere("sent"),
    countWhere("failed"),
  ]);
  if (totalRes.error || sentRes.error || failedRes.error)
    return { total: 0, sent: 0, failed: 0 };
  return {
    total: totalRes.count ?? 0,
    sent: sentRes.count ?? 0,
    failed: failedRes.count ?? 0,
  };
}

/** Distinct template keys for the filter dropdown. */
export async function listEmailLogTemplates(): Promise<string[]> {
  const { data } = await (supabase as any)
    .from("email_logs")
    .select("template_key")
    .not("template_key", "is", null);
  if (!data) return [];
  const set = new Set<string>(data.map((r: any) => r.template_key).filter(Boolean));
  return Array.from(set).sort();
}

/** Delete a single log row. */
export async function deleteEmailLog(id: string): Promise<void> {
  const { error } = await (supabase as any).from("email_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Delete all logs. */
export async function clearEmailLogs(): Promise<void> {
  const { error } = await (supabase as any).from("email_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
}
