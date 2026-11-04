import { createClient } from '@supabase/supabase-js';
import { getRates } from '../api/currency.js';
import { currencyDecimals } from '../src/lib/currency-catalog.js';

export class TrainingPaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new TrainingPaymentError('Training payments are not configured', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function trainingAmountMinor(base: number, feePercent: number, discountPercent: number, rate: number, decimals: number) {
  if (![base, feePercent, discountPercent, rate].every(Number.isFinite)
    || base <= 0 || feePercent < 0 || discountPercent < 0 || discountPercent > 100 || rate <= 0) {
    throw new TrainingPaymentError('Invalid training price configuration');
  }
  const discounted = Math.max(0, Math.round(base * (100 - discountPercent)) / 100);
  const fee = Math.round(base * feePercent) / 100;
  return Math.round((discounted + fee) * rate * 10 ** decimals);
}

/** Authoritative training quote. Browser-supplied amounts never set the price. */
export async function validateTrainingOrder(input: {
  authorization?: string; amount: number; currency: string;
  notes: Record<string, unknown>;
}) {
  const db = database();
  const token = input.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new TrainingPaymentError('Please sign in to pay for training', 401);
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) throw new TrainingPaymentError('Please sign in again', 401);
  const enrollmentId = String(input.notes.enrollment_id || '');
  const orderId = String(input.notes.order_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(enrollmentId) || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    throw new TrainingPaymentError('Missing training checkout reference');
  }
  const { data: enrollment, error: enrollmentError } = await db.from('training_enrollments')
    .select('id,training_id,user_id,order_id,payment_status').eq('id', enrollmentId).single();
  if (enrollmentError || !enrollment || enrollment.user_id !== auth.user.id || enrollment.order_id !== orderId) {
    throw new TrainingPaymentError('Training checkout does not belong to this account', 403);
  }
  if (!['pending', 'failed'].includes(enrollment.payment_status)) throw new TrainingPaymentError('This enrollment is already settled', 409);
  const [{ data: course, error: courseError }, { data: order, error: orderError }] = await Promise.all([
    db.from('trainings').select('price_inr,platform_fee_pct,status').eq('id', enrollment.training_id).single(),
    db.from('orders').select('user_id,kind').eq('id', orderId).single(),
  ]);
  if (courseError || !course || course.status !== 'published' || orderError || !order
    || order.user_id !== auth.user.id || order.kind !== 'training') {
    throw new TrainingPaymentError('Training checkout is unavailable', 403);
  }
  let discount = 0;
  const couponCode = String(input.notes.coupon_code || '').trim();
  if (couponCode) {
    const { data, error } = await db.rpc('validate_coupon', {
      p_code: couponCode, p_scope: 'training', p_entity_ids: [enrollment.training_id],
    });
    if (error || !data?.length) throw new TrainingPaymentError('The coupon is no longer valid');
    discount = Number(data[0].percent_off);
  }
  const rate = input.currency === 'INR' ? 1 : (await getRates()).rates[input.currency];
  const amount = trainingAmountMinor(Number(course.price_inr), Number(course.platform_fee_pct || 0), discount, rate, currencyDecimals(input.currency));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount !== input.amount) {
    throw new TrainingPaymentError('The checkout price has changed. Refresh the course and try again.', 409);
  }
  return { amount, notes: {
    kind: 'training', enrollment_id: enrollmentId, order_id: orderId,
    user_id: auth.user.id, training_id: enrollment.training_id, training_checkout_version: '1',
    ...(couponCode ? { coupon_code: couponCode } : {}),
  } };
}

/** Match a captured provider payment to the server-priced enrollment. */
export async function verifyTrainingPayment(input: {
  providerOrderId: string; providerPaymentId: string; enrollmentId: string; orderId: string;
}) {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new TrainingPaymentError('Payment gateway unavailable', 503);
  const headers = { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` };
  const [orderRes, paymentRes] = await Promise.all([
    fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(input.providerOrderId)}`, { headers }),
    fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.providerPaymentId)}`, { headers }),
  ]);
  if (!orderRes.ok || !paymentRes.ok) throw new TrainingPaymentError('Unable to verify payment with the provider', 502);
  const [order, payment] = await Promise.all([orderRes.json(), paymentRes.json()]);
  if (order.notes?.kind !== 'training' || order.notes?.training_checkout_version !== '1'
    || order.notes.enrollment_id !== input.enrollmentId || order.notes.order_id !== input.orderId
    || payment.order_id !== input.providerOrderId || payment.status !== 'captured'
    || payment.amount !== order.amount || payment.currency !== order.currency
    || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) {
    throw new TrainingPaymentError('Payment does not match this training checkout');
  }
  const db = database();
  const { data: enrollment, error } = await db.from('training_enrollments')
    .select('id,order_id,user_id,training_id,payment_status').eq('id', input.enrollmentId).single();
  if (error || !enrollment || enrollment.order_id !== input.orderId
    || enrollment.user_id !== order.notes.user_id || enrollment.training_id !== order.notes.training_id) {
    throw new TrainingPaymentError('Training enrollment does not match the payment');
  }
  return { amount: payment.amount as number, currency: payment.currency as string };
}
