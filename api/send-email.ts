import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

/* ── Shared helpers ────────────────────────────────────────────────── */

/** Best-effort HTML → plain text for the email's text/plain alternative. */
function htmlToText(html: string): string {
    return String(html || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

/** Lazy-initialized Supabase service-role client for tracking writes. */
let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
    if (!_sb) {
        _sb = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );
    }
    return _sb;
}

// 1×1 transparent GIF for open tracking
const PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

function getSafeRedirectUrl(rawUrl?: string | string[]): string {
    const fallback = 'https://www.yatricloud.com';
    const target = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
    if (!target || typeof target !== 'string') return fallback;
    const trimmed = target.trim();

    // Allow internal relative paths
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
        return `https://www.yatricloud.com${trimmed}`;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;

        const hostname = parsed.hostname.toLowerCase();
        if (
            hostname === 'yatricloud.in' ||
            hostname.endsWith('.yatricloud.in') ||
            hostname === 'yatricloud.com' ||
            hostname.endsWith('.yatricloud.com') ||
            hostname === 'yatri.cloud' ||
            hostname.endsWith('.yatri.cloud') ||
            hostname === 'github.com' ||
            hostname.endsWith('.github.com') ||
            hostname === 'linkedin.com' ||
            hostname.endsWith('.linkedin.com')
        ) {
            return trimmed;
        }
    } catch {
        return fallback;
    }
    return fallback;
}

async function handleTracking(req: VercelRequest, res: VercelResponse) {
    const { type, nl, sub, url } = req.query;
    if (!nl || !sub || typeof nl !== 'string' || typeof sub !== 'string') {
        return res.status(400).end();
    }

    if (type === 'open') {
        (sb().from('newsletter_opens') as any).insert({
            newsletter_id: nl,
            subscriber_id: sub,
            user_agent: req.headers['user-agent'] || '',
        }).then();
        const { data } = await (sb().from('newsletters') as any).select('open_count').eq('id', nl).single();
        if (data) {
            await (sb().from('newsletters') as any).update({ open_count: (data.open_count || 0) + 1 }).eq('id', nl);
        }
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        return res.status(200).send(PIXEL);
    }

    if (type === 'click') {
        const targetUrl = getSafeRedirectUrl(url as string);
        (sb().from('newsletter_clicks') as any).insert({
            newsletter_id: nl,
            subscriber_id: sub,
            url: targetUrl,
        }).then();
        const { data } = await (sb().from('newsletters') as any).select('click_count').eq('id', nl).single();
        if (data) {
            await (sb().from('newsletters') as any).update({ click_count: (data.click_count || 0) + 1 }).eq('id', nl);
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.redirect(302, targetUrl);
    }

    return res.status(400).end();
}

/* ── Email sending (POST /api/send-email) ─────────────────────────── */

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
/** Only our own domain may appear as the sender (prevents From-spoofing). */
const ALLOWED_FROM_DOMAINS = ['yatricloud.com'];
const MAX_RECIPIENTS = 10;
/** Unauthenticated callers may reach at most this many non-Yatri recipients per request. */
const MAX_ANON_EXTERNAL_RECIPIENTS = 1;
const ANON_WINDOW_MS = 10 * 60 * 1000;
const ANON_MAX_PER_WINDOW = 20;
/** Best-effort per-IP throttle for unauthenticated sends (per warm instance). */
const anonHits = new Map<string, number[]>();

function isInternal(addr: string): boolean {
    const domain = addr.split('@')[1]?.toLowerCase() || '';
    return ALLOWED_FROM_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

function normalizeRecipients(to: unknown): string[] | null {
    const list = Array.isArray(to) ? to : String(to || '').split(/[,;]/);
    const out = list.map((v) => String(v || '').trim()).filter(Boolean);
    if (out.length === 0 || out.length > MAX_RECIPIENTS) return null;
    return out.every((a) => EMAIL_RE.test(a)) ? out : null;
}

async function isAuthenticated(req: VercelRequest): Promise<boolean> {
    const header = String(req.headers.authorization || '');
    const token = header.match(/^Bearer (.+)$/i)?.[1];
    if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
    try {
        const { data, error } = await sb().auth.getUser(token);
        return !error && Boolean(data?.user?.id);
    } catch {
        return false;
    }
}

function anonRateLimited(req: VercelRequest): boolean {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const now = Date.now();
    const hits = (anonHits.get(ip) || []).filter((t) => now - t < ANON_WINDOW_MS);
    hits.push(now);
    anonHits.set(ip, hits);
    if (anonHits.size > 5000) anonHits.clear();
    return hits.length > ANON_MAX_PER_WINDOW;
}

async function handleSendEmail(req: VercelRequest, res: VercelResponse) {
    const { to, subject, html, from } = req.body || {};
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }
    if (typeof subject !== 'string' || typeof html !== 'string' || subject.length > 300 || html.length > 500_000) {
        return res.status(400).json({ error: 'Invalid subject or body' });
    }
    const recipients = normalizeRecipients(to);
    if (!recipients) {
        return res.status(400).json({ error: 'Invalid recipient list' });
    }

    // Signed-in callers are trusted app flows. Anonymous callers (public forms,
    // guest bookings) are limited to one external recipient and throttled so the
    // endpoint cannot be used as a bulk relay.
    if (!(await isAuthenticated(req))) {
        const external = recipients.filter((a) => !isInternal(a));
        if (external.length > MAX_ANON_EXTERNAL_RECIPIENTS) {
            return res.status(401).json({ error: 'Sign in required to email these recipients' });
        }
        if (anonRateLimited(req)) {
            return res.status(429).json({ error: 'Too many emails, please try again later' });
        }
    }

    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;
    const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.office365.com';
    const EMAIL_PORT = process.env.EMAIL_PORT || 587;
    const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Yatri Cloud';
    // Priority: Request body (from parameter, own domain only) > EMAIL_FROM env var > EMAIL_USER env var
    const requestedFrom = typeof from === 'string' && EMAIL_RE.test(from.trim()) && isInternal(from.trim())
        ? from.trim()
        : '';
    const EMAIL_FROM = requestedFrom || process.env.EMAIL_FROM || EMAIL_USER;

    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error('❌ Email credentials missing in env');
        return res.status(500).json({ error: 'Email configuration missing on server' });
    }

    const transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        secure: false,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
        tls: { ciphers: 'SSLv3' },
    });

    const info = await transporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: recipients,
        subject,
        html,
        text: (typeof req.body?.text === 'string' && req.body.text) || htmlToText(html),
    });

    console.log('✅ Email sent:', info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });
}

/* ── Router ────────────────────────────────────────────────────────── */

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    // Enable CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    try {
        // GET with tracking query params → newsletter open/click tracking
        if (request.method === 'GET' && request.query.type) {
            return await handleTracking(request, response);
        }

        // POST → send email
        if (request.method === 'POST') {
            return await handleSendEmail(request, response);
        }

        return response.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('❌ Email send error:', {
            message: error.message,
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
            response: error.response,
        });
        // Never echo SMTP/server internals to the caller.
        return response.status(500).json({ error: 'Failed to send email' });
    }
}
