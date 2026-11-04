/**
 * Currency catalog, the full set of currencies Razorpay accepts for
 * international checkout (129 codes), plus the data needed to price and format
 * in each one and to guess a visitor's currency from their country.
 *
 * Three things live here and nothing here ever calls the network:
 *  - CURRENCY_META: display symbol, name and ISO 4217 minor-unit exponent
 *    (decimals) per code. The exponent drives BOTH how we format the amount and
 *    the integer we hand Razorpay (amount * 10^decimals).
 *  - FALLBACK_USD: units of the currency per 1 USD. Used only when the live
 *    rates feed is unreachable, so amounts stay sensible offline. Live rates
 *    (see api/currency/rates.ts) override these whenever available.
 *  - COUNTRY_CURRENCY: ISO 3166-1 alpha-2 country -> currency code, for the
 *    geo default. Anything unmapped falls back to USD; no country falls back
 *    to INR (that is the base and the pre-detection default).
 *
 * INR is the pricing base. Every rate elsewhere is expressed as "foreign units
 * per one INR"; see currency.ts. INR keeps decimals: 2 so the Razorpay charge
 * is paise (value * 100) even though we display whole rupees.
 */

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  /** ISO 4217 minor-unit exponent: 0 (e.g. JPY), 2 (most), or 3 (e.g. KWD). */
  decimals: number;
}

/** Currencies whose ISO minor unit is 0 (no fractional part). */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
/** Currencies whose ISO minor unit is 3 (thousandths). */
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]);

