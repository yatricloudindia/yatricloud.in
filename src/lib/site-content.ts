import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ADMIN_GUIDE_CONTENT,
  USER_GUIDE_CONTENT,
  ADMIN_URL_SITE_MAP,
  USER_URL_SITE_MAP,
} from "@/data/guides-content";

/**
 * Site content loader, reads homepage/site copy from Supabase
 * (`site_settings`, `site_stats`, `promotions`, `faqs`, `team_members`,
 * `package_benefits`, `certification_steps`, `eligible_exams`,
 * `recognitions`, `trust_features`, `communities`, `nav_links`,
 * `option_lists`, `legal_pages`, `guides`, `tech_logos`) with hardcoded fallbacks that match
 * the live values exactly. If Supabase is slow,
 * errors, or returns nothing, the site keeps rendering the fallback so
 * visitors never see a blank section. Fetches once per session; every
 * consumer shares the same in-flight promise.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SiteStat = { key: string; value: string; label: string };

export type Promotion = {
  headline: string;
  discount_text: string;
  cta_label: string;
  cta_url: string;
};

export type Faq = {
  question: string;
  answer: string;
  listItems?: string[];
};

export type TeamMember = {
  name: string;
  role: string;
  image: string;
  portfolio: string;
};

export type PackageBenefit = {
  text: string;
  description: string;
};

export type StepAction = {
  label: string;
  isPopup: boolean;
  url: string;
};

export type CertificationStep = {
  number: number;
  title: string;
  description: string;
  action: StepAction | null;
};

export type EligibleExam = {
  title: string;
  examCode: string | null;
};

export type Recognition = {
  label: string;
  logo: string;
};

export type TrustFeature = {
  title: string;
  description: string;
};

export type TrustFeatureKind = "feature" | "not_for_you";

export type CommunityGroup = "channel" | "main" | "ms_subs";

export type CommunityEntry = {
  name: string;
  url: string;
  tagline: string;
  logo: string | null;
  grp: CommunityGroup;
};

export type NavLinkLocation =
  | "navbar"
  | "footer_explore"
  | "footer_quick"
  | "footer_legal";

export type NavLink = { href: string; label: string };

export type OptionItem = { value: string; label: string };

export type TechLogoGroup = "marquee" | "community";

export type TechLogo = {
  name: string;
  src: string;
  /** For community logos this holds the light-theme logo variant URL. */
  href: string | null;
  grp: TechLogoGroup;
};

export type LegalPage = { slug: string; title: string; body_md: string };

export type Guide = { slug: string; title: string; body_md: string };

/* ------------------------------------------------------------------ */
/* Fallbacks, must always equal today's live values                   */
/* ------------------------------------------------------------------ */

export const FALLBACK_SETTINGS: Record<string, any> = {
  contact: {
    email: "info@yatricloud.com",
    phone: "+91 97248 23602",
    phone_href: "tel:+919724823602",
    location: "Bengaluru, Karnataka, India",
    hours: "Mon to Fri: 9:00 AM to 6:00 PM · Sat & Sun: 10:00 AM to 4:00 PM",
  },
  social: {
    youtube: "https://www.youtube.com/@yatricloud?sub_confirmation=1",
    linkedin: "https://linkedin.com/company/yatricloud",
    whatsapp: "https://whatsapp.com/channel/0029VakdAHIFHWq60yHA1Q0s",
  },
  booking: {
    calendar_url: "/schedule/40min",
  },
  brand: {
    name: "Yatri Cloud",
    tagline:
      "Cloud certification training, practice tests, and discounted vouchers for AWS, Azure, and Google Cloud exams.",
    designed_by: "Uimitra",
  },
  hero: {
    subheadline:
      "Get AWS certified with discounted vouchers. Book your time slot and we will schedule your exam during the meeting. Practice tests, resources, and support included!",
  },
};

/* Tech logos, grp 'marquee' copied verbatim from TECH_LOGOS in
 * src/components/TechLogos.tsx; grp 'community' copied verbatim from
 * `companies` in src/components/sections/CommunitySection.tsx, where
 * `href` carries the light-theme logo variant (logoLight). */
const COMMUNITY_LOGO_BASE_URL =
  "https://raw.githubusercontent.com/yatricloud/yatri-images/main/certification.yatricloud.com/logo/certifications";

export const FALLBACK_TECH_LOGOS: TechLogo[] = [
  { name: "AWS", src: "/logos/aws.svg", href: null, grp: "marquee" },
  { name: "Azure", src: "/logos/azure.svg", href: null, grp: "marquee" },
  { name: "Google Cloud", src: "/logos/googlecloud.svg", href: null, grp: "marquee" },
  { name: "Kubernetes", src: "/logos/kubernetes.svg", href: null, grp: "marquee" },
  { name: "Terraform", src: "/logos/terraform.svg", href: null, grp: "marquee" },
  { name: "Docker", src: "/logos/docker.svg", href: null, grp: "marquee" },
  { name: "Ansible", src: "/logos/ansible.svg", href: null, grp: "marquee" },
  { name: "Python", src: "/logos/python.svg", href: null, grp: "marquee" },
  { name: "Linux", src: "/logos/linux.svg", href: null, grp: "marquee" },
  { name: "GitHub", src: "/logos/github.svg", href: null, grp: "marquee" },
  {
    name: "AWS",
    src: `${COMMUNITY_LOGO_BASE_URL}/aws.svg`,
    href: `${COMMUNITY_LOGO_BASE_URL}/aws-light.png`,
    grp: "community",
  },
  {
    name: "Google Cloud",
    src: `${COMMUNITY_LOGO_BASE_URL}/google_cloud.svg`,
    href: null,
    grp: "community",
  },
  {
    name: "Azure",
    src: `${COMMUNITY_LOGO_BASE_URL}/Microsoft_Azure.svg`,
    href: null,
    grp: "community",
  },
  {
    name: "Salesforce",
    src: `${COMMUNITY_LOGO_BASE_URL}/Salesforce.com_logo.svg`,
    href: null,
    grp: "community",
  },
  {
    name: "Oracle",
    src: `${COMMUNITY_LOGO_BASE_URL}/Oracle_logo.svg`,
    href: null,
    grp: "community",
  },
  {
    name: "GitHub",
    src: `${COMMUNITY_LOGO_BASE_URL}/github-white-icon.webp`,
    href: `${COMMUNITY_LOGO_BASE_URL}/github-white-icon.webp`,
    grp: "community",
  },
];

