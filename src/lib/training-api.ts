/**
 * Yatri Cloud, Training data-access layer (Supabase).
 *
 * Replaces the legacy Google Apps Script backend (VITE_TRAINING_SCRIPT_URL).
 * Every function here talks to the already-migrated Supabase tables:
 *   trainings · training_enrollments · course_modules · course_lessons
 *   trainer_applications · profiles
 *
 * The UI shapes (Course / Enrollment / TrainerApplication / …) are preserved
 * exactly so no page/component markup or copy needs to change, only the data
 * source. Fields that have no column in the Supabase schema (skills, outcomes,
 * level, instructor-profiles, google-drive folders, google-meet auto links,
 * quizzes) are defaulted on read and dropped on write; those limitations are
 * documented in the migration notes.
 */

import { supabase } from "@/lib/supabase";
import { getCachedUser, fetchMyProfile } from "@/lib/auth";
import { getFormProviders } from "@/lib/cert-catalog";
import { sendEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Provider enum helpers
// ---------------------------------------------------------------------------

/** Display-cased provider labels shown in the UI (fallback list). */
export const PROVIDERS_DISPLAY = [
  "AWS", "Azure", "GCP", "GitHub", "Oracle", "Salesforce",
  "ServiceNow", "OpenAI", "Anthropic", "Snowflake", "HashiCorp", "Kubernetes", "Other",
];

/**
 * Display labels sourced from the certification catalog. Known providers
 * keep the exact casing above (matched by enum value) so nothing on screen
 * changes; providers added to the catalog later appear with their label.
 * Always ends with "Other" and never throws.
 */
async function providerDisplayLabels(): Promise<string[]> {
  try {
    const forms = await getFormProviders();
    const labels = forms.map((fp) => {
      const enumValue = String(fp.enumValue || fp.slug).toUpperCase();
      return (
        PROVIDERS_DISPLAY.find((l) => l !== "Other" && l.toUpperCase() === enumValue) ||
        fp.label
      );
    });
    return [...labels, "Other"];
  } catch {
    return [...PROVIDERS_DISPLAY];
  }
}

/** Map a free-text provider/track label to the provider_t enum value. */
function toProviderEnum(s: string | null | undefined): string {
  const x = String(s || "").toUpperCase();
  for (const p of ["REDIS", "AWS", "AZURE", "GCP", "GITHUB", "ORACLE", "SALESFORCE", "SERVICENOW", "OPENAI", "ANTHROPIC", "SNOWFLAKE", "HASHICORP", "KUBERNETES"]) {
    if (x.includes(p) || (p === "GCP" && x.includes("GOOGLE")) || (p === "ANTHROPIC" && (x.includes("CLAUDE") || x.includes("ANTHROPIC")))) return p;
  }
  return "OTHER";
}

// ---------------------------------------------------------------------------
// Shared shapes (structurally match the callers' local interfaces)
// ---------------------------------------------------------------------------

export interface Course {
  id: string;
  slug?: string;
  courseName: string;
  description: string;
  instructor: string;
  instructorId?: string;
  level: string;
  duration: string;
  paymentType: "Free" | "Paid";
  price: string;
  /** Optional admin-set platform fee as a % of the base price, added on top of it. 0 = no fee. */
  platformFeePct: number;
  thumbnailUrl: string;
  subType: string;
  mode: "Online" | "On-site";
  skills: string;
  outcomes: string;
  /** Number of public reviews (0 when none). */
  modulesCount: number;
  status: "Draft" | "Published" | "Review";
  /** 'public' = listed on /training; 'private' = unlisted, reachable only via its direct link. */
  visibility: "public" | "private";
  /** Review gate: 'none' | 'pending' | 'approved' | 'rejected'. */
  reviewStatus: string;
  timestamp: string;
  folderUrl: string;
  venue?: string;
  capacity?: string;
  startDate?: string;
  startTime?: string;
  meetLink?: string;
  resources?: any[];
  /** Average public rating (0 when no public reviews yet). */
  avgRating: number;
  /** Count of public reviews (0 when none). */
  reviewCount: number;
  /** Linked certification this training prepares you for (provider_certifications.id). */
  certificationId?: string | null;
  /** Full label of the linked certification, e.g. "AWS Certified Solutions Architect - Associate". */
  certificationLabel?: string;
  /** Exam code of the linked certification, e.g. "SAA-C03". */
  certificationExamCode?: string;
  /** Provider slug of the linked certification, e.g. "aws". */
  certificationProvider?: string;
}

const createSlug = (name: string) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

/**
 * Unguessable suffix for private (unlisted) URLs, the YouTube-unlisted
 * pattern. The URL itself never says "private"; it is simply not enumerable.
 */
const unlistedToken = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

/** Slug base for a private item: the word "private" never reaches the URL. */
const privateSlugBase = (name: string) =>
  createSlug(String(name || "").replace(/\bprivate\b/gi, " ")) || "training";

const statusToDb = (s?: string) => (s === "Published" ? "published" : "draft");
const statusFromDb = (s?: string): "Draft" | "Published" =>
  s === "published" ? "Published" : "Draft";

/** Map a trainings row → the legacy Course shape used across the public UI. */
function rowToCourse(row: any, modulesCount = 0): Course {
  const priceNum = Number(row.price_inr) || 0;
  const isPaid = priceNum > 0;
  const mode: "Online" | "On-site" = row.mode === "online" ? "Online" : "On-site";
  const reviewStatus = row.review_status || "none";
  // A draft awaiting admin approval reads as "Review" so both dashboards can
  // tell it apart from an untouched draft. A published course stays published.
  let status: "Draft" | "Published" | "Review" = statusFromDb(row.status);
  if (status !== "Published" && reviewStatus === "pending") status = "Review";
  // PostgREST embeds a to-one relation as an object (or null when unlinked).
  const cert = Array.isArray(row.provider_certifications)
    ? row.provider_certifications[0]
    : row.provider_certifications;
  return {
    id: row.id,
    slug: row.slug || "",
    courseName: row.course_title || row.name || "",
    description: row.description || "",
    instructor: row.trainer_name || "",
    instructorId: row.trainer_id || "",
    level: row.level || "All Levels",
    duration: row.duration_hours ? `${row.duration_hours} hours` : "",
    paymentType: isPaid ? "Paid" : "Free",
    price: isPaid ? `₹${priceNum}` : "Free",
    platformFeePct: Number(row.platform_fee_pct) || 0,
    thumbnailUrl: row.image_url || "",
    subType: row.name || "",
    mode,
    skills: row.skills || "",
    outcomes: row.outcomes || "",
    modulesCount,
    status,
    visibility: row.visibility === "private" ? "private" : "public",
    reviewStatus,
    timestamp: row.created_at || "",
    folderUrl: "",
    venue: row.city || "",
    startDate: row.start_date || undefined,
    startTime: row.start_time || undefined,
    meetLink: row.meet_link || undefined,
    resources: Array.isArray(row.resources) ? row.resources : [],
    avgRating: Number(row.avg_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    certificationId: row.certification_id || null,
    certificationLabel: cert?.label || undefined,
    certificationExamCode: cert?.exam_code || undefined,
    certificationProvider: cert?.provider_slug || undefined,
  };
}

// ---------------------------------------------------------------------------
// Public catalog
// ---------------------------------------------------------------------------

/**
 * Column list for anonymous visitors: everything EXCEPT meet_link and
 * trainer_email, the anon role cannot select those (migration 038), and a
 * `select *` would fail outright. Signed-in requests keep `*` so enrolled
 * students still receive the meeting link on their dashboards.
 */
const TRAINING_PUBLIC_COLS =
  "id,slug,name,course_title,provider,start_date,start_time,end_date,duration_hours,mode,city,trainer_id,trainer_name,max_capacity,price_inr,platform_fee_pct,image_url,description,skills,outcomes,resources,status,created_at,updated_at,review_status,avg_rating,review_count,certification_id,visibility,level";

async function trainingCatalogColumns(): Promise<string> {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session ? "*" : TRAINING_PUBLIC_COLS;
}

/** All published (and archived) trainings for the public catalog. */
export async function listPublishedTrainings(): Promise<Course[]> {
  const cols = await trainingCatalogColumns();
  const { data, error } = await supabase
    .from("trainings")
    .select(`${cols}, provider_certifications(label, exam_code, provider_slug)`)
    .in("status", ["published", "archived"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => rowToCourse(r));
}

/**
 * A single training with its module count (public detail / dashboard).
 * Accepts either a slug or an id so slug URLs resolve while old id links still work.
 */
export async function getTrainingDetail(idOrSlug: string): Promise<Course | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug || "");
  const cols = await trainingCatalogColumns();
  const base = supabase
    .from("trainings")
    .select(`${cols}, provider_certifications(label, exam_code, provider_slug)`);
  const { data: rawData, error } = await (
    isUuid ? base.eq("id", idOrSlug) : base.eq("slug", idOrSlug)
  ).maybeSingle();
  if (error) throw error;
  if (!rawData) return null;
  const data = rawData as unknown as Record<string, any>;
  const { count } = await supabase
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("training_id", data.id);
  return rowToCourse(data, count || 0);
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

/**
 * Enroll the current user in a training.
 * RLS requires an authenticated session (user_id = auth.uid()).
 */
export async function enroll(input: {
  trainingId: string;
  email: string;
  paymentId?: string;
  /** INR price of the training (stored for the record). */
  amount?: number;
  /** Currency the Yatri chose to pay in (INR default). */
  currency?: string;
  /** 'pending' before a paid checkout, 'paid'/'free' when settled. */
  paymentStatus?: "pending" | "paid" | "failed" | "free";
  /** Our orders.id row backing this enrollment (paid flows). */
  orderId?: string | null;
  /** Attendee contact details captured on the enrollment form (persisted so
   *  admins/trainers can reach the learner instead of being discarded). */
  fullName?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin?: string;
}): Promise<{ id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to enroll.");
  const email = input.email.trim().toLowerCase();

  const fields: Record<string, unknown> = {};
  if (input.paymentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.paymentId)) {
    fields.payment_id = input.paymentId;
  }
  if (input.amount !== undefined) fields.amount = input.amount;
  if (input.currency) fields.currency = input.currency;
  if (input.paymentStatus) fields.payment_status = input.paymentStatus;

  if (input.orderId !== undefined && input.orderId !== null) fields.order_id = input.orderId;
  // Attendee contact details, only set the ones we actually received so a
  // retried paid attempt never blanks values captured on the first pass.
  if (input.fullName) fields.full_name = input.fullName;
  if (input.phone) fields.phone = input.phone;
  if (input.city) fields.city = input.city;
  if (input.state) fields.state = input.state;
  if (input.country) fields.country = input.country;
  if (input.linkedin) fields.linkedin = input.linkedin;

  // Reuse an existing row for this (training, email) so a retried paid attempt
  // does not hit the unique constraint, mirrors the events flow.
  const { data: existing } = await supabase
    .from("training_enrollments")
    .select("id, payment_status")
    .eq("training_id", input.trainingId)
    .eq("user_id", user.id)
    .eq("email", email)
    .maybeSingle();

  if (existing?.id) {
    // Never downgrade a settled enrollment when a checkout is retried.
    if (existing.payment_status === "paid" || existing.payment_status === "free") {
      return { id: existing.id };
    }
    const { data, error } = await supabase
      .from("training_enrollments")
      .update(fields)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  }

  const { data, error } = await supabase
    .from("training_enrollments")
    .insert({
      training_id: input.trainingId,
      user_id: user.id,
      email,
      status: "enrolled",
      ...fields,
    })
    .select("id")
    .single();

  if (error) {
    // Row already exists (e.g. RLS hid it above), patch and reuse it.
    if ((error as any).code === "23505") {
      const { data: again, error: upErr } = await supabase
        .from("training_enrollments")
        .update(fields)
        .eq("training_id", input.trainingId)
        .eq("email", email)
        .select("id")
        .single();
      if (upErr) throw upErr;
      return { id: again.id };
    }
    throw error;
  }
  return { id: data.id };
}

/**
 * Creates our orders row (kind 'training') and returns its id. Mirrors
 * createMentorshipOrder so the paid enrollment flow has an order to link.
 */
export async function createTrainingOrder(input: {
  email: string;
  amount: number;
  currency: string;
  items: unknown[];
}): Promise<{ orderId: string | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: user?.id || null,
      email: input.email,
      kind: "training",
      items: input.items,
      amount: input.amount,
      currency: input.currency,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[training-api] createTrainingOrder", error?.message);
    return { orderId: null, error: "We could not start your order. Please try again." };
  }
  return { orderId: String(data.id), error: null };
}

