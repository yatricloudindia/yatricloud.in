/**
 * Exam Dumps service, Supabase `exam_dumps` table + Provider Architecture.
 * Reads published dumps; admin CRUD is enforced by RLS.
 */

import { supabase } from "@/lib/supabase";
import { getCertificationLogoUrl } from "@/lib/certification-logos";
import { FALLBACK_FORM_PROVIDERS, LOGO_BASE_URL } from "@/lib/cert-catalog";

export interface ExamDump {
  id: string;
  title: string;
  provider: string;
  originalPrice: number;
  price: number;
  image: string;
  downloadUrl: string;
  description: string;
  status?: string;
  slug?: string;
}

export interface ExamDumpProviderMeta {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  logoUrl?: string;
  brandColor?: string;
  glowColor: string;
  badge?: string;
}

/** Standard recognized exam providers with tailored metadata. */
export const KNOWN_EXAM_PROVIDERS: Record<string, ExamDumpProviderMeta> = {
  aws: {
    slug: "aws",
    name: "Amazon Web Services (AWS)",
    shortName: "AWS",
    description: "Verified practice exams and question banks for AWS Certified Cloud Practitioner, Solutions Architect, Developer, SysOps, DevOps, and Security certifications.",
    logoUrl: `${LOGO_BASE_URL}/aws.svg`,
    brandColor: "#FF9900",
    glowColor: "rgba(255, 153, 0, 0.35)",
    badge: "Cloud Computing",
  },
  azure: {
    slug: "azure",
    name: "Microsoft Azure",
    shortName: "Azure",
    description: "Realistic practice exams for Microsoft Azure certifications including AZ-900, AZ-104, AZ-204, AZ-305, AZ-400, AZ-500, and DP/AI specialty exams.",
    logoUrl: `${LOGO_BASE_URL}/Microsoft_Azure.svg`,
    brandColor: "#0078D4",
    glowColor: "rgba(0, 120, 212, 0.35)",
    badge: "Cloud & Enterprise",
  },
  gcp: {
    slug: "gcp",
    name: "Google Cloud Platform (GCP)",
    shortName: "GCP",
    description: "Authentic practice questions and study tests for Google Cloud Digital Leader, Associate Cloud Engineer, Professional Cloud Architect, and Data Engineer.",
    logoUrl: `${LOGO_BASE_URL}/google_cloud.svg`,
    brandColor: "#4285F4",
    glowColor: "rgba(66, 133, 244, 0.35)",
    badge: "Cloud & Data",
  },
  kubernetes: {
    slug: "kubernetes",
    name: "Kubernetes (CNCF)",
    shortName: "Kubernetes",
    description: "Hands-on preparation questions and verified tests for CKA (Certified Kubernetes Administrator), CKAD (Application Developer), and CKS (Security Specialist).",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Kubernetes_logo_without_workmark.svg/1280px-Kubernetes_logo_without_workmark.svg.png?20190926210707",
    brandColor: "#326CE5",
    glowColor: "rgba(50, 108, 229, 0.35)",
    badge: "DevOps & Containers",
  },
  github: {
    slug: "github",
    name: "GitHub",
    shortName: "GitHub",
    description: "Complete practice materials for GitHub Actions, GitHub Advanced Security, GitHub Administration, and GitHub Foundations certifications.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
    brandColor: "#181717",
    glowColor: "rgba(24, 23, 23, 0.35)",
    badge: "CI/CD & Security",
  },
  hashicorp: {
    slug: "hashicorp",
    name: "HashiCorp",
    shortName: "HashiCorp",
    description: "Curated practice exams and questions for Terraform Associate, Vault Associate, and Consul Associate certification exams.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Terraform_Logo.svg/1280px-Terraform_Logo.svg.png?20181016201549",
    brandColor: "#844FBA",
    glowColor: "rgba(132, 79, 186, 0.35)",
    badge: "Infrastructure as Code",
  },
  salesforce: {
    slug: "salesforce",
    name: "Salesforce",
    shortName: "Salesforce",
    description: "Practice questions and exams for Salesforce Administrator, Platform Developer (PD1/PD2), App Builder, and Architecture certifications.",
    logoUrl: `${LOGO_BASE_URL}/Salesforce.com_logo.svg`,
    brandColor: "#00A1E0",
    glowColor: "rgba(0, 161, 224, 0.35)",
    badge: "CRM & Cloud",
  },
  cisco: {
    slug: "cisco",
    name: "Cisco",
    shortName: "Cisco",
    description: "Verified practice tests and questions for Cisco CCNA, CCNP Enterprise, DevNet, and CyberOps certifications.",
    logoUrl: "/logos/cisco.svg",
    brandColor: "#00BCEB",
    glowColor: "rgba(0, 188, 235, 0.35)",
    badge: "Networking & Security",
  },
  comptia: {
    slug: "comptia",
    name: "CompTIA",
    shortName: "CompTIA",
    description: "Reliable practice exams for CompTIA Security+, Network+, A+, CySA+, and Cloud+ exams.",
    logoUrl: "/logos/comptia.svg",
    brandColor: "#FF0000",
    glowColor: "rgba(255, 0, 0, 0.35)",
    badge: "IT & Cybersecurity",
  },
  oracle: {
    slug: "oracle",
    name: "Oracle Cloud",
    shortName: "Oracle",
    description: "Comprehensive practice exams for Oracle Cloud Infrastructure (OCI) Foundations, Architect, and Database certifications.",
    logoUrl: "https://companieslogo.com/img/orig/ORCL-d5a587ae.png?t=1740130451",
    brandColor: "#F80000",
    glowColor: "rgba(248, 0, 0, 0.35)",
    badge: "Enterprise Cloud",
  },
  servicenow: {
    slug: "servicenow",
    name: "ServiceNow",
    shortName: "ServiceNow",
    description: "Certified System Administrator (CSA) and Certified Application Developer (CAD) practice questions and exam simulators.",
    logoUrl: `${LOGO_BASE_URL}/ServiceNow_logo.svg`,
    brandColor: "#00A82E",
    glowColor: "rgba(0, 168, 46, 0.35)",
    badge: "ITSM & Workflows",
  },
  openai: {
    slug: "openai",
    name: "OpenAI & AI Specialist",
    shortName: "OpenAI",
    description: "Generative AI, LLM application architecture, and AI engineering exam study materials.",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/1280px-OpenAI_logo_2025_%28symbol%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20260430054318",
    brandColor: "#10A37F",
    glowColor: "rgba(16, 163, 127, 0.35)",
    badge: "Artificial Intelligence",
  },
  anthropic: {
    slug: "anthropic",
    name: "Anthropic Claude",
    shortName: "Anthropic",
    description: "Verified practice exams, prompt engineering certifications, and Claude AI model implementation guides.",
    logoUrl: "/logos/anthropic.svg",
    brandColor: "#181818",
    glowColor: "rgba(24, 24, 24, 0.35)",
    badge: "Artificial Intelligence",
  },
  snowflake: {
    slug: "snowflake",
    name: "Snowflake Data Cloud",
    shortName: "Snowflake",
    description: "Real practice questions and test prep for SnowPro Core (COF-C02), Architect, and Data Engineer certifications.",
    logoUrl: "/logos/snowflake.png",
    brandColor: "#29B5E8",
    glowColor: "rgba(41, 181, 232, 0.35)",
    badge: "Data Cloud & Analytics",
  },
  docker: {
    slug: "docker",
    name: "Docker",
    shortName: "Docker",
    description: "Docker Certified Associate (DCA) and containerization practice test questions.",
    logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
    brandColor: "#2496ED",
    glowColor: "rgba(36, 150, 237, 0.35)",
    badge: "Containerization",
  },
  linux: {
    slug: "linux",
    name: "Linux Foundation (LFCS / LFCE)",
    shortName: "Linux",
    description: "Linux system administration, command line mastery, and open source certification practice tests.",
    logoUrl: "/logos/linux.svg",
    brandColor: "#FCC624",
    glowColor: "rgba(252, 198, 36, 0.35)",
    badge: "Open Source",
  },
  redis: {
    slug: "redis",
    name: "Redis",
    shortName: "Redis",
    description: "Verified practice exams and question banks for Redis Certified Developer (REDIS-DEV) certification.",
    logoUrl: "/logos/redis.svg",
    brandColor: "#DC382D",
    glowColor: "rgba(220, 56, 45, 0.35)",
    badge: "Database & In-Memory",
  },
  databricks: {
    slug: "databricks",
    name: "Databricks",
    shortName: "Databricks",
    description: "Complete practice questions and verified exam prep for Databricks Data Engineer, ML Associate, and Lakehouse exams.",
    logoUrl: "/logos/databricks.png",
    brandColor: "#FF3621",
    glowColor: "rgba(255, 54, 33, 0.35)",
    badge: "Data & Lakehouse",
  },
};

