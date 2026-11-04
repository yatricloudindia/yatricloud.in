/**
 * Store Products, Supabase `products` table (read + admin write).
 *
 * Auth model: every write here relies on the `products_admin_write` RLS policy
 * (is_admin()), the same admin gate AdminDashboard enforces client-side. No
 * per-call role check is needed. Validation is the single source of truth below,
 * shared by the create form (AdminAddProduct) and the edit dialog (AdminProducts).
 */

import { z } from "zod";
import { supabase } from "@/lib/supabase";

/** The store's category + level vocabularies, shared by every product surface. */
export const STORE_CATEGORIES = ["AWS", "Azure", "GCP", "Oracle", "Salesforce", "ServiceNow", "GitHub"] as const;
export const PRODUCT_LEVELS = ["Associate", "Practitioner", "Professional", "Specialty"] as const;

/**
 * Strict create-time schema (used by AdminAddProduct via react-hook-form).
 * An image URL and a real description are required when adding a new product.
 */
export const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(STORE_CATEGORIES),
  originalPrice: z.number().min(0, "Price must be positive"),
  discountedPrice: z.number().min(0, "Price must be positive"),
  discount: z.number().min(0).max(100, "Discount must be between 0-100"),
  image: z.string().url("Must be a valid URL"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  examCode: z.string().optional(),
  level: z.enum(PRODUCT_LEVELS),
});

/**
 * Edit-time validation for the admin manager. Tolerant of legacy rows (image may
 * be blank, description may be short) but still catches the mistakes that matter:
 * a missing title, a non-URL image, negative prices, or an offer price above list.
 * Returns the first problem as a message, or null when the patch is valid.
 */
export function validateProductPatch(patch: Partial<Omit<StoreProduct, "id" | "status">>): string | null {
  if (patch.title !== undefined && !patch.title.trim()) return "Title is required";
  if (patch.image !== undefined && patch.image.trim() && !z.string().url().safeParse(patch.image.trim()).success) {
    return "Image must be a valid URL";
  }
  const orig = patch.originalPrice, disc = patch.discountedPrice;
  if (orig !== undefined && (Number.isNaN(orig) || orig < 0)) return "Original price can't be negative";
  if (disc !== undefined && (Number.isNaN(disc) || disc < 0)) return "Discounted price can't be negative";
  if (orig !== undefined && disc !== undefined && disc > orig) return "Discounted price can't be higher than the original price";
  return null;
}

/** DB provider enum → display category used across the store UI. */
const PROVIDER_TO_CATEGORY: Record<string, StoreProduct["category"]> = {
  AWS: "AWS", AZURE: "Azure", GCP: "GCP", ORACLE: "Oracle",
  SALESFORCE: "Salesforce", SERVICENOW: "ServiceNow", GITHUB: "GitHub",
};
const CATEGORY_TO_PROVIDER: Record<string, string> = {
  AWS: "AWS", Azure: "AZURE", GCP: "GCP", Oracle: "ORACLE",
  Salesforce: "SALESFORCE", ServiceNow: "SERVICENOW", GitHub: "GITHUB",
};

export interface StoreProduct {
  id: string;
  title: string;
  category: "AWS" | "Azure" | "GCP" | "Oracle" | "Salesforce" | "ServiceNow" | "GitHub";
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  image: string;
  description: string;
  examCode?: string;
  level: "Associate" | "Practitioner" | "Professional" | "Specialty";
  status?: string;
}

/** Fetch published store products. */
export async function fetchStoreProducts(): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,title,provider,exam_code,level,original_price_inr,discounted_price_inr,image_url,description,status")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("❌ Error fetching products:", error.message);
    return [];
  }
  return (data || [])
    .map((p) => {
      const orig = Number(p.original_price_inr ?? 0);
      const disc = Number(p.discounted_price_inr ?? 0);
      return {
        id: p.id,
        title: p.title || "",
        category: PROVIDER_TO_CATEGORY[p.provider] ?? "AWS",
        originalPrice: orig,
        discountedPrice: disc,
        discount: orig > 0 ? Math.round(((orig - disc) / orig) * 100) : 0,
        image: p.image_url || "",
        description: p.description || "",
        examCode: p.exam_code || "",
        level: (p.level as StoreProduct["level"]) || "Associate",
        status: "active",
      } satisfies StoreProduct;
    })
    .filter((p) => p.title && p.discountedPrice > 0);
}

const toRow = (p: Partial<Omit<StoreProduct, "id">>) => ({
  ...(p.title !== undefined ? { title: p.title } : {}),
  ...(p.category !== undefined ? { provider: CATEGORY_TO_PROVIDER[p.category] ?? "OTHER" } : {}),
  ...(p.examCode !== undefined ? { exam_code: p.examCode || null } : {}),
  ...(p.level !== undefined ? { level: p.level } : {}),
  ...(p.originalPrice !== undefined ? { original_price_inr: p.originalPrice } : {}),
  ...(p.discountedPrice !== undefined ? { discounted_price_inr: p.discountedPrice } : {}),
  ...(p.image !== undefined ? { image_url: p.image || null } : {}),
  ...(p.description !== undefined ? { description: p.description || null } : {}),
  ...(p.status !== undefined ? { status: p.status } : {}),
});

/** Add a product (admin, enforced by RLS). */
export async function submitProduct(product: Omit<StoreProduct, "id" | "status">): Promise<void> {
  const { error } = await supabase.from("products").insert({ ...toRow(product), status: "published" });
  if (error) { console.error("❌ Error submitting product:", error.message); throw new Error(error.message); }
}

/** Admin: list ALL products (any status) with their real DB status. */
export async function listAllProducts(): Promise<StoreProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,title,provider,exam_code,level,original_price_inr,discounted_price_inr,image_url,description,status")
    .order("created_at", { ascending: false });
  if (error) { console.error("listAllProducts", error.message); return []; }
  return (data || []).map((p) => {
    const orig = Number(p.original_price_inr ?? 0);
    const disc = Number(p.discounted_price_inr ?? 0);
    return {
      id: p.id, title: p.title || "",
      category: PROVIDER_TO_CATEGORY[p.provider] ?? "AWS",
      originalPrice: orig, discountedPrice: disc,
      discount: orig > 0 ? Math.round(((orig - disc) / orig) * 100) : 0,
      image: p.image_url || "", description: p.description || "",
      examCode: p.exam_code || "", level: (p.level as StoreProduct["level"]) || "Associate",
      status: p.status || "draft",
    } satisfies StoreProduct;
  });
}

/** Admin: update a product (partial). */
export async function updateProduct(id: string, patch: Partial<Omit<StoreProduct, "id">>): Promise<void> {
  const { error } = await supabase.from("products").update(toRow(patch)).eq("id", id);
  if (error) { console.error("updateProduct", error.message); throw new Error(error.message); }
}

/** Admin: set a product's publish status. */
export async function setProductStatus(id: string, status: "published" | "draft"): Promise<void> {
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) { console.error("setProductStatus", error.message); throw new Error(error.message); }
}

/** Admin: delete a product. */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) { console.error("deleteProduct", error.message); throw new Error(error.message); }
}