/** Is the current user enrolled in a training? */
export async function checkEnrollment(trainingId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  // Fetch ALL of the user's rows for this training, a user can legitimately
  // have more than one (e.g. a settled `free`/`paid` row plus a stale `pending`
  // row from an abandoned checkout, or enrolments under two emails). Using
  // .maybeSingle() here erroed on 2+ rows and locked the learner out entirely.
  const { data, error } = await supabase
    .from("training_enrollments")
    .select("payment_status")
    .eq("training_id", trainingId)
    .eq("user_id", user.id);
  if (error || !data?.length) return false;
  // Access if ANY row is settled (free/paid). This also grandfathers learners
  // when a course later flips free -> paid: their existing `free` row still
  // grants access. A lone pending/failed row does not.
  return data.some((r) => r.payment_status === "paid" || r.payment_status === "free");
}

/** The current user's enrollments + a map of their trainings (My Trainings). */
export async function listMyEnrollments(): Promise<{
  enrollments: any[];
  trainings: Record<string, any>;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enrollments: [], trainings: {} };

  const { data, error } = await supabase
    .from("training_enrollments")
    .select("*, trainings(*)")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;

  const enrollments: any[] = [];
  const trainings: Record<string, any> = {};
  for (const e of data || []) {
    const t = e.trainings;
    enrollments.push({
      trainingId: e.training_id,
      trainingName: t ? (t.course_title || t.name) : "",
      status: e.status,
      paymentStatus: e.payment_status
        ? e.payment_status.charAt(0).toUpperCase() + e.payment_status.slice(1)
        : (e.payment_id ? "Paid" : "Unknown"),
      amount: "",
      currency: "INR",
      timestamp: e.enrolled_at,
      userEmail: e.email,
    });
    if (t) trainings[e.training_id] = rowToCourse(t);
  }
  return { enrollments, trainings };
}

/** Admin: all enrollments with student + course details. */
export async function listAllEnrollments(): Promise<any[]> {
  const { data, error } = await supabase
    .from("training_enrollments")
    .select("*, trainings(name, course_title), profiles(full_name, city, phone_number)")
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((e: any) => ({
    rowIndex: e.id,
    timestamp: e.enrolled_at,
    trainingName: e.trainings ? (e.trainings.course_title || e.trainings.name) : "",
    // Prefer what the learner entered on THIS enrollment (now persisted);
    // fall back to their profile for older rows / incomplete forms.
    userName: e.full_name || e.profiles?.full_name || e.email,
    userEmail: e.email,
    userPhone: e.phone || e.profiles?.phone_number || "",
    city: e.city || e.profiles?.city || "",
    status: e.status === "enrolled" ? "Enrolled"
      : e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : "",
    // DB stores lowercase ('paid' | 'free' | 'pending' | 'failed'); the admin
    // table and its Paid/Free filter compare against the capitalised label.
    paymentStatus: e.payment_status
      ? e.payment_status.charAt(0).toUpperCase() + e.payment_status.slice(1)
      : (e.payment_id ? "Paid" : "Free"),
    amount: e.amount ? `${e.currency || "INR"} ${e.amount}` : "",
  }));
}

/** Admin: delete an enrollment by its id. */
export async function deleteEnrollment(id: string): Promise<void> {
  const { error } = await supabase.from("training_enrollments").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Trainer applications
// ---------------------------------------------------------------------------


async function uploadTrainerResume(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.includes(',') ? result.split(',')[1] : result;
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // 1. Try relative endpoint (/api/upload-resume served by Vite dev or Vercel serverless)
  try {
    const res = await fetch('/api/upload-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        fileData: base64,
        contentType: file.type || 'application/pdf',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.resumeUrl) return data.resumeUrl;
    }
  } catch (apiErr) {
    console.warn("Resume upload endpoint failed, trying fallback:", apiErr);
  }

  // 2. If running locally, fallback to production API
  if (typeof window !== "undefined" && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const prodRes = await fetch('https://www.yatricloud.com/api/upload-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileData: base64,
          contentType: file.type || 'application/pdf',
        }),
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData?.resumeUrl) return prodData.resumeUrl;
      }
    } catch (prodErr) {
      console.warn("Production upload endpoint fallback failed:", prodErr);
    }
  }

  // 3. Fallback: direct Supabase storage
  try {
    const path = `trainer-resumes/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });
    if (!upErr) {
      return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
  } catch {
    // fallback error
  }

  throw new Error("Unable to upload resume. Please check your file and internet connection, then try again.");
}

export async function submitTrainerApplication(input: {
  fullName: string;
  email: string;
  countryCode?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  expertise?: string;
  certificationProvider?: string;
  credentialsLinks?: string;
  yearsOfExperience?: string;
  motivation?: string;
  resumeFile?: File | null;
}): Promise<void> {
  let resumeUrl = "";
  if (input.resumeFile) {
    resumeUrl = await uploadTrainerResume(input.resumeFile);
    if (!resumeUrl) {
      throw new Error("Failed to upload resume. Please try again.");
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("trainer_applications").insert({
    user_id: user?.id || null,
    name: input.fullName,
    email: input.email.trim().toLowerCase(),
    phone: [input.countryCode, input.phoneNumber].filter(Boolean).join(" ") || null,
    expertise: input.expertise || null,
    linkedin_url: input.linkedinUrl || null,
    resume_url: resumeUrl || null,
    status: "pending",
    details: {
      countryCode: input.countryCode || "",
      phoneNumber: input.phoneNumber || "",
      certificationProvider: input.certificationProvider || "",
      credentialsLinks: input.credentialsLinks || "",
      yearsOfExperience: input.yearsOfExperience || "",
      motivation: input.motivation || "",
    },
  });
  if (error) throw error;
  const name = input.fullName?.trim() || "there";
  try {
    await sendEmail({
      to: input.email.trim().toLowerCase(),
      subject: "Thanks for applying to teach with Yatri Cloud",
      templateKey: "trainer_application_received",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <div style="border-bottom: 2px solid #007CFF; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #007CFF; margin: 0; font-size: 22px; font-weight: 700;">Yatri Cloud</h2>
          </div>
          <p style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Hi ${name},</p>
          <p>Thank you for applying to become a Yatri Cloud Trainer!</p>
          <p>We have successfully received your application. Our team will review your credentials and real-world experience, and we will get back to you soon.</p>
          <p>Once your application is approved, you will receive an invitation email to sign in and access your dedicated Trainer Dashboard to create courses, configure syllabus modules, and schedule cohorts.</p>
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
            <p style="margin: 0;">Warm regards,<br/><strong style="color: #1f2937;">The Yatri Cloud Team</strong></p>
            <p style="margin: 8px 0 0;"><a href="https://yatricloud.com" style="color: #007CFF; text-decoration: none;">yatricloud.com</a> &middot; Master IT Certifications</p>
          </div>
        </div>
      `,
    });
  } catch (mailErr) {
    console.warn("Failed to dispatch trainer confirmation email:", mailErr);
  }
}

