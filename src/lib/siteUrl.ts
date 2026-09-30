// Canonical public origin for share/copy/QR smart-link URLs.
// Production uses the custom domain; preview deployments use their own
// Vercel URL so copied links and QR codes work on the deployment you are
// actually viewing. NEXT_PUBLIC_SITE_URL overrides everything when set.
export function siteUrl(): string {
  const override = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  if (override) return override;
  if (process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://afropitchplay.best";
}
