"use client";

import { CURRENCIES, formatMoney } from "@/../config/currency";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";

export type PriceKey =
  | "standard"
  | "express"
  | "exclusive"
  | "demo"
  | "full"
  | "master"
  | "referral"
  | "payoutMin";

/**
 * A price rendered in the viewer's display currency: the signed-in user's
 * account currency, or a logged-out visitor's detected location (NGN when
 * undetectable). Lets server-rendered public pages show local prices.
 */
export function DisplayPrice({ k }: { k: PriceKey }) {
  const currency = useDisplayCurrency();
  return <>{formatMoney(CURRENCIES[currency].prices[k], currency)}</>;
}
