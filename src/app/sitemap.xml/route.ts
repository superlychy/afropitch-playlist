import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const baseUrl = "https://afropitchplay.best";
  const now = new Date().toISOString();

  // Every URL carries its own real last-modified date so Google can spot
  // new and updated pages on its regular sitemap check. No manual
  // "request indexing" needed per artist or event.
  const routes: { url: string; priority: string; changefreq: string; lastmod: string }[] = [
    { url: "/", priority: "1.0", changefreq: "daily", lastmod: now },
    { url: "/playlists", priority: "0.9", changefreq: "daily", lastmod: now },
    { url: "/pricing", priority: "0.9", changefreq: "weekly", lastmod: now },
    { url: "/mixing", priority: "0.9", changefreq: "weekly", lastmod: now },
    { url: "/featured", priority: "0.8", changefreq: "weekly", lastmod: now },
    { url: "/events", priority: "0.8", changefreq: "weekly", lastmod: now },
    { url: "/mixed", priority: "0.8", changefreq: "weekly", lastmod: now },
    { url: "/how-it-works", priority: "0.8", changefreq: "monthly", lastmod: now },
    { url: "/trust", priority: "0.8", changefreq: "monthly", lastmod: now },
    { url: "/contact", priority: "0.7", changefreq: "monthly", lastmod: now },
    { url: "/curators", priority: "0.8", changefreq: "weekly", lastmod: now },
    { url: "/curators/join", priority: "0.7", changefreq: "monthly", lastmod: now },
    { url: "/terms", priority: "0.3", changefreq: "yearly", lastmod: now },
    { url: "/privacy", priority: "0.3", changefreq: "yearly", lastmod: now },
  ];

  const asIso = (v: unknown): string => {
    if (typeof v === "string" && v) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return now;
  };

  // Public playlist pages (SEO: one URL per playlist)
  try {
    const sbPl = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: pls } = await sbPl.from("playlists").select("id, created_at, tracks_synced_at").limit(500);
    for (const row of pls ?? []) {
      const pid = (row as { id: string }).id;
      const r = row as { created_at?: string; tracks_synced_at?: string };
      const lastmod = [r.tracks_synced_at, r.created_at].find(Boolean);
      if (pid) routes.push({ url: `/playlist/${pid}`, priority: "0.8", changefreq: "daily", lastmod: asIso(lastmod) });
    }
  } catch {
    // sitemap still serves the static routes if the DB lookup fails
  }

  // Published featured-artist pages (SEO: one URL per artist)
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb
      .from("featured_artists")
      .select("slug, created_at, questionnaire_completed_at")
      .eq("status", "published")
      .not("slug", "is", null);
    for (const row of data ?? []) {
      const slug = (row as { slug: string }).slug;
      const r = row as { created_at?: string; questionnaire_completed_at?: string };
      const lastmod = [r.questionnaire_completed_at, r.created_at].find(Boolean);
      if (slug) routes.push({ url: `/featured/${slug}`, priority: "0.7", changefreq: "monthly", lastmod: asIso(lastmod) });
    }
  } catch {
    // sitemap still serves the static routes if the DB lookup fails
  }

  // Published event pages (SEO: one URL per event)
  try {
    const sbEv = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: evs } = await sbEv
      .from("events")
      .select("slug, created_at")
      .eq("status", "published")
      .not("slug", "is", null);
    for (const row of evs ?? []) {
      const slug = (row as { slug: string }).slug;
      const r = row as { created_at?: string };
      if (slug) routes.push({ url: `/events/${slug}`, priority: "0.7", changefreq: "weekly", lastmod: asIso(r.created_at) });
    }
  } catch {
    // sitemap still serves the static routes if the DB lookup fails
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${routes
  .map(
    (r) => `  <url>
    <loc>${baseUrl}${r.url}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  ).join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
