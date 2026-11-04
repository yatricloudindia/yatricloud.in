/**
 * Razorpay Payment Integration Utility
 */

import { loadRazorpay } from "@/lib/third-party";
import { supabase } from "@/lib/supabase";

export interface RazorpayOptions {
  amount: number; // Amount in rupees (not paise)
  currency: string;
  eventName: string;
  userDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Order based Razorpay checkout, the ONE correct flow.
 *
 * The caller must already have created a Razorpay order (createRazorpayOrder)
 * so a signature comes back and /api/razorpay/verify can validate the HMAC.
 * The verify body carries the smallest unit amount + chosen currency, our
 * orders.id (ourOrderId) and any extra fields (kind, registration_id,
 * enrollment_id, buyer info, item) so the server can confirm the row and
 * issue an invoice. Mirrors openMentorshipCheckout in src/lib/mentorship.ts.
 */
export interface RazorpayCheckoutInput {
  /** Razorpay order id from createRazorpayOrder. */
  razorpayOrderId: string;
  /** Amount in the smallest unit of the chosen currency (e.g. paise, cents). */
  amountSmallestUnit: number;
  /** ISO currency code being charged (INR, USD, ...). */
  currency: string;
  /** Shown in the Razorpay modal. */
  productName: string;
  customer: { name: string; email: string; phone: string };
  /** Our orders.id row, forwarded to verify as order_id. */
  ourOrderId?: string;
  /** Extra fields merged into the verify body (kind, registration_id, ...). */
  verifyExtra?: Record<string, unknown>;
  onSuccess: (paymentId: string) => void;
  onFailure: (message: string) => void;
}

/** Drops undefined/null entries so Razorpay notes and the verify body stay clean. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

export async function openRazorpayCheckout(input: RazorpayCheckoutInput): Promise<void> {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    input.onFailure('Payment gateway not configured. Please contact administrator.');
    return;
  }
  // checkout.js loads on demand, it is no longer on every page.
  if (!(await loadRazorpay())) {
    input.onFailure('Payment system not available. Please refresh and try again.');
    return;
  }

  const extra = compact(input.verifyExtra || {});

  const razorpayOptions = {
    key,
    amount: input.amountSmallestUnit,
    currency: input.currency,
    name: 'Yatri Cloud',
    description: input.productName,
    order_id: input.razorpayOrderId,
    image: 'https://raw.githubusercontent.com/yatricloud/yatri-images/refs/heads/main/Logo/yatricloud-round-transparent.png',
    handler: async function (response: RazorpayResponse) {
      // Server-side signature verification, the payment is only trusted
      // if /api/razorpay/verify confirms the HMAC. Never trust the client.
      try {
        const verifyRes = await fetch('/api/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: input.amountSmallestUnit,
            currency: input.currency,
            ...(input.ourOrderId ? { order_id: input.ourOrderId } : {}),
            ...extra,
          }),
        });
        const verdict = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok || !verdict.verified) {
          input.onFailure('Payment could not be verified. If money was deducted it will be auto-refunded, please contact support.');
          return;
        }
      } catch (e) {
        console.error('Payment verification request failed:', e);
        input.onFailure('Payment verification failed, please contact support with your payment ID.');
        return;
      }
      input.onSuccess(response.razorpay_payment_id);
    },
    prefill: {
      name: input.customer.name,
      email: input.customer.email,
      contact: input.customer.phone,
    },
    notes: extra,
    theme: {
      color: '#3B82F6', // Primary blue color
    },
    modal: {
      ondismiss: function () {
        input.onFailure('Payment cancelled by user');
      },
    },
  };

  try {
    const razorpayInstance = new window.Razorpay(razorpayOptions);
    razorpayInstance.on('payment.failed', function (response: any) {
      input.onFailure(response?.error?.description || 'Payment failed');
    });
    razorpayInstance.open();
  } catch (error) {
    console.error('Error opening Razorpay:', error);
    input.onFailure('Failed to open payment gateway');
  }
}

/**
 * Format amount for display (₹499 or Free)
 */
export function formatEventPrice(price: string | number | undefined): string {
  if (!price || price === 0 || price === '0') {
    return 'Free';
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (!Number.isFinite(numPrice)) return 'Free';
  return `₹${Math.round(numPrice).toLocaleString('en-IN')}`;
}

/**
 * Check if event is paid
 */
export function isEventPaid(price: string | number | undefined): boolean {
  if (!price) return false;
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice > 0;
}

// ------------------------------------------------------------------
// Legacy Support & CartSheet.tsx Compatibility
// ------------------------------------------------------------------

export const isTestMode = () => {
  return import.meta.env.VITE_RAZORPAY_KEY_ID?.startsWith("rzp_test_");
};

export const createRazorpayOrder = async (orderData: any) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    // Relative path: Vercel serverless function in prod, Vite dev proxy →
    // server.js in local dev. No hardcoded hosts.
    const response = await fetch('/api/razorpay/create-order', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.message || `Failed to create order: ${response.statusText}`);
    }

    const data = await response.json();
    return data.orderId;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
};

export function initiatePayment(
  orderId: string,
  amount: number,
  productName: string,
  customerName: string,
  email: string,
  phone: string,
  onSuccess: (paymentId: string) => void,
  onFailure: (error: string) => void,
  currency: string = "INR",
  verifyExtra: Record<string, unknown> = {}
) {
  // Delegates to the shared order based checkout so the store benefits from the
  // same verified flow, multi currency support and server side invoicing.
  openRazorpayCheckout({
    razorpayOrderId: orderId,
    amountSmallestUnit: amount,
    currency,
    productName,
    customer: { name: customerName, email, phone },
    verifyExtra: { kind: "store", ...verifyExtra },
    onSuccess,
    onFailure,
  });
}
