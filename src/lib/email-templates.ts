/**
 * Email Templates for Yatri Cloud
 * Uses inline styles for maximum email client compatibility.
 *
 * Each builder first tries the matching `email_templates` row in
 * Supabase (seeded by supabase/migrations/013_legal_guides_emails.sql
 * with the exact same HTML). RLS makes that table admin only, so for
 * non admin sessions the fetch returns nothing and the hardcoded
 * builder output below is used as the fallback. That is expected and
 * required. Builders stay synchronous because every call site uses the
 * return value directly, so the table is fetched once per session in
 * the background and rows are read from the cache on later calls.
 */

import { supabase } from "@/lib/supabase";

type EmailTemplateRow = { key: string; subject: string; body_html: string };

const templateCache = new Map<string, EmailTemplateRow>();
let templatesFetch: Promise<void> | null = null;

/** Fetches all template rows once per session (admin only via RLS). */
const warmTemplates = (): void => {
  if (templatesFetch) return;
  templatesFetch = (async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("key, subject, body_html");
      if (error || !data) return;
      for (const row of data) {
        if (row?.key && row?.body_html) {
          templateCache.set(String(row.key), {
            key: String(row.key),
            subject: String(row.subject ?? ""),
            body_html: String(row.body_html),
          });
        }
      }
    } catch {
      /* keep the hardcoded fallbacks */
    }
  })();
};

/**
 * Substitutes template placeholders:
 * - `{{#if variable}}...{{/if}}` blocks are kept when the variable is
 *   truthy and removed otherwise.
 * - `{{variable}}` is replaced from `vars`; `{{year}}` is always the
 *   current year.
 */
