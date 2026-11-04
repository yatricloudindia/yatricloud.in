/**
 * Centralized Provider Catalog
 * Single source of truth for all cloud & IT certification providers across
 * Admin (Exam Dumps, Resources, Store Products, Trainings) and Public Pages.
 */

export interface CentralProvider {
  value: string;
  label: string;
  slug: string;
  shortName: string;
  logoUrl: string;
  logoLightUrl?: string;
  brandColor: string;
  glowColor?: string;
  badge?: string;
  description?: string;
}

export const CENTRAL_PROVIDERS_LIST: CentralProvider[] = [
  {
    value: "AWS",
    label: "Amazon Web Services (AWS)",
    slug: "aws",
    shortName: "AWS",
    logoUrl: "/logos/aws.svg",
    logoLightUrl: "/logos/aws.svg",
    brandColor: "#FF9900",
    glowColor: "rgba(255, 153, 0, 0.35)",
    badge: "Cloud Computing",
    description: "Verified practice exams and question dumps for AWS Certified Cloud Practitioner, Solutions Architect, Developer, SysOps, DevOps, and Security certifications.",
  },
  {
    value: "Azure",
    label: "Microsoft Azure",
    slug: "azure",
    shortName: "Azure",
    logoUrl: "/logos/azure.svg",
    logoLightUrl: "/logos/azure.svg",
    brandColor: "#0078D4",
    glowColor: "rgba(0, 120, 212, 0.35)",
    badge: "Cloud & Enterprise",
    description: "Realistic exam dumps for Microsoft Azure certifications including AZ-900, AZ-104, AZ-204, AZ-305, AZ-400, AZ-500, and DP/AI specialty exams.",
  },
  {
    value: "GCP",
    label: "Google Cloud Platform (GCP)",
    slug: "gcp",
    shortName: "GCP",
    logoUrl: "/logos/googlecloud.svg",
    logoLightUrl: "/logos/googlecloud.svg",
    brandColor: "#4285F4",
    glowColor: "rgba(66, 133, 244, 0.35)",
    badge: "Cloud & Data",
    description: "Authentic practice questions and dumps for Google Cloud Digital Leader, Associate Cloud Engineer, Professional Cloud Architect, and Data Engineer.",
  },
  {
    value: "Redis",
    label: "Redis",
    slug: "redis",
    shortName: "Redis",
    logoUrl: "/logos/redis.svg",
    logoLightUrl: "/logos/redis.svg",
    brandColor: "#DC382D",
    glowColor: "rgba(220, 56, 45, 0.35)",
    badge: "In-Memory & Caching",
    description: "Real exam dumps, question banks, and interactive practice simulator for Redis Certified Developer (REDIS-DEV).",
  },
  {
    value: "Snowflake",
    label: "Snowflake Data Cloud",
    slug: "snowflake",
    shortName: "Snowflake",
    logoUrl: "/logos/snowflake.png",
    logoLightUrl: "/logos/snowflake.png",
    brandColor: "#29B5E8",
    glowColor: "rgba(41, 181, 232, 0.35)",
    badge: "Data Cloud",
    description: "Comprehensive question dumps for SnowPro Core Certification (COF-C02), Advanced Architect, and Data Engineer.",
  },
  {
    value: "Anthropic",
    label: "Anthropic (Claude AI)",
    slug: "anthropic",
    shortName: "Anthropic",
    logoUrl: "/logos/anthropic.svg",
    logoLightUrl: "/logos/anthropic.svg",
    brandColor: "#D97706",
    glowColor: "rgba(217, 119, 6, 0.35)",
    badge: "Generative AI",
    description: "Practice exams and architecture dumps for Anthropic Claude AI certifications and prompt engineering.",
  },
  {
    value: "Kubernetes",
    label: "Kubernetes (CNCF)",
    slug: "kubernetes",
    shortName: "Kubernetes",
    logoUrl: "/logos/kubernetes.svg",
    logoLightUrl: "/logos/kubernetes.svg",
    brandColor: "#326CE5",
    glowColor: "rgba(50, 108, 229, 0.35)",
    badge: "DevOps & Containers",
    description: "Hands-on preparation questions and verified dumps for CKA (Certified Kubernetes Administrator), CKAD (Application Developer), and CKS (Security Specialist).",
  },
  {
    value: "GitHub",
    label: "GitHub",
    slug: "github",
    shortName: "GitHub",
    logoUrl: "/logos/github.svg",
    logoLightUrl: "/logos/github.svg",
    brandColor: "#181717",
    glowColor: "rgba(24, 23, 23, 0.35)",
    badge: "CI/CD & Security",
    description: "Complete practice materials for GitHub Actions, GitHub Advanced Security, GitHub Administration, and GitHub Foundations certifications.",
  },
  {
    value: "HashiCorp",
    label: "HashiCorp / Terraform",
    slug: "hashicorp",
    shortName: "HashiCorp",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Terraform_Logo.svg/1280px-Terraform_Logo.svg.png?20181016201549",
    brandColor: "#844FBA",
    glowColor: "rgba(132, 79, 186, 0.35)",
    badge: "Infrastructure as Code",
    description: "Curated exam dumps and questions for Terraform Associate, Vault Associate, and Consul Associate certification exams.",
  },
  {
    value: "Salesforce",
    label: "Salesforce",
    slug: "salesforce",
    shortName: "Salesforce",
    logoUrl: "/logos/salesforce.svg",
    logoLightUrl: "/logos/salesforce.svg",
    brandColor: "#00A1E0",
    glowColor: "rgba(0, 161, 224, 0.35)",
    badge: "CRM & Cloud",
    description: "Exam dumps for Salesforce Administrator, Platform Developer (PD1/PD2), App Builder, and Architecture certifications.",
  },
  {
    value: "Cisco",
    label: "Cisco",
    slug: "cisco",
    shortName: "Cisco",
    logoUrl: "/logos/cisco.svg",
    logoLightUrl: "/logos/cisco.svg",
    brandColor: "#1BA0D7",
    glowColor: "rgba(27, 160, 215, 0.35)",
    badge: "Networking & Security",
    description: "Verified dumps for Cisco CCNA (200-301), CCNP Enterprise (350-401 ENCOR), and Security certifications.",
  },
  {
    value: "CompTIA",
    label: "CompTIA",
    slug: "comptia",
    shortName: "CompTIA",
    logoUrl: "/logos/comptia.svg",
    logoLightUrl: "/logos/comptia.svg",
    brandColor: "#C8102E",
    glowColor: "rgba(200, 16, 46, 0.35)",
    badge: "IT & Cybersecurity",
    description: "Exam prep materials for CompTIA Security+ (SY0-701), Network+ (N10-008), A+, and CySA+ certifications.",
  },
  {
    value: "Oracle",
    label: "Oracle Cloud (OCI)",
    slug: "oracle",
    shortName: "Oracle",
    logoUrl: "/logos/oracle.svg",
    logoLightUrl: "/logos/oracle.svg",
    brandColor: "#F80000",
    glowColor: "rgba(248, 0, 0, 0.35)",
    badge: "Database & OCI",
    description: "Study dumps for Oracle Cloud Infrastructure (OCI) Foundations, Architect Associate, and Database certifications.",
  },
  {
    value: "ServiceNow",
    label: "ServiceNow",
    slug: "servicenow",
    shortName: "ServiceNow",
    logoUrl: "/logos/servicenow.svg",
    logoLightUrl: "/logos/servicenow.svg",
    brandColor: "#00A82E",
    glowColor: "rgba(0, 168, 46, 0.35)",
    badge: "ITSM & Automation",
    description: "Verified exam questions for ServiceNow Certified System Administrator (CSA) and Certified Application Developer (CAD).",
  },
  {
    value: "Docker",
    label: "Docker",
    slug: "docker",
    shortName: "Docker",
    logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
    brandColor: "#2496ED",
    glowColor: "rgba(36, 150, 237, 0.35)",
    badge: "Containers",
    description: "Practice questions and exam dumps for Docker Certified Associate (DCA).",
  },
  {
    value: "Linux",
    label: "Linux Foundation",
    slug: "linux",
    shortName: "Linux",
    logoUrl: "/logos/linux.svg",
    logoLightUrl: "/logos/linux.svg",
    brandColor: "#FCC624",
    glowColor: "rgba(252, 198, 36, 0.35)",
    badge: "Open Source & OS",
    description: "Study questions and dumps for Linux Foundation Certified System Administrator (LFCS) and Engineer (LFCE).",
  },
  {
    value: "OpenAI",
    label: "OpenAI & AI Specialist",
    slug: "openai",
    shortName: "OpenAI",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/1280px-OpenAI_logo_2025_%28symbol%29.svg.png",
    brandColor: "#10A37F",
    glowColor: "rgba(16, 163, 127, 0.35)",
    badge: "AI Engineering",
    description: "Certification questions and dumps for AI engineering and LLM application development.",
  },
  {
    value: "NVIDIA",
    label: "NVIDIA",
    slug: "nvidia",
    shortName: "NVIDIA",
    logoUrl: "/logos/nvidia.svg",
    logoLightUrl: "/logos/nvidia.svg",
    brandColor: "#76B900",
    glowColor: "rgba(118, 185, 0, 0.35)",
    badge: "AI & Accelerated Computing",
    description: "Practice materials for NVIDIA AI, Deep Learning Institute (DLI), and CUDA certifications.",
  },
  {
    value: "IBM",
    label: "IBM",
    slug: "ibm",
    shortName: "IBM",
    logoUrl: "/logos/ibm.svg",
    logoLightUrl: "/logos/ibm.svg",
    brandColor: "#1F70C1",
    glowColor: "rgba(31, 112, 193, 0.35)",
    badge: "Enterprise & Cloud",
    description: "Practice questions for IBM Cloud, Red Hat OpenShift, and Data & AI certifications.",
  },
  {
    value: "Databricks",
    label: "Databricks",
    slug: "databricks",
    shortName: "Databricks",
    logoUrl: "/logos/databricks.png",
    logoLightUrl: "/logos/databricks.png",
    brandColor: "#FF3621",
    glowColor: "rgba(255, 54, 33, 0.35)",
    badge: "Data & Lakehouse",
    description: "Complete practice questions and dumps for Databricks Certified Data Engineer, Machine Learning Associate/Professional, and Lakehouse Fundamentals.",
  },
  {
    value: "Alibaba",
    label: "Alibaba Cloud",
    slug: "alibaba",
    shortName: "Alibaba",
    logoUrl: "/logos/alibabacloud.svg",
    logoLightUrl: "/logos/alibabacloud.svg",
    brandColor: "#FF6A00",
    glowColor: "rgba(255, 106, 0, 0.35)",
    badge: "Cloud Computing",
    description: "Verified dumps for Alibaba Cloud Associate (ACA) and Professional (ACP) certifications.",
  },
];

