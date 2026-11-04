/**
 * Resources service, Supabase `resources` table.
 * Admin CRUD, public catalog listing, and user unlock (via RPC).
 * Redis is NOT yet wired in this SPA (no server runtime).
 * Cache is handled with a simple in-memory store with TTL so the
 * catalog is only fetched once per browser session unless invalidated.
 */

import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Resource {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  accessUrl: string;         // only returned after unlock
  resourceType: "link" | "file";
  isFree: boolean;
  priceInr: number;
  provider: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
}

export interface MyResource {
  id: string;               // user_resources.id
  resourceId: string;
  name: string;
  description: string;
  imageUrl: string;
  accessUrl: string;
  provider: string;
  category: string;
  resourceType: "link" | "file";
  accessedAt: string;
}

export interface ResourceFilters {
  provider?: string;
  category?: string;
  isFree?: boolean;
  search?: string;
}

// ─────────────────────────────────────────────────────────────
// Simple in-memory catalog cache (TTL: 5 min)
// ─────────────────────────────────────────────────────────────

let _catalogCache: Resource[] | null = null;
let _catalogAt = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000;

function invalidateCache() {
  _catalogCache = null;
  _catalogAt = 0;
}

// ─────────────────────────────────────────────────────────────
// Row → UI mapper
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResource(r: any): Resource {
  return {
    id: r.id,
    name: r.name ?? "",
    description: r.description ?? "",
    imageUrl: r.image_url ?? "",
    accessUrl: r.access_url ?? "",
    resourceType: r.resource_type === "file" ? "file" : "link",
    isFree: Boolean(r.is_free),
    priceInr: Number(r.price_inr ?? 0),
    provider: r.provider ?? "",
    category: r.category ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    isPublished: Boolean(r.is_published),
    createdAt: r.created_at ?? "",
  };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/** Fetch all published resources (cached). Filters applied client-side. */
export async function listResources(): Promise<Resource[]> {
  if (_catalogCache && Date.now() - _catalogAt < CATALOG_TTL_MS) {
    return _catalogCache;
  }
  const { data, error } = await supabase
    .from("resources")
    .select("id,name,description,image_url,resource_type,is_free,price_inr,provider,category,tags,is_published,created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("❌ resources fetch failed:", error?.message);
    return [];
  }
  _catalogCache = data.map(toResource);
  _catalogAt = Date.now();
  return _catalogCache;
}

export const listPublishedResources = listResources;

/** Distinct provider values for the filter dropdown. */
export async function listResourceProviders(): Promise<string[]> {
  const all = await listResources();
  const set = new Set(all.map((r) => r.provider).filter(Boolean));
  return Array.from(set).sort();
}

/** Distinct category values for the filter dropdown. */
export async function listResourceCategories(): Promise<string[]> {
  const all = await listResources();
  const set = new Set(all.map((r) => r.category).filter(Boolean));
  return Array.from(set).sort();
}

// ─────────────────────────────────────────────────────────────
// Unlock
// ─────────────────────────────────────────────────────────────

/**
 * Unlock a resource for the signed in user.
 * Calls the `grant_resource_access` Supabase RPC (SECURITY DEFINER),
 * then fires a confirmation email.
 * Returns the access_url on success.
 */
export async function unlockResource(
  resource: Pick<Resource, "id" | "name" | "description" | "provider">,
  userEmail: string,
  userName: string,
  paymentId?: string
): Promise<string> {
  const { data, error } = await supabase.rpc("grant_resource_access", {
    p_resource_id: resource.id,
    p_payment_id: paymentId ?? null,
  });

  if (error) {
    console.error("❌ grant_resource_access failed:", error.message);
    throw new Error(error.message);
  }

  const accessUrl = data as string;

  return accessUrl;
}


// ─────────────────────────────────────────────────────────────
// My Resources (authenticated user)
// ─────────────────────────────────────────────────────────────

function detectProviderFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("anthropic") || n.includes("claude")) return "anthropic";
  if (n.includes("openai") || n.includes("chatgpt")) return "openai";
  if (n.includes("snow") || n.includes("snowflake")) return "snowflake";
  if (n.includes("aws") || n.includes("amazon")) return "aws";
  if (n.includes("azure") || n.includes("microsoft")) return "azure";
  if (n.includes("gcp") || n.includes("google")) return "gcp";
  if (n.includes("redis")) return "redis";
  if (n.includes("oracle") || n.includes("oci")) return "oracle";
  if (n.includes("cisco")) return "cisco";
  if (n.includes("salesforce")) return "salesforce";
  if (n.includes("github")) return "github";
  if (n.includes("hashicorp") || n.includes("terraform") || n.includes("vault")) return "hashicorp";
  if (n.includes("docker")) return "docker";
  if (n.includes("linux") || n.includes("lfcs") || n.includes("lfce")) return "linux";
  if (n.includes("comptia") || n.includes("security+") || n.includes("network+")) return "comptia";
  if (n.includes("servicenow") || n.includes("csa") || n.includes("cad")) return "servicenow";
  if (n.includes("kubernetes") || n.includes("ckad") || n.includes("cka") || n.includes("cks")) return "kubernetes";
  return "";
}

