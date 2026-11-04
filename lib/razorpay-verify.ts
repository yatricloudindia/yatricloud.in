import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyTrainingPayment, TrainingPaymentError } from './training-payment.js';

/** ISO to UTC basic format YYYYMMDDTHHMMSSZ (mirrors src/lib/mentorship.ts). */
const toCalendarUtc = (iso: string): string =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** Google Calendar add event URL, same format as the client helper. */
const googleCalendarUrl = (input: {
  title: string;
  startISO: string;
  endISO: string;
  details?: string;
  location?: string;
}): string => {
  const dates = `${toCalendarUtc(input.startISO)}/${toCalendarUtc(input.endISO)}`;
  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(input.title)}`,
    `dates=${dates}`,
    `details=${encodeURIComponent(input.details ?? '')}`,
    `location=${encodeURIComponent(input.location ?? '')}`,
  ].join('&');
  return `https://calendar.google.com/calendar/render?${params}`;
};

/** Minimal symbol map for the receipt (server has no currency table). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$',
  JPY: '¥', CNY: '¥', KRW: '₩', KWD: 'د.ك', BHD: '.د.ب', OMR: 'ر.ع.',
};

// Currencies whose ISO minor unit is not 2, so the smallest-unit integer
// Razorpay uses is amount * 10^decimals, not amount * 100.
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND']);

/** Minor-unit exponent (0, 2 or 3) for a currency code. */
function currencyDecimals(code: string): number {
  const c = (code || 'INR').toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
}

/** Convert a Razorpay smallest-unit integer back to major units for the code. */
function toMajorUnits(smallest: number | null | undefined, code: string): number {
  const factor = Math.pow(10, currencyDecimals(code));
  return (Number(smallest ?? 0) || 0) / factor;
}