export const fillTemplate = (
  html: string,
  vars: Record<string, string | undefined>
): string => {
  return html
    .replace(/{{#if\s+(\w+)\s*}}([\s\S]*?){{\/if}}/g, (_match, name, block) =>
      vars[name] ? block : ""
    )
    .replace(/{{\s*(\w+)\s*}}/g, (match, name) => {
      if (name === "year") return String(new Date().getFullYear());
      const value = vars[name];
      return value !== undefined && value !== null ? value : match;
    });
};

/**
 * Renders a DB template if the row is already cached for this session.
 * Returns null when the row is not available (non admin session, fetch
 * still in flight, offline) so the caller falls back to the hardcoded
 * builder output.
 */
const renderDbTemplate = (
  key: string,
  vars: Record<string, string | undefined>
): string | null => {
  warmTemplates();
  const row = templateCache.get(key);
  if (!row?.body_html) return null;
  return fillTemplate(row.body_html, vars);
};

/** Escapes user-supplied plain text (e.g. a subscriber name) for HTML. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const COLORS = {
  primary: '#007CFF', // Yatri Cloud brand blue (hsl(210 100% 50%))
  secondary: '#007CFF', // brand blue, header band + headings (no more navy)
  background: '#f3f4f6', // gray-100
  card: '#ffffff',
  text: '#1f2937', // gray-800
  textMuted: '#6b7280', // gray-500
};

const LOGO_URL = "https://raw.githubusercontent.com/yatricloud/yatri-images/refs/heads/main/certification.yatricloud.com/logo/yatri_cloud_logo.png"; // Replace with actual logo URL if available

export const BASE_TEMPLATE = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; color: ${COLORS.text}; line-height: 1.6;">
    
    <!-- Header -->
    <div style="background-color: ${COLORS.secondary}; padding: 30px; text-align: center; border-radius: 0 0 20px 20px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Yatri Cloud</h1>
    </div>

    <!-- Content -->
    <div style="background-color: ${COLORS.card}; padding: 40px; margin: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: ${COLORS.textMuted}; font-size: 12px;">
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} Yatri Cloud. All rights reserved.</p>
      <p style="margin: 5px 0;">Master IT Certifications with Yatri Cloud.</p>
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin-bottom: 10px;">Connect with us:</p>
        <a href="https://www.youtube.com/@yatricloud?sub_confirmation=1" style="text-decoration: none; margin: 0 8px;"><img src="https://img.icons8.com/ios-filled/50/007cff/youtube-play.png" alt="YouTube" width="24" height="24" style="vertical-align: middle;"></a>
        <a href="https://linkedin.com/company/yatricloud" style="text-decoration: none; margin: 0 8px;"><img src="https://img.icons8.com/ios-filled/50/007cff/linkedin.png" alt="LinkedIn" width="24" height="24" style="vertical-align: middle;"></a>
        <a href="https://whatsapp.com/channel/0029VakdAHIFHWq60yHA1Q0s" style="text-decoration: none; margin: 0 8px;"><img src="https://img.icons8.com/ios-filled/50/007cff/whatsapp.png" alt="WhatsApp" width="24" height="24" style="vertical-align: middle;"></a>
      </div>

      <div style="margin-top: 15px;">
        <p style="margin: 5px 0;">Join Yatri Cloud Community: <a href="https://www.yatricloud.com/community" style="color: ${COLORS.primary}; text-decoration: none; font-weight: bold;">yatricloud.com/community</a></p>
        <p style="margin: 5px 0; color: ${COLORS.primary}; font-weight: bold;">Special Offer: <a href="https://yatricloud.com/schedule/40min" style="color: ${COLORS.primary}; text-decoration: underline;">Discounted AWS Exam Vouchers</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Branded training-enrollment confirmation.
 * DB template key: `enrollment_confirmed`.
 * Placeholder mapping: name -> {{name}}, courseName -> {{course_name}},
 * calendarUrl -> {{calendar_url}} (Add-to-calendar block wrapped in
 * {{#if calendar_url}}...{{/if}}).
 */
export const getEnrollmentEmail = (name: string, courseName: string, calendarUrl?: string) => {
  const fromDb = renderDbTemplate("enrollment_confirmed", {
    name,
    course_name: courseName,
    calendar_url: calendarUrl,
  });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">You're enrolled!</h2>
    <p>Hello ${name},</p>
    <p>You have successfully enrolled in <strong>${courseName}</strong>.</p>

    <div style="background-color: #eff6ff; border-left: 4px solid ${COLORS.primary}; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 5px 0;">Our team will reach out shortly with your access details and everything you need to get started.</p>
    </div>

    ${calendarUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${calendarUrl}" style="background-color: ${COLORS.primary}; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Add to your calendar</a>
    </div>
    ` : ''}

    <p>Happy learning,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, `Enrollment Confirmed: ${courseName}`);
};

/**
 * DB template key: `registration_confirmed`.
 * Placeholder mapping: name -> {{name}}, eventName -> {{event_name}},
 * code -> {{code}}, date -> {{date}}, meetLink -> {{meet_link}}.
 * The Join Meeting block is wrapped in {{#if meet_link}}...{{/if}}.
 */
export const getRegistrationEmail = (name: string, eventName: string, code: string, date: string, meetLink?: string) => {
  const fromDb = renderDbTemplate("registration_confirmed", {
    name,
    event_name: eventName,
    code,
    date,
    meet_link: meetLink,
  });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Registration Confirmed!</h2>
    <p>Hello ${name},</p>
    <p>You have successfully registered for <strong>${eventName}</strong>.</p>
    
    <div style="background-color: #eff6ff; border-left: 4px solid ${COLORS.primary}; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 5px 0; font-size: 16px;"><strong>Registration Code:</strong> <span style="font-family: monospace; background-color: white; padding: 2px 6px; border-radius: 4px; border: 1px solid ${COLORS.primary}; color: ${COLORS.primary};">${code}</span></p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 5px 0;"><strong>Location:</strong> Online</p>
    </div>

    ${meetLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${meetLink}" style="background-color: ${COLORS.primary}; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Join Meeting</a>
    </div>
    ` : ''}

    <p>We're excited to see you there! Make sure to add this to your calendar.</p>
    <p>Best regards,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, `Registration Confirmed: ${eventName}`);
};

/**
 * DB template key: `product_purchase`.
 * Placeholder mapping: name -> {{name}}, productNames -> {{product_names}},
 * amount -> {{amount}}, paymentId -> {{payment_id}}.
 */
export const getProductPurchaseEmail = (name: string, productNames: string, amount: string, paymentId: string) => {
  const fromDb = renderDbTemplate("product_purchase", {
    name,
    product_names: productNames,
    amount,
    payment_id: paymentId,
  });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Order Confirmed!</h2>
    <p>Hello ${name},</p>
    <p>Thank you for your purchase from the Yatri Store.</p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 5px 0;"><strong>Order ID:</strong> ${paymentId}</p>
      <p style="margin: 5px 0;"><strong>Items:</strong> ${productNames}</p>
      <p style="margin: 5px 0;"><strong>Total Paid:</strong> ${amount}</p>
    </div>

    <p><strong>Next Steps:</strong></p>
    <p>You will receive a separate email shortly with a <strong>meeting link</strong> to schedule your exam with our team.</p>
    
    <p>If you have any questions, feel free to reply to this email.</p>
    <p>Best regards,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, "Order Confirmation - Yatri Cloud");
};