/**
 * Normalizes any provider name/slug string into a standard canonical slug.
 * Handles variations like "Amazon AWS", "amazon-web-services", "Microsoft Azure", "k8s", etc.
 */
export function normalizeProviderSlug(providerStr?: string): string {
  if (!providerStr) return "";
  const raw = providerStr.toLowerCase().trim();
  if (raw === "all") return "all";

  // Common aliases
  if (/^(aws|amazon)/.test(raw)) return "aws";
  if (/^(azure|microsoft)/.test(raw)) return "azure";
  if (/^(gcp|google)/.test(raw)) return "gcp";
  if (/^databricks/.test(raw)) return "databricks";
  if (/^(k8s|kubernetes|cncf)/.test(raw)) return "kubernetes";
  if (/^(github|gh)/.test(raw)) return "github";
  if (/^(hashicorp|terraform|vault)/.test(raw)) return "hashicorp";
  if (/^salesforce/.test(raw)) return "salesforce";
  if (/^cisco/.test(raw)) return "cisco";
  if (/^comptia/.test(raw)) return "comptia";
  if (/^oracle/.test(raw)) return "oracle";
  if (/^servicenow/.test(raw)) return "servicenow";
  if (/^openai/.test(raw)) return "openai";
  if (/^anthropic/.test(raw)) return "anthropic";
  if (/^snowflake/.test(raw)) return "snowflake";
  if (/^redis/.test(raw)) return "redis";
  if (/^docker/.test(raw)) return "docker";
  if (/^linux/.test(raw)) return "linux";

  // Fallback: slugify whatever string was passed
  return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Resolves full display metadata for a provider slug or provider name.
 */
export function getProviderMeta(providerSlugOrName: string): ExamDumpProviderMeta {
  const slug = normalizeProviderSlug(providerSlugOrName);
  if (KNOWN_EXAM_PROVIDERS[slug]) {
    return KNOWN_EXAM_PROVIDERS[slug];
  }

  // Fallback check from form providers
  const formMatch = FALLBACK_FORM_PROVIDERS.find((p) => p.slug === slug || p.label.toLowerCase() === providerSlugOrName.toLowerCase());
  if (formMatch) {
    return {
      slug: formMatch.slug,
      name: formMatch.label,
      shortName: formMatch.label,
      description: `Verified practice exams and real practice questions for ${formMatch.label} certifications.`,
      logoUrl: formMatch.logoUrl || getCertificationLogoUrl(formMatch.slug, "light"),
      brandColor: formMatch.brandColor || "#007CFF",
      glowColor: "rgba(0, 124, 255, 0.35)",
      badge: "Certification",
    };
  }

  // Generic custom provider
  const displayName = providerSlugOrName.trim().toUpperCase() === providerSlugOrName.trim()
    ? providerSlugOrName.trim()
    : providerSlugOrName.charAt(0).toUpperCase() + providerSlugOrName.slice(1);

  return {
    slug: slug || "other",
    name: displayName,
    shortName: displayName,
    description: `Verified practice exams and preparation questions for ${displayName} certifications.`,
    logoUrl: undefined,
    brandColor: "#007CFF",
    glowColor: "rgba(0, 124, 255, 0.35)",
    badge: "Certification",
  };
}

/**
 * Returns a dynamic CSS color value for an exam provider,
 * used to render matching glow effects on UI cards.
 */
export const getProviderGlowColor = (provider?: string) => {
  if (!provider) return "rgba(0, 124, 255, 0.25)";
  const meta = getProviderMeta(provider);
  return meta.glowColor || "rgba(0, 124, 255, 0.25)";
};

/**
 * Fetch published exam dumps from Supabase.
 */
export async function fetchExamDumps(): Promise<ExamDump[]> {
  const { data, error } = await supabase
    .from("exam_dumps")
    .select("id,title,provider,original_price_inr,price_inr,image_url,download_url,file_path,description,status")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("❌ Supabase exam_dumps fetch failed:", error?.message);
    return [];
  }

  return data.map((d) => ({
    id: d.id,
    title: d.title || "",
    provider: d.provider || "",
    originalPrice: Number(d.original_price_inr ?? 0),
    price: Number(d.price_inr ?? 0),
    image: d.image_url || "",
    downloadUrl: d.download_url || "",
    description: d.description || "",
    status: "active",
  }));
}

