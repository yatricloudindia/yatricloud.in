/**
 * Certifications service, Supabase `certifications` table.
 * (Filename kept for import stability; the Google Sheets/Apps Script backend
 * was fully migrated to Supabase, see docs/SYSTEM-DESIGN.md.)
 */

import { supabase } from "@/lib/supabase";

export interface CertificationSubmission {
  fullName: string;
  email: string;
  certificationProvider: string;
  certificationName: string;
  examCode: string;
  certificationDate: string;
  linkedinUrl: string;
  verifiedCredential: string;
  country: string;
  stateProvince?: string;
  city: string;
  countryCode: string;
  phoneNumber: string;
  photo: File | null;
  photoUrl?: string; // if user already has a profile photo, reuse it
  additionalNotes?: string;
  sheetName: string;      // legacy fields, ignored by Supabase (kept for caller compatibility)
  subSheetName: string;
}

export interface CertificationEntry {
  id: string;
  fullName: string;
  email: string;
  certificationProvider: string;
  certificationName: string;
  examCode: string;
  certificationDate: string;
  linkedinUrl: string;
  verifiedCredential?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  countryCode?: string;
  phoneNumber?: string;
  photoUrl: string;
  additionalNotes?: string;
}

/** Display provider name → DB enum. */
const DISPLAY_TO_ENUM: Record<string, string> = {
  aws: "AWS", azure: "AZURE", gcp: "GCP", github: "GITHUB", oracle: "ORACLE",
  salesforce: "SALESFORCE", servicenow: "SERVICENOW", openai: "OPENAI", anthropic: "ANTHROPIC", snowflake: "SNOWFLAKE",
  hashicorp: "HASHICORP", kubernetes: "KUBERNETES",
};

/** DB enum → display name used across the UI. */
export const ENUM_TO_DISPLAY: Record<string, string> = {
  AWS: "AWS", AZURE: "Azure", GCP: "GCP", GITHUB: "GitHub", ORACLE: "Oracle",
  SALESFORCE: "Salesforce", SERVICENOW: "ServiceNow", OPENAI: "OpenAI", ANTHROPIC: "Anthropic", SNOWFLAKE: "Snowflake",
  HASHICORP: "HashiCorp", KUBERNETES: "Kubernetes", OTHER: "Other",
};

const VALID_PROVIDER_ENUMS = new Set([
  "AWS", "AZURE", "GCP", "GITHUB", "ORACLE", "SALESFORCE", "SERVICENOW", "OPENAI", "ANTHROPIC", "SNOWFLAKE", "HASHICORP", "KUBERNETES", "OTHER",
]);

export function normalizeProviderEnum(raw?: string | null): string {
  if (!raw) return "OTHER";
  const clean = raw.trim();
  const upper = clean.toUpperCase();
  if (VALID_PROVIDER_ENUMS.has(upper)) return upper;
  const lower = clean.toLowerCase();
  if (DISPLAY_TO_ENUM[lower]) return DISPLAY_TO_ENUM[lower];
  if (/anthropic|claude/i.test(clean)) return "ANTHROPIC";
  if (/open\s*ai|chatgpt/i.test(clean)) return "OPENAI";
  if (/k8s|kubernetes/i.test(clean)) return "KUBERNETES";
  if (/terraform|hashicorp|vault/i.test(clean)) return "HASHICORP";
  if (/google|gcp/i.test(clean)) return "GCP";
  if (/azure|microsoft/i.test(clean)) return "AZURE";
  if (/aws|amazon/i.test(clean)) return "AWS";
  return "OTHER";
}

/**
 * Submit a certification for the signed-in user.
 * Photo: reuse the profile URL, else upload the file to the `avatars` bucket.
 */
/**
 * If the photo is an inline data URI, upload it to the avatars bucket and
 * return the public URL instead. Inline base64 photos (up to ~3 MB per row)
 * once made the wall-of-fame query exceed the DB statement timeout, no
 * data URI may ever be written to certifications.photo_url again.
 */
export async function ensurePhotoIsUrl(
  photo: string | null | undefined,
  userId: string
): Promise<string | null> {
  if (!photo) return null;
  if (!photo.startsWith("data:")) return photo;
  try {
    const blob = await (await fetch(photo)).blob();
    const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const path = `${userId}/${Date.now()}-photo.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) return null; // better no photo than a timeout-inducing blob
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function submitCertification(data: CertificationSubmission): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to submit your certification.");

  let photoUrl = (await ensurePhotoIsUrl(data.photoUrl, user.id)) || "";
  if (!photoUrl && data.photo) {
    const path = `${user.id}/${Date.now()}-${data.photo.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, data.photo, { upsert: true });
    if (upErr) throw new Error("Photo upload failed, please try again.");
    photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("certifications").insert({
    user_id: user.id,
    email: data.email.trim().toLowerCase(),
    full_name: data.fullName,
    provider: normalizeProviderEnum(data.certificationProvider),
    certification_name: data.certificationName,
    exam_code: data.examCode || null,
    certification_date: data.certificationDate || null,
    verified_credential_url: data.verifiedCredential || null,
    linkedin_url: data.linkedinUrl || null,
    photo_url: photoUrl || null,
    country: data.country || null,
    state_province: data.stateProvince || null,
    city: data.city || null,
    country_code: data.countryCode || null,
    phone_number: data.phoneNumber || null,
    additional_notes: data.additionalNotes || null,
  });
  if (error) {
    console.error("❌ Error submitting certification:", error.message);
    throw new Error("Submission failed, please try again.");
  }
}

/** Fetch all public certifications (the Wall of Fame). */
export async function fetchCertifications(): Promise<CertificationEntry[]> {
  // Let the auth session settle first: on a signed-in visitor's first load a
  // stale access token could ride along and get rejected, which showed the
  // page with 0 results until a reload. getSession() refreshes if expired.
  await supabase.auth.getSession().catch(() => null);

  // The wall reads the certifications_public VIEW (migration 038): display
  // columns of public rows only. The underlying table is own-rows + admin —
  // no role can read another person's contact data through it.
  const runQuery = () =>
    supabase
      .from("certifications_public")
      .select("id,full_name,provider,certification_name,exam_code,certification_date,verified_credential_url,linkedin_url,photo_url,country,additional_notes")
      .order("created_at", { ascending: false });

  let { data, error } = await runQuery();
  if (error) {
    // One retry after a short beat, transient auth/network hiccups on first
    // load should not blank the whole Wall of Fame.
    await new Promise((r) => setTimeout(r, 800));
    ({ data, error } = await runQuery());
  }
  if (error) {
    console.error("❌ Error fetching certifications:", error.message);
    throw new Error(error.message);
  }
  return (data || []).map((c) => ({
    id: c.id,
    fullName: c.full_name || "",
    // Contact fields are intentionally absent from the public wall payload.
    email: "",
    certificationProvider: ENUM_TO_DISPLAY[c.provider] ?? c.provider,
    certificationName: c.certification_name || "",
    examCode: c.exam_code || "",
    certificationDate: c.certification_date || "",
    linkedinUrl: c.linkedin_url || "",
    verifiedCredential: c.verified_credential_url || undefined,
    country: c.country || undefined,
    stateProvince: undefined,
    city: undefined,
    countryCode: undefined,
    phoneNumber: undefined,
    photoUrl: c.photo_url || "",
    additionalNotes: c.additional_notes || undefined,
  }));
}