/**
 * DB template key: `certificate_submission`.
 * Placeholder mapping: name -> {{name}}, certName -> {{cert_name}},
 * provider -> {{provider}}.
 */
export const getCertificateSubmissionEmail = (name: string, certName: string, provider: string) => {
  const fromDb = renderDbTemplate("certificate_submission", {
    name,
    cert_name: certName,
    provider,
  });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Achievement Unlocked!</h2>
    <p>Hello ${name},</p>
    <p>Congratulations on earning your <strong>${certName}</strong> from <strong>${provider}</strong>!</p>
    <p>We've successfully received your submission. It will now appear on your public profile and the "Yatri Stars" wall.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://certification.yatricloud.com/achievements" style="background-color: ${COLORS.primary}; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View Profile</a>
    </div>

    <p>Keep learning and collecting those badges!</p>
    <p>Best regards,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, `Submission Received: ${certName}`);
};

/**
 * DB template key: `welcome`.
 * Placeholder mapping: name -> {{name}}.
 */
export const getWelcomeEmail = (name: string) => {
  const fromDb = renderDbTemplate("welcome", { name });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Welcome to Yatri Cloud!</h2>
    <p>Hello ${name},</p>
    <p>We're thrilled to have you join our community of cloud enthusiasts.</p>
    <p>Here at Yatri Cloud, you can:</p>
    <ul style="padding-left: 20px; color: ${COLORS.text};">
      <li style="margin-bottom: 10px;">Showcase your certifications</li>
      <li style="margin-bottom: 10px;">Register for exclusive workshops</li>
      <li style="margin-bottom: 10px;">Generate AI-powered practice questions</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://certification.yatricloud.com" style="background-color: ${COLORS.primary}; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Explore Dashboard</a>
    </div>

    <p>If you have any questions, feel free to reply to this email.</p>
    <p>Happy Learning!<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, "Welcome to Yatri Cloud");
};

/**
 * DB template key: `event_feedback`.
 * Placeholder mapping: name -> {{name}}, eventName -> {{event_name}},
 * feedbackLink -> {{feedback_link}}.
 */
export const getEventFeedbackEmail = (name: string, eventName: string, feedbackLink: string) => {
  const fromDb = renderDbTemplate("event_feedback", {
    name,
    event_name: eventName,
    feedback_link: feedbackLink,
  });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Thank You for Attending!</h2>
    <p>Hello ${name},</p>
    <p>Thanks for joining us at <strong>${eventName}</strong>. We hope you found it valuable!</p>
    <p>To help us improve and bring you better events, please take a moment to share your feedback. Completing this form is also required to receive your participation certificate.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${feedbackLink}" style="background-color: ${COLORS.primary}; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Give Feedback & Get Certificate</a>
    </div>

    <p>See you at the next event!</p>
    <p>Best regards,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, `Feedback Request: ${eventName}`);
};

/**
 * DB template key: `exam_dump_purchase`.
 * Placeholder mapping: name -> {{name}}, dumpTitle -> {{dump_title}},
 * amount -> {{amount}}, downloadUrl -> {{download_url}} (used twice),
 * paymentId -> {{payment_id}}.
 */
export const getExamDumpPurchaseEmail = (name: string, dumpTitle: string, amount: string, downloadUrl: string, paymentId: string) => {
  const fromDb = renderDbTemplate("exam_dump_purchase", {
    name,
    dump_title: dumpTitle,
    amount,
    download_url: downloadUrl,
    payment_id: paymentId,
  });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Practice Exam Access!</h2>
    <p>Hello ${name},</p>
    <p>Thank you for purchasing the <strong>${dumpTitle}</strong> practice exam.</p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 5px 0;"><strong>Order ID:</strong> ${paymentId}</p>
      <p style="margin: 5px 0;"><strong>Total Paid:</strong> ${amount}</p>
    </div>

    <p><strong>Your Download Link:</strong></p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${downloadUrl}" style="background-color: ${COLORS.primary}; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Download Practice Exam</a>
    </div>
    
    <p style="font-size: 14px; color: ${COLORS.textMuted}; text-align: center;">you can also access using this link:<br>${downloadUrl}</p>

    <p>Success in your certification journey!</p>
    <p>Best regards,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, "Your Practice Exam Download Link - Yatri Cloud");
};

