/**
 * Receipts for the signed in Yatri.
 *
 * Every paid purchase (store, event, training, mentorship) writes a row to the
 * invoices table from the payment verify endpoint. Row level security lets a
 * buyer read only their own invoices, matched on their profile email, so these
 * plain client queries are already scoped to the current user. Nothing here
 * exposes a database id: invoices are addressed by their human readable number
 * (YC-YYYYMMDD-XXXX). Never throws for the caller to crash on.
 */

import { supabase } from "@/lib/supabase";
import { currencyDecimals } from "@/lib/currency-catalog";

export interface InvoiceItem {
  name: string;
  quantity?: number;
}

export interface Invoice {
  /** Human readable, e.g. YC-20260703-A1B2C3D4. Used in the URL. */
  number: string;
  /** What was bought. */
  kind: "store" | "event" | "training" | "mentorship" | "other";
  /** Friendly label for the kind. */
  kindLabel: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  currency: string;
  items: InvoiceItem[];
  /** ISO timestamp. */
  createdAt: string;
}

const KIND_LABELS: Record<string, string> = {
  store: "Store purchase",
  event: "Event",
  training: "Training",
  mentorship: "Mentorship session",
  other: "Purchase",
};

function coerceItems(raw: unknown): InvoiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it): InvoiceItem | null => {
      if (typeof it === "string") return { name: it };
      if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        const name = String(o.name ?? o.title ?? o.item ?? "").trim();
        if (!name) return null;
        const q = Number(o.quantity ?? o.qty);
        return { name, quantity: Number.isFinite(q) && q > 0 ? q : undefined };
      }
      return null;
    })
    .filter((x): x is InvoiceItem => !!x);
}

function rowToInvoice(row: Record<string, any>): Invoice {
  const kind = (row.kind as Invoice["kind"]) || "other";
  return {
    number: String(row.invoice_number || ""),
    kind,
    kindLabel: KIND_LABELS[kind] || KIND_LABELS.other,
    buyerName: String(row.buyer_name || ""),
    buyerEmail: String(row.buyer_email || ""),
    amount: Number(row.amount) || 0,
    currency: String(row.currency || "INR").toUpperCase(),
    items: coerceItems(row.items),
    createdAt: String(row.created_at || ""),
  };
}

/** All receipts for the signed in Yatri, newest first. Empty if none/not signed in. */
export async function getMyInvoices(): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number, kind, buyer_name, buyer_email, amount, currency, items, created_at")
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(rowToInvoice);
    }
  } catch (err) {
    console.warn("Client invoices fetch error:", err);
  }

  // Fallback to server endpoint to match email case-insensitively via service role
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      const res = await fetch("/api/razorpay/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "user.purchases", access_token: token }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.ok && Array.isArray(json.invoices)) {
        return json.invoices.map(rowToInvoice);
      }
    }
  } catch (apiErr) {
    console.warn("API user-purchases invoices fallback error:", apiErr);
  }

  return [];
}

/**
 * All invoices across the platform, newest first. Admin only, RLS returns rows
 * to admins (is_admin()) and to owners; call this from admin surfaces. Capped to
 * keep the payload sane; raise the limit when a real paging need appears.
 */
export async function getAllInvoices(limit = 1000): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number, kind, buyer_name, buyer_email, amount, currency, items, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  // Surface failures to the admin page (it toasts) instead of rendering "no payments".
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map(rowToInvoice);
}

/** A single receipt by its number. Null if not found or not the caller's. */
export async function getInvoiceByNumber(number: string): Promise<Invoice | null> {
  if (!number) return null;
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number, kind, buyer_name, buyer_email, amount, currency, items, created_at")
    .eq("invoice_number", number)
    .maybeSingle();
  if (error || !data) return null;
  return rowToInvoice(data);
}

/** Format a stored amount in its own currency, e.g. "$5.99", "₹499", "¥898". */
export function formatInvoiceMoney(amount: number, currency: string): string {
  const code = (currency || "INR").toUpperCase();
  const value = Number(amount) || 0;
  if (code === "INR") return `₹${Math.round(value).toLocaleString("en-IN")}`;
  const d = currencyDecimals(code);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(value);
  } catch {
    // Unknown-to-Intl code: fall back to "CODE 12.34".
    return `${code} ${value.toFixed(d)}`;
  }
}
