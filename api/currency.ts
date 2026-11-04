import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Currency helper endpoint. One function, two modes (kept together to stay well
 * under the serverless-function budget):
 *
 *   GET /api/currency?mode=rates   -> live INR-based exchange rates
 *   GET /api/currency?mode=detect  -> the visitor's currency from their country
 *
 * Neither mode reads user data or mutates anything. Rates come from a free,
 * no-key feed (open.er-api.com), cached in memory for six hours with an
 * approximate static fallback so pricing never breaks. Detection uses Vercel's
 * edge `x-vercel-ip-country` header, so no external geo call is made.
 */

// Approximate units-per-USD fallback, mirrored from src/lib/currency-catalog.ts.
const FALLBACK_USD: Record<string, number> = {
  INR: 85, AED: 3.67, ALL: 92, AMD: 388, ARS: 1000, AUD: 1.52, AWG: 1.79,
  AZN: 1.7, BAM: 1.8, BBD: 2, BDT: 120, BGN: 1.8, BHD: 0.376, BIF: 2900,
  BMD: 1, BND: 1.35, BOB: 6.9, BRL: 5.5, BSD: 1, BTN: 85, BWP: 13.6, BZD: 2,
  CAD: 1.38, CHF: 0.9, CLP: 950, CNY: 7.2, COP: 4100, CRC: 515, CUP: 24,
  CVE: 101, CZK: 23, DJF: 178, DKK: 6.9, DOP: 60, DZD: 134, EGP: 49, ETB: 126,
  EUR: 0.92, FJD: 2.25, GBP: 0.79, GHS: 15, GIP: 0.79, GMD: 71, GNF: 8600,
  GTQ: 7.7, GYD: 209, HKD: 7.8, HNL: 25, HRK: 6.9, HTG: 132, HUF: 360,
  IDR: 16000, ILS: 3.7, IQD: 1310, ISK: 138, JMD: 157, JOD: 0.71, JPY: 150,
  KES: 129, KGS: 87, KHR: 4050, KMF: 452, KRW: 1350, KWD: 0.307, KYD: 0.83,
  KZT: 480, LAK: 21500, LKR: 295, LRD: 190, LSL: 18, MAD: 9.9, MDL: 17.8,
  MGA: 4600, MKD: 57, MMK: 2100, MNT: 3400, MOP: 8, MUR: 46, MVR: 15.4,
  MWK: 1730, MXN: 18.5, MYR: 4.5, MZN: 63.5, NAD: 18, NGN: 1550, NIO: 36.7,
  NOK: 10.7, NPR: 136, NZD: 1.66, OMR: 0.385, PEN: 3.75, PGK: 3.9, PHP: 58,
  PKR: 278, PLN: 3.95, PYG: 7600, QAR: 3.64, RON: 4.6, RSD: 108, RUB: 92,
  RWF: 1350, SAR: 3.75, SCR: 13.5, SEK: 10.5, SGD: 1.35, SOS: 571, SSP: 3000,
  SVC: 8.75, SZL: 18, THB: 34, TND: 3.1, TRY: 34, TTD: 6.8, TWD: 32, TZS: 2650,
  UAH: 41, UGX: 3700, USD: 1, UYU: 42, UZS: 12800, VND: 25400, VUV: 120,
  XAF: 605, XCD: 2.7, XOF: 605, XPF: 110, YER: 250, ZAR: 18, ZMW: 27,
};
const SUPPORTED = Object.keys(FALLBACK_USD);

function fallbackRates(): Record<string, number> {
  const inrPerUsd = FALLBACK_USD.INR;
  const out: Record<string, number> = {};
  for (const [code, usd] of Object.entries(FALLBACK_USD)) out[code] = usd / inrPerUsd;
  return out;
}