export const FALLBACK_STATS: SiteStat[] = [
  { key: "learners", value: "50K+", label: "Learners" },
  { key: "rating", value: "4.9", label: "Rating" },
  { key: "certified", value: "10000+", label: "Certified" },
  { key: "tracks", value: "10000+", label: "Certified" },
  { key: "success_rate", value: "95%", label: "Success Rate" },
  { key: "communities", value: "17", label: "Communities" },
  { key: "reached", value: "400K+", label: "Reached" },
];

export const FALLBACK_PROMOTION: Promotion = {
  headline: "Get Discounted Certification Vouchers",
  discount_text: "Discounted",
  cta_label: "Get Discounted Voucher",
  cta_url: "/schedule/40min",
};

export const FALLBACK_FAQS: Faq[] = [
  {
    question: "How do I claim my discounted AWS Exam Voucher?",
    answer:
      "Click 'Get Discounted Voucher' to select your certification and choose a meeting slot. Our team connects with you in a brief 1-on-1 session to verify your details, apply your official discounted voucher, and confirm your exam appointment.",
  },
  {
    question: "Which AWS certifications are eligible for the discount?",
    answer: "list",
    listItems: [
      "AWS Certified Cloud Practitioner (CLF-C02)",
      "AWS Certified AI Practitioner (AIF-C01)",
      "AWS Certified Solutions Architect – Associate (SAA-C03)",
      "AWS Certified Developer – Associate (DVA-C02)",
      "AWS Certified SysOps Administrator – Associate (SOA-C03)",
      "AWS Certified Data Engineer – Associate (DEA-C01)",
      "AWS Certified Machine Learning Engineer – Associate (MLA-C01)",
      "AWS Certified Solutions Architect – Professional (SAP-C02)",
      "AWS Certified DevOps Engineer – Professional (DOP-C02)",
      "AWS Certified Security – Specialty (SCS-C02)",
    ],
  },
  {
    question: "What resources and bonus features are included in the package?",
    answer:
      "Along with your official discounted voucher, you get access to verified practice exams & question banks, top Udemy certification courses, 1-on-1 scheduling assistance, community mentorship, and a featured badge on the Certified Yatris Wall of Fame upon passing.",
  },
  {
    question: "How does the 1-on-1 guided scheduling call work?",
    answer:
      "During the scheduled meeting, our mentors walk you through your AWS Certification portal, verify your Pearson VUE registration details, apply the discounted voucher code, and help you lock in your preferred date, time, and test format (in-person test center or online proctored).",
  },
  {
    question: "Are the practice exams and questions up to date?",
    answer:
      "Yes! Our question banks and study materials are continuously curated and updated to match the latest official AWS exam guides and domain objectives, giving candidates a 98%+ first-attempt pass rate.",
  },
  {
    question: "How do I get listed on the Certified Yatris Wall of Fame?",
    answer:
      "Once you clear your certification, submit your official Credly badge link or certification ID through your account on certification.yatricloud.com. Your achievement will be published on the public Wall of Fame, visible to recruiters and peers worldwide.",
  },
  {
    question: "How soon can I schedule and take my exam after booking?",
    answer:
      "You can book your exam immediately during our call for any upcoming date that matches your preparation plan, whether you want to take it in the next 48 hours or a few weeks later.",
  },
  {
    question: "Do I need to join the WhatsApp group to participate?",
    answer:
      "Yes, the WhatsApp community group is an essential part of the support package. It's where you receive real-time updates, exam tips, peer discussions, and direct coordination with our team for scheduling and guidance.",
  },
  {
    question: "Is the discounted voucher offer available for Azure, GCP, or GitHub certifications?",
    answer:
      "The discounted voucher program is currently focused on AWS Associate and Specialty exams. Yatri Cloud also supports select Azure, GCP, and GitHub certifications, reach out to our team via WhatsApp or the contact form for current availability.",
  },
  {
    question: "What is the Certified Yatris platform?",
    answer:
      "Certified Yatris is our public achievement showcase at certification.yatricloud.com. Create a free account, log your cloud certifications with official Credly badges, and appear on our interactive worldwide map alongside thousands of verified cloud professionals.",
  },
];

export const FALLBACK_TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Yatharth Chauhan",
    role: "Founder – Yatri Cloud",
    // Self-hosted 200px copy, the original remote PNG was 812 KB.
    image: "https://raw.githubusercontent.com/YatharthChauhan2362/prod-public-images/refs/heads/main/yatharth-chauhan-profile1.png",
    portfolio: "https://yatharthchauhan.me/",
  },
  {
    name: "Nensi Ravaliya",
    role: "Creator - Yatri Cloud",
    // Self-hosted 200px copy, the original remote PNG was 2 MB.
    image: "/team/nensi-ravaliya-200.png",
    portfolio: "https://nensi.yatricloud.com/",
  },
];

