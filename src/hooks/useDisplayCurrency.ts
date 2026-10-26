"use client";

import { useAuth } from "@/context/AuthContext";
import { currencyForCountry, type CurrencyCode } from "@/../config/currency";

/**
 * The currency prices are DISPLAYED in.
 * Signed-in user: their account country (fixed at signup).
 * Logged-out visitor: detected location from the afropitch_country cookie
 * (set by middleware from Vercel's country header).
 * Anything else, including an undetectable location: NGN.
 */
export function useDisplayCurrency(): CurrencyCode {
  const { user } = useAuth();
  if (user) return user.currency;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)afropitch_country=([^;]*)/);
    if (match) return currencyForCountry(decodeURIComponent(match[1]));
  }
  return "NGN";
}

/** Detected ISO country code for a logged-out visitor, or null. */
export function getDetectedCountry(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)afropitch_country=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