/**
 * Fetch exam dumps filtered specifically by provider slug.
 */
export async function fetchExamDumpsByProvider(providerSlug: string): Promise<ExamDump[]> {
  const allDumps = await fetchExamDumps();
  const targetSlug = normalizeProviderSlug(providerSlug);
  if (!targetSlug || targetSlug === "all") return allDumps;

  return allDumps.filter((dump) => normalizeProviderSlug(dump.provider) === targetSlug);
}

const VALID_DB_PROVIDER_ENUMS = new Set([
  "AWS", "AZURE", "GCP", "GITHUB", "ORACLE", "SALESFORCE", "SERVICENOW", "OPENAI", "ANTHROPIC", "SNOWFLAKE", "REDIS", "HASHICORP", "KUBERNETES", "OTHER",
]);

/** Convert any free-text provider input to the exact PostgreSQL provider_t enum value. */
export function toDbProviderEnum(providerStr?: string | null): string {
  if (!providerStr) return "OTHER";
  const clean = providerStr.trim();
  const upper = clean.toUpperCase();
  if (VALID_DB_PROVIDER_ENUMS.has(upper)) return upper;
  if (/redis/i.test(clean)) return "REDIS";
  if (/snowflake/i.test(clean)) return "SNOWFLAKE";
  if (/anthropic|claude/i.test(clean)) return "ANTHROPIC";
  if (/open\s*ai|chatgpt/i.test(clean)) return "OPENAI";
  if (/k8s|kubernetes|cncf/i.test(clean)) return "KUBERNETES";
  if (/terraform|hashicorp|vault/i.test(clean)) return "HASHICORP";
  if (/google|gcp/i.test(clean)) return "GCP";
  if (/azure|microsoft/i.test(clean)) return "AZURE";
  if (/aws|amazon/i.test(clean)) return "AWS";
  if (/github/i.test(clean)) return "GITHUB";
  if (/oracle/i.test(clean)) return "ORACLE";
  if (/salesforce/i.test(clean)) return "SALESFORCE";
  if (/servicenow/i.test(clean)) return "SERVICENOW";
  return "OTHER";
}