export const FALLBACK_PACKAGE_BENEFITS: PackageBenefit[] = [
  {
    text: "Discounted Vouchers",
    description: "Get AWS Associate exam vouchers at discounted rates for all eligible exams",
  },
  {
    text: "Practice Exams & Resources",
    description: "Comprehensive practice exams and study resources to help you prepare effectively",
  },
  {
    text: "Guided Exam Scheduling & Support",
    description: "Personalized support and step-by-step guidance to schedule your AWS certification exam",
  },
];

export const FALLBACK_CERTIFICATION_STEPS: CertificationStep[] = [
  {
    number: 1,
    title: "Select Time",
    description: "Select an available time slot for your 1-on-1 scheduling call",
    action: {
      label: "Book Now",
      isPopup: true,
      url: "#",
    },
  },
  {
    number: 2,
    title: "Book a Meet",
    description: "Confirm your appointment through our scheduling calendar",
    action: null,
  },
  {
    number: 3,
    title: "Exam Scheduling",
    description: "We guide you through voucher application and exam booking directly on Pearson VUE",
    action: null,
  },
];

export const FALLBACK_ELIGIBLE_EXAMS: EligibleExam[] = [
  { title: "AWS Cloud Practitioner", examCode: "CLF-C02" },
  { title: "AWS AI Practitioner", examCode: "AIF-C01" },
  { title: "AWS Certified Solutions Architect – Associate (SAA-C03)", examCode: "SAA-C03" },
  { title: "AWS Certified Developer – Associate (DVA-C02)", examCode: "DVA-C02" },
  { title: "AWS Certified CloudOps Engineer – Associate (SOA-C03)", examCode: "SOA-C03" },
  { title: "AWS Certified Data Engineer – Associate (DEA-C01)", examCode: "DEA-C01" },
  { title: "AWS Certified Machine Learning Engineer – Associate (MLA-C01)", examCode: "MLA-C01" },
];

export const FALLBACK_RECOGNITIONS: Recognition[] = [
  { label: "Microsoft MVP", logo: "/logos/microsoft.svg" },
  { label: "Microsoft Certified Trainer", logo: "/logos/microsoft.svg" },
  { label: "Google Developer Expert", logo: "/logos/google.svg" },
  { label: "AWS Hero", logo: "/logos/aws.svg" },
  { label: "AWS Subject Matter Expert", logo: "/logos/aws.svg" },
  { label: "AWS Community Builder", logo: "/logos/aws.svg" },
  { label: "CNCF Ambassador", logo: "/logos/cncf.svg" },
  { label: "Docker Captain", logo: "/logos/docker.svg" },
  { label: "HashiCorp Ambassador", logo: "/logos/hashicorp.svg" },
  { label: "MS Learn Student Ambassador (Gold)", logo: "/logos/microsoft.svg" },
  { label: "Google Student Ambassador", logo: "/logos/google.svg" },
  { label: "GitHub Campus Expert", logo: "/logos/github.svg" },
];

export const FALLBACK_TRUST_FEATURES: TrustFeature[] = [
  {
    title: "Discounted Vouchers",
    description: "Get AWS Associate exam vouchers at special discounted partner rates.",
  },
  {
    title: "Complete Support Package",
    description: "Practice exams, study resources, guides, and personal support included.",
  },
  {
    title: "Guided Exam Scheduling",
    description: "Our team schedules your exam via personal meeting call for correct setup.",
  },
  {
    title: "Personal Support",
    description: "Direct support from our team via WhatsApp group for guidance and assistance.",
  },
  {
    title: "Yatri Wall of Fame",
    description: "Get featured on our Wall of Fame after successfully passing your AWS certification.",
  },
];

export const FALLBACK_NOT_FOR_YOU: TrustFeature[] = [
  {
    title: "You're seeking completely free exam vouchers without personal guidance or verified resources",
    description: "",
  },
  {
    title: "You prefer navigating the exam booking and verification process entirely on your own",
    description: "",
  },
  {
    title: "You'd rather study in complete isolation without community discussions or peer tips",
    description: "",
  },
  {
    title: "You already have access to premium practice questions and verified exam material",
    description: "",
  },
  {
    title: "You don't need structured checkpoints or mentor assistance to keep you on schedule",
    description: "",
  },
];

/* Communities, copied verbatim from src/pages/Community.tsx.
 * Icon-only entries keep their Lucide icons in the consumer, which
 * merges them back by name, so `logo` is null for those rows here. */