const capitalize = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

/** Admin: all trainer applications. */
export async function listTrainerApplications(): Promise<any[]> {
  const { data, error } = await supabase
    .from("trainer_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((a: any) => {
    const d = a.details || {};
    return {
      id: a.id,
      timestamp: a.created_at,
      fullName: a.name,
      email: a.email,
      countryCode: d.countryCode || "",
      phoneNumber: d.phoneNumber || a.phone || "",
      linkedinUrl: a.linkedin_url || "",
      expertise: a.expertise || "",
      yearsOfExperience: d.yearsOfExperience || "",
      motivation: d.motivation || "",
      status: capitalize(a.status),
      adminNotes: "",
      resumeUrl: a.resume_url || "",
      certificationProvider: d.certificationProvider || "",
      credentialsLinks: d.credentialsLinks || "",
    };
  });
}

/** Admin: all approved trainers (profiles with role='trainer'). */
export async function listApprovedTrainers(): Promise<any[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "trainer")
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Enrich expertise from the trainer's application (matched by email).
  const emails = (data || []).map((p: any) => p.email).filter(Boolean);
  const expertiseByEmail: Record<string, string> = {};
  if (emails.length) {
    const { data: apps } = await supabase
      .from("trainer_applications")
      .select("email, expertise")
      .in("email", emails);
    for (const a of apps || []) expertiseByEmail[a.email] = a.expertise || "";
  }

  return (data || []).map((p: any) => ({
    trainerId: p.id,
    email: p.email,
    fullName: p.full_name || "",
    photoUrl: p.photo_url || p.avatar_url || "",
    phone: p.phone_number || "",
    linkedIn: p.linkedin_url || "",
    expertise: expertiseByEmail[p.email] || "",
    status: "Approved",
    createdDate: p.created_at,
  }));
}

/** Admin: update an application's status (Approved/Rejected/Pending). */
export async function updateApplicationStatus(email: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("trainer_applications")
    .update({ status: status.toLowerCase() })
    .eq("email", email.trim().toLowerCase());
  if (error) throw error;
}

/** Admin: approve a trainer, set application approved + promote profile role. */
export async function approveTrainer(email: string, applicantName?: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("email", e).maybeSingle();

  const updatePayload: Record<string, any> = { status: "approved" };
  if (profile?.id) {
    updatePayload.user_id = profile.id;
  }

  const { error: appErr } = await supabase
    .from("trainer_applications")
    .update(updatePayload)
    .eq("email", e);
  if (appErr) throw appErr;

  // Set profile role to trainer so they have approved trainer privileges
  if (profile) {
    const { error: roleErr } = await supabase
      .from("profiles").update({ role: "trainer" }).eq("id", profile.id);
    if (roleErr) throw roleErr;
  }

  const name = applicantName || "there";
  void sendEmail({
    to: e,
    subject: "Your Yatri Cloud trainer application was approved",
    templateKey: "trainer_application_approved",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="border-bottom: 2px solid #007CFF; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #007CFF; margin: 0; font-size: 22px; font-weight: 700;">Yatri Cloud</h2>
        </div>
        <p style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Hi ${name},</p>
        <p>Congratulations! Your application to become a Yatri Cloud Trainer has been approved.</p>
        <p>You can now sign in with your Google account and access your dedicated Trainer Dashboard to view cohorts, curriculum materials, and scheduled batches.</p>
        <div style="margin: 28px 0;">
          <a href="https://yatricloud.com/trainer/dashboard" style="background-color: #007CFF; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
            Open Trainer Dashboard &rarr;
          </a>
        </div>
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
          <p style="margin: 0;">Warm regards,<br/><strong style="color: #1f2937;">The Yatri Cloud Team</strong></p>
          <p style="margin: 8px 0 0;"><a href="https://yatricloud.com" style="color: #007CFF; text-decoration: none;">yatricloud.com</a> &middot; Master IT Certifications</p>
        </div>
      </div>
    `,
  });
}

/** Admin: reject an application, mark rejected + revoke trainer role. */
export async function rejectTrainerApplication(email: string, applicantName?: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const { error: appErr } = await supabase
    .from("trainer_applications")
    .update({ status: "rejected" })
    .eq("email", e);
  if (appErr) throw appErr;

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("email", e).maybeSingle();
  if (profile && profile.role === "trainer") {
    await supabase.from("profiles").update({ role: "yatri" }).eq("id", profile.id);
  }

  const name = applicantName || "there";
  void sendEmail({
    to: e,
    subject: "Update on your Yatri Cloud Trainer Application",
    templateKey: "trainer_application_rejected",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="border-bottom: 2px solid #007CFF; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #007CFF; margin: 0; font-size: 22px; font-weight: 700;">Yatri Cloud</h2>
        </div>
        <p style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Hi ${name},</p>
        <p>Thank you for your interest in joining Yatri Cloud as a trainer and for taking the time to share your background and credentials with us.</p>
        <p>After carefully reviewing your submission and current cohort requirements, we are unable to move forward with your trainer application at this time.</p>
        <p>We receive many applications from talented engineers and regularly revisit past submissions as new courses and domains expand. We encourage you to continue mastering your certifications and stay connected with our community.</p>
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
          <p style="margin: 0;">Warm regards,<br/><strong style="color: #1f2937;">The Yatri Cloud Team</strong></p>
          <p style="margin: 8px 0 0;"><a href="https://yatricloud.com" style="color: #007CFF; text-decoration: none;">yatricloud.com</a> &middot; Master IT Certifications</p>
        </div>
      </div>
    `,
  });
}

/** Admin: delete a trainer application. */
export async function deleteTrainerApplication(email: string): Promise<void> {
  const { error } = await supabase
    .from("trainer_applications")
    .delete()
    .eq("email", email.trim().toLowerCase());
  if (error) throw error;
}

/** Admin: "delete" a trainer, demote their profile role back to yatri. */
export async function deleteTrainer(trainerId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "yatri" })
    .eq("id", trainerId);
  if (error) throw error;
}

/**
 * Build a working Jitsi meeting link for a training. Jitsi rooms are created on
 * first visit, so this URL is live the moment it is shared, no external API.
 */
export function generateMeetLink(
  training: { id?: string; slug?: string; courseName?: string; course_title?: string; name?: string } = {},
): string {
  const label =
    createSlug(training.slug || training.courseName || training.course_title || training.name || "");
  const idPart = String(training.id || "").replace(/-/g, "").slice(0, 6);
  const base = (label || idPart || "session").slice(0, 40);
  const random6 = Math.random().toString(36).slice(2, 8);
  return `https://meet.jit.si/YatriCloud-${base}-${random6}`;
}

/** Approved trainers as public instructor profiles (backed by trainer_applications). */
export async function listInstructorProfiles(): Promise<any[]> {
  const { data, error } = await supabase
    .from("trainer_applications")
    .select("id, user_id, name, email, expertise, linkedin_url, details")
    .eq("status", "approved");
  if (error) throw error;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, photo_url, role")
    .eq("role", "trainer");
  const applicationsByEmail = new Map((data || []).map((a: any) => [String(a.email || "").toLowerCase(), a]));
  const rows = (profiles || []).map((p: any) => {
    const a = applicationsByEmail.get(String(p.email || "").toLowerCase());
    return { ...(a || {}), profile: p };
  });
  // Keep approved applications whose profile row is not readable in this session.
  for (const a of data || []) if (!rows.some((r: any) => String(r.email || "").toLowerCase() === String(a.email || "").toLowerCase())) rows.push(a);
  return rows.map((a: any) => {
    const d = a.details || {};
    const p = a.profile || {};
    return {
      id: a.id || p.id,
      userId: a.user_id || p.id || "",
      trainerId: a.user_id || p.id || "",
      name: a.name || p.full_name || "",
      fullName: a.name || p.full_name || "",
      email: a.email || p.email || "",
      role: d.role || "",
      bio: d.bio || "",
      expertise: a.expertise || "",
      linkedin: a.linkedin_url || "",
      linkedin_url: a.linkedin_url || "",
      photo: d.photo || p.photo_url || p.avatar_url || "",
      photoUrl: d.photo || p.photo_url || p.avatar_url || "",
      // No invented numbers: an empty rating/count simply renders nothing.
      rating: d.rating || "",
      studentsCount: d.studentsCount || "",
      coursesCount: d.coursesCount || "",
    };
  });
}