/** Standard string array of provider values for simple selects */
export const CENTRAL_PROVIDER_NAMES: string[] = CENTRAL_PROVIDERS_LIST.map((p) => p.value);

/** Get provider metadata by name or slug */
export function getCentralProvider(nameOrSlug?: string): CentralProvider | undefined {
  if (!nameOrSlug) return undefined;
  const clean = nameOrSlug.toLowerCase().trim();
  return CENTRAL_PROVIDERS_LIST.find(
    (p) => p.slug === clean || p.value.toLowerCase() === clean || p.shortName.toLowerCase() === clean
  );
}

/** Normalize any provider string into its standard canonical slug */
export function normalizeCentralProviderSlug(name?: string): string {
  if (!name) return "other";
  const raw = name.toLowerCase().trim();
  if (/^amazon|^aws/.test(raw)) return "aws";
  if (/^microsoft|^azure/.test(raw)) return "azure";
  if (/^google|^gcp/.test(raw)) return "gcp";
  if (/^databricks/.test(raw)) return "databricks";
  if (/^redis/.test(raw)) return "redis";
  if (/^snowflake/.test(raw)) return "snowflake";
  if (/^anthropic|^claude/.test(raw)) return "anthropic";
  if (/^k8s|^kubernetes|^cncf/.test(raw)) return "kubernetes";
  if (/^github/.test(raw)) return "github";
  if (/^hashicorp|^terraform|^vault/.test(raw)) return "hashicorp";
  if (/^salesforce|^sfdc/.test(raw)) return "salesforce";
  if (/^cisco|^ccna|^ccnp/.test(raw)) return "cisco";
  if (/^comptia/.test(raw)) return "comptia";
  if (/^oracle|^oci/.test(raw)) return "oracle";
  if (/^service\s*now/.test(raw)) return "servicenow";
  if (/^docker/.test(raw)) return "docker";
  if (/^linux/.test(raw)) return "linux";
  if (/^openai|^chatgpt/.test(raw)) return "openai";
  if (/^nvidia/.test(raw)) return "nvidia";
  if (/^ibm/.test(raw)) return "ibm";
  if (/^alibaba/.test(raw)) return "alibaba";
  return raw.replace(/[^a-z0-9]/g, "-");
}