export const FALLBACK_COMMUNITIES: CommunityEntry[] = [
  { name: "Yatri Community", url: "https://whatsapp.com/channel/0029VakdAHIFHWq60yHA1Q0s", tagline: "", logo: null, grp: "channel" },
  { name: "AWS Yatri", url: "https://chat.whatsapp.com/Luh1daKLk4tCfgohAdkayp", tagline: "The world's #1 cloud", logo: "/logos/aws.svg", grp: "main" },
  { name: "Microsoft Yatri", url: "https://chat.whatsapp.com/CzcpDRiV2vR87vGwY7dPAp", tagline: "Azure, MVP & the Microsoft stack", logo: "/logos/microsoft.svg", grp: "main" },
  { name: "GCP Yatri", url: "https://chat.whatsapp.com/JgUS13YbcYCL82PfpLQnBv", tagline: "Google Cloud & data", logo: "/logos/googlecloud.svg", grp: "main" },
  { name: "GitHub Yatri", url: "https://chat.whatsapp.com/DbuYINmHGKF3qkQLYU5Ugx", tagline: "Open source, PRs & version control", logo: "/logos/github.svg", grp: "main" },
  { name: "Kubernetes Yatri", url: "https://chat.whatsapp.com/LC5LN2YTqjV24X0eiSMNwe", tagline: "Containers & cloud-native", logo: "/logos/kubernetes.svg", grp: "main" },
  { name: "DevOps Yatri", url: "https://chat.whatsapp.com/JYjH73L6Tof7JDmYQSUYqW", tagline: "CI/CD, automation & SRE", logo: null, grp: "main" },
  { name: "AI Yatri", url: "https://chat.whatsapp.com/FPgpa7E8WQyA75ITKzXxI0", tagline: "LLMs, ML & the future of AI", logo: null, grp: "main" },
  { name: "Salesforce Yatri", url: "https://chat.whatsapp.com/KGjtJpcqgPRJFB6ImU2Awc", tagline: "CRM & the Salesforce ecosystem", logo: "/logos/salesforce.svg", grp: "main" },
  { name: "Oracle Yatri", url: "https://chat.whatsapp.com/JETPhF7ZE3LDQQeeigLLge", tagline: "Databases & enterprise cloud", logo: "/logos/oracle.svg", grp: "main" },
  { name: "TiDB Yatri", url: "https://chat.whatsapp.com/GNFWRA2yxSVCafGXgpXQO6", tagline: "Distributed SQL & databases", logo: null, grp: "main" },
  { name: "Google Cloud Arcade Yatri", url: "https://chat.whatsapp.com/Lkm5LMvsTrACLn6FIijist", tagline: "Earn badges & swag with GCP Arcade", logo: null, grp: "main" },
  { name: "Women Yatri", url: "https://chat.whatsapp.com/If2yiVZNzivHdf7nv5lHiU", tagline: "Women in cloud & tech", logo: null, grp: "main" },
  { name: "Blog Yatri", url: "https://chat.whatsapp.com/LJWGl6juKNgK7kO7jjgwp1", tagline: "Write, learn & get published", logo: null, grp: "main" },
  { name: "Yatri LinkedIn", url: "https://chat.whatsapp.com/ImroH8OP1GKBzB2dACmqmf", tagline: "Network, grow & get noticed", logo: null, grp: "main" },
  { name: "Azure Yatri", url: "https://chat.whatsapp.com/JUl0ysEOLZGKVSHnsuIoJb", tagline: "Microsoft's cloud platform", logo: "/logos/azure.svg", grp: "ms_subs" },
  { name: "MLSA Yatri", url: "https://chat.whatsapp.com/CRPn0N5V2lbDsexLrXY0l4", tagline: "Microsoft Learn Student Ambassadors", logo: "/logos/microsoft.svg", grp: "ms_subs" },
  { name: "MVP Yatri", url: "https://chat.whatsapp.com/GIqTRS29D8iIQodRNNXblr", tagline: "Most Valuable Professionals", logo: "/logos/microsoft.svg", grp: "ms_subs" },
];

/* Nav links, copied verbatim from Navbar.tsx and Footer.tsx. */
export const FALLBACK_NAV_LINKS: Record<NavLinkLocation, NavLink[]> = {
  navbar: [
    { href: "/community", label: "Community" },
    { href: "/partners", label: "Partners" },
  ],
  footer_explore: [
    { href: "/training", label: "Training" },
    { href: "/hands-on-labs", label: "Hands-on Labs" },
    { href: "/blog", label: "Blog" },
  ],
  footer_quick: [
    { href: "/about-us", label: "About Us" },
    { href: "/events", label: "Events" },
    { href: "/community", label: "Community" },
    { href: "/partners", label: "Partners" },
  ],
  footer_legal: [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-and-conditions", label: "Terms and Conditions" },
    { href: "/cancellation-and-refund", label: "Cancellation and Refund" },
    { href: "/shipping-and-exchange", label: "Shipping and Exchange" },
    { href: "/contact-us", label: "Contact Us" },
    { href: "/reviews", label: "Reviews" },
  ],
};

