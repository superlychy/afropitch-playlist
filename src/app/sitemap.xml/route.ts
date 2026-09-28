import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const baseUrl = "https://afropitchplay.best";
  const now = new Date().toISOString();

  const routes = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/playlists", priority: "0.9", changefreq: "daily" },
    { url: "/pricing", priority: "0.9", changefreq: "weekly" },
    { url: "/mixing", priority: "0.9", changefreq: "weekly" },
    { url: "/featured", priority: "0.8", changefreq: "weekly" },
    { url: "/mixed", priority: "0.8", changefreq: "weekly" },
    { url: "/how-it-works", priority: "0.8", changefreq: "monthly" },
    { url: "/trust", priority: "0.8", changefreq: "monthly" },
    { url: "/contact", priority: "0.7", changefreq: "monthly" },
    { url: "/curators/join", priority: "0.7", changefreq: "monthly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
  ];

  // Public playlist pages (SEO: one URL per playlist)
  try {
    const sbPl = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: pls } = await sbPl.from("playlists").select("id").limit(500);
    for (const row of pls ?? []) {
      const pid = (row as { id: string }).id;
      if (pid) routes.push({ url: `/playlist/${pid}`, priority: "0.8", changefreq: "daily" });
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
      .select("slug")
      .eq("status", "published")
      .not("slug", "is", null);
    for (const row of data ?? []) {
      const slug = (row as { slug: string }).slug;
      if (slug) routes.push({ url: `/featured/${slug}`, priority: "0.7", changefreq: "monthly" });
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
    <lastmod>${now}</lastmod>
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