/** Map the UI shape → DB columns. */
function toRow(dump: Partial<ExamDump>) {
  const row: Record<string, unknown> = {};
  if (dump.title !== undefined) row.title = dump.title.trim();
  if (dump.provider !== undefined) row.provider = toDbProviderEnum(dump.provider);
  if (dump.originalPrice !== undefined) row.original_price_inr = dump.originalPrice;
  if (dump.price !== undefined) row.price_inr = dump.price;
  if (dump.image !== undefined) row.image_url = dump.image.trim();
  if (dump.downloadUrl !== undefined) row.download_url = dump.downloadUrl.trim();
  if (dump.description !== undefined) row.description = dump.description.trim();
  return row;
}

/**
 * Add an exam dump (admin, enforced by RLS).
 */
export async function submitExamDump(dump: Omit<ExamDump, 'id' | 'status'>): Promise<void> {
  const payload = { ...toRow(dump), status: 'published' };
  const { error } = await supabase.from('exam_dumps').insert(payload);
  if (error) {
    // If live PostgreSQL provider_t enum does not contain the new provider yet, retry with 'OTHER'
    if (error.message && error.message.includes('provider_t')) {
      console.warn('⚠️ Provider enum not yet in DB schema, falling back to OTHER:', error.message);
      const fallbackPayload = { ...payload, provider: 'OTHER' };
      const { error: fallbackError } = await supabase.from('exam_dumps').insert(fallbackPayload);
      if (!fallbackError) return;
      throw new Error(fallbackError.message);
    }
    console.error('❌ Error submitting exam dump:', error.message);
    throw new Error(error.message);
  }
}

/**
 * Update an existing exam dump (admin, enforced by RLS).
 */
export async function updateExamDump(id: string, data: Partial<ExamDump>): Promise<void> {
  const payload = toRow(data);
  const { error } = await supabase.from('exam_dumps').update(payload).eq('id', id);
  if (error) {
    if (error.message && error.message.includes('provider_t')) {
      console.warn('⚠️ Provider enum not yet in DB schema, falling back to OTHER:', error.message);
      const fallbackPayload = { ...payload, provider: 'OTHER' };
      const { error: fallbackError } = await supabase.from('exam_dumps').update(fallbackPayload).eq('id', id);
      if (!fallbackError) return;
      throw new Error(fallbackError.message);
    }
    console.error('❌ Error updating exam dump:', error.message);
    throw new Error(error.message);
  }
}

/**
 * Delete an exam dump (soft delete → archived; admin, enforced by RLS).
 */
export async function deleteExamDump(id: string): Promise<void> {
  const { error } = await supabase.from('exam_dumps').update({ status: 'archived' }).eq('id', id);
  if (error) {
    console.error('❌ Error deleting exam dump:', error.message);
    throw new Error(error.message);
  }
}