/* Option lists, copied verbatim from their consumer pages. */
export const FALLBACK_OPTION_LISTS: Record<string, OptionItem[]> = {
  udemy_creator: [
    { value: "yatharth-chauhan", label: "Yatharth Chauhan" },
    { value: "nensi-ravaliya", label: "Nensi Ravaliya" },
  ],
  course_tech: [
    { value: "AWS", label: "AWS" },
    { value: "Azure", label: "Azure" },
    { value: "Google Cloud", label: "Google Cloud" },
    { value: "Databricks", label: "Databricks" },
    { value: "GitHub", label: "GitHub" },
    { value: "Oracle", label: "Oracle" },
    { value: "Salesforce", label: "Salesforce" },
    { value: "ServiceNow", label: "ServiceNow" },
  ],
  course_category: [
    { value: "cloud", label: "Cloud" },
    { value: "devops", label: "DevOps" },
    { value: "ai", label: "AI" },
    { value: "data", label: "Data" },
    { value: "security", label: "Security" },
    { value: "networking", label: "Networking" },
    { value: "other", label: "Other" },
  ],
  store_category: [
    { value: "AWS", label: "AWS" },
    { value: "Azure", label: "Azure" },
    { value: "GCP", label: "Google Cloud (GCP)" },
    { value: "Databricks", label: "Databricks" },
    { value: "Redis", label: "Redis" },
    { value: "Snowflake", label: "Snowflake" },
    { value: "Anthropic", label: "Anthropic" },
    { value: "Kubernetes", label: "Kubernetes" },
    { value: "HashiCorp", label: "HashiCorp / Terraform" },
    { value: "GitHub", label: "GitHub" },
    { value: "Salesforce", label: "Salesforce" },
    { value: "Oracle", label: "Oracle" },
    { value: "ServiceNow", label: "ServiceNow" },
    { value: "Cisco", label: "Cisco" },
    { value: "CompTIA", label: "CompTIA" },
    { value: "Docker", label: "Docker" },
    { value: "Linux", label: "Linux Foundation" },
    { value: "OpenAI", label: "OpenAI" },
    { value: "NVIDIA", label: "NVIDIA" },
    { value: "Other", label: "Other" },
  ],
  product_level: [
    { value: "Associate", label: "Associate" },
    { value: "Practitioner", label: "Practitioner" },
    { value: "Professional", label: "Professional" },
    { value: "Specialty", label: "Specialty" },
  ],
  support_category: [
    { value: "account", label: "Account & sign in" },
    { value: "payments", label: "Payments & refunds" },
    { value: "events", label: "Events" },
    { value: "training", label: "Training & courses" },
    { value: "store", label: "Store & vouchers" },
    { value: "technical", label: "Something is broken" },
    { value: "other", label: "Something else" },
  ],
  event_category: [
    { value: "Concert", label: "Concert" },
    { value: "Conference", label: "Conference" },
    { value: "Hackathon", label: "Hackathon" },
    { value: "Marathon", label: "Marathon" },
    { value: "Workshop", label: "Workshop" },
  ],
  sponsor_tier: [
    { value: "Platinum", label: "Platinum" },
    { value: "Gold", label: "Gold" },
    { value: "Silver", label: "Silver" },
    { value: "Bronze", label: "Bronze" },
    { value: "Partner", label: "Partner" },
  ],
  sponsorship_area: [
    { value: "Venue", label: "Venue" },
    { value: "Food & Beverages", label: "Food & Beverages" },
    { value: "Swag/Merchandise", label: "Swag/Merchandise" },
    { value: "Travel Support", label: "Travel Support" },
    { value: "Prize Money", label: "Prize Money" },
    { value: "General Support", label: "General Support" },
  ],
  // Countries with real Yatri records (wall of fame, profiles, event
  // registrations, voucher requests). Admin managed via Dropdown Options.
  community_countries: [
    { value: "IN", label: "India" },
    { value: "EG", label: "Egypt" },
    { value: "NG", label: "Nigeria" },
    { value: "GT", label: "Guatemala" },
    { value: "BD", label: "Bangladesh" },
    { value: "DZ", label: "Algeria" },
  ],
};

/* Legal pages, converted 1:1 from the JSX that used to live in
 * src/pages/PrivacyPolicy.tsx and src/pages/TermsOfService.tsx.
 * One `## heading` per former <section>, every sentence verbatim.
 * The H1 lives in `title`; the "Last updated" line stays page rendered. */
export const FALLBACK_LEGAL_PAGES: Record<string, LegalPage> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    body_md: `## 1. Introduction

Yatri Cloud ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.

## 2. Information We Collect

We may collect information about you in a variety of ways:

- Personal information you provide when using our services
- Usage data and analytics information
- Cookies and tracking technologies
- Information from third-party services integrated with our platform

## 3. How We Use Your Information

We use the information we collect to:

- Provide, maintain, and improve our services
- Process transactions and send related information
- Send technical notices and support messages
- Respond to your comments and questions
- Monitor and analyze trends and usage

## 4. Information Sharing

We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:

- With your consent
- To comply with legal obligations
- To protect our rights and safety
- With service providers who assist us in operating our platform

## 5. Data Security

We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.

## 6. Your Rights

You have the right to:

- Access and receive a copy of your personal data
- Rectify inaccurate personal data
- Request deletion of your personal data
- Object to processing of your personal data
- Request restriction of processing your personal data

## 7. Cookies and Advertising

We use cookies, web beacons, and similar tracking technologies to track activity on our website, improve user experience, and deliver relevant content.

- Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website or other websites on the Internet.
- Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visits to our site and/or other sites across the Internet.
- Users may opt out of personalized advertising by visiting Google Ads Settings (https://www.google.com/settings/ads) or by visiting https://www.aboutads.info/choices/.
- You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, some portions of our services may not function as intended.

## 8. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.

## 9. Contact Us

If you have any questions about this Privacy Policy, please contact us through our website or email.`,
  },
  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of Service",
    body_md: `## 1. Agreement to Terms

By accessing or using Yatri Cloud's services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.

## 2. Use License

Permission is granted to temporarily access the materials on Yatri Cloud's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:

- Modify or copy the materials
- Use the materials for any commercial purpose or for any public display
- Attempt to reverse engineer any software contained on the website
- Remove any copyright or other proprietary notations from the materials

## 3. User Accounts

When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.

## 4. Content

Our service allows you to post, link, store, share and otherwise make available certain information. You are responsible for the content that you post on or through the service, including its legality, reliability, and appropriateness.

By posting content on or through the service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such content on and through the service.

## 5. Prohibited Uses

You may not use our service:

- In any way that violates any applicable law or regulation
- To transmit any malicious code or viruses
- To impersonate or attempt to impersonate another user
- To engage in any automated use of the system
- To interfere with or disrupt the service or servers

## 6. Intellectual Property

The service and its original content, features, and functionality are and will remain the exclusive property of Yatri Cloud and its licensors. The service is protected by copyright, trademark, and other laws.

## 7. Disclaimer

The materials on Yatri Cloud's website are provided on an 'as is' basis. Yatri Cloud makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

## 8. Limitations

In no event shall Yatri Cloud or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Yatri Cloud's website.

## 9. Revisions

Yatri Cloud may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.

## 10. Governing Law

These terms and conditions are governed by and construed in accordance with applicable laws. Any disputes relating to these terms will be subject to the exclusive jurisdiction of the courts in the applicable jurisdiction.`,
  },
};

