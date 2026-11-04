import type { VercelRequest, VercelResponse } from '@vercel/node';
import handleCreateOrder from '../lib/razorpay-create-order.js';
import handleVerify from '../lib/razorpay-verify.js';
import handleAdmin from '../lib/razorpay-admin.js';

/**
 * Universal Razorpay Dispatcher for Yatri Cloud (keeps deployment under Vercel Hobby 12-function cap).
 *
 * Routes requests based on query param `action`, URL path, or body `action`:
 *   - /api/razorpay?action=create-order (or /api/razorpay/create-order)
 *   - /api/razorpay?action=verify       (or /api/razorpay/verify)
 *   - /api/razorpay?action=admin        (or /api/razorpay/admin)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Pass OPTIONS to handleAdmin if querying/preflighting admin or handle generic preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, QUERY, OPTIONS');
    res.setHeader('Accept-Query', '"application/json"');
    return res.status(204).end();
  }

  let action = String(req.query?.action || '').trim().toLowerCase();

  // If not in query param, check URL pathname
  if (!action && req.url) {
    const pathname = req.url.split('?')[0];
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = (parts[parts.length - 1] || '').toLowerCase();
    if (lastPart && lastPart !== 'razorpay') {
      action = lastPart;
    }
  }

  const rawBodyAction = req.body?.action;
  if (!action && rawBodyAction) {
    action = String(rawBodyAction).trim().toLowerCase();
  }

  if (action === 'create-order' || action === 'createorder') {
    return handleCreateOrder(req, res);
  }

  if (action === 'verify') {
    return handleVerify(req, res);
  }

  if (
    action === 'admin' ||
    req.method === 'QUERY' ||
    (typeof rawBodyAction === 'string' && (
      rawBodyAction.startsWith('adminUsers.') ||
      rawBodyAction.startsWith('invoices.') ||
      rawBodyAction.startsWith('payments.') ||
      rawBodyAction.startsWith('tickets.') ||
      rawBodyAction === 'user.purchases'
    ))
  ) {
    return handleAdmin(req, res);
  }

  return res.status(404).json({
    ok: false,
    message: `Unknown Razorpay action: "${action}". Valid endpoints: create-order, verify, admin`,
  });
}
