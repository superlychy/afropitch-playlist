// Multi-currency pricing (approved 2026-10-26, Path A).
//
// Model: every price the user SEES is in their own currency, from fixed
// clean round numbers below. Paystack ALWAYS charges naira: card, Apple Pay
// and Google Pay all run on the buyer's card and the bank converts.
// The wallet, referral balance and payout minimum are all denominated in
// the user's currency.
//
// Currency follows the country on the account (fixed for the account's
// life; changing country means re-registering). Visitors who have not
// signed up see prices for their detected location. Any country not in
// the list below sees naira.
//
// The same tables live in Postgres (currency_prices, see migration
// 20261026210000) so the server-side money functions price identically.
// Keep the two in sync: changing a number here means changing it there.

export type CurrencyCode = "NGN" | "USD" | "ZAR" | "GHS" | "KES" | "XAF" | "TZS";

export interface CurrencyPrices {
  standard: number;
  express: number;
  exclusive: number;
  demoPolish: number;
  fullMix: number;
  mixMaster: number;
  referral: number;
  payoutMin: number;
}

export interface CurrencyDef {
  code: CurrencyCode;
  symbol: string;
  /** Naira per 1 unit of this currency (mid-market, Oct 2026). Used only
   *  for arbitrary amounts (wallet top-ups, refunds of NGN orders). Fixed
   *  prices above always win for tiers, packages, referral and payouts. */
  ngnPerUnit: number;
  /** ISO alpha-2 country codes that display in this currency. */
  countries: string[];
  prices: CurrencyPrices;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    ngnPerUnit: 1,
    countries: ["NG"],
    prices: {
      standard: 3000,
      express: 5000,
      exclusive: 13500,
      demoPolish: 35000,
      fullMix: 65000,
      mixMaster: 100000,
      referral: 1000,
      payoutMin: 5000,
    },
  },
  USD: {
    code: "USD",
    symbol: "$",
    ngnPerUnit: 1350,
    countries: ["US"],
    prices: {
      standard: 2,
      express: 4,
      exclusive: 10,
      demoPolish: 26,
      fullMix: 48,
      mixMaster: 74,
      referral: 1,
      payoutMin: 4,
    },
  },
  ZAR: {
    code: "ZAR",
    symbol: "R",
    ngnPerUnit: 81,
    countries: ["ZA"],
    prices: {
      standard: 35,
      express: 60,
      exclusive: 165,
      demoPolish: 430,
      fullMix: 800,
      mixMaster: 1250,
      referral: 10,
      payoutMin: 60,
    },
  },
  GHS: {
    code: "GHS",
    symbol: "₵",
    ngnPerUnit: 116,
    countries: ["GH"],
    prices: {
      standard: 25,
      express: 45,
      exclusive: 115,
      demoPolish: 300,
      fullMix: 560,
      mixMaster: 860,
      referral: 10,
      payoutMin: 45,
    },
  },
  KES: {
    code: "KES",
    symbol: "KSh",
    ngnPerUnit: 10.4,
    countries: ["KE"],
    prices: {
      standard: 300,
      express: 500,
      exclusive: 1300,
      demoPolish: 3400,
      fullMix: 6250,
      mixMaster: 9600,
      referral: 100,
      payoutMin: 500,
    },
  },
  XAF: {
    code: "XAF",
    symbol: "FCFA ",
    ngnPerUnit: 2.29,
    countries: ["CM"],
    prices: {
      standard: 1300,
      express: 2200,
      exclusive: 5900,
      demoPolish: 15300,
      fullMix: 28400,
      mixMaster: 43700,
      referral: 450,
      payoutMin: 2200,
    },
  },
  TZS: {
    code: "TZS",
    symbol: "TSh ",
    ngnPerUnit: 0.509,
    countries: ["TZ"],
    prices: {
      standard: 6000,
      express: 10000,
      exclusive: 26500,
      demoPolish: 68500,
      fullMix: 127500,
      mixMaster: 196000,
      referral: 2000,
      payoutMin: 10000,
    },
  },
};

/** ISO country code -> display currency. Anything unlisted falls back to NGN. */
export function currencyForCountry(
  country: string | null | undefined
): CurrencyCode {
  if (!country) return "NGN";
  const code = country.trim().toUpperCase();
  for (const def of Object.values(CURRENCIES)) {
    if (def.countries.includes(code)) return def.code;
  }
  return "NGN";
}

/** Countries offered on the signup country selector. "OTHER" maps to NGN. */
export const SIGNUP_COUNTRIES: { code: string; label: string }[] = [
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
  { code: "GH", label: "Ghana" },
  { code: "KE", label: "Kenya" },
  { code: "CM", label: "Cameroon" },
  { code: "TZ", label: "Tanzania" },
  { code: "US", label: "United States" },
  { code: "OTHER", label: "Another country" },
];

/** Country codes the signup selector accepts as a priced country. */
export const PRICED_COUNTRY_CODES = new Set([
  "NG",
  "ZA",
  "GH",
  "KE",
  "CM",
  "TZ",
  "US",
]);

export function formatMoney(amount: number, code: CurrencyCode): string {
  const def = CURRENCIES[code];
  const n = Number(amount) || 0;
  const text = Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${def.symbol}${text}`;
}

/** Convert a naira amount to the user's currency at the fixed table rate.
 *  Cent-using currencies keep 2 decimals; the rest round to whole units. */
export function ngnToLocal(ngn: number, code: CurrencyCode): number {
  if (code === "NGN") return Math.round(ngn);
  const v = ngn / CURRENCIES[code].ngnPerUnit;
  return code === "USD" || code === "ZAR" || code === "GHS"
    ? Math.round(v * 100) / 100
    : Math.round(v);
}

/** Convert a user-currency amount to the naira amount Paystack charges. */
export function localToNgn(local: number, code: CurrencyCode): number {
  if (code === "NGN") return Math.round(local);
  return Math.round(local * CURRENCIES[code].ngnPerUnit);
}

/** Convert an amount between two currencies at the fixed table rates. */
export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;
  const ngn = amount * CURRENCIES[from].ngnPerUnit;
  const v = ngn / CURRENCIES[to].ngnPerUnit;
  return to === "USD" || to === "ZAR" || to === "GHS"
    ? Math.round(v * 100) / 100
    : Math.round(v);
}

/**
 * The fee for one playlist, mirroring the server-side submit_with_payment
 * RPC exactly: a playlist whose type is exclusive/express/free fixes the
 * price; any other playlist uses the tier the artist picked.
 */
export function priceForPlaylist(
  playlistType: string | null | undefined,
  pickedTier: string | null | undefined,
  code: CurrencyCode
): number {
  const p = CURRENCIES[code].prices;
  if (playlistType === "exclusive") return p.exclusive;
  if (playlistType === "express") return p.express;
  if (playlistType === "free") return 0;
  if (pickedTier === "exclusive") return p.exclusive;
  if (pickedTier === "express") return p.express;
  return p.standard;
}

/** Mixing package display price, keyed by the package name in the DB. */
export function mixingPackagePrice(
  packageName: string,
  code: CurrencyCode
): number | null {
  const p = CURRENCIES[code].prices;
  const name = (packageName || "").toLowerCase();
  if (name.includes("demo")) return p.demoPolish;
  if (name.includes("master")) return p.mixMaster;
  if (name.includes("full")) return p.fullMix;
  return null;
}