/* Guides, bodies come straight from src/data/guides-content.ts so the
 * markdown lives in exactly one place. Titles equal each guide's H1. */
export const FALLBACK_GUIDES: Record<string, Guide> = {
  "admin-guide": {
    slug: "admin-guide",
    title: "Yatri Cloud: The Definitive Operations Manual",
    body_md: ADMIN_GUIDE_CONTENT,
  },
  "user-guide": {
    slug: "user-guide",
    title: "Yatri Cloud: The Professional Growth Guide",
    body_md: USER_GUIDE_CONTENT,
  },
  "admin-sitemap": {
    slug: "admin-sitemap",
    title: "Yatri Cloud: Administrative Sitemap & Operations Guide",
    body_md: ADMIN_URL_SITE_MAP,
  },
  "user-sitemap": {
    slug: "user-sitemap",
    title: "Yatri Cloud: User Sitemap & Access Guide",
    body_md: USER_URL_SITE_MAP,
  },
};

/* ------------------------------------------------------------------ */
/* Session cache, one shared promise per resource                     */
/* ------------------------------------------------------------------ */

let settingsPromise: Promise<Record<string, any>> | null = null;
let statsPromise: Promise<SiteStat[]> | null = null;
const promotionPromises: Record<string, Promise<Promotion | null>> = {};
let faqsPromise: Promise<Faq[]> | null = null;
let teamMembersPromise: Promise<TeamMember[]> | null = null;
let packageBenefitsPromise: Promise<PackageBenefit[]> | null = null;
let certificationStepsPromise: Promise<CertificationStep[]> | null = null;
let eligibleExamsPromise: Promise<EligibleExam[]> | null = null;
let recognitionsPromise: Promise<Recognition[]> | null = null;
const trustFeaturesPromises: Partial<Record<TrustFeatureKind, Promise<TrustFeature[]>>> = {};
let communitiesPromise: Promise<CommunityEntry[]> | null = null;
let techLogosPromise: Promise<TechLogo[]> | null = null;
const navLinksPromises: Partial<Record<NavLinkLocation, Promise<NavLink[]>>> = {};
const optionListPromises: Record<string, Promise<OptionItem[]>> = {};
const legalPagePromises: Record<string, Promise<LegalPage | null>> = {};
const guidePromises: Record<string, Promise<Guide | null>> = {};

/** Sanitizes any aggressive '50% off' marketing text to 'Discounted' */
export function cleanDiscountText(text: string): string {
  if (!text) return text;
  return text
    .replace(/50%\s*off/gi, "Discounted")
    .replace(/50%\s*discount/gi, "discounted")
    .replace(/at\s+50%/gi, "with discounted vouchers")
    .replace(/up\s+to\s+50%/gi, "discounted rates")
    .replace(/half\s+price/gi, "discounted price");
}

/** key → value map from `site_settings`. Never throws; falls back per key. */
export function getSiteSettings(): Promise<Record<string, any>> {
  if (!settingsPromise) {
    settingsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key, value");
        if (error || !data || data.length === 0) return FALLBACK_SETTINGS;
        const map: Record<string, any> = { ...FALLBACK_SETTINGS };
        for (const row of data) {
          if (!row?.key) continue;
          const fallback = FALLBACK_SETTINGS[row.key];
          let val =
            fallback && typeof fallback === "object"
              ? { ...fallback, ...(row.value ?? {}) }
              : row.value ?? fallback;
          if (row.key === "hero" && val?.subheadline) {
            val = {
              ...val,
              subheadline: cleanDiscountText(val.subheadline),
            };
          }
          map[row.key] = val;
        }
        return map;
      } catch {
        return FALLBACK_SETTINGS;
      }
    })();
  }
  return settingsPromise;
}

/** Active `site_stats` rows in display order. Never throws. */
export function getSiteStats(): Promise<SiteStat[]> {
  if (!statsPromise) {
    statsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("site_stats")
          .select("key, value, label")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_STATS;
        return data.map((row: any) => ({
          key: String(row.key ?? ""),
          value: cleanDiscountText(String(row.value ?? "")),
          label: String(row.label ?? ""),
        }));
      } catch {
        return FALLBACK_STATS;
      }
    })();
  }
  return statsPromise;
}

/** The active promotion (optionally by slug). Never throws. */
export function getActivePromotion(slug?: string): Promise<Promotion | null> {
  const cacheKey = slug ?? "__any__";
  if (!promotionPromises[cacheKey]) {
    promotionPromises[cacheKey] = (async () => {
      try {
        let query = supabase
          .from("promotions")
          .select("headline, discount_text, cta_label, cta_url")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(1);
        if (slug) query = query.eq("slug", slug);
        const { data, error } = await query;
        if (error || !data || data.length === 0) return FALLBACK_PROMOTION;
        const row: any = data[0];
        const rawHeadline = String(row.headline ?? FALLBACK_PROMOTION.headline);
        const headline = rawHeadline.includes("50%")
          ? "Get Discounted Certification Vouchers"
          : cleanDiscountText(rawHeadline);
        const rawCta = String(row.cta_label ?? FALLBACK_PROMOTION.cta_label);
        const cta_label = rawCta.includes("50%") ? "Get Discounted Voucher" : cleanDiscountText(rawCta);
        return {
          headline,
          discount_text: cleanDiscountText(String(row.discount_text ?? FALLBACK_PROMOTION.discount_text)),
          cta_label,
          cta_url: String(row.cta_url ?? FALLBACK_PROMOTION.cta_url),
        };
      } catch {
        return FALLBACK_PROMOTION;
      }
    })();
  }
  return promotionPromises[cacheKey];
}

