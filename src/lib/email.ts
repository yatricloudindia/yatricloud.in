
/**
 * Email Utility functions
 */

import { logEmail } from "@/lib/email-logs-api";
import { supabase } from "@/lib/supabase";

/** JSON headers plus the caller's Supabase access token when signed in (the API trusts signed-in senders). */
async function emailHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch {
        // anonymous send
    }
    return headers;
}

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    /** Optional override for the FROM address (e.g. info@yatricloud.com instead of noreply) */
    from?: string;
    /** Optional: name of the template used, stored in email_logs for auditing. */
    templateKey?: string;
    /** Optional extra metadata to store alongside the log (e.g. user_id, event_id). */
    metadata?: Record<string, unknown>;
}

/**
 * Send an email using the backend API.
 * Every attempt (success or failure) is automatically logged to the email_logs table.
 */
export async function sendEmail({ to, subject, html, from, templateKey, metadata }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const headers = await emailHeaders();
        // Relative path: served by the Vercel serverless function in prod and
        // by the Vite dev proxy → server.js in local dev. No hardcoded hosts.
        let response = await fetch('/api/send-email', {
            method: 'POST',
            headers,
            body: JSON.stringify({ to, subject, html, from }),
            signal: controller.signal,
        });

        // In local development, if local :3001 server isn't running, fallback to production API
        if (!response.ok && typeof window !== "undefined" && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            try {
                const prodResponse = await fetch('https://www.yatricloud.com/api/send-email', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ to, subject, html, from }),
                    signal: controller.signal,
                });
                if (prodResponse.ok) {
                    void logEmail({ to, subject, templateKey, status: "sent", metadata });
                    return { success: true };
                }
            } catch (fallbackErr) {
                console.warn('Fallback email send failed:', fallbackErr);
            }
        }

        const data = await response.json().catch(() => ({ error: 'Failed to send email' }));

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send email');
        }

        // Log success (fire-and-forget)
        void logEmail({ to, subject, templateKey, status: "sent", metadata });

        return { success: true };
    } catch (error: any) {
        const errMsg = error?.name === 'AbortError' ? 'Email send timed out' : error.message;

        // Log failure (fire-and-forget)
        void logEmail({ to, subject, templateKey, status: "failed", error: errMsg, metadata });

        console.error('❌ Failed to send email:', error);
        return { success: false, error: errMsg };
    } finally {
        clearTimeout(timeoutId);
    }
}
