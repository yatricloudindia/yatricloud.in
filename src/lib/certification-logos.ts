/**
 * Certification provider logos, shared with Certified Yatris and Reviews.
 * Same source as certification.yatricloud.com / certifiedyatris?addNew=true.
 *
 * The map data now lives in the certification catalog (@/lib/cert-catalog,
 * Supabase backed). This module keeps the same synchronous exports so every
 * existing consumer keeps working; the async getter is re exported for
 * anyone who wants live catalog rows.
 */

import {
  FALLBACK_CERTIFICATION_PROVIDER_LOGOS,
  getCertificationProviderLogos,
  LOGO_BASE_URL,
  type CertificationLogoInfo,
} from "@/lib/cert-catalog";

export { LOGO_BASE_URL, getCertificationProviderLogos };
export type { CertificationLogoInfo };

/** Provider id -> logo URLs and label. Used by Reviews and Certified Yatris. */
export const CERTIFICATION_PROVIDER_LOGOS: Record<string, CertificationLogoInfo> =
  FALLBACK_CERTIFICATION_PROVIDER_LOGOS;

/** Resolve logo URL for a provider by theme (light theme uses logoLight when available). */
export function getCertificationLogoUrl(
  providerId: string,
  theme: "light" | "dark"
): string | undefined {
  const info = CERTIFICATION_PROVIDER_LOGOS[providerId];
  if (!info) return undefined;
  if (theme === "light" && info.logoLight) return info.logoLight;
  return info.logo;
}