/**
 * Multiple Exam Dumps purchase email template.
 */
export const getMultipleExamDumpsPurchaseEmail = (
  name: string,
  dumps: Array<{ title: string; downloadUrl: string }>,
  amount: string,
  paymentId: string
) => {
  const dumpListHtml = dumps
    .map(
      (d) => `
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; text-align: left;">
        <h3 style="margin: 0 0 8px; color: ${COLORS.secondary}; font-size: 16px;">${d.title}</h3>
        <div style="text-align: center; margin: 12px 0;">
          <a href="${d.downloadUrl}" style="background-color: ${COLORS.primary}; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px;">Download Practice Exam</a>
        </div>
        <p style="font-size: 12px; color: ${COLORS.textMuted}; text-align: center; margin: 0; word-break: break-all;">Link: ${d.downloadUrl}</p>
      </div>`
    )
    .join("");

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Practice Exams Access!</h2>
    <p>Hello ${name},</p>
    <p>Thank you for purchasing <strong>${dumps.length} practice exams</strong> from Yatri Cloud.</p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 5px 0;"><strong>Order ID:</strong> ${paymentId}</p>
      <p style="margin: 5px 0;"><strong>Total Paid:</strong> ${amount}</p>
      <p style="margin: 5px 0;"><strong>Total Items:</strong> ${dumps.length}</p>
    </div>

    <p><strong>Your Download Links:</strong></p>
    ${dumpListHtml}

    <p style="margin-top: 24px;">Success in your certification journey!</p>
    <p>Best regards,<br>Team Yatri Cloud</p>
  `;
  return BASE_TEMPLATE(content, "Your Practice Exams Download Links - Yatri Cloud");
};

/**
 * Newsletter email template.
 * DB template key: `newsletter_welcome` (welcome only).
 * The newsletter body is the admin-composed HTML.
 * Adds an unsubscribe footer with the token link.
 */
export const getNewsletterEmail = (
  subject: string,
  bodyHtml: string,
  unsubscribeUrl: string,
  name?: string,
  newsletterId?: string,
  subscriberId?: string
) => {
  const greeting = name ? `<p style="margin:0 0 16px;color:${COLORS.text};font-size:16px;line-height:1.6;">Hey ${escapeHtml(name)},</p>` : "";
  const trackingPixel = newsletterId && subscriberId
    ? `<img src="https://www.yatricloud.com/api/send-email?type=open&nl=${newsletterId}&sub=${subscriberId}" width="1" height="1" style="display:none" alt="" />`
    : "";
  const content = `
    ${greeting}
    <div style="margin-bottom:24px;">${bodyHtml}</div>
    ${trackingPixel}
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;text-align:center;">
      <p style="margin:0;font-size:13px;color:${COLORS.textMuted};">You received this because you're subscribed to the Yatri Cloud newsletter.</p>
      <a href="${unsubscribeUrl}" style="display:inline-block;margin-top:8px;font-size:13px;color:${COLORS.textMuted};text-decoration:underline;">Unsubscribe</a>
    </div>
  `;
  return BASE_TEMPLATE(content, subject);
};

/**
 * Subscriber welcome email sent after newsletter signup.
 * DB template key: `newsletter_welcome`.
 * Placeholder mapping: name -> {{name}}, email -> {{email}}.
 */
export const getSubscriberWelcomeEmail = (rawName: string, rawEmail: string) => {
  // Name/email come from the public signup form: escape before embedding.
  const name = escapeHtml(rawName);
  const email = escapeHtml(rawEmail);
  const fromDb = renderDbTemplate("newsletter_welcome", { name, email });
  if (fromDb) return fromDb;

  const content = `
    <h2 style="color: ${COLORS.secondary}; margin-top: 0;">Welcome to the newsletter!</h2>
    <p>Hey ${name},</p>
    <p>Welcome to the Yatri Cloud newsletter. You'll receive updates on new certification practice materials, upcoming events, exclusive discounts, and learning resources to help you ace your cloud exams.</p>
    <p>We're glad to have you with us, Yatri.</p>
    <p style="color: ${COLORS.textMuted}; font-size: 14px;">The Yatri Cloud Team</p>
  `;
  return BASE_TEMPLATE(content, "Welcome to the Yatri Cloud newsletter");
};