/** Update an approved trainer's instructor profile (columns + details jsonb). */
export async function updateInstructorProfile(profile: any): Promise<void> {
  const email = String(profile?.email || "").trim().toLowerCase();
  let row: { id: string; details: any } | null = null;
  if (profile?.id) {
    const { data } = await supabase
      .from("trainer_applications")
      .select("id, details")
      .eq("id", profile.id)
      .maybeSingle();
    row = data as any;
  } else if (email) {
    const { data } = await supabase
      .from("trainer_applications")
      .select("id, details")
      .eq("email", email)
      .eq("status", "approved")
      .maybeSingle();
    row = data as any;
  }
  if (!row) throw new Error("We could not find this trainer's application.");

  const details = { ...(row.details || {}) };
  if (profile.bio !== undefined) details.bio = profile.bio;
  const photo = profile.photo_url ?? profile.photoUrl;
  if (photo !== undefined) details.photo = photo;
  if (profile.role !== undefined) details.role = profile.role;
  if (profile.rating !== undefined) details.rating = profile.rating;
  if (profile.studentsCount !== undefined) details.studentsCount = profile.studentsCount;
  if (profile.coursesCount !== undefined) details.coursesCount = profile.coursesCount;

  const patch: Record<string, any> = { details };
  if (profile.expertise !== undefined) patch.expertise = profile.expertise;
  const linkedin = profile.linkedin_url ?? profile.linkedIn ?? profile.linkedin;
  if (linkedin !== undefined) patch.linkedin_url = linkedin;

  const { error } = await supabase
    .from("trainer_applications")
    .update(patch)
    .eq("id", row.id);
  if (error) throw error;
}

/**
 * Ensure a training has a live meeting link (generate + save a Jitsi one if
 * missing) so the trainer can host. Returns the link.
 */
export async function grantMeetAccess(input: { trainerEmail: string; trainingId: string }): Promise<{ meetLink?: string }> {
  const { data: current, error: readErr } = await supabase
    .from("trainings")
    .select("id, slug, course_title, name, meet_link")
    .eq("id", input.trainingId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!current) throw new Error("We could not find that training.");

  let meetLink = current.meet_link || "";
  if (!meetLink) {
    meetLink = generateMeetLink({
      id: current.id,
      slug: current.slug,
      courseName: current.course_title || current.name,
    });
    const { error } = await supabase
      .from("trainings")
      .update({ meet_link: meetLink })
      .eq("id", input.trainingId);
    if (error) throw error;
  }
  return { meetLink };
}