// ISO2 country -> currency code. Eurozone all map to EUR. Unknown -> USD.
const COUNTRY_CURRENCY: Record<string, string> = {
  IN: 'INR', US: 'USD', UM: 'USD', PA: 'USD', SV: 'SVC', GB: 'GBP', GI: 'GIP',
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR', DE: 'EUR',
  GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR',
  NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR', HR: 'EUR', AD: 'EUR',
  MC: 'EUR', SM: 'EUR', VA: 'EUR', ME: 'EUR', XK: 'EUR',
  AE: 'AED', AL: 'ALL', AM: 'AMD', AR: 'ARS', AU: 'AUD', AW: 'AWG', AZ: 'AZN',
  BA: 'BAM', BB: 'BBD', BD: 'BDT', BG: 'BGN', BH: 'BHD', BI: 'BIF', BM: 'BMD',
  BN: 'BND', BO: 'BOB', BR: 'BRL', BS: 'BSD', BT: 'BTN', BW: 'BWP', BZ: 'BZD',
  CA: 'CAD', CH: 'CHF', LI: 'CHF', CL: 'CLP', CN: 'CNY', CO: 'COP', CR: 'CRC',
  CU: 'CUP', CV: 'CVE', CZ: 'CZK', DJ: 'DJF', DK: 'DKK', FO: 'DKK', GL: 'DKK',
  DO: 'DOP', DZ: 'DZD', EG: 'EGP', ET: 'ETB', FJ: 'FJD', GH: 'GHS', GM: 'GMD',
  GN: 'GNF', GT: 'GTQ', GY: 'GYD', HK: 'HKD', HN: 'HNL', HT: 'HTG', HU: 'HUF',
  ID: 'IDR', IL: 'ILS', PS: 'ILS', IQ: 'IQD', IS: 'ISK', JM: 'JMD', JO: 'JOD',
  JP: 'JPY', KE: 'KES', KG: 'KGS', KH: 'KHR', KM: 'KMF', KR: 'KRW', KW: 'KWD',
  KY: 'KYD', KZ: 'KZT', LA: 'LAK', LK: 'LKR', LR: 'LRD', LS: 'LSL', MA: 'MAD',
  EH: 'MAD', MD: 'MDL', MG: 'MGA', MK: 'MKD', MM: 'MMK', MN: 'MNT', MO: 'MOP',
  MU: 'MUR', MV: 'MVR', MW: 'MWK', MX: 'MXN', MY: 'MYR', MZ: 'MZN', NA: 'NAD',
  NG: 'NGN', NI: 'NIO', NO: 'NOK', NP: 'NPR', NZ: 'NZD', CK: 'NZD', NU: 'NZD',
  OM: 'OMR', PE: 'PEN', PG: 'PGK', PH: 'PHP', PK: 'PKR', PL: 'PLN', PY: 'PYG',
  QA: 'QAR', RO: 'RON', RS: 'RSD', RU: 'RUB', RW: 'RWF', SA: 'SAR', SC: 'SCR',
  SE: 'SEK', SG: 'SGD', SO: 'SOS', SS: 'SSP', SZ: 'SZL', TH: 'THB', TN: 'TND',
  TR: 'TRY', TT: 'TTD', TW: 'TWD', TZ: 'TZS', UA: 'UAH', UG: 'UGX', UY: 'UYU',
  UZ: 'UZS', VN: 'VND', VU: 'VUV', YE: 'YER', ZA: 'ZAR', ZM: 'ZMW',
  CM: 'XAF', CF: 'XAF', CG: 'XAF', TD: 'XAF', GQ: 'XAF', GA: 'XAF',
  BJ: 'XOF', BF: 'XOF', CI: 'XOF', GW: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF',
  PF: 'XPF', NC: 'XPF', WF: 'XPF',
  AG: 'XCD', DM: 'XCD', GD: 'XCD', KN: 'XCD', LC: 'XCD', VC: 'XCD', AI: 'XCD', MS: 'XCD',
};

let cache: { rates: Record<string, number>; source: string; updatedAt: string; at: number } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

export async function getRates() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  let rates = fallbackRates();
  let source = 'fallback';
  let updatedAt = new Date().toISOString();
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/INR', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const data = (await r.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
      if (data.result === 'success' && data.rates && typeof data.rates.INR === 'number') {
        const live: Record<string, number> = { INR: 1 };
        for (const code of SUPPORTED) {
          const v = data.rates[code];
          if (typeof v === 'number' && v > 0) live[code] = v;
          else if (code !== 'INR') live[code] = rates[code];
        }
        rates = live;
        source = 'open.er-api.com';
        updatedAt = data.time_last_update_utc || updatedAt;
      }
    }
  } catch {
    /* keep fallback */
  }
  cache = { rates, source, updatedAt, at: Date.now() };
  return cache;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const mode = String(req.query.mode || 'rates').toLowerCase();

  if (mode === 'detect') {
    const raw = (req.headers['x-vercel-ip-country'] as string) || '';
    const country = raw.toUpperCase();
    const currency = country ? COUNTRY_CURRENCY[country] || 'USD' : 'INR';
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).json({ country: country || null, currency });
  }

  // Default: rates.
  const c = await getRates();
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600');
  return res.status(200).json({ base: 'INR', rates: c.rates, source: c.source, updatedAt: c.updatedAt });
}