function detectAccessUrlFromName(name: string, provider: string): string {
  const n = name.toLowerCase();
  if (n.includes("redis")) return "/examdumps/practice/redis-certified-developer";
  if (provider) return `/examdumps/${provider}`;
  return "/examdumps";
}

export async function listMyResources(): Promise<MyResource[]> {
  // Resolve the current user's UUID from the live Supabase session.
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return [];

  const { data, error } = await supabase
    .from("user_resources")
    .select(`
      id,
      resource_id,
      accessed_at,
      resources (
        name, description, image_url, access_url,
        provider, category, resource_type
      )
    `)
    .eq("user_id", authUser.id)
    .order("accessed_at", { ascending: false });

  if (error) {
    console.error("❌ listMyResources user_resources query failed:", error.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myResources: MyResource[] = (data || []).map((row: any) => {
    const r = row.resources ?? {};
    const nameLower = (r.name ?? "").toLowerCase();
    const isDumpCategory =
      (r.category ?? "").toLowerCase().includes("dump") ||
      (r.category ?? "").toLowerCase() === "exam dumps" ||
      r.access_url?.includes("drive.google.com") ||
      r.access_url?.includes("examdump") ||
      r.resource_type === "file" ||
      nameLower.includes("cert") ||
      nameLower.includes("exam") ||
      nameLower.includes("developer") ||
      nameLower.includes("architect") ||
      nameLower.includes("administrator") ||
      nameLower.includes("specialist") ||
      Boolean(r.provider);

    return {
      id: row.id,
      resourceId: row.resource_id,
      name: r.name ?? "",
      description: r.description ?? "",
      imageUrl: r.image_url ?? "",
      accessUrl: r.access_url ?? "",
      provider: r.provider ?? "",
      category: isDumpCategory ? "Exam Dumps" : (r.category ?? "Exam Guide"),
      resourceType: r.resource_type === "file" ? "file" : "link",
      accessedAt: row.accessed_at ?? "",
    };
  });

  // Helper to extract all individual items from invoice data
  function extractItemsFromInvoice(rawItems: unknown): Array<{ name: string; downloadUrl?: string; id?: string; provider?: string }> {
    let parsed = rawItems;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = String(parsed).split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const result: Array<{ name: string; downloadUrl?: string; id?: string; provider?: string }> = [];

    const addName = (n: string, extra?: { downloadUrl?: string; id?: string; provider?: string }) => {
      const cleaned = n.replace(/\s*\(x\d+\)\s*$/i, "").trim();
      if (!cleaned) return;
      if (cleaned.includes(",") && !cleaned.toLowerCase().includes("certified,")) {
        cleaned.split(",").forEach((sub) => {
          const subClean = sub.replace(/\s*\(x\d+\)\s*$/i, "").trim();
          if (subClean) result.push({ name: subClean, ...extra });
        });
      } else {
        result.push({ name: cleaned, ...extra });
      }
    };

    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (typeof entry === "string") {
          addName(entry);
        } else if (entry && typeof entry === "object") {
          const itemObj = entry as Record<string, any>;
          const name = itemObj.name || itemObj.title || itemObj.productName || "";
          const dlUrl = itemObj.downloadUrl || itemObj.download_url;
          const id = itemObj.id || itemObj.resource_id;
          const provider = itemObj.provider;
          if (typeof name === "string") {
            addName(name, { downloadUrl: dlUrl, id, provider });
          }
        }
      }
    } else if (parsed && typeof parsed === "object") {
      const itemObj = parsed as Record<string, any>;
      const name = itemObj.name || itemObj.title || "";
      if (typeof name === "string") {
        addName(name, {
          downloadUrl: itemObj.downloadUrl || itemObj.download_url,
          id: itemObj.id || itemObj.resource_id,
          provider: itemObj.provider,
        });
      }
    }

    return result;
  }

  // Reconcile purchases from invoices (e.g. store checkout, exam dumps purchases)
  try {
    const [{ data: invData }, { data: dumpsData }, { data: allResourcesData }] = await Promise.all([
      supabase
        .from("invoices")
        .select("invoice_number, kind, items, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("exam_dumps")
        .select("id, title, provider, download_url, image_url"),
      supabase
        .from("resources")
        .select("id, name, provider, access_url, image_url, resource_type"),
    ]);

    let userInvoices: any[] = Array.isArray(invData) ? invData : [];
    if (userInvoices.length === 0) {
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
            userInvoices = json.invoices;
          }
        }
      } catch (e) {
        console.warn("Could not fetch user invoices from API:", e);
      }
    }

    if (Array.isArray(userInvoices) && userInvoices.length > 0) {
      const existingNames = new Set(myResources.map((r) => r.name.toLowerCase().trim()));

      for (const inv of userInvoices) {
        const extractedItems = extractItemsFromInvoice(inv.items);
        let itemIdx = 0;
        for (const item of extractedItems) {
          itemIdx++;
          const name = item.name.trim();
          if (!name || existingNames.has(name.toLowerCase())) continue;

          // Find exact or closest match in exam_dumps table
          const matchedDump = (dumpsData || []).find((d) => {
            if (item.id && d.id === item.id) return true;
            const dt = (d.title || "").toLowerCase().trim();
            const nt = name.toLowerCase().trim();
            return dt === nt || dt.includes(nt) || nt.includes(dt);
          });

          // Find match in resources table
          const matchedResource = !matchedDump
            ? (allResourcesData || []).find((r) => {
                if (item.id && r.id === item.id) return true;
                const rt = (r.name || "").toLowerCase().trim();
                const nt = name.toLowerCase().trim();
                return rt === nt || rt.includes(nt) || nt.includes(rt);
              })
            : null;

          const provider = item.provider || matchedDump?.provider || matchedResource?.provider || detectProviderFromName(name);
          const isDumpOrGuide =
            Boolean(matchedDump) ||
            Boolean(matchedResource) ||
            Boolean(item.downloadUrl) ||
            name.toLowerCase().includes("dump") ||
            name.toLowerCase().includes("exam") ||
            name.toLowerCase().includes("certification") ||
            name.toLowerCase().includes("guide") ||
            inv.kind === "store";

          if (isDumpOrGuide) {
            existingNames.add(name.toLowerCase());

            const accessUrl =
              item.downloadUrl ||
              matchedDump?.download_url ||
              matchedResource?.access_url ||
              detectAccessUrlFromName(name, provider);

            const resourceId = matchedDump?.id || matchedResource?.id || item.id || `inv_${inv.invoice_number}_${itemIdx}`;

            myResources.push({
              id: `inv_${inv.invoice_number}_${resourceId}_${itemIdx}`,
              resourceId: resourceId,
              name: matchedDump?.title || matchedResource?.name || name,
              description: "Purchased Material",
              imageUrl: matchedDump?.image_url || matchedResource?.image_url || (provider ? `/logos/${provider}.svg` : ""),
              accessUrl: accessUrl,
              provider: provider,
              category: name.toLowerCase().includes("dump") || matchedDump || item.downloadUrl ? "Exam Dumps" : "Exam Guide",
              resourceType: "file",
              accessedAt: inv.created_at || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (invErr) {
    console.warn("Could not reconcile invoices into My Resources:", invErr);
  }

  // Also reconcile local recent purchases from this browser session/device
  try {
    const rawRecent = localStorage.getItem("yatri_recent_purchases");
    if (rawRecent) {
      const recentItems: Array<any> = JSON.parse(rawRecent);
      const existingNames = new Set(myResources.map((r) => r.name.toLowerCase().trim()));
      const existingIds = new Set(myResources.map((r) => r.id.toLowerCase().trim()));

      for (const rec of recentItems) {
        const recName = (rec.name || rec.title || "").trim();
        const recId = rec.id || "";
        if (!recName) continue;
        if (existingNames.has(recName.toLowerCase()) || (recId && existingIds.has(recId.toLowerCase()))) {
          continue;
        }

        existingNames.add(recName.toLowerCase());
        const provider = rec.provider || detectProviderFromName(recName);
        const accessUrl = rec.downloadUrl || rec.accessUrl || detectAccessUrlFromName(recName, provider);

        myResources.unshift({
          id: `recent_${recId || Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          resourceId: recId || `recent_${Date.now()}`,
          name: recName,
          description: "Purchased Material",
          imageUrl: rec.image || (provider ? `/logos/${provider}.svg` : ""),
          accessUrl: accessUrl,
          provider: provider,
          category: rec.category || (rec.downloadUrl || recName.toLowerCase().includes("dump") ? "Exam Dumps" : "Exam Guide"),
          resourceType: "file",
          accessedAt: rec.purchasedAt || new Date().toISOString(),
        });
      }
    }
  } catch (recentErr) {
    console.warn("Could not reconcile recent purchases into My Resources:", recentErr);
  }

  // Filter out any dismissed/removed items
  try {
    const key = `yatri_hidden_resources_${authUser.id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const hiddenList: string[] = JSON.parse(raw);
      const hiddenSet = new Set(hiddenList.map((s) => String(s).toLowerCase().trim()));
      return myResources.filter(
        (r) =>
          !hiddenSet.has(r.id.toLowerCase().trim()) &&
          !hiddenSet.has(r.resourceId.toLowerCase().trim()) &&
          !hiddenSet.has(r.name.toLowerCase().trim())
      );
    }
  } catch (e) {
    console.warn("Error checking hidden resources:", e);
  }

  return myResources;
}

/**
 * Remove a resource from the signed in user's library permanently.
 */
export async function removeMyResource(resource: MyResource): Promise<void> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return;

  // 1. Delete from Supabase user_resources table if matching record exists
  try {
    if (resource.id && !resource.id.startsWith("inv_")) {
      await supabase
        .from("user_resources")
        .delete()
        .eq("id", resource.id)
        .eq("user_id", authUser.id);
    }
    if (resource.resourceId && !resource.resourceId.startsWith("inv_")) {
      await supabase
        .from("user_resources")
        .delete()
        .eq("resource_id", resource.resourceId)
        .eq("user_id", authUser.id);
    }
  } catch (dbErr) {
    console.warn("Could not delete from user_resources in Supabase:", dbErr);
  }

  // 2. Persist in dismissed list so invoice-reconciled items also stay removed permanently
  try {
    const key = `yatri_hidden_resources_${authUser.id}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (resource.id) list.push(resource.id);
    if (resource.resourceId) list.push(resource.resourceId);
    if (resource.name) list.push(resource.name.toLowerCase().trim());
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(list))));
  } catch (lsErr) {
    console.warn("Could not save to hidden_resources localStorage:", lsErr);
  }
}




// ─────────────────────────────────────────────────────────────
// Admin CRUD
// ─────────────────────────────────────────────────────────────

export interface ResourceInput {
  name: string;
  description: string;
  imageUrl: string;
  accessUrl: string;
  resourceType: "link" | "file";
  isFree: boolean;
  priceInr: number;
  provider: string;
  category: string;
  tags: string[];
  isPublished: boolean;
}

function toRow(input: Partial<ResourceInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
  if (input.accessUrl !== undefined) row.access_url = input.accessUrl;
  if (input.resourceType !== undefined) row.resource_type = input.resourceType;
  if (input.isFree !== undefined) row.is_free = input.isFree;
  if (input.priceInr !== undefined) row.price_inr = input.priceInr;
  if (input.provider !== undefined) row.provider = input.provider;
  if (input.category !== undefined) row.category = input.category;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.isPublished !== undefined) row.is_published = input.isPublished;
  return row;
}

/** Admin: fetch all resources (published + draft). */
export async function adminListResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("❌ adminListResources failed:", error.message);
    throw new Error(error.message);
  }
  if (!data) return [];
  return data.map(toResource);
}

/** Admin: fetch a single resource by id. */
export async function adminGetResource(id: string): Promise<Resource | null> {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("❌ adminGetResource failed:", error.message);
    return null;
  }
  return toResource(data);
}

/** Admin: create a new resource. */
export async function createResource(input: ResourceInput): Promise<void> {
  const { error } = await supabase.from("resources").insert(toRow(input));
  if (error) throw new Error(error.message);
  invalidateCache();
}

/** Admin: update an existing resource. */
export async function updateResource(id: string, input: Partial<ResourceInput>): Promise<void> {
  const { data, error } = await supabase
    .from("resources")
    .update(toRow(input))
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Update failed: no rows updated. Please check admin permissions.");
  }
  invalidateCache();
}

/** Admin: delete (hard) a resource. */
export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateCache();
}

/** Admin: upload thumbnail to Supabase Storage, returns public URL. */
export async function uploadResourceImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("resource-images").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("resource-images").getPublicUrl(path);
  return data.publicUrl;
}

/** Get provider glow color (mirrors exam-dumps helper). */
export const getResourceProviderColor = (provider?: string): string => {
  const p = (provider ?? "").toLowerCase();
  if (p.includes("aws")) return "rgba(255,153,0,0.35)";
  if (p.includes("azure") || p.includes("microsoft")) return "rgba(0,137,214,0.35)";
  if (p.includes("gcp") || p.includes("google")) return "rgba(66,133,244,0.35)";
  if (p.includes("databricks")) return "rgba(255,54,33,0.35)";
  if (p.includes("snowflake")) return "rgba(41,181,232,0.35)";
  if (p.includes("anthropic") || p.includes("claude")) return "rgba(217,119,6,0.35)";
  if (p.includes("redis")) return "rgba(220,56,45,0.35)";
  if (p.includes("oracle")) return "rgba(248,0,0,0.35)";
  if (p.includes("cisco")) return "rgba(0,188,235,0.35)";
  return "rgba(37,99,235,0.25)";
};
