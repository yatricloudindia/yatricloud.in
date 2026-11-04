import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - shared plain-ESM core (no TS declaration)
import { handleAdminUsers } from './admin-users-lib.mjs';

/**
 * Admin gateway to the Razorpay API.
 *
 * One function, many actions (kept together to stay under the serverless
 * function budget). Every call must carry a Supabase access token belonging to
 * an admin; we verify it server side with the service role before touching
 * Razorpay. The Razorpay secret never leaves the server.
 *
 * POST /api/razorpay/admin  { action, access_token, ...params }
 *   action = "invoices.list"    params: { count?, skip? }
 *          | "invoices.create"  params: { customer:{name,email,contact}, description?, item_name, amount, currency, notify? }
 *          | "invoices.cancel"  params: { invoice_id }
 *          | "payments.list"    params: { count?, skip? }
 *          | "payments.refund"  params: { payment_id, amount?, currency? }  (omit amount for a full refund)
 *
 * invoices.create issues the invoice and returns its short_url (a hosted pay
 * page). This lets an admin raise a professional invoice, in any currency, from
 * Yatri Cloud, and pull the ones raised in the Razorpay dashboard back in.
 */

// Currencies whose ISO minor unit is not 2 (mirrors verify.ts / currency-catalog).
const ZERO_DECIMAL = new Set(['BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
const THREE_DECIMAL = new Set(['BHD','IQD','JOD','KWD','OMR','TND']);
function toSmallestUnit(amountMajor: number, code: string): number {
  const c = (code || 'INR').toUpperCase();
  const dec = ZERO_DECIMAL.has(c) ? 0 : THREE_DECIMAL.has(c) ? 3 : 2;
  return Math.round((Number(amountMajor) || 0) * Math.pow(10, dec));
}

// RFC 10008 (The HTTP QUERY Method): the list actions are safe, idempotent
// reads that carry a request body — exactly what QUERY is for. Mutations
// (create/cancel/refund) stay POST-only; sending them via QUERY is rejected
// so the method's safety promise holds.
const QUERY_SAFE_ACTIONS = new Set(['invoices.list', 'payments.list']);

export default async function handleAdmin(req: VercelRequest, res: VercelResponse) {
  // Advertise QUERY support per RFC 10008 (Structured Field of media ranges).
  res.setHeader('Accept-Query', '"application/json"');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, QUERY, OPTIONS');
    return res.status(204).end();
  }

  const isQuery = req.method === 'QUERY';
  if (req.method !== 'POST' && !isQuery) {
    res.setHeader('Allow', 'POST, QUERY, OPTIONS');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  // RFC 10008 requires typed request content on QUERY.
  if (isQuery && !String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ ok: false, message: 'QUERY requests must send application/json.' });
  }

  // Safety gate before auth or any side effects: QUERY may only run reads.
  if (isQuery && !QUERY_SAFE_ACTIONS.has((req.body || {}).action)) {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'This action changes state — send it with POST.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ ok: false, message: 'Server is not configured.' });
  if (!keyId || !keySecret) return res.status(500).json({ ok: false, message: 'Payments are not configured on the server.' });

  const { action, access_token } = req.body || {};
  if (!action || !access_token) return res.status(400).json({ ok: false, message: 'Missing action or sign in token.' });

  const svcHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // ---- Verify caller token ----
  let authUser: any = null;
  let isAdmin = false;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) return res.status(401).json({ ok: false, message: 'Please sign in again.' });
    authUser = await userRes.json().catch(() => null);
    const uid = authUser?.id;
    if (!uid) return res.status(401).json({ ok: false, message: 'Please sign in again.' });

    const profRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${uid}&select=role`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    const [profile] = (await profRes.json().catch(() => [])) as Array<{ role?: string }>;
    isAdmin = profile?.role === 'admin';

    // Verify Super Admin status for financial lockout
    const [adminUserRes, totalAdminsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/admin_users?id=eq.${uid}&select=role,is_active`, { headers: svcHeaders }),
      fetch(`${supabaseUrl}/rest/v1/admin_users?select=id`, { headers: { ...svcHeaders, Prefer: 'count=exact' } }),
    ]);
    const [adminUser] = (await adminUserRes.json().catch(() => [])) as Array<{ role?: string; is_active?: boolean }>;
    // A disabled admin_users row revokes admin access even if profiles.role is still 'admin'.
    if (adminUser && adminUser.is_active === false) isAdmin = false;
    const rangeHdr = totalAdminsRes.headers.get('content-range') || '';
    const totalAdmins = rangeHdr.includes('/') ? parseInt(rangeHdr.split('/')[1] || '0', 10) : 0;

    const isSuperAdmin =
      (adminUser && adminUser.role === 'super_admin' && adminUser.is_active) ||
      (!adminUser && profile?.role === 'admin' && totalAdmins === 0);

    // Attach to req for downstream handlers if needed
    (req as any).isSuperAdmin = isSuperAdmin;
  } catch (e) {
    console.error('admin gateway auth error:', e);
    return res.status(500).json({ ok: false, message: 'Could not verify your access.' });
  }

  // ── User Purchases (for any authenticated user checking their own receipts & materials)
  if (action === 'user.purchases') {
    try {
      const email = (authUser?.email || '').trim().toLowerCase();
      // ilike must match the address literally: escape LIKE wildcards, and refuse
      // '*' (PostgREST expands it to '%' and it cannot be escaped).
      if (!email || email.includes('*')) {
        return res.status(200).json({ ok: true, invoices: [], orders: [] });
      }
      const emailLike = email.replace(/[\\%_]/g, (c: string) => `\\${c}`);
      const [invRes, ordersRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/invoices?buyer_email=ilike.${encodeURIComponent(
            emailLike
          )}&select=*&order=created_at.desc`,
          { headers: svcHeaders }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/orders?email=ilike.${encodeURIComponent(
            emailLike
          )}&select=*&order=created_at.desc`,
          { headers: svcHeaders }
        ),
      ]);
      const invoices = (await invRes.json().catch(() => [])) || [];
      const orders = (await ordersRes.json().catch(() => [])) || [];
      return res.status(200).json({
        ok: true,
        invoices: Array.isArray(invoices) ? invoices : [],
        orders: Array.isArray(orders) ? orders : [],
      });
    } catch (err) {
      console.error('user.purchases error:', err);
      return res.status(500).json({ ok: false, message: 'Failed to fetch purchases' });
    }
  }

  // All subsequent actions require Admin privileges
  if (!isAdmin) {
    return res.status(403).json({ ok: false, message: 'Admins only.' });
  }

  // Financial actions: Strictly Super Admin only
  const isSuperAdminUser = (req as any).isSuperAdmin;
  if (
    typeof action === 'string' &&
    (action.startsWith('invoices.') || action.startsWith('payments.')) &&
    !isSuperAdminUser
  ) {
    return res.status(403).json({
      ok: false,
      message: 'Super Admin access required. Financial records and payment data are strictly restricted to Super Admin only.',
    });
  }

  // ── Support Ticket Admin Actions
  if (action === 'tickets.delete') {
    const ticket_id = req.body?.ticket_id;
    if (!ticket_id) return res.status(400).json({ ok: false, message: 'ticket_id is required' });
    await fetch(
      `${supabaseUrl}/rest/v1/support_messages?ticket_id=eq.${encodeURIComponent(ticket_id)}`,
      { method: 'DELETE', headers: svcHeaders }
    );
    const delRes = await fetch(
      `${supabaseUrl}/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticket_id)}`,
      { method: 'DELETE', headers: { ...svcHeaders, Prefer: 'return=representation' } }
    );
    if (!delRes.ok) return res.status(500).json({ ok: false, message: 'Failed to delete ticket' });
    return res.status(200).json({ ok: true, message: 'Ticket deleted successfully' });
  }

  if (action === 'tickets.set_status') {
    const { ticket_id, status } = req.body || {};
    if (!ticket_id || !status) return res.status(400).json({ ok: false, message: 'ticket_id and status required' });
    const patch: Record<string, unknown> = { status, last_activity_at: new Date().toISOString() };
    if (status === 'resolved') patch.resolved_at = new Date().toISOString();
    if (status === 'closed') patch.closed_at = new Date().toISOString();
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticket_id)}`,
      { method: 'PATCH', headers: { ...svcHeaders, Prefer: 'return=representation' }, body: JSON.stringify(patch) }
    );
    if (!patchRes.ok) return res.status(500).json({ ok: false, message: 'Failed to update ticket status' });
    return res.status(200).json({ ok: true, message: 'Status updated' });
  }

  // ---- Razorpay call helper (Basic auth) ----
  const basic = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const rzp = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: basic, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  };

  try {
    const p = req.body || {};

    // Admin role & credential management
    if (typeof action === 'string' && action.startsWith('adminUsers.')) {
      req.body = { ...(req.body || {}), action: action.slice('adminUsers.'.length) };
      return handleAdminUsers(req, res);
    }

    if (action === 'invoices.list') {
      const count = Math.min(Math.max(Number(p.count) || 25, 1), 100);
      const skip = Math.max(Number(p.skip) || 0, 0);
      const r = await rzp('GET', `/invoices?count=${count}&skip=${skip}`);
      if (!r.ok) return res.status(r.status).json({ ok: false, message: r.data?.error?.description || 'Could not load invoices.' });
      return res.status(200).json({ ok: true, count: r.data.count, items: r.data.items || [] });
    }

    if (action === 'payments.list') {
      const count = Math.min(Math.max(Number(p.count) || 25, 1), 100);
      const skip = Math.max(Number(p.skip) || 0, 0);
      const r = await rzp('GET', `/payments?count=${count}&skip=${skip}`);
      if (!r.ok) return res.status(r.status).json({ ok: false, message: r.data?.error?.description || 'Could not load payments.' });
      return res.status(200).json({ ok: true, count: r.data.count, items: r.data.items || [] });
    }

    if (action === 'invoices.create') {
      const cust = p.customer || {};
      const currency = String(p.currency || 'INR').toUpperCase();
      const amount = Number(p.amount);
      if (!cust.name || !cust.email) return res.status(400).json({ ok: false, message: 'Customer name and email are required.' });
      if (!p.item_name) return res.status(400).json({ ok: false, message: 'An item name is required.' });
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ ok: false, message: 'Enter a valid amount.' });

      const payload: Record<string, unknown> = {
        type: 'invoice',
        description: String(p.description || p.item_name),
        customer: {
          name: String(cust.name),
          email: String(cust.email),
          ...(cust.contact ? { contact: String(cust.contact) } : {}),
        },
        line_items: [
          { name: String(p.item_name), amount: toSmallestUnit(amount, currency), currency, quantity: 1 },
        ],
        currency,
        email_notify: p.notify ? 1 : 0,
        sms_notify: 0,
      };
      const r = await rzp('POST', '/invoices', payload);
      if (!r.ok) return res.status(r.status).json({ ok: false, message: r.data?.error?.description || 'Could not create the invoice.' });
      return res.status(200).json({
        ok: true,
        invoice: { id: r.data.id, status: r.data.status, short_url: r.data.short_url, amount: r.data.amount, currency: r.data.currency },
      });
    }

    if (action === 'payments.refund') {
      if (!p.payment_id) return res.status(400).json({ ok: false, message: 'Missing payment id.' });
      // Optional partial amount (major units). Omit for a full refund.
      const body: Record<string, unknown> = { speed: 'normal' };
      if (p.amount !== undefined && p.amount !== null && p.amount !== '') {
        const amt = Number(p.amount);
        if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ ok: false, message: 'Enter a valid refund amount.' });
        body.amount = toSmallestUnit(amt, String(p.currency || 'INR'));
      }
      const r = await rzp('POST', `/payments/${encodeURIComponent(String(p.payment_id))}/refund`, body);
      if (!r.ok) return res.status(r.status).json({ ok: false, message: r.data?.error?.description || 'Could not refund this payment.' });
      return res.status(200).json({ ok: true, refund: { id: r.data.id, amount: r.data.amount, currency: r.data.currency, status: r.data.status } });
    }

    if (action === 'invoices.cancel') {
      if (!p.invoice_id) return res.status(400).json({ ok: false, message: 'Missing invoice id.' });
      const r = await rzp('POST', `/invoices/${encodeURIComponent(String(p.invoice_id))}/cancel`);
      if (!r.ok) return res.status(r.status).json({ ok: false, message: r.data?.error?.description || 'Could not cancel the invoice.' });
      return res.status(200).json({ ok: true, status: r.data.status });
    }

    return res.status(400).json({ ok: false, message: `Unknown action: ${action}` });
  } catch (e) {
    console.error('admin gateway action error:', e);
    return res.status(500).json({ ok: false, message: 'Something went wrong talking to Razorpay.' });
  }
}