/** Assign a trainer to a real training (sets trainer_id, trainer_name, trainer_email). */
export async function assignTrainerToCourse(input: {
  trainingId: string;
  trainerId?: string;
  trainerName?: string;
  trainerEmail?: string;
}): Promise<void> {
  if (!input.trainingId) throw new Error("Please choose a training to assign.");
  const patch: Record<string, any> = {};
  if (input.trainerId !== undefined) patch.trainer_id = input.trainerId || null;
  if (input.trainerName !== undefined) patch.trainer_name = input.trainerName || null;
  if (input.trainerEmail !== undefined) patch.trainer_email = input.trainerEmail || null;
  const { error } = await supabase
    .from("trainings")
    .update(patch)
    .eq("id", input.trainingId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Providers (derived from the provider_t enum + distinct training course titles)
// ---------------------------------------------------------------------------

export interface ProviderData {
  id?: string;
  type: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  exams: string[];
  exists?: boolean;
}

/**
 * Provider list from the training_providers table (public read of active rows;
 * admins see all). Each provider is enriched with the exams (course titles)
 * seen in trainings. Falls back to the certification catalog labels when the
 * table is empty so dropdowns are never blank.
 */
export async function listProviders(): Promise<ProviderData[]> {
  const { data: providerRows } = await supabase
    .from("training_providers")
    .select("id, name, slug, logo_url, sort_order, active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: trainingRows } = await supabase
    .from("trainings")
    .select("name, course_title, provider");

  // Real, managed providers.
  if (providerRows && providerRows.length) {
    const examsByProvider: Record<string, Set<string>> = {};
    for (const p of providerRows) examsByProvider[p.name] = new Set();

    for (const row of trainingRows || []) {
      const match = providerRows.find(
        (p) => toProviderEnum(p.name) === toProviderEnum(row.name || row.provider),
      );
      const exam = row.course_title || row.name;
      if (match && exam) examsByProvider[match.name]?.add(exam);
    }

    return providerRows.map((p) => ({
      id: p.id,
      type: "Certification",
      name: p.name,
      slug: p.slug || "",
      logoUrl: p.logo_url || "",
      exams: Array.from(examsByProvider[p.name] || []),
      exists: true,
    }));
  }

  // Fallback: catalog labels with exams derived from trainings.
  const labels = await providerDisplayLabels();
  const examsByLabel: Record<string, Set<string>> = {};
  for (const label of labels) examsByLabel[label] = new Set();
  for (const row of trainingRows || []) {
    const label = labels.find(
      (p) => toProviderEnum(p) === toProviderEnum(row.name || row.provider),
    ) || "Other";
    const exam = row.course_title || row.name;
    if (exam) examsByLabel[label]?.add(exam);
  }
  return labels.map((label) => ({
    type: "Certification",
    name: label,
    exams: Array.from(examsByLabel[label] || []),
    exists: true,
  }));
}

/** Folder-picker helper: providers when no provider given, else that provider's exams. */
export async function getFoldersInPath(_type: string, provider?: string): Promise<string[]> {
  if (!provider) return providerDisplayLabels();
  const providers = await listProviders();
  return providers.find((p) => p.name === provider)?.exams || [];
}

/** Admin: add a training provider. */
export async function addProvider(input: {
  name?: string;
  provider?: string;
  logo_url?: string;
  slug?: string;
  sort_order?: number;
}): Promise<void> {
  const name = String(input.name || input.provider || "").trim();
  if (!name) throw new Error("Please enter a provider name.");
  const { error } = await supabase.from("training_providers").insert({
    name,
    slug: input.slug || createSlug(name),
    logo_url: input.logo_url || null,
    sort_order: input.sort_order ?? 0,
    active: true,
  });
  if (error) throw error;
}

/** Admin: update a training provider (by id, or by current name). */
export async function updateProvider(input: {
  id?: string;
  name?: string;
  provider?: string;
  oldProvider?: string;
  logo_url?: string;
  slug?: string;
  sort_order?: number;
  active?: boolean;
}): Promise<void> {
  const patch: Record<string, any> = {};
  const newName = input.name ?? input.provider;
  if (newName !== undefined) patch.name = newName;
  if (input.logo_url !== undefined) patch.logo_url = input.logo_url;
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;
  if (input.active !== undefined) patch.active = input.active;
  if (Object.keys(patch).length === 0) return;

  let query = supabase.from("training_providers").update(patch);
  if (input.id) query = query.eq("id", input.id);
  else if (input.oldProvider) query = query.eq("name", input.oldProvider);
  else throw new Error("We could not tell which provider to update.");
  const { error } = await query;
  if (error) throw error;
}

/** Admin: delete a training provider (by id, or by name). */
export async function deleteProvider(input: { id?: string; provider?: string; name?: string }): Promise<void> {
  let query = supabase.from("training_providers").delete();
  if (input.id) query = query.eq("id", input.id);
  else if (input.provider || input.name) query = query.eq("name", input.provider || input.name);
  else throw new Error("We could not tell which provider to delete.");
  const { error } = await query;
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Training CRUD (admin + trainer)
// ---------------------------------------------------------------------------

export async function uploadCourseThumbnail(base64: string, mimeType: string): Promise<string> {
  const ext = (mimeType.split("/")[1] || "png").replace(/[^\w]+/g, "");
  const filename = `course-thumb-${Date.now()}.${ext}`;

  // Try endpoints in order:
  // When running on yatricloud.com, calling /api directly gets 308 redirected to www.yatricloud.com.
  // We try /api/upload-resume and the full https://www.yatricloud.com/api/upload-resume.
  const endpoints = [
    '/api/upload-resume',
    'https://www.yatricloud.com/api/upload-resume',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          fileData: base64,
          contentType: mimeType,
          folder: 'trainings',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const url = data?.resumeUrl || data?.url;
        if (url) return url;
      }
    } catch (apiErr) {
      console.warn(`Server upload endpoint (${endpoint}) failed, trying next:`, apiErr);
    }
  }

  // Fallback: direct Supabase storage upload
  try {
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const path = `trainings/${Date.now()}-thumb.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, blob, { upsert: true, contentType: mimeType });
    if (!error) {
      return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
  } catch (directErr) {
    console.warn("Direct storage upload failed:", directErr);
  }

  throw new Error("Failed to upload course thumbnail");
}

const uploadThumbnail = uploadCourseThumbnail;

export interface TrainingInput {
  subType?: string;
  courseName?: string;
  imageUrl?: string;
  description?: string;
  level?: string;
  instructorId?: string;
  instructor?: string;
  duration?: string;
  mode?: "Online" | "On-site";
  /** Custom online meeting link for the live session (trainings.meet_link). */
  meetLink?: string;
  venueName?: string;
  capacityType?: string;
  capacityCount?: string;
  paymentType?: string;
  price?: string;
  /** Optional admin-set platform fee as a % of the base price, added on top of it. 0/undefined = no fee. */
  platformFeePct?: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  thumbnailBase64?: string;
  thumbnailMimeType?: string;
  curriculum?: {
    moduleId?: string;
    title: string;
    lessons: { lessonId?: string; title: string; type: string; duration: string; url?: string; description?: string }[];
  }[];
  resources?: any[];
  /** Comma-separated skills gained (stored in trainings.skills). */
  skills?: string;
  /** Learning outcomes / what you'll learn (stored in trainings.outcomes). */
  outcomes?: string;
  status?: "Draft" | "Published";
  /** 'public' = listed on /training; 'private' = unlisted, reachable only via its direct link. */
  visibility?: "public" | "private";
  /** Certification this training prepares you for (provider_certifications.id). Empty = none. */
  certificationId?: string | null;
}


function inputToRow(input: TrainingInput): Record<string, any> {
  const trackLabel = input.subType || input.courseName || "Training";
  const price = Number(input.price) || 0;
  const durHours = parseFloat(String(input.duration || "").replace(/[^\d.]/g, ""));
  const row: Record<string, any> = {
    name: trackLabel,
    course_title: input.courseName || null,
    provider: toProviderEnum(input.subType),
    description: input.description || null,
    level: input.level || null,
    trainer_id: input.instructorId || null,
    trainer_name: input.instructor || null,
    duration_hours: isNaN(durHours) ? null : durHours,
    mode: input.mode === "On-site" ? "offline" : "online",
    city: input.mode === "On-site" ? (input.venueName || null) : null,
    // Only touch meet_link when the caller manages it (the unified editor does),
    // so a save never wipes an auto-generated link from a caller that omits it.
    ...(input.meetLink !== undefined ? { meet_link: input.meetLink || null } : {}),
    max_capacity: input.capacityType === "Limited" ? (Number(input.capacityCount) || null) : null,
    price_inr: input.paymentType === "Paid" ? price : 0,
    platform_fee_pct: input.paymentType === "Paid" ? (Number(input.platformFeePct) || 0) : 0,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    start_time: input.startTime || null,
    resources: Array.isArray(input.resources) ? input.resources : [],
    skills: input.skills || null,
    outcomes: input.outcomes || null,
    status: statusToDb(input.status),
    visibility: input.visibility === "private" ? "private" : "public",
    // Optional certification link. An empty choice clears it (nullable column).
    certification_id: input.certificationId ? input.certificationId : null,
  };
  return row;
}

/** Matches a Postgres UUID, editor-created rows use temp ids (MOD…/LSN…) instead. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canonical lesson content types. The coarse (TrainingManager) and granular
 * (TrainerCourseEditor) editors historically wrote different casing ("Video" vs
 * "video") for the same field; normalize every write to Title-case so the coarse
 * form's <select> round-trips and reads stay consistent. Reads that compare type
 * should still lower-case defensively for legacy rows.
 */
export const canonLessonType = (t?: string): string => {
  const k = String(t || "").toLowerCase().trim();
  const known: Record<string, string> = {
    concept: "Concept",
    "hands-on": "Hands-on",
    handson: "Hands-on",
    "hands on": "Hands-on",
    project: "Project",
    assignment: "Assignment",
    quiz: "Quiz",
    // Legacy lesson types migrated to Concept
    video: "Concept",
    reading: "Concept",
  };
  return known[k] || (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "Concept");
};

/**
 * Persist a curriculum (modules + lessons) for a training id-preservingly.
 *
 * This is the coarse editor's save path (TrainingManager), which only knows a
 * lesson's title/type/duration, NOT the url/description the granular editor
 * (saveCourseContent) manages. So for an existing lesson we UPDATE it in place
 * and MERGE its content: title/type/duration change, but any url/description
 * already stored survives. Rows carrying a real UUID are matched to the DB and
 * updated (ids stay stable so lesson_progress FKs and student completion aren't
 * lost); new rows insert; only rows the editor removed are deleted.
 */
async function saveCurriculum(
  trainingId: string,
  curriculum?: TrainingInput["curriculum"],
): Promise<void> {
  if (!curriculum) return;

  // Snapshot existing modules + their lessons' ids and content to diff + merge.
  const { data: existingMods, error: snapErr } = await supabase
    .from("course_modules")
    .select("id, course_lessons(id, content)")
    .eq("training_id", trainingId);
  // Without the snapshot every module would be re-inserted (duplicating the
  // curriculum), so a failed read must abort the save instead.
  if (snapErr) throw snapErr;
  const existingModuleIds = new Set<string>((existingMods || []).map((m: any) => m.id));
  const existingLessonsByModule = new Map<string, Set<string>>();
  const contentByLesson = new Map<string, any>();
  for (const m of existingMods || []) {
    existingLessonsByModule.set(m.id, new Set((m.course_lessons || []).map((l: any) => l.id)));
    for (const l of m.course_lessons || []) contentByLesson.set(l.id, l.content || {});
  }

  const keptModuleIds = new Set<string>();
  let mi = 0;
  for (const mod of curriculum) {
    const name = mod.title || `Module ${mi + 1}`;
    let moduleId: string;

    if (mod.moduleId && UUID_RE.test(mod.moduleId) && existingModuleIds.has(mod.moduleId)) {
      moduleId = mod.moduleId;
      const { error: modErr } = await supabase.from("course_modules").update({ name, sort_order: mi }).eq("id", moduleId);
      if (modErr) throw modErr;
    } else {
      const { data: modRow, error } = await supabase
        .from("course_modules")
        .insert({ training_id: trainingId, name, sort_order: mi })
        .select("id")
        .single();
      if (error || !modRow) throw error || new Error("Could not save a curriculum module");
      moduleId = modRow.id;
    }
    keptModuleIds.add(moduleId);

    const existingLessonIds = existingLessonsByModule.get(moduleId) || new Set<string>();
    const keptLessonIds = new Set<string>();
    let li = 0;
    for (const l of mod.lessons || []) {
      const isExisting = !!l.lessonId && UUID_RE.test(l.lessonId) && existingLessonIds.has(l.lessonId);
      // Preserve url/description the coarse form doesn't manage, from the stored row.
      const prev = isExisting ? (contentByLesson.get(l.lessonId!) || {}) : {};
      const content = {
        ...prev,
        type: canonLessonType(l.type || prev.type),
        duration: l.duration || prev.duration || "",
        ...(l.url !== undefined ? { url: l.url } : {}),
        ...(l.description !== undefined ? { description: l.description } : {}),
      };
      // Keep the typed mirror columns (migration 073) in sync with the content
      // blob so lesson metadata is queryable/aggregatable in SQL. content stays
      // the source the app reads; these just mirror it.
      const durationDigits = String(content.duration ?? "").replace(/\D/g, "");
      const row = {
        name: l.title || `Lesson ${li + 1}`,
        content,
        sort_order: li,
        lesson_type: content.type || null,
        duration_minutes: durationDigits ? parseInt(durationDigits, 10) : null,
        content_url: content.url ?? null,
        description: content.description ?? null,
      };
      if (isExisting) {
        const { error: lesErr } = await supabase.from("course_lessons").update(row).eq("id", l.lessonId!);
        if (lesErr) throw lesErr;
        keptLessonIds.add(l.lessonId!);
      } else {
        const { error: lesErr } = await supabase.from("course_lessons").insert({ module_id: moduleId, ...row });
        if (lesErr) throw lesErr;
      }
      li++;
    }
    const removedLessons = [...existingLessonIds].filter((id) => !keptLessonIds.has(id));
    if (removedLessons.length) {
      const { error: delErr } = await supabase.from("course_lessons").delete().in("id", removedLessons);
      if (delErr) throw delErr;
    }
    mi++;
  }

  const removedModules = [...existingModuleIds].filter((id) => !keptModuleIds.has(id));
  if (removedModules.length) {
    const { error: delErr } = await supabase.from("course_modules").delete().in("id", removedModules);
    if (delErr) throw delErr;
  }
}

/** Create a training (admin or trainer). Returns the new id. */
export async function createTraining(input: TrainingInput): Promise<string> {
  const row = inputToRow(input);
  if (input.thumbnailBase64 && input.thumbnailMimeType) {
    try {
      row.image_url = await uploadThumbnail(input.thumbnailBase64, input.thumbnailMimeType);
    } catch (err) {
      console.error("Course thumbnail upload failed:", err);
      if (!input.imageUrl) throw new Error("Failed to upload course image. Please try again or select a different image.");
    }
  } else if (input.imageUrl) {
    row.image_url = input.imageUrl;
  }
  // Private trainings get an unguessable token suffix and never carry the
  // word "private" in the URL; public ones keep the readable dated slug.
  row.slug = input.visibility === "private"
    ? `${privateSlugBase(input.courseName || input.subType || "training")}-${unlistedToken()}`
    : `${createSlug(input.courseName || input.subType || "training") || "training"}-${Date.now().toString(36)}`;

  const { data, error } = await supabase.from("trainings").insert(row).select("id").single();
  if (error || !data) throw error || new Error("Create failed");
  await saveCurriculum(data.id, input.curriculum);
  const auditPrice = input.paymentType === "Paid" ? `Paid · ₹${Number(input.price) || 0}` : "Free";
  await logAudit({
    training_id: data.id,
    action: "created",
    field: "course_title",
    new_value: input.courseName || input.subType || "",
    note: auditPrice,
  });
  return data.id;
}

/** Update an existing training. */
export async function updateTraining(id: string, input: TrainingInput): Promise<void> {
  const row = inputToRow(input);
  if (input.thumbnailBase64 && input.thumbnailMimeType) {
    try {
      row.image_url = await uploadThumbnail(input.thumbnailBase64, input.thumbnailMimeType);
    } catch (err) {
      console.error("Course thumbnail update upload failed:", err);
      if (!input.imageUrl) throw new Error("Failed to upload course image. Please try again or select a different image.");
    }
  } else if (input.imageUrl !== undefined) {
    row.image_url = input.imageUrl || null;
  }
  // Capture the pre-save price so a change can be flagged for price integrity.
  const { data: before } = await supabase
    .from("trainings").select("price_inr, status, review_status, course_title, name").eq("id", id).maybeSingle();
  const beforePrice = Number(before?.price_inr) || 0;
  const afterPrice = Number(row.price_inr) || 0;
  // Switching public → private regenerates the link: the old URL was public
  // knowledge, so it must not remain the private one. An already-private slug
  // is kept stable so links already shared keep working.
  if (input.visibility === "private") {
    const { data: cur } = await supabase
      .from("trainings").select("visibility").eq("id", id).maybeSingle();
    if (cur && cur.visibility !== "private") {
      row.slug = `${privateSlugBase(input.courseName || input.subType || "training")}-${unlistedToken()}`;
    }
  }
  const { error } = await supabase.from("trainings").update(row).eq("id", id);
  if (error) throw error;
  if (input.curriculum) await saveCurriculum(id, input.curriculum);
  // Price integrity: log any change to the list price, plus a generic edit record.
  if (beforePrice !== afterPrice) {
    await logAudit({
      training_id: id, action: "price_changed", field: "price_inr",
      old_value: String(beforePrice), new_value: String(afterPrice),
    });
  }
  await logAudit({ training_id: id, action: "updated", field: "course_title", new_value: input.courseName || input.subType || "" });
}

/** Load a training into the admin/trainer edit-form shape (populateForm). */
export async function getTrainingForEdit(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("trainings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: mods } = await supabase
    .from("course_modules")
    .select("id, name, sort_order, course_lessons(id, name, content, sort_order)")
    .eq("training_id", id)
    .order("sort_order", { ascending: true });

  // Carry the module/lesson ids into the form so a later save can update rows in
  // place (preserving student progress) instead of replacing them wholesale.
  const curriculum = (mods || []).map((m: any) => ({
    moduleId: m.id,
    title: m.name,
    lessons: (m.course_lessons || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((l: any) => ({
        lessonId: l.id,
        title: l.name,
        type: canonLessonType(l.content?.type),
        duration: l.content?.duration || "",
        url: l.content?.url || "",
        description: l.content?.description || "",
      })),
  }));

  const { data: quizRows } = await supabase
    .from("quizzes")
    .select("*")
    .eq("training_id", id)
    .order("sort_order", { ascending: true })
    .limit(1);

  const quiz = quizRows && quizRows[0] ? quizRows[0] : null;
  const quizQuestions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const quizSettings = {
    title: quiz?.title || "Practice Quiz",
    passingScore: quiz?.passing_score ?? 70,
    timeLimitMin: quiz?.time_limit_min ?? null,
  };

  const priceNum = Number(data.price_inr) || 0;
  return {
    id: data.id,
    type: "Certification",
    subType: data.name || "",
    courseName: data.course_title || "",
    description: data.description || "",
    instructor: data.trainer_id || "",
    level: data.level || "Beginner",
    duration: data.duration_hours ? `${data.duration_hours}` : "",
    skills: data.skills || "",
    outcomes: data.outcomes || "",
    curriculum,
    mode: data.mode === "online" ? "Online" : "On-site",
    meetLink: data.meet_link || "",
    venueName: data.mode !== "online" ? (data.city || "") : "",
    venueAddress: "",
    venueMapLink: "",
    capacityType: data.max_capacity ? "Limited" : "Unlimited",
    capacityCount: data.max_capacity ? String(data.max_capacity) : "",
    paymentType: priceNum > 0 ? "Paid" : "Free",
    price: priceNum > 0 ? String(priceNum) : "",
    platformFeePct: data.platform_fee_pct ? String(data.platform_fee_pct) : "",
    currency: "INR",
    couponCode: "",
    startDate: data.start_date || "",
    endDate: data.end_date || "",
    startTime: data.start_time || "",
    thumbnail: data.image_url || "",
    resources: Array.isArray(data.resources) ? data.resources : [],
    quizQuestions,
    quizSettings,
    certificationId: data.certification_id || "",
    visibility: data.visibility === "private" ? "private" : "public",
    status: statusFromDb(data.status),
  };
}

/** A certification option for the "Prepares you for" picker in the course form. */
export interface CertificationOption {
  id: string;
  label: string;
  examCode: string;
  provider: string;
}

/**
 * The certification catalog for the training picker, flat and in provider order.
 * Reads provider_certifications directly so each option carries its real id
 * (the value stored on trainings.certification_id). Never throws, returns an
 * empty list on any error so the form still renders.
 */
export async function getCertificationOptions(): Promise<CertificationOption[]> {
  try {
    const { data, error } = await supabase
      .from("provider_certifications")
      .select("id, label, exam_code, provider_slug")
      .eq("active", true)
      .order("provider_slug", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: String(r.id),
      label: String(r.label || ""),
      examCode: String(r.exam_code || ""),
      provider: String(r.provider_slug || ""),
    }));
  } catch {
    return [];
  }
}

/** Admin: every training (drafts + published), list shape. */
export async function listAllTrainings(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select("*, provider_certifications(label, exam_code, provider_slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => rowToCourse(r));
}

/** Trainer: only trainings owned by this trainer. */
export async function listTrainerTrainings(trainerId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => rowToCourse(r));
}

/** Delete a training (RLS: admins only). */
export async function deleteTraining(id: string): Promise<void> {
  const { data: cur } = await supabase
    .from("trainings").select("id, course_title, name").eq("id", id).maybeSingle();
  // Log the deletion FIRST so the audit row exists before the course row is
  // removed; the FK (ON DELETE SET NULL) then keeps the history instead of
  // cascading it away.
  if (cur) {
    await logAudit({
      training_id: id, action: "deleted", field: "course_title",
      new_value: cur.course_title || cur.name || "", note: "Course removed by admin",
    });
  }
  const { error } = await supabase.from("trainings").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Save a training's schedule and ensure it has a meeting link. Uses the
 * provided link when given, otherwise keeps the existing one, otherwise
 * generates a working Jitsi link. Returns the saved link.
 */
export async function updateTrainingSchedule(
  id: string,
  schedule: { startDate: string; startTime: string; meetLink?: string },
): Promise<{ meetLink?: string }> {
  const { data: current } = await supabase
    .from("trainings")
    .select("id, slug, course_title, name, meet_link")
    .eq("id", id)
    .maybeSingle();

  let meetLink = (schedule.meetLink || current?.meet_link || "").trim();
  if (!meetLink) {
    meetLink = generateMeetLink({
      id,
      slug: current?.slug,
      courseName: current?.course_title || current?.name,
    });
  }

  const { data, error } = await supabase
    .from("trainings")
    .update({ start_date: schedule.startDate, start_time: schedule.startTime, meet_link: meetLink })
    .eq("id", id)
    .select("meet_link")
    .single();
  if (error) throw error;
  return { meetLink: data?.meet_link || meetLink };
}

/** Admin: approve a pending course, publish it and mark the review approved. */
export async function approveCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from("trainings")
    .update({ status: "published", review_status: "approved" })
    .eq("id", courseId);
  if (error) throw error;
  await logAudit({ training_id: courseId, action: "approved", field: "status", new_value: "published" });
}

/** Admin: publish course */
export async function publishCourse(courseId: string): Promise<void> {
  // trainings has course_title/name (no course_name column, selecting it fails the whole read).
  const { data: course } = await supabase.from("trainings").select("course_title, name, trainer_email").eq("id", courseId).maybeSingle();
  const { error } = await supabase
    .from("trainings")
    .update({ status: "published", review_status: "approved" })
    .eq("id", courseId);
  if (error) throw error;
  await logAudit({ training_id: courseId, action: "published", field: "status", new_value: "published" });
  const courseName = course?.course_title || course?.name;
  if (course?.trainer_email) void sendEmail({ to: course.trainer_email, subject: `${courseName || "Your course"} is now live on Yatri Cloud`, templateKey: "training_published", html: `<p>Your course <strong>${courseName || "course"}</strong> is now live on Yatri Cloud.</p><p>Yatri Cloud</p>` });
}

/** Admin: unpublish course back to draft */
export async function unpublishCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from("trainings")
    .update({ status: "draft" })
    .eq("id", courseId);
  if (error) throw error;
  await logAudit({ training_id: courseId, action: "unpublished", field: "status", new_value: "draft" });
}


/** Admin: reject a pending course, mark the review rejected (stays a draft). */
export async function rejectCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from("trainings")
    .update({ review_status: "rejected" })
    .eq("id", courseId);
  if (error) throw error;
  await logAudit({ training_id: courseId, action: "rejected", field: "review_status", new_value: "rejected" });
}

// ---------------------------------------------------------------------------
// Audit trail (migration 080), transparency / anti-cheat
// ---------------------------------------------------------------------------

interface AuditEntry {
  training_id: string;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  note?: string;
}

/** Resolve the current caller's role for the audit trail. */
async function currentActorRole(): Promise<"admin" | "trainer" | "system"> {
  try {
    const profile = await fetchMyProfile();
    if (profile?.role === "admin") return "admin";
    if (profile?.role === "trainer") return "trainer";
  } catch { /* fall through */ }
  return "system";
}

/**
 * Append an audit entry. Best-effort on purpose: a course action must never
 * fail because the audit write did, history is the record, not the gate.
 */
async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { data: me } = await supabase.auth.getUser();
    await supabase.from("training_audit_log").insert({
      ...entry,
      actor_id: me?.user?.id ?? null,
      actor_role: await currentActorRole(),
    });
  } catch { /* best-effort */ }
}

/** Admin: the full audit trail, newest first. */
export async function listAllTrainingAudits(): Promise<any[]> {
  const { data, error } = await supabase
    .from("training_audit_log")
    .select("*, trainings(course_title, name), profiles(full_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    trainingId: r.training_id,
    trainingName: r.trainings ? (r.trainings.course_title || r.trainings.name) : "",
    actorId: r.actor_id,
    actorName: r.profiles?.full_name || r.profiles?.email || "",
    actorRole: r.actor_role,
    action: r.action,
    field: r.field,
    oldValue: r.old_value,
    newValue: r.new_value,
    note: r.note,
    createdAt: r.created_at,
  }));
}

/** Admin: the audit trail for one training, newest first. */
export async function listTrainingAudits(trainingId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("training_audit_log")
    .select("*, profiles(full_name, email)")
    .eq("training_id", trainingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    trainingId: r.training_id,
    actorId: r.actor_id,
    actorName: r.profiles?.full_name || r.profiles?.email || "",
    actorRole: r.actor_role,
    action: r.action,
    field: r.field,
    oldValue: r.old_value,
    newValue: r.new_value,
    note: r.note,
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Training finance (revenue per course / per trainer)
// ---------------------------------------------------------------------------

export interface TrainingFinanceRow {
  trainingId: string;
  courseName: string;
  trainerId: string | null;
  trainerName: string;
  price: number;          // list price (INR)
  currency: string;
  enrollments: number;    // all enrollment rows
  paidEnrollments: number; // rows with payment_status = 'paid'
  freeEnrollments: number;
  revenue: number;        // sum of amount where payment_status = 'paid' (INR)
  status: string;
  reviewStatus: string;
  visibility: string;
}

/**
 * Admin: per-training revenue built by aggregating paid enrollments. Pricing is
 * INR-denominated today (only price_inr is persisted), so revenue sums in INR.
 */
export async function listTrainingFinance(): Promise<TrainingFinanceRow[]> {
  const { data: trainings, error } = await supabase
    .from("trainings")
    .select("id, course_title, name, trainer_id, trainer_name, price_inr, status, review_status, visibility");
  if (error) throw error;

  const { data: enrollments, error: enrErr } = await supabase
    .from("training_enrollments")
    .select("training_id, amount, payment_status, currency");
  if (enrErr) throw enrErr;

  const byTraining = new Map<string, { count: number; paid: number; free: number; revenue: number; currency: string }>();
  for (const e of (enrollments || [])) {
    const agg = byTraining.get(e.training_id) || { count: 0, paid: 0, free: 0, revenue: 0, currency: e.currency || "INR" };
    agg.count += 1;
    if (e.payment_status === "paid") {
      agg.paid += 1;
      // amount is stored in the currency the Yatri paid in; only INR amounts
      // can be summed into this INR revenue figure (never add USD to INR).
      if (String(e.currency || "INR").toUpperCase() === "INR") agg.revenue += Number(e.amount) || 0;
    } else if (e.payment_status === "free") {
      agg.free += 1;
    }
    byTraining.set(e.training_id, agg);
  }

  return ((trainings as any[]) || []).map((t) => {
    const agg = byTraining.get(t.id) || { count: 0, paid: 0, free: 0, revenue: 0, currency: "INR" };
    return {
      trainingId: t.id,
      courseName: t.course_title || t.name || "",
      trainerId: t.trainer_id,
      trainerName: t.trainer_name || "",
      price: Number(t.price_inr) || 0,
      currency: agg.currency,
      enrollments: agg.count,
      paidEnrollments: agg.paid,
      freeEnrollments: agg.free,
      revenue: agg.revenue,
      status: t.status,
      reviewStatus: t.review_status || "none",
      visibility: t.visibility || "public",
    };
  });
}

// ---------------------------------------------------------------------------
// Trainer login (Supabase role check)
// ---------------------------------------------------------------------------

/**
 * Verify trainer access for the currently signed-in Supabase user.
 * Requires an active Supabase session whose profile role is 'trainer'.
 * (Replaces the Sheets `verifyTrainerAccess` action; Google auto-provisioning
 * of trainer rows is no longer needed, role is managed in `profiles`.)
 */
/**
 * Verifies whether a user is an approved trainer.
 * A user is approved IF AND ONLY IF:
 * 1. Their profile role is explicitly 'trainer'
 * 2. OR they have an application in trainer_applications with status = 'approved'
 *
 * NOTE: Mere 'admin' role or 'yatri' role DOES NOT grant access without trainer approval.
 */
export async function checkTrainerApproval(email?: string, role?: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // If role is explicitly 'trainer'
  if (role === "trainer") {
    return true;
  }

  // Check if they have an approved application in trainer_applications
  try {
    const { data: app } = await supabase
      .from("trainer_applications")
      .select("id, status")
      .eq("email", cleanEmail)
      .eq("status", "approved")
      .maybeSingle();

    if (app && app.status === "approved") {
      return true;
    }
  } catch (err) {
    console.warn("Could not check trainer approval:", err);
  }

  return false;
}

export async function verifyTrainerAccess(email?: string): Promise<{
  trainer: { trainerId: string; fullName: string; email: string; phone: string; expertise: string };
  assignments: any[];
}> {
  // Read the LIVE profile role, not the cached mirror: a trainer approved after
  // their last sign-in would otherwise be denied because the cache still says
  // "yatri". Fall back to the cached user only if the live fetch is unavailable.
  const user = (await fetchMyProfile()) || getCachedUser();
  if (!user || !user.id) {
    throw new Error("Please sign in to Yatri Cloud first, then continue.");
  }
  const isApproved = await checkTrainerApproval(user.email, user.role);
  if (!isApproved) {
    throw new Error("Access denied. You are not an approved trainer yet.");
  }
  void email;

  // Expertise (best-effort) from the trainer's application.
  let expertise = "";
  const { data: app } = await supabase
    .from("trainer_applications")
    .select("expertise")
    .eq("email", (user.email || "").toLowerCase())
    .maybeSingle();
  if (app) expertise = app.expertise || "";

  return {
    trainer: {
      trainerId: user.id,
      fullName: user.fullName || "",
      email: user.email,
      phone: user.phoneNumber || "",
      expertise,
    },
    assignments: [],
  };
}

// ---------------------------------------------------------------------------
// Trainer course editor (modules / lessons / resources / live session)
// ---------------------------------------------------------------------------

/** Public syllabus; the database strips private lesson bodies and URLs. */
export async function getTrainingCurriculumPreview(courseId: string): Promise<{ modules: any[] }> {
  const { data, error } = await supabase.rpc("training_curriculum_preview", { p_training_id: courseId });
  if (error) throw error;
  return { modules: Array.isArray(data?.modules) ? data.modules : [] };
}

/** Load editor content: modules, resources, live-session. Quizzes have no table. */
export async function getCourseContent(courseId: string): Promise<{
  modules: any[];
  quizzes: any[];
  resources: any[];
  liveSession: { mode: "Online" | "On-site"; startDate: string; startTime: string; meetLink: string };
}> {
  const { data: training } = await supabase
    .from("trainings")
    .select("mode, start_date, start_time, meet_link, resources")
    .eq("id", courseId)
    .maybeSingle();

  const { data: mods } = await supabase
    .from("course_modules")
    .select("id, name, sort_order, course_lessons(id, name, content, sort_order)")
    .eq("training_id", courseId)
    .order("sort_order", { ascending: true });

  const modules = (mods || []).map((m: any, i: number) => ({
    moduleId: m.id,
    moduleName: m.name,
    order: m.sort_order ?? i + 1,
    lessons: (m.course_lessons || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((l: any, li: number) => ({
        lessonId: l.id,
        lessonTitle: l.name,
        duration: l.content?.duration || "",
        contentType: canonLessonType(l.content?.type),
        contentUrl: l.content?.url || "",
        description: l.content?.description || "",
        order: l.sort_order ?? li + 1,
      })),
  }));

  const resources = (Array.isArray(training?.resources) ? training!.resources : []).map((r: any) => ({
    resourceId: r.id || r.resourceId || `RES${Date.now()}`,
    title: r.name || r.title || "",
    type: r.type || "link",
    url: r.url || "",
  }));

  return {
    modules,
    quizzes: [],
    resources,
    liveSession: {
      mode: training?.mode === "offline" ? "On-site" : "Online",
      startDate: training?.start_date || "",
      startTime: training?.start_time || "",
      meetLink: training?.meet_link || "",
    },
  };
}

/**
 * Submit a course for admin approval. The course stays a draft and its
 * review_status flips to 'pending' so an admin can approve it to publish.
 */
export async function submitCourseForApproval(input: { courseId: string }): Promise<void> {
  const { error } = await supabase
    .from("trainings")
    .update({ status: "draft", review_status: "pending" })
    .eq("id", input.courseId);
  if (error) throw error;
  await logAudit({ training_id: input.courseId, action: "submitted", field: "review_status", new_value: "pending" });
}

/** Upload a resource file to the public product-images bucket; returns its URL. */
export async function uploadResource(file: File): Promise<string> {
  const path = `trainings/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Lesson progress + completion certificates (migration 021)
// ---------------------------------------------------------------------------

/**
 * The lesson ids the current user has completed for a training.
 * Returns an empty array when signed out or on any error (never throws).
 */
export async function getLessonProgress(trainingId: string): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("training_id", trainingId);
    if (error || !data) return [];
    return data.map((r: any) => r.lesson_id);
  } catch {
    return [];
  }
}

/**
 * Mark a lesson complete for the current user. Idempotent: a duplicate
 * (already-completed) lesson resolves quietly. Returns whether it stuck.
 */
export async function markLessonComplete(
  trainingId: string,
  lessonId: string,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: user.id, training_id: trainingId, lesson_id: lessonId },
        { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
      );
    // A unique-violation just means it was already there, treat as success.
    if (error && (error as any).code !== "23505") return false;
    return true;
  } catch {
    return false;
  }
}