function decimalsFor(code: string): number {
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/**
 * code -> [symbol, name, unitsPerUsd]. Decimals are derived from the ISO sets
 * above. unitsPerUsd is an approximate fallback used only when the live feed is
 * down; INR is 85 per USD by definition here so the derived INR rate is 1.
 */
const RAW: Record<string, [string, string, number]> = {
  INR: ["₹", "Indian Rupee", 85],
  AED: ["د.إ", "Emirati Dirham", 3.67],
  ALL: ["L", "Albanian Lek", 92],
  AMD: ["֏", "Armenian Dram", 388],
  ARS: ["$", "Argentine Peso", 1000],
  AUD: ["A$", "Australian Dollar", 1.52],
  AWG: ["ƒ", "Aruban Guilder", 1.79],
  AZN: ["₼", "Azerbaijani Manat", 1.7],
  BAM: ["KM", "Convertible Mark", 1.8],
  BBD: ["$", "Barbadian Dollar", 2],
  BDT: ["৳", "Bangladeshi Taka", 120],
  BGN: ["лв", "Bulgarian Lev", 1.8],
  BHD: [".د.ب", "Bahraini Dinar", 0.376],
  BIF: ["FBu", "Burundi Franc", 2900],
  BMD: ["$", "Bermudian Dollar", 1],
  BND: ["B$", "Bruneian Dollar", 1.35],
  BOB: ["Bs.", "Bolivian Boliviano", 6.9],
  BRL: ["R$", "Brazilian Real", 5.5],
  BSD: ["$", "Bahamian Dollar", 1],
  BTN: ["Nu.", "Bhutanese Ngultrum", 85],
  BWP: ["P", "Botswana Pula", 13.6],
  BZD: ["BZ$", "Belize Dollar", 2],
  CAD: ["C$", "Canadian Dollar", 1.38],
  CHF: ["Fr", "Swiss Franc", 0.9],
  CLP: ["$", "Chilean Peso", 950],
  CNY: ["¥", "Chinese Yuan", 7.2],
  COP: ["$", "Colombian Peso", 4100],
  CRC: ["₡", "Costa Rican Colon", 515],
  CUP: ["$", "Cuban Peso", 24],
  CVE: ["$", "Cabo Verde Escudo", 101],
  CZK: ["Kč", "Czech Koruna", 23],
  DJF: ["Fdj", "Djibouti Franc", 178],
  DKK: ["kr", "Danish Krone", 6.9],
  DOP: ["RD$", "Dominican Peso", 60],
  DZD: ["دج", "Algerian Dinar", 134],
  EGP: ["£", "Egyptian Pound", 49],
  ETB: ["Br", "Ethiopian Birr", 126],
  EUR: ["€", "Euro", 0.92],
  FJD: ["FJ$", "Fijian Dollar", 2.25],
  GBP: ["£", "British Pound", 0.79],
  GHS: ["₵", "Ghanaian Cedi", 15],
  GIP: ["£", "Gibraltar Pound", 0.79],
  GMD: ["D", "Gambian Dalasi", 71],
  GNF: ["FG", "Guinea Franc", 8600],
  GTQ: ["Q", "Guatemalan Quetzal", 7.7],
  GYD: ["G$", "Guyanese Dollar", 209],
  HKD: ["HK$", "Hong Kong Dollar", 7.8],
  HNL: ["L", "Honduran Lempira", 25],
  HRK: ["kn", "Croatian Kuna", 6.9],
  HTG: ["G", "Haitian Gourde", 132],
  HUF: ["Ft", "Hungarian Forint", 360],
  IDR: ["Rp", "Indonesian Rupiah", 16000],
  ILS: ["₪", "Israeli Shekel", 3.7],
  IQD: ["ع.د", "Iraqi Dinar", 1310],
  ISK: ["kr", "Iceland Krona", 138],
  JMD: ["J$", "Jamaican Dollar", 157],
  JOD: ["د.ا", "Jordanian Dinar", 0.71],
  JPY: ["¥", "Japanese Yen", 150],
  KES: ["KSh", "Kenyan Shilling", 129],
  KGS: ["с", "Kyrgyzstani Som", 87],
  KHR: ["៛", "Cambodian Riel", 4050],
  KMF: ["CF", "Comorian Franc", 452],
  KRW: ["₩", "South Korean Won", 1350],
  KWD: ["د.ك", "Kuwaiti Dinar", 0.307],
  KYD: ["$", "Caymanian Dollar", 0.83],
  KZT: ["₸", "Kazakhstani Tenge", 480],
  LAK: ["₭", "Lao Kip", 21500],
  LKR: ["Rs", "Sri Lankan Rupee", 295],
  LRD: ["L$", "Liberian Dollar", 190],
  LSL: ["L", "Lesotho Loti", 18],
  MAD: ["د.م.", "Moroccan Dirham", 9.9],
  MDL: ["L", "Moldovan Leu", 17.8],
  MGA: ["Ar", "Malagasy Ariary", 4600],
  MKD: ["ден", "Macedonian Denar", 57],
  MMK: ["K", "Burmese Kyat", 2100],
  MNT: ["₮", "Mongolian Tughrik", 3400],
  MOP: ["MOP$", "Macau Pataca", 8],
  MUR: ["₨", "Mauritian Rupee", 46],
  MVR: [".ރ", "Maldivian Rufiyaa", 15.4],
  MWK: ["MK", "Malawian Kwacha", 1730],
  MXN: ["$", "Mexican Peso", 18.5],
  MYR: ["RM", "Malaysian Ringgit", 4.5],
  MZN: ["MT", "Mozambique Metical", 63.5],
  NAD: ["N$", "Namibian Dollar", 18],
  NGN: ["₦", "Nigerian Naira", 1550],
  NIO: ["C$", "Nicaraguan Cordoba", 36.7],
  NOK: ["kr", "Norwegian Krone", 10.7],
  NPR: ["रू", "Nepalese Rupee", 136],
  NZD: ["NZ$", "New Zealand Dollar", 1.66],
  OMR: ["ر.ع.", "Omani Rial", 0.385],
  PEN: ["S/", "Peruvian Sol", 3.75],
  PGK: ["K", "Papua New Guinean Kina", 3.9],
  PHP: ["₱", "Philippine Peso", 58],
  PKR: ["₨", "Pakistani Rupee", 278],
  PLN: ["zł", "Polish Zloty", 3.95],
  PYG: ["₲", "Paraguayan Guarani", 7600],
  QAR: ["ر.ق", "Qatari Riyal", 3.64],
  RON: ["lei", "Romanian Leu", 4.6],
  RSD: ["дин", "Serbian Dinar", 108],
  RUB: ["₽", "Russian Ruble", 92],
  RWF: ["FRw", "Rwandan Franc", 1350],
  SAR: ["ر.س", "Saudi Riyal", 3.75],
  SCR: ["₨", "Seychellois Rupee", 13.5],
  SEK: ["kr", "Swedish Krona", 10.5],
  SGD: ["S$", "Singapore Dollar", 1.35],
  SOS: ["Sh", "Somali Shilling", 571],
  SSP: ["£", "South Sudanese Pound", 3000],
  SVC: ["₡", "Salvadoran Colon", 8.75],
  SZL: ["E", "Swazi Lilangeni", 18],
  THB: ["฿", "Thai Baht", 34],
  TND: ["د.ت", "Tunisian Dinar", 3.1],
  TRY: ["₺", "Turkish Lira", 34],
  TTD: ["TT$", "Trinidad Dollar", 6.8],
  TWD: ["NT$", "New Taiwan Dollar", 32],
  TZS: ["TSh", "Tanzanian Shilling", 2650],
  UAH: ["₴", "Ukrainian Hryvnia", 41],
  UGX: ["USh", "Ugandan Shilling", 3700],
  USD: ["$", "US Dollar", 1],
  UYU: ["$U", "Uruguayan Peso", 42],
  UZS: ["so'm", "Uzbekistani Som", 12800],
  VND: ["₫", "Vietnamese Dong", 25400],
  VUV: ["VT", "Vanuatu Vatu", 120],
  XAF: ["FCFA", "Central African CFA Franc", 605],
  XCD: ["EC$", "East Caribbean Dollar", 2.7],
  XOF: ["CFA", "West African CFA Franc", 605],
  XPF: ["₣", "CFP Franc", 110],
  YER: ["﷼", "Yemeni Rial", 250],
  ZAR: ["R", "South African Rand", 18],
  ZMW: ["ZK", "Zambian Kwacha", 27],
};

/** Full metadata list, INR first then alphabetical by code. */
export const CURRENCY_META: CurrencyMeta[] = Object.entries(RAW)
  .map(([code, [symbol, name]]) => ({ code, symbol, name, decimals: decimalsFor(code) }))
  .sort((a, b) => (a.code === "INR" ? -1 : b.code === "INR" ? 1 : a.code.localeCompare(b.code)));

/** code -> units per USD (approximate; live feed overrides). */
export const FALLBACK_USD: Record<string, number> = Object.fromEntries(
  Object.entries(RAW).map(([code, [, , usd]]) => [code, usd]),
);

const INR_PER_USD = FALLBACK_USD.INR; // 85

/** code -> foreign units per one INR, derived from FALLBACK_USD. INR = 1. */
export const FALLBACK_RATES_PER_INR: Record<string, number> = Object.fromEntries(
  Object.entries(FALLBACK_USD).map(([code, usd]) => [code, usd / INR_PER_USD]),
);

/** Quick lookup for decimals by code (defaults to 2 for unknown codes). */
export function currencyDecimals(code: string): number {
  const found = CURRENCY_META.find((c) => c.code === code);
  return found ? found.decimals : 2;
}

/**
 * ISO 3166-1 alpha-2 country -> currency code. Eurozone members all map to EUR.
 * Countries not listed fall back to USD at the call site.
 */
export const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD", UM: "USD", EC: "USD", SV: "SVC", PA: "USD",
  GB: "GBP", GI: "GIP",
  // Eurozone
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR",
  GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR", HR: "EUR", AD: "EUR",
  MC: "EUR", SM: "EUR", VA: "EUR", ME: "EUR", XK: "EUR",
  // Rest of world
  AE: "AED", AL: "ALL", AM: "AMD", AR: "ARS", AU: "AUD", AW: "AWG", AZ: "AZN",
  BA: "BAM", BB: "BBD", BD: "BDT", BG: "BGN", BH: "BHD", BI: "BIF", BM: "BMD",
  BN: "BND", BO: "BOB", BR: "BRL", BS: "BSD", BT: "BTN", BW: "BWP", BZ: "BZD",
  CA: "CAD", CH: "CHF", LI: "CHF", CL: "CLP", CN: "CNY", CO: "COP", CR: "CRC",
  CU: "CUP", CV: "CVE", CZ: "CZK", DJ: "DJF", DK: "DKK", FO: "DKK", GL: "DKK",
  DO: "DOP", DZ: "DZD", EG: "EGP", ET: "ETB", FJ: "FJD", GH: "GHS", GM: "GMD",
  GN: "GNF", GT: "GTQ", GY: "GYD", HK: "HKD", HN: "HNL", HT: "HTG", HU: "HUF",
  ID: "IDR", IL: "ILS", PS: "ILS", IQ: "IQD", IS: "ISK", JM: "JMD", JO: "JOD",
  JP: "JPY", KE: "KES", KG: "KGS", KH: "KHR", KM: "KMF", KR: "KRW", KW: "KWD",
  KY: "KYD", KZ: "KZT", LA: "LAK", LK: "LKR", LR: "LRD", LS: "LSL", MA: "MAD",
  EH: "MAD", MD: "MDL", MG: "MGA", MK: "MKD", MM: "MMK", MN: "MNT", MO: "MOP",
  MU: "MUR", MV: "MVR", MW: "MWK", MX: "MXN", MY: "MYR", MZ: "MZN", NA: "NAD",
  NG: "NGN", NI: "NIO", NO: "NOK", NP: "NPR", NZ: "NZD", CK: "NZD", NU: "NZD",
  OM: "OMR", PE: "PEN", PG: "PGK", PH: "PHP", PK: "PKR", PL: "PLN", PY: "PYG",
  QA: "QAR", RO: "RON", RS: "RSD", RU: "RUB", RW: "RWF", SA: "SAR", SC: "SCR",
  SE: "SEK", SG: "SGD", SO: "SOS", SS: "SSP", SZ: "SZL", TH: "THB", TN: "TND",
  TR: "TRY", TT: "TTD", TW: "TWD", TZ: "TZS", UA: "UAH", UG: "UGX", UY: "UYU",
  UZ: "UZS", VN: "VND", VU: "VUV", YE: "YER", ZA: "ZAR", NA_: "NAD", ZM: "ZMW",
  // CFA franc zones
  CM: "XAF", CF: "XAF", CG: "XAF", TD: "XAF", GQ: "XAF", GA: "XAF",
  BJ: "XOF", BF: "XOF", CI: "XOF", GW: "XOF", ML: "XOF", NE: "XOF", SN: "XOF", TG: "XOF",
  PF: "XPF", NC: "XPF", WF: "XPF",
  AG: "XCD", DM: "XCD", GD: "XCD", KN: "XCD", LC: "XCD", VC: "XCD", AI: "XCD", MS: "XCD",
};

/** Map an ISO2 country to a currency code, defaulting to USD when unknown. */
export function currencyForCountry(country?: string | null): string {
  if (!country) return "USD";
  return COUNTRY_CURRENCY[country.toUpperCase()] || "USD";
}