/** Active FAQs in display order. Never throws. */
export function getFaqs(): Promise<Faq[]> {
  if (!faqsPromise) {
    faqsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("faqs")
          .select("question, answer, list_items")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_FAQS;
        return data.map((row: any) => {
          const faq: Faq = {
            question: cleanDiscountText(String(row.question ?? "")),
            answer: cleanDiscountText(String(row.answer ?? "")),
          };
          if (Array.isArray(row.list_items) && row.list_items.length > 0) {
            faq.listItems = row.list_items.map((item: any) => String(item));
          }
          return faq;
        });
      } catch {
        return FALLBACK_FAQS;
      }
    })();
  }
  return faqsPromise;
}

/** Active team members in display order. Never throws. */
export function getTeamMembers(): Promise<TeamMember[]> {
  if (!teamMembersPromise) {
    teamMembersPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("name, role, image_url, portfolio_url")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_TEAM_MEMBERS;
        return data.map((row: any) => ({
          name: String(row.name ?? ""),
          role: String(row.role ?? ""),
          image: String(row.image_url ?? ""),
          portfolio: String(row.portfolio_url ?? ""),
        }));
      } catch {
        return FALLBACK_TEAM_MEMBERS;
      }
    })();
  }
  return teamMembersPromise;
}

/** Active certification package benefits in display order. Never throws. */
export function getPackageBenefits(): Promise<PackageBenefit[]> {
  if (!packageBenefitsPromise) {
    packageBenefitsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("package_benefits")
          .select("title, description")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_PACKAGE_BENEFITS;
        return data.map((row: any) => ({
          text: cleanDiscountText(String(row.title ?? "")),
          description: cleanDiscountText(String(row.description ?? "")),
        }));
      } catch {
        return FALLBACK_PACKAGE_BENEFITS;
      }
    })();
  }
  return packageBenefitsPromise;
}

/** Active certification journey steps in display order. Never throws. */
export function getCertificationSteps(): Promise<CertificationStep[]> {
  if (!certificationStepsPromise) {
    certificationStepsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("certification_steps")
          .select("step_number, title, description, action_label, action_is_popup")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_CERTIFICATION_STEPS;
        return data.map((row: any, index: number) => ({
          number: Number(row.step_number ?? index + 1),
          title: String(row.title ?? ""),
          description: String(row.description ?? ""),
          action: row.action_label
            ? {
              label: String(row.action_label),
              isPopup: row.action_is_popup === true,
              url: "#",
            }
            : null,
        }));
      } catch {
        return FALLBACK_CERTIFICATION_STEPS;
      }
    })();
  }
  return certificationStepsPromise;
}

/** Active eligible exams in display order. Never throws. */
export function getEligibleExams(): Promise<EligibleExam[]> {
  if (!eligibleExamsPromise) {
    eligibleExamsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("eligible_exams")
          .select("title, exam_code")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_ELIGIBLE_EXAMS;
        return data.map((row: any) => ({
          title: String(row.title ?? ""),
          examCode: row.exam_code ? String(row.exam_code) : null,
        }));
      } catch {
        return FALLBACK_ELIGIBLE_EXAMS;
      }
    })();
  }
  return eligibleExamsPromise;
}

/** Active instructor recognitions in display order. Never throws. */
export function getRecognitions(): Promise<Recognition[]> {
  if (!recognitionsPromise) {
    recognitionsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("recognitions")
          .select("label, logo_url")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_RECOGNITIONS;
        return data.map((row: any) => ({
          label: String(row.label ?? ""),
          logo: String(row.logo_url ?? ""),
        }));
      } catch {
        return FALLBACK_RECOGNITIONS;
      }
    })();
  }
  return recognitionsPromise;
}

/** Active trust features for a given kind in display order. Never throws. */
export function getTrustFeatures(kind: TrustFeatureKind): Promise<TrustFeature[]> {
  if (!trustFeaturesPromises[kind]) {
    const fallback = kind === "feature" ? FALLBACK_TRUST_FEATURES : FALLBACK_NOT_FOR_YOU;
    trustFeaturesPromises[kind] = (async () => {
      try {
        const { data, error } = await supabase
          .from("trust_features")
          .select("title, description")
          .eq("kind", kind)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return fallback;
        return data.map((row: any) => ({
          title: cleanDiscountText(String(row.title ?? "")),
          description: row.description ? cleanDiscountText(String(row.description)) : "",
        }));
      } catch {
        return fallback;
      }
    })();
  }
  return trustFeaturesPromises[kind]!;
}

/** Active communities in display order, optionally filtered by group. Never throws. */
export function getCommunities(grp?: CommunityGroup): Promise<CommunityEntry[]> {
  if (!communitiesPromise) {
    communitiesPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("communities")
          .select("name, url, tagline, logo_url, grp")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_COMMUNITIES;
        return data.map((row: any) => ({
          name: String(row.name ?? ""),
          url: String(row.url ?? ""),
          tagline: String(row.tagline ?? ""),
          logo: row.logo_url ? String(row.logo_url) : null,
          grp: (row.grp === "channel" || row.grp === "ms_subs"
            ? row.grp
            : "main") as CommunityGroup,
        }));
      } catch {
        return FALLBACK_COMMUNITIES;
      }
    })();
  }
  if (!grp) return communitiesPromise;
  return communitiesPromise.then((rows) => rows.filter((c) => c.grp === grp));
}

