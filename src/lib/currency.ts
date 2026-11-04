/**
 * Multi currency helpers for direct international checkout.
 *
 * INR is the base. Every currency carries a rate expressed as foreign units per
 * one rupee, so INR * rate = foreign amount. The supported set is the full
 * catalog (see currency-catalog.ts); live rates come from /api/currency/rates
 * and are cached once per session, falling back to the catalog's static rates
 * when the feed is unreachable. Amount maths is decimal aware: each currency's
 * ISO minor-unit exponent drives both formatting and the integer we give
 * Razorpay (amount * 10^decimals). Nothing here ever throws.
 */

import {
  CURRENCY_META,
  FALLBACK_RATES_PER_INR,
  currencyDecimals,
  currencyForCountry,
} from "@/lib/currency-catalog";

export interface CurrencyOption {
  /** ISO 4217 code, e.g. INR, USD. */
  code: string;
  /** Display symbol, e.g. ₹, $. */
  symbol: string;
  /** Foreign units per one INR (INR * rate = foreign). */
  rate: number;
  /** Human label shown in the dropdown. */
  label: string;
  /** ISO minor-unit exponent: 0 (JPY), 2 (most), 3 (KWD). */
  decimals: number;
}

export const BASE_CURRENCY = "INR";

/** The default currency (INR) shown before geo detection resolves. */
export const DEFAULT_CURRENCY: CurrencyOption = {
  code: "INR",
  symbol: "₹",
  rate: 1,
  label: "Indian Rupee",
  decimals: 2,
};

/** Build the option list from catalog metadata + a rate lookup. */
function buildOptions(rates: Record<string, number>): CurrencyOption[] {
  const list = CURRENCY_META.map((m) => {
    const rate = m.code === BASE_CURRENCY ? 1 : Number(rates[m.code]) || FALLBACK_RATES_PER_INR[m.code] || 0;
    return { code: m.code, symbol: m.symbol, label: m.name, decimals: m.decimals, rate };
  }).filter((c) => c.code === BASE_CURRENCY || c.rate > 0);
  // Guarantee INR is present and first.
  const withoutBase = list.filter((c) => c.code !== BASE_CURRENCY);
  return [DEFAULT_CURRENCY, ...withoutBase];
}

/** Fallback list from the static catalog rates (used before/without the feed). */
export const FALLBACK_CURRENCIES: CurrencyOption[] = buildOptions(FALLBACK_RATES_PER_INR);

let currenciesPromise: Promise<CurrencyOption[]> | null = null;

/** Supported currencies with live rates, cached once per session. Never throws. */
export function getCurrencies(): Promise<CurrencyOption[]> {
  if (!currenciesPromise) {
    currenciesPromise = (async () => {
      try {
        const res = await fetch("/api/currency?mode=rates", { headers: { accept: "application/json" } });
        if (!res.ok) return FALLBACK_CURRENCIES;
        const data = (await res.json()) as { rates?: Record<string, number> };
        if (!data?.rates || typeof data.rates !== "object") return FALLBACK_CURRENCIES;
        return buildOptions(data.rates);
      } catch {
        return FALLBACK_CURRENCIES;
      }
    })();
  }
  return currenciesPromise;
}

/** Find an option by code, falling back to the base currency. */
export function findCurrency(list: CurrencyOption[], code: string): CurrencyOption {
  return list.find((c) => c.code === code) || list[0] || DEFAULT_CURRENCY;
}

// ---- Visitor's preferred / detected currency ----

const PREF_KEY = "yc_currency_code";

/** Read a manually chosen currency code from this browser, if any. */
function readPreferred(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(PREF_KEY) : null;
  } catch {
    return null;
  }
}

/** Remember the visitor's explicit currency choice for next time. */
export function setPreferredCurrency(code: string): void {
  try {
    if (typeof localStorage !== "undefined" && code) localStorage.setItem(PREF_KEY, code);
  } catch {
    /* ignore */
  }
}