/** "₹499" for INR, "$5.99" for everything else. */
function formatReceiptMoney(amount: number, currency: string): string {
  const code = (currency || 'INR').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
  if (code === 'INR') return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`;
  const d = currencyDecimals(code);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** Friendly line item label when none is supplied. */
function labelForKind(kind: string | null): string {
  switch (kind) {
    case 'store': return 'Yatri Cloud store purchase';
    case 'event': return 'Event registration';
    case 'training': return 'Training enrollment';
    case 'mentorship': return 'Mentorship session';
    default: return 'Yatri Cloud purchase';
  }
}

/** Inline-styled payment receipt sent to the buyer (domestic and international). */
function buildInvoiceEmail(input: {
  invoiceNumber: string;
  buyerName: string;
  buyerEmail: string;
  item: string;
  amountLabel: string;
  dateLabel: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Payment receipt from Yatri Cloud</title></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6;">
    <div style="background-color:#0a1f44;padding:28px 32px;border-radius:0 0 16px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="color:#ffffff;font-size:20px;font-weight:700;">Yatri Cloud</td>
        <td align="right" style="color:#c7d2fe;font-size:13px;">Payment receipt</td>
      </tr></table>
    </div>

    <div style="background-color:#ffffff;padding:36px 32px;margin:20px;border-radius:14px;box-shadow:0 4px 10px rgba(0,0,0,0.06);">
      <p style="margin:0 0 6px;">Hello ${input.buyerName},</p>
      <p style="margin:0 0 24px;color:#4b5563;">Thank you for your payment. Here is your receipt for your records.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;padding-bottom:2px;">Receipt number</td>
          <td align="right" style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;padding-bottom:2px;">Date</td>
        </tr>
        <tr>
          <td style="font-weight:600;font-size:15px;">${input.invoiceNumber}</td>
          <td align="right" style="font-weight:600;font-size:15px;">${input.dateLabel}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;">
        <tr>
          <td style="padding:14px 0;color:#4b5563;">${input.item}</td>
          <td align="right" style="padding:14px 0;font-weight:600;">${input.amountLabel}</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #0a1f44;">
        <tr>
          <td style="padding:14px 0;font-weight:700;font-size:16px;">Total paid</td>
          <td align="right" style="padding:14px 0;font-weight:700;font-size:16px;color:#0a1f44;">${input.amountLabel}</td>
        </tr>
      </table>

      <p style="margin:22px 0 4px;color:#6b7280;font-size:13px;">Billed to</p>
      <p style="margin:0;font-size:14px;">${input.buyerName} · ${input.buyerEmail}</p>

      <p style="margin:28px 0 0;color:#4b5563;">If you have any question about this receipt, reply to this email or write to us at info@yatricloud.com.</p>
      <p style="margin:16px 0 0;">Warm regards,<br><strong>Team Yatri Cloud</strong></p>
    </div>

    <div style="text-align:center;padding:8px 20px 28px;color:#9ca3af;font-size:12px;">
      <p style="margin:4px 0;">Yatri Cloud · Bengaluru, India · info@yatricloud.com</p>
      <p style="margin:4px 0;">&copy; ${new Date().getFullYear()} Yatri Cloud. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * True when the Razorpay order was created for this mentorship booking at the
 * service's current price (mirrors MentorServiceDetail: price * 100, service currency).
 */
async function paymentMatchesBooking(bookingId: string, razorpayOrderId: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!supabaseUrl || !serviceKey || !keyId || !keySecret) return false;
  try {
    const sb = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const bRes = await fetch(
      `${supabaseUrl}/rest/v1/mentorship_bookings?id=eq.${encodeURIComponent(bookingId)}&select=service_id`,
      { headers: sb },
    );
    const [booking] = (await bRes.json().catch(() => [])) as Array<{ service_id?: string }>;
    if (!booking?.service_id) return false;
    const sRes = await fetch(
      `${supabaseUrl}/rest/v1/mentorship_services?id=eq.${encodeURIComponent(booking.service_id)}&select=price,currency`,
      { headers: sb },
    );
    const [service] = (await sRes.json().catch(() => [])) as Array<{ price?: number; currency?: string }>;
    if (!service) return false;
    const oRes = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
    });
    if (!oRes.ok) return false;
    const order = await oRes.json();
    return (
      String(order?.notes?.booking_id || '') === bookingId &&
      Number(order?.amount) === Math.round(Number(service.price) * 100) &&
      String(order?.currency || '').toUpperCase() === String(service.currency || 'INR').toUpperCase()
    );
  } catch (err) {
    console.error('booking/payment match check failed:', err);
    return false;
  }
}

/**
 * Verify a Razorpay payment signature server-side, then record the payment
 * in Supabase (`payments` table) with the service-role key.
 */
export default async function handleVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!keySecret) {
    return res.status(500).json({ message: 'Razorpay is not configured on the server' });
  }

  try {
    let {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency,
      order_id,
      booking_id,
      registration_id,
      enrollment_id,
      kind,
      buyer_name,
      buyer_email,
      item,
      items_list,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ verified: false, message: 'Missing payment fields' });
    }

    // ── The signature check (Razorpay docs): HMAC-SHA256(order_id|payment_id, secret)
    const expected = createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const givenBuf = Buffer.from(String(razorpay_signature));
    if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
      console.warn('❌ Razorpay signature mismatch', { razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ verified: false, message: 'Invalid payment signature' });
    }

    if (kind === 'training' || enrollment_id) {
      const verified = await verifyTrainingPayment({
        providerOrderId: razorpay_order_id, providerPaymentId: razorpay_payment_id,
        enrollmentId: enrollment_id, orderId: order_id,
      });
      amount = verified.amount;
      currency = verified.currency;
    }

    // ── Mentorship: the signature only proves that SOME order was paid. Bind it
    //    to this booking and to the service's server-side price, otherwise a
    //    cheap (client-priced) order could confirm any pending booking.
    if (booking_id) {
      const bound = await paymentMatchesBooking(String(booking_id), String(razorpay_order_id));
      if (!bound) {
        console.warn('❌ Razorpay order does not match booking', { razorpay_order_id, booking_id });
        return res.status(400).json({ verified: false, message: 'Payment does not match this booking' });
      }
    }

    // ── Record the verified payment (best-effort: verification result is
    //    authoritative even if the audit insert hiccups)
    let recorded = false;
    let paymentRowId: string | null = null;

    // Invoice context, filled by whichever branch matches (mentorship / event /
    // training) and finally by the order row for the store. Drives the receipt.
    let invoiceKind: string | null = kind || null;
    let invoiceBuyerName: string = buyer_name || '';
    let invoiceBuyerEmail: string = buyer_email || '';
    let invoiceItem: string = item || '';

    if (supabaseUrl && serviceKey) {
      const insert = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          order_id: order_id || null,
          provider: 'razorpay',
          provider_order_id: razorpay_order_id,
          provider_payment_id: razorpay_payment_id,
          amount: toMajorUnits(amount, currency || 'INR'), // smallest unit -> major, per currency
          currency: currency || 'INR',
          status: 'completed',
          verified_at: new Date().toISOString(),
          raw: { razorpay_order_id, razorpay_payment_id },
        }),
      });
      recorded = insert.ok;
      if (!insert.ok) {
        console.error('⚠️ payment record insert failed:', await insert.text());
      } else {
        try {
          const rows = await insert.json();
          paymentRowId = Array.isArray(rows) ? rows[0]?.id ?? null : null;
        } catch {
          paymentRowId = null;
        }
      }

      // Mark our order completed if provided
      if (order_id && recorded) {
        await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'completed' }),
        });
      }

      // ── Mentorship: flip the paid pending booking to confirmed.
      //    This endpoint (service role) is the ONLY writer allowed to do it.
      if (booking_id) {
        try {
          const bookingPatch = await fetch(
            `${supabaseUrl}/rest/v1/mentorship_bookings?id=eq.${encodeURIComponent(
              booking_id
            )}&status=eq.pending`,
            {
              method: 'PATCH',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify({
                status: 'confirmed',
                ...(paymentRowId ? { payment_id: paymentRowId } : {}),
                ...(order_id ? { order_id } : {}),
              }),
            }
          );
          if (!bookingPatch.ok) {
            console.error('⚠️ booking confirm failed:', await bookingPatch.text());
          } else {
            // Fire-and-forget mentor notification: never affects the verdict.
            try {
              const patched = await bookingPatch.json().catch(() => []);
              const booking = Array.isArray(patched) ? patched[0] : null;

              // Invoice context from the booking (buyer + amount currency).
              if (booking) {
                invoiceKind = invoiceKind || 'mentorship';
                invoiceBuyerName = invoiceBuyerName || booking.customer_name || '';
                invoiceBuyerEmail = invoiceBuyerEmail || booking.customer_email || '';
                if (!invoiceItem) invoiceItem = 'Mentorship session';
              }

              // Record the commission split on the booking (Route order transfer).
              // Best effort: never affects the payment verdict.
              if (booking?.id && keyId && keySecret) {
                try {
                  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
                  const trRes = await fetch(
                    `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}/transfers`,
                    { headers: { Authorization: `Basic ${auth}` } }
                  );
                  const trData = await trRes.json().catch(() => ({}));
                  const transfer = Array.isArray(trData?.items) ? trData.items[0] : null;
                  if (transfer?.id) {
                    const payoutRupees = Number(transfer.amount ?? 0) / 100;
                    const amountRupees = Number(booking.amount ?? 0);
                    await fetch(
                      `${supabaseUrl}/rest/v1/mentorship_bookings?id=eq.${encodeURIComponent(booking.id)}`,
                      {
                        method: 'PATCH',
                        headers: {
                          apikey: serviceKey,
                          Authorization: `Bearer ${serviceKey}`,
                          'Content-Type': 'application/json',
                          Prefer: 'return=minimal',
                        },
                        body: JSON.stringify({
                          transfer_id: transfer.id,
                          mentor_payout: payoutRupees,
                          platform_fee: Math.max(amountRupees - payoutRupees, 0),
                        }),
                      }
                    );
                  }
                } catch (err) {
                  console.error('Recording the commission split failed (ignored):', err);
                }
              }

              if (booking?.mentor_id) {
                const [privateRes, mentorRes, serviceRes] = await Promise.all([
                  fetch(
                    `${supabaseUrl}/rest/v1/mentor_private?mentor_id=eq.${encodeURIComponent(
                      booking.mentor_id
                    )}&select=contact_email`,
                    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
                  ),
                  fetch(
                    `${supabaseUrl}/rest/v1/mentors?id=eq.${encodeURIComponent(
                      booking.mentor_id
                    )}&select=name`,
                    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
                  ),
                  fetch(
                    `${supabaseUrl}/rest/v1/mentorship_services?id=eq.${encodeURIComponent(
                      booking.service_id
                    )}&select=title`,
                    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
                  ),
                ]);
                const contactEmail = (await privateRes.json().catch(() => []))?.[0]?.contact_email;
                const mentorName = (await mentorRes.json().catch(() => []))?.[0]?.name || 'Mentor';
                const serviceTitle =
                  (await serviceRes.json().catch(() => []))?.[0]?.title || 'Mentorship session';

                if (contactEmail) {
                  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
                  const host = req.headers.host;
                  const slotLine = booking.slot_start
                    ? `<p style="margin: 5px 0;"><strong>When:</strong> ${new Date(
                        booking.slot_start
                      ).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>`
                    : '';
                  const calLink =
                    booking.slot_start && booking.slot_end
                      ? `<div style="text-align: center; margin: 24px 0;"><a href="${googleCalendarUrl(
                          {
                            title: serviceTitle,
                            startISO: booking.slot_start,
                            endISO: booking.slot_end,
                            details: `Mentorship session with ${booking.customer_name || 'your Yatri'}.`,
                            location: booking.meeting_link || 'Online',
                          }
                        )}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Add to your calendar</a></div>`
                      : '';
                  await fetch(`${proto}://${host}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to: contactEmail,
                      subject: `New booking: ${serviceTitle}`,
                      html: `
                        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; color: #1f2937; line-height: 1.6;">
                          <h2 style="color: #1e3a8a;">New mentorship booking</h2>
                          <p>Hello ${mentorName},</p>
                          <p>A new session was just booked and paid on Yatri Cloud.</p>
                          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 5px 0;"><strong>Session:</strong> ${serviceTitle}</p>
                            <p style="margin: 5px 0;"><strong>Yatri:</strong> ${booking.customer_name || ''} (${booking.customer_email || ''})</p>
                            ${slotLine}
                          </div>
                          ${calLink}
                          <p>Please add the meeting link from your dashboard before the session.</p>
                          <p>Team Yatri Cloud</p>
                        </div>
                      `,
                    }),
                  });
                }
              }
            } catch (notifyError) {
              console.error('⚠️ mentor notification failed (ignored):', notifyError);
            }
          }
        } catch (bookingError) {
          console.error('⚠️ booking confirm errored (payment still verified):', bookingError);
        }
      }

      const sbHeaders = {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      };

      // ── Event: flip the paid pending registration to 'paid'.
      if (registration_id) {
        try {
          const regPatch = await fetch(
            `${supabaseUrl}/rest/v1/event_registrations?id=eq.${encodeURIComponent(registration_id)}`,
            {
              method: 'PATCH',
              headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
              body: JSON.stringify({
                payment_status: 'paid',
                ...(paymentRowId ? { payment_id: paymentRowId } : {}),
                ...(order_id ? { order_id } : {}),
              }),
            }
          );
          if (!regPatch.ok) {
            console.error('⚠️ event registration confirm failed:', await regPatch.text());
          } else {
            const rows = await regPatch.json().catch(() => []);
            const reg = Array.isArray(rows) ? rows[0] : null;
            if (reg) {
              invoiceKind = invoiceKind || 'event';
              invoiceBuyerName = invoiceBuyerName || reg.name || '';
              invoiceBuyerEmail = invoiceBuyerEmail || reg.email || '';
              if (!invoiceItem) invoiceItem = 'Event registration';
            }
          }
        } catch (regError) {
          console.error('⚠️ event confirm errored (payment still verified):', regError);
        }
      }

      // ── Training: flip the paid pending enrollment to 'paid'.
      if (enrollment_id) {
        if (!recorded) return res.status(503).json({ verified: false, message: 'Payment record could not be saved. Contact support before retrying payment.' });
        try {
          const enrPatch = await fetch(
            `${supabaseUrl}/rest/v1/training_enrollments?id=eq.${encodeURIComponent(enrollment_id)}`,
            {
              method: 'PATCH',
              headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
              body: JSON.stringify({
                payment_status: 'paid',
                ...(paymentRowId ? { payment_id: paymentRowId } : {}),
                ...(order_id ? { order_id } : {}),
              }),
            }
          );
          if (!enrPatch.ok) {
            console.error('⚠️ training enrollment confirm failed:', await enrPatch.text());
            return res.status(503).json({ verified: false, message: 'Payment received but enrollment could not be confirmed. Contact support.' });
          } else {
            const rows = await enrPatch.json().catch(() => []);
            const enr = Array.isArray(rows) ? rows[0] : null;
            if (enr) {
              invoiceKind = invoiceKind || 'training';
              invoiceBuyerEmail = invoiceBuyerEmail || enr.email || '';
              if (!invoiceItem) invoiceItem = 'Training enrollment';
            }
          }
        } catch (enrError) {
          console.error('⚠️ training confirm errored (payment still verified):', enrError);
        }
      }

      // ── Invoice + receipt email for every successful payment (best effort).
      //    Never changes the payment verdict if anything here fails.
      if (paymentRowId) {
        try {
          // Fall back to the order row for buyer info + line items (store etc.).
          let invoiceItems: unknown = Array.isArray(items_list) && items_list.length > 0
            ? items_list
            : (invoiceItem ? [{ name: invoiceItem }] : []);

          if (order_id && (!invoiceKind || !invoiceBuyerEmail || !invoiceItem)) {
            const oRes = await fetch(
              `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(order_id)}&select=kind,email,items`,
              { headers: sbHeaders }
            );
            const [orow] = (await oRes.json().catch(() => [])) as Array<{
              kind?: string;
              email?: string;
              items?: unknown;
            }>;
            if (orow) {
              invoiceKind = invoiceKind || orow.kind || 'store';
              invoiceBuyerEmail = invoiceBuyerEmail || orow.email || '';
              if ((!Array.isArray(invoiceItems) || invoiceItems.length === 0) && orow.items) {
                invoiceItems = orow.items;
              }
            }
          }
          if (!invoiceKind) invoiceKind = 'other';

          const amountMajor = toMajorUnits(amount, currency || 'INR');
          const cur = currency || 'INR';
          const idForNumber = String(paymentRowId || razorpay_payment_id || '').replace(/-/g, '');
          const now = new Date();
          const yyyymmdd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
            now.getUTCDate()
          ).padStart(2, '0')}`;
          const invoiceNumber = `YC-${yyyymmdd}-${idForNumber.slice(0, 8).toUpperCase()}`;

          const invoiceRes = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
            method: 'POST',
            headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({
              invoice_number: invoiceNumber,
              kind: invoiceKind,
              payment_id: paymentRowId,
              order_id: order_id || null,
              buyer_name: invoiceBuyerName || null,
              buyer_email: invoiceBuyerEmail || null,
              amount: amountMajor,
              currency: cur,
              items: invoiceItems,
            }),
          });
          if (!invoiceRes.ok) {
            console.error('⚠️ invoice insert failed (ignored):', await invoiceRes.text());
          }

          if (invoiceBuyerEmail) {
            const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
            const host = req.headers.host;
            const amountLabel = formatReceiptMoney(amountMajor, cur);
            await fetch(`${proto}://${host}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: invoiceBuyerEmail,
                subject: `Your Yatri Cloud receipt ${invoiceNumber}`,
                html: buildInvoiceEmail({
                  invoiceNumber,
                  buyerName: invoiceBuyerName || 'Yatri',
                  buyerEmail: invoiceBuyerEmail,
                  item: invoiceItem || labelForKind(invoiceKind),
                  amountLabel,
                  dateLabel: now.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Asia/Kolkata',
                  }),
                }),
              }),
            });
          }
        } catch (invoiceError) {
          console.error('⚠️ invoice/receipt errored (payment still verified):', invoiceError);
        }
      }
    } else {
      console.warn('⚠️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — payment verified but not recorded');
    }

    return res.status(200).json({ verified: true, recorded });
  } catch (error: any) {
    if (error instanceof TrainingPaymentError) return res.status(error.status).json({ verified: false, message: error.message });
    console.error('Error in /api/razorpay/verify:', error);
    return res.status(500).json({ verified: false, message: 'Internal error verifying payment' });
  }
}
