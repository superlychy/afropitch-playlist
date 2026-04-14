import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://afropitchplay.best";
  const now = new Date().toISOString();

  const routes = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/playlists", priority: "0.9", changefreq: "daily" },
    { url: "/pricing", priority: "0.9", changefreq: "weekly" },
    { url: "/how-it-works", priority: "0.8", changefreq: "monthly" },
    { url: "/trust", priority: "0.8", changefreq: "monthly" },
    { url: "/submit", priority: "0.8", changefreq: "weekly" },
    { url: "/portal", priority: "0.8", changefreq: "monthly" },
    { url: "/contact", priority: "0.7", changefreq: "monthly" },
    { url: "/curators/join", priority: "0.7", changefreq: "monthly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/signup/artist", priority: "0.8", changefreq: "monthly" },
    { url: "/verified", priority: "0.5", changefreq: "monthly" },
    { url: "/verify", priority: "0.5", changefreq: "monthly" },
    { url: "/reset-password", priority: "0.5", changefreq: "monthly" },
  ];

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
