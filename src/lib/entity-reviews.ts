import { supabase } from "@/lib/supabase";
import { getCachedUser } from "@/lib/auth";

/**
 * Unified per-entity reviews (migration 075), events, store products,
 * udemy courses and exam dumps. Trainings and mentors keep their dedicated
 * review tables. One review per Yatri per entity; admins moderate via
 * is_public / delete (enforced by RLS, not here).
 */

export type ReviewEntityType = "event" | "product" | "udemy_course" | "exam_dump";

export interface EntityReview {
  id: string;
  entityType: ReviewEntityType;
  entityId: string;
  userId: string;
  name: string;
  rating: number;
  review: string;
  isPublic: boolean;
  createdAt: string;
}

export interface EntityRatingSummary {
  average: number | null;
  count: number;
}

function rowToReview(row: any): EntityReview {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    userId: row.user_id,
    name: row.name || "A Yatri",
    rating: row.rating,
    review: row.review || "",
    isPublic: row.is_public,
    createdAt: row.created_at,
  };
}

/** Public reviews for one entity, newest first. */
export async function listEntityReviews(
  entityType: ReviewEntityType,
  entityId: string
): Promise<EntityReview[]> {
  if (!entityId) return [];
  const { data, error } = await supabase
    .from("entity_reviews")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[entity-reviews] list", error.message);
    return [];
  }
  return (data || []).map(rowToReview);
}

/** Average + count over the public reviews of one entity. */
export function summarize(reviews: EntityReview[]): EntityRatingSummary {
  if (!reviews.length) return { average: null, count: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { average: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
}

/** The signed-in Yatri's own review of this entity (public or not). */
export async function getMyEntityReview(
  entityType: ReviewEntityType,
  entityId: string
): Promise<EntityReview | null> {
  const uid = getCachedUser()?.id;
  if (!uid || !entityId) return null;
  const { data } = await supabase
    .from("entity_reviews")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("user_id", uid)
    .maybeSingle();
  return data ? rowToReview(data) : null;
}

/**
 * Create or update the signed-in Yatri's review. RLS enforces ownership and,
 * for events, a non-cancelled registration. Returns a friendly error string.
 */
export async function submitEntityReview(input: {
  entityType: ReviewEntityType;
  entityId: string;
  name: string;
  rating: number;
  review: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const uid = getCachedUser()?.id;
  if (!uid) return { ok: false, error: "Please sign in to leave a review." };
  const { error } = await supabase.from("entity_reviews").upsert(
    {
      entity_type: input.entityType,
      entity_id: input.entityId,
      user_id: uid,
      name: input.name.trim() || "A Yatri",
      rating: input.rating,
      review: input.review.trim(),
      is_public: true,
    },
    { onConflict: "entity_type,entity_id,user_id" }
  );
  if (error) {
    console.error("[entity-reviews] submit", error.message);
    if (input.entityType === "event" && /row-level security/i.test(error.message)) {
      return { ok: false, error: "Only Yatris registered for this event can review it." };
    }
    return { ok: false, error: "We could not save your review. Please try again." };
  }
  return { ok: true, error: null };
}

/* ---------------- admin ---------------- */

export interface AdminEntityReview extends EntityReview {
  entityName: string;
}

const ENTITY_NAME_SOURCES: Record<ReviewEntityType, { table: string; column: string }> = {
  event: { table: "events", column: "name" },
  product: { table: "products", column: "title" },
  udemy_course: { table: "udemy_courses", column: "title" },
  exam_dump: { table: "exam_dumps", column: "title" },
};

/** Admin: every review (public + hidden) with the entity's display name. */
export async function listAllEntityReviews(): Promise<AdminEntityReview[]> {
  const { data, error } = await supabase
    .from("entity_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[entity-reviews] listAll", error.message);
    return [];
  }
  const rows = (data || []).map(rowToReview);

  // Resolve entity names per type in one query each.
  const names = new Map<string, string>();
  for (const type of Object.keys(ENTITY_NAME_SOURCES) as ReviewEntityType[]) {
    const ids = [...new Set(rows.filter((r) => r.entityType === type).map((r) => r.entityId))];
    if (!ids.length) continue;
    const src = ENTITY_NAME_SOURCES[type];
    const { data: ents } = await supabase.from(src.table).select(`id, ${src.column}`).in("id", ids);
    for (const ent of (ents || []) as any[]) names.set(`${type}:${ent.id}`, ent[src.column]);
  }
  return rows.map((r) => ({
    ...r,
    entityName: names.get(`${r.entityType}:${r.entityId}`) || "(deleted)",
  }));
}

export async function setEntityReviewPublic(id: string, isPublic: boolean): Promise<boolean> {
  const { error } = await supabase.from("entity_reviews").update({ is_public: isPublic }).eq("id", id);
  if (error) console.error("[entity-reviews] setPublic", error.message);
  return !error;
}

export async function deleteEntityReview(id: string): Promise<boolean> {
  const { error } = await supabase.from("entity_reviews").delete().eq("id", id);
  if (error) console.error("[entity-reviews] delete", error.message);
  return !error;
}
