import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateTrainingOrder, TrainingPaymentError } from './training-payment.js';

/**
 * Creates a Razorpay order.
 *
 * For mentorship bookings, when Route is enabled and the mentor has a linked
 * account, the order carries a transfer that pays the mentor their share and
 * keeps the platform commission automatically. The split is computed here on
 * the server from the database, never from the client, so the amounts cannot
 * be tampered with. Everything else (store, events, training) is unchanged.
 */

const ROUTE_ENABLED = process.env.RAZORPAY_ROUTE_ENABLED === 'true';

// Reads the mentor share for a mentorship booking. Returns null when the split
// should not apply (Route off, no linked account, missing config, any error).
async function computeMentorTransfer(bookingId: string, orderAmountPaise: number): Promise<
  { account: string; amountPaise: number; feePaise: number } | null
> {
  if (!ROUTE_ENABLED) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  try {
    // The booking tells us which mentor is being paid.
    const bRes = await fetch(
      `${supabaseUrl}/rest/v1/mentorship_bookings?id=eq.${encodeURIComponent(bookingId)}&select=mentor_id,amount`,
      { headers },
    );
    const [booking] = (await bRes.json()) as Array<{ mentor_id: string; amount: number }>;
    if (!booking?.mentor_id) return null;

    // The mentor's linked account and their commission override (if any).
    const mRes = await fetch(
      `${supabaseUrl}/rest/v1/mentors?id=eq.${encodeURIComponent(booking.mentor_id)}&select=razorpay_account_id,commission_percent`,
      { headers },
    );
    const [mentor] = (await mRes.json()) as Array<{ razorpay_account_id: string | null; commission_percent: number | null }>;
    if (!mentor?.razorpay_account_id) return null;

    // Effective commission: mentor override, else the platform default.
    let percent = mentor.commission_percent;
    if (percent == null) {
      const sRes = await fetch(
        `${supabaseUrl}/rest/v1/site_settings?key=eq.commission&select=value`,
        { headers },
      );
      const [row] = (await sRes.json()) as Array<{ value: { mentorship_percent?: number } }>;
      percent = row?.value?.mentorship_percent ?? 10;
    }
    const pct = Math.min(Math.max(Number(percent) || 0, 0), 100);

    // Mentor share is the whole amount minus commission, floored to paise.
    const payoutPaise = Math.floor((orderAmountPaise * (100 - pct)) / 100);
    const feePaise = orderAmountPaise - payoutPaise;
    if (payoutPaise <= 0 || payoutPaise > orderAmountPaise) return null;
    return { account: mentor.razorpay_account_id, amountPaise: payoutPaise, feePaise };
  } catch (err) {
    console.error('Route split lookup failed, falling back to a normal order:', err);
    return null;
  }
}

export default async function handleCreateOrder(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({ message: 'Razorpay keys are not configured on the server' });
  }

  try {
    const { amount, currency, receipt, notes } = req.body || {};

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 50000000) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const cleanCurrency = String(currency || 'INR').toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      return res.status(400).json({ message: 'Invalid currency code' });
    }

    const orderBody: Record<string, unknown> = {
      amount: Math.round(numericAmount),
      currency: cleanCurrency,
      receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
      payment_capture: 1,
      partial_payment: false,
      notes: typeof notes === 'object' && notes !== null ? notes : {},
    };

    if (notes?.kind === 'training' || notes?.enrollment_id || notes?.training_checkout_version) {
      const quote = await validateTrainingOrder({
        authorization: req.headers.authorization, amount: numericAmount, currency: cleanCurrency, notes,
      });
      orderBody.amount = quote.amount;
      orderBody.notes = quote.notes;
    }

    // Mentorship commission split (only when eligible; safe no op otherwise).
    if (notes?.kind === 'mentorship' && notes?.booking_id && currency === 'INR') {
      const split = await computeMentorTransfer(String(notes.booking_id), Number(amount));
      if (split) {
        orderBody.transfers = [
          {
            account: split.account,
            amount: split.amountPaise,
            currency: 'INR',
            notes: { booking_id: String(notes.booking_id) },
            on_hold: 1,
          },
        ];
      }
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(orderBody),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP error from Razorpay: ${razorpayResponse.status}` };
      }
      console.error('Razorpay order creation failed:', errorData);
      return res.status(razorpayResponse.status).json({
        message: errorData.error?.description || errorData.message || 'Failed to create Razorpay order',
      });
    }

    const razorpayOrder = await razorpayResponse.json();

    return res.status(200).json({
      orderId: razorpayOrder.id,
    });
  } catch (error: any) {
    if (error instanceof TrainingPaymentError) return res.status(error.status).json({ message: error.message });
    console.error('Error in /api/razorpay/create-order:', error);
    return res.status(500).json({
      message: error?.message || 'Internal Server Error while creating Razorpay order',
    });
  }
}