/** Remove the current user's completion of a lesson. Never throws. */
export async function unmarkLesson(lessonId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("lesson_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Ask the server to issue a completion certificate (it re-verifies enrollment
 * and that every lesson is done). Returns the serial on success.
 */
export async function issueCertificate(
  trainingId: string,
): Promise<{ ok: boolean; serial?: string; message?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return { ok: false, message: "Please sign in again to get your certificate." };
    }
    const res = await fetch("/api/issue-certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ training_id: trainingId, access_token: accessToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.serial) {
      return {
        ok: false,
        message: data.message || "We could not issue your certificate just now. Please try again.",
      };
    }
    return { ok: true, serial: data.serial };
  } catch {
    return { ok: false, message: "We could not issue your certificate just now. Please try again." };
  }
}

/** The current user's certificates, newest first. Empty on signed-out/error. */
export async function getMyCertificates(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("certificates")
      .select("serial, kind, recipient_name, title, issued_at, training_id")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** Public: read one certificate by its serial (share/verify link). */
export async function getCertificateBySerial(serial: string): Promise<{
  serial: string;
  kind: string;
  recipient_name: string;
  title: string;
  issued_at: string;
  training_id: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from("certificates")
      .select("serial, kind, recipient_name, title, issued_at, training_id")
      .eq("serial", serial)
      .maybeSingle();
    if (error || !data) return null;
    return data as any;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Training reviews & ratings (migration 026)
// ---------------------------------------------------------------------------

/** A public review shown on the catalog and detail pages. */
export interface TrainingReview {
  id: string;
  name: string;
  rating: number;
  review: string;
  created_at: string;
  /** Set when the reviewer has an enrollment, powers the Verified badge. */
  enrollment_id: string | null;
}

/** Public reviews for a training, newest first. Signed-out safe; never throws. */
export async function getTrainingReviews(trainingId: string): Promise<TrainingReview[]> {
  try {
    const { data, error } = await supabase
      .from("training_reviews")
      .select("id, name, rating, review, created_at, enrollment_id")
      .eq("training_id", trainingId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      name: r.name || "",
      rating: Number(r.rating) || 0,
      review: r.review || "",
      created_at: r.created_at || "",
      enrollment_id: r.enrollment_id || null,
    }));
  } catch {
    return [];
  }
}

