import { redirect } from "next/navigation";

// /submit merged into /playlists (Max, 2026-10-20): one page for browsing,
// selecting and submitting. Every existing /submit link (pricing tiers,
// dashboards, curator profiles, homepage CTAs) keeps working — all query
// params (playlists, playlist, tier) are carried over untouched.
export default async function SubmitRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value))
      value.forEach((item) => qs.append(key, item));
  }
  const query = qs.toString();
  redirect(query ? `/playlists?${query}` : "/playlists");
}
