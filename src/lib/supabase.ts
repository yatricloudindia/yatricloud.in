import { createClient } from "@supabase/supabase-js";

/**
 * Supabase browser client | Yatri Cloud (Mumbai, project yatricloud.com).
 * Uses the PUBLISHABLE key only: safe in the browser because every table
 * enforces Row Level Security. The secret/service keys live server-side only.
 * All values come from .env, nothing hardcoded.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

const configured = Boolean(supabaseUrl && supabaseKey);
if (!configured) {
  // Never crash the app on missing config (e.g. a deploy without env vars):
  // degrade to legacy paths instead.
  console.warn("[supabase] Missing VITE_SUPABASE_URL / key, running in legacy mode. Check env vars.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "public-placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/** Feature flag: when false (or when env is missing), legacy paths stay active. */
export const USE_SUPABASE =
  configured && String(import.meta.env.VITE_USE_SUPABASE ?? "true") !== "false";