/** Heuristic fallback using client timezone and locale when geo headers are absent (e.g. localhost). */
function guessBrowserCurrency(): string {
  try {
    const tz = (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
    if (/Calcutta|Kolkata/i.test(tz)) return "INR";
    if (/London/i.test(tz)) return "GBP";
    if (/Dubai|Muscat/i.test(tz)) return "AED";
    if (/Tokyo/i.test(tz)) return "JPY";
    if (/Sydney|Melbourne|Brisbane|Perth|Adelaide/i.test(tz)) return "AUD";
    if (/Toronto|Vancouver|Montreal|Calgary/i.test(tz)) return "CAD";
    if (/Singapore/i.test(tz)) return "SGD";
    if (/Auckland|Wellington/i.test(tz)) return "NZD";
    if (/Berlin|Paris|Rome|Madrid|Amsterdam|Brussels|Vienna|Dublin|Helsinki|Lisbon|Athens/i.test(tz)) return "EUR";
    if (/Europe/i.test(tz)) return "EUR";
    if (/America/i.test(tz)) return "USD";
    if (/Hong_Kong/i.test(tz)) return "HKD";
    if (/Seoul/i.test(tz)) return "KRW";
    if (/Riyadh/i.test(tz)) return "SAR";
    if (/Zurich/i.test(tz)) return "CHF";

    // Locale country fallback, e.g. "en-GB" -> GBP, "de-DE" -> EUR
    if (typeof navigator !== "undefined" && navigator.language) {
      const parts = navigator.language.split("-");
      if (parts[1]) {
        const c = currencyForCountry(parts[1]);
        if (c) return c;
      }
    }
  } catch {
    /* ignore */
  }
  return "INR";
}

let detectPromise: Promise<string> | null = null;

/** Guess the visitor's currency code from their location (cached per session). */
function detectCurrencyCode(): Promise<string> {
  if (!detectPromise) {
    detectPromise = (async () => {
      try {
        const res = await fetch("/api/currency?mode=detect", { headers: { accept: "application/json" } });
        if (res.ok) {
          const data = (await res.json()) as { currency?: string; country?: string };
          if (data?.currency) return data.currency;
          if (data?.country) return currencyForCountry(data.country);
        }
      } catch {
        /* ignore */
      }
      return guessBrowserCurrency();
    })();
  }
  return detectPromise;
}

/**
 * The currency to show a visitor by default: their explicit choice if they made
 * one, otherwise their geo-detected currency, otherwise INR. Resolves against
 * the live option list so the returned option carries the current rate.
 */
export async function getInitialCurrency(): Promise<CurrencyOption> {
  const list = await getCurrencies();
  const preferred = readPreferred();
  if (preferred) return findCurrency(list, preferred);
  try {
    const code = await detectCurrencyCode();
    return findCurrency(list, code);
  } catch {
    return findCurrency(list, BASE_CURRENCY);
  }
}

// ---- Amount maths (decimal aware) ----

function decimalsOf(currency: CurrencyOption | null | undefined): number {
  if (!currency) return 2;
  if (typeof currency.decimals === "number") return currency.decimals;
  return currencyDecimals(currency.code);
}

/** Convert an INR amount to the chosen currency, rounded to its minor unit. */
export function convertFromInr(inr: number, currency: CurrencyOption): number {
  const value = Number(inr) || 0;
  const factor = Math.pow(10, decimalsOf(currency));
  if (!currency || currency.code === BASE_CURRENCY) return Math.round(value * factor) / factor;
  const rate = Number(currency.rate) || 0;
  return Math.round(value * rate * factor) / factor;
}

/** Format an amount with the currency symbol, e.g. "$5.99", "₹499", "¥898". */
export function formatMoney(amount: number, currency: CurrencyOption): string {
  const value = Number(amount) || 0;
  const symbol = currency?.symbol || currency?.code || "";
  if (!currency || currency.code === BASE_CURRENCY) {
    // Rupees show as whole numbers with Indian grouping, to match the app.
    return `${symbol}${Math.round(value).toLocaleString("en-IN")}`;
  }
  const d = decimalsOf(currency);
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** Smallest-unit integer for Razorpay: amount * 10^decimals (paise, cents, ...). */
export function toSmallestUnit(amount: number, currency: CurrencyOption): number {
  const factor = Math.pow(10, decimalsOf(currency));
  return Math.round((Number(amount) || 0) * factor);
}