/** The current user's own review for a training, or null. Never throws. */
export async function getMyTrainingReview(trainingId: string): Promise<TrainingReview | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("training_reviews")
      .select("id, name, rating, review, created_at, enrollment_id")
      .eq("training_id", trainingId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name || "",
      rating: Number(data.rating) || 0,
      review: data.review || "",
      created_at: data.created_at || "",
      enrollment_id: data.enrollment_id || null,
    };
  } catch {
    return null;
  }
}

/**
 * Upsert the current user's review for a training. The name comes from their
 * profile, the enrollment_id is looked up from their enrollment, and RLS
 * enforces that only an enrolled (paid or free) student may write. One review
 * per (training, user). Never throws, returns { ok, error }.
 */
export async function submitTrainingReview(input: {
  trainingId: string;
  rating: number;
  review: string;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in to leave a review." };

    // Name from the signed in user (profile first, then email).
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const name = profile?.full_name || profile?.email || user.email || "Yatri";

    // Enrollment backing this review (RLS still verifies it server-side).
    const { data: enrollment } = await supabase
      .from("training_enrollments")
      .select("id")
      .eq("training_id", input.trainingId)
      .eq("user_id", user.id)
      .maybeSingle();

    const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 0)));
    const { error } = await supabase
      .from("training_reviews")
      .upsert(
        {
          training_id: input.trainingId,
          user_id: user.id,
          enrollment_id: enrollment?.id || null,
          name,
          rating,
          review: input.review?.trim() || "", // column is NOT NULL default ''
        },
        { onConflict: "training_id,user_id" },
      );
    if (error) {
      return { ok: false, error: "Your review could not be saved. Please try again." };
    }
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Your review could not be saved. Please try again." };
  }
}