/** Active tech logos in display order, optionally filtered by group. Never throws. */
export function getTechLogos(grp?: TechLogoGroup): Promise<TechLogo[]> {
  if (!techLogosPromise) {
    techLogosPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("tech_logos")
          .select("name, src, href, grp")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_TECH_LOGOS;
        return data.map((row: any) => ({
          name: String(row.name ?? ""),
          src: String(row.src ?? ""),
          href: row.href ? String(row.href) : null,
          grp: (row.grp === "community" ? "community" : "marquee") as TechLogoGroup,
        }));
      } catch {
        return FALLBACK_TECH_LOGOS;
      }
    })();
  }
  if (!grp) return techLogosPromise;
  return techLogosPromise.then((rows) => rows.filter((l) => l.grp === grp));
}

/** Active nav links for a location in display order. Never throws. */
export function getNavLinks(location: NavLinkLocation): Promise<NavLink[]> {
  if (!navLinksPromises[location]) {
    navLinksPromises[location] = (async () => {
      try {
        const { data, error } = await supabase
          .from("nav_links")
          .select("label, href")
          .eq("location", location)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return FALLBACK_NAV_LINKS[location];
        return data.map((row: any) => ({
          href: String(row.href ?? ""),
          label: String(row.label ?? ""),
        }));
      } catch {
        return FALLBACK_NAV_LINKS[location];
      }
    })();
  }
  return navLinksPromises[location]!;
}

/** Active option list rows for a list name in display order. Never throws. */
export function getOptionList(list: string): Promise<OptionItem[]> {
  if (!optionListPromises[list]) {
    const fallback = FALLBACK_OPTION_LISTS[list] ?? [];
    optionListPromises[list] = (async () => {
      try {
        const { data, error } = await supabase
          .from("option_lists")
          .select("value, label")
          .eq("list", list)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return fallback;
        return data.map((row: any) => ({
          value: String(row.value ?? ""),
          label: String(row.label ?? row.value ?? ""),
        }));
      } catch {
        return fallback;
      }
    })();
  }
  return optionListPromises[list];
}

/** A legal page (`legal_pages` row) by slug. Never throws; falls back
 * to the verbatim hardcoded copy so visitors never see a blank page. */
export function getLegalPage(slug: string): Promise<LegalPage | null> {
  if (!legalPagePromises[slug]) {
    const fallback = FALLBACK_LEGAL_PAGES[slug] ?? null;
    legalPagePromises[slug] = (async () => {
      try {
        const { data, error } = await supabase
          .from("legal_pages")
          .select("slug, title, body_md")
          .eq("slug", slug)
          .limit(1);
        if (error || !data || data.length === 0) return fallback;
        const row: any = data[0];
        if (!row?.body_md) return fallback;
        return {
          slug: String(row.slug ?? slug),
          title: String(row.title ?? fallback?.title ?? ""),
          body_md: String(row.body_md),
        };
      } catch {
        return fallback;
      }
    })();
  }
  return legalPagePromises[slug];
}

/** A guide (`guides` row) by slug. Never throws; falls back to the
 * constants exported from src/data/guides-content.ts. */
export function getGuide(slug: string): Promise<Guide | null> {
  if (!guidePromises[slug]) {
    const fallback = FALLBACK_GUIDES[slug] ?? null;
    guidePromises[slug] = (async () => {
      try {
        const { data, error } = await supabase
          .from("guides")
          .select("slug, title, body_md")
          .eq("slug", slug)
          .limit(1);
        if (error || !data || data.length === 0) return fallback;
        const row: any = data[0];
        if (!row?.body_md) return fallback;
        return {
          slug: String(row.slug ?? slug),
          title: String(row.title ?? fallback?.title ?? ""),
          body_md: String(row.body_md),
        };
      } catch {
        return fallback;
      }
    })();
  }
  return guidePromises[slug];
}

/* ------------------------------------------------------------------ */
/* Convenience helpers                                                  */
/* ------------------------------------------------------------------ */

/** Look up a stat value by key with a guaranteed fallback string. */
export function statValue(
  stats: SiteStat[],
  key: string,
  fallback: string
): string {
  const found = stats.find((s) => s.key === key);
  return found?.value || fallback;
}

/**
 * React hook: render with `fallback` immediately (no flash, no layout
 * shift), then swap in the fetched value once it resolves. Fetchers are
 * session cached above, so this never spams the network per component.
 */
/**
 * Like useSiteContent, but starts from the last value this browser saw (localStorage)
 * instead of the code fallback, so above-the-fold copy doesn't swap text on every
 * refresh. index.html's static hero shell reads the same keys before React loads.
 */
export function useCachedSiteContent<T extends object>(cacheKey: string, fetcher: () => Promise<T>, fallback: T): T {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) return { ...fallback, ...JSON.parse(raw) } as T;
    } catch {
      /* storage blocked or bad JSON, use the fallback */
    }
    return fallback;
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let mounted = true;
    fetcherRef
      .current()
      .then((result) => {
        if (!mounted || result === null || result === undefined) return;
        setValue(result);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          /* storage full or blocked, nothing to do */
        }
      })
      .catch(() => {
        /* keep the cached or fallback value */
      });
    return () => {
      mounted = false;
    };
  }, [cacheKey]);

  return value;
}

export function useSiteContent<T>(fetcher: () => Promise<T>, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let mounted = true;
    fetcherRef
      .current()
      .then((result) => {
        if (mounted && result !== null && result !== undefined) {
          setValue(result);
        }
      })
      .catch(() => {
        /* keep the fallback, never blank the section */
      });
    return () => {
      mounted = false;
    };
  }, []);

  return value;
}
