import { NextResponse } from "next/server";

export async function GET() {
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /portal/
Disallow: /submit/
Disallow: /signup/
Disallow: /reset-password/
Disallow: /verified/
Disallow: /verify/

# Allow search engines to crawl public pages
Allow: /
Allow: /playlists
Allow: /pricing
Allow: /how-it-works
Allow: /trust
Allow: /contact
Allow: /curators/
Allow: /track/
Allow: /terms
Allow: /privacy

# Crawl delay
Crawl-delay: 1

# Sitemap
Sitemap: https://afropitchplay.best/sitemap.xml
`;

  return new NextResponse(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