/** Owner: remove their own review. Never throws, returns { ok, error }. */
export async function deleteTrainingReview(id: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("training_reviews").delete().eq("id", id);
    if (error) return { ok: false, error: "We could not remove your review. Please try again." };
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "We could not remove your review. Please try again." };
  }
}

// ── Admin moderation ──

/** An admin view of a review, joined to its training name. */
export interface AdminTrainingReview {
  id: string;
  training_id: string;
  trainingName: string;
  name: string;
  rating: number;
  review: string;
  is_public: boolean;
  enrollment_id: string | null;
  created_at: string;
}

/** Admin: every review with its training name, newest first. */
export async function getAllTrainingReviews(): Promise<AdminTrainingReview[]> {
  const { data, error } = await supabase
    .from("training_reviews")
    .select(
      "id, training_id, name, rating, review, is_public, enrollment_id, created_at, trainings(name, course_title)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    training_id: r.training_id,
    trainingName: r.trainings ? (r.trainings.course_title || r.trainings.name) : "",
    name: r.name || "",
    rating: Number(r.rating) || 0,
    review: r.review || "",
    is_public: r.is_public !== false,
    enrollment_id: r.enrollment_id || null,
    created_at: r.created_at || "",
  }));
}

/** Admin: show or hide a review (the trigger recalculates the training rating). */
export async function setReviewPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from("training_reviews")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw error;
}

/** Admin: delete any review. */
export async function adminDeleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("training_reviews").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Practice quizzes (quizzes + quiz_attempts tables, migration 031)
// ---------------------------------------------------------------------------

import type { QuizQuestion } from "@/types/quiz";
import type { QuizAnswer, PreviousAttempt } from "@/types/quizAttempt";

export interface QuizRecord {
  id: string;
  trainingId: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimitMin: number | null;
  status: "draft" | "published";
}

const rowToQuiz = (row: any): QuizRecord => ({
  id: row.id,
  trainingId: row.training_id,
  title: row.title || "Practice Quiz",
  description: row.description || null,
  questions: Array.isArray(row.questions) ? row.questions : [],
  passingScore: row.passing_score ?? 70,
  timeLimitMin: row.time_limit_min ?? null,
  status: row.status === "draft" ? "draft" : "published",
});

/**
 * Quizzes for a training. RLS limits reads to enrolled students, the
 * training's trainer, and admins (questions carry the correct answers).
 * Never throws, the dashboard renders an honest empty state instead.
 */
export async function listQuizzes(trainingId: string): Promise<QuizRecord[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("training_id", trainingId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data || []).map(rowToQuiz);
}

/**
 * Save the training's practice quiz (one default quiz per training for now —
 * updates the first quiz if present, creates it otherwise). Trainer/admin only
 * via RLS. Passing an empty question list removes the quiz.
 */
export async function saveQuizForTraining(
  trainingId: string,
  questions: QuizQuestion[],
  opts?: { title?: string; passingScore?: number; timeLimitMin?: number | null },
): Promise<void> {
  const { data: existing } = await supabase
    .from("quizzes")
    .select("id")
    .eq("training_id", trainingId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!questions.length) {
    if (existing?.id) {
      const { error: delErr } = await supabase.from("quizzes").delete().eq("id", existing.id);
      if (delErr) throw delErr;
    }
    return;
  }

  const row: Record<string, unknown> = {
    training_id: trainingId,
    questions,
    updated_at: new Date().toISOString(),
  };
  if (opts?.title) row.title = opts.title;
  if (opts?.passingScore !== undefined) {
    const pScore = Number(opts.passingScore);
    row.passing_score = !isNaN(pScore) && pScore >= 0 && pScore <= 100 ? Math.round(pScore) : 70;
  }
  if (opts?.timeLimitMin !== undefined) {
    const tMin = Number(opts.timeLimitMin);
    row.time_limit_min = tMin > 0 ? Math.round(tMin) : null;
  }

  const { error } = existing?.id
    ? await supabase.from("quizzes").update(row).eq("id", existing.id)
    : await supabase.from("quizzes").insert(row);
  if (error) throw error;
}

/** Record a completed attempt. RLS requires the signed-in student to own it. */
export async function submitQuizAttempt(input: {
  quizId: string;
  trainingId: string;
  answers: QuizAnswer[];
  score: number;
  isPassed: boolean;
  timeSpentSec: number;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to submit your quiz.");
  const { error } = await supabase.from("quiz_attempts").insert({
    quiz_id: input.quizId,
    training_id: input.trainingId,
    user_id: user.id,
    answers: input.answers,
    score: Math.round(input.score * 100) / 100,
    is_passed: input.isPassed,
    time_spent_sec: Math.max(0, Math.round(input.timeSpentSec)),
    status: "completed",
  });
  if (error) throw error;
}

/** The signed-in student's past attempts for a quiz, newest first. */
export async function getMyQuizAttempts(quizId: string): Promise<PreviousAttempt[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, score, is_passed, time_spent_sec, created_at")
    .eq("quiz_id", quizId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data || []).map((row: any) => ({
    attemptId: row.id,
    date: new Date(row.created_at),
    score: Number(row.score) || 0,
    timeSpent: row.time_spent_sec || 0,
    isPassed: row.is_passed === true,
  }));
}
