import { NextRequest, NextResponse } from 'next/server';
import { getDetails } from 'spotify-url-info';
import fetch from 'cross-fetch';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log("Fetching info for:", url);

        let name = "";
        let coverImage = "";
        let description = "";
        let followers = 0;
        let songsCount = 0;

        // METHOD 1: Direct HTML Scraping (Works for Spotify, Audiomack, Apple Music, etc.)
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const htmlText = await response.text();

            // 1. Generic Open Graph Parsing (Fallback for all)
            const getMeta = (prop: string) => {
                const match = htmlText.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`, 'i')) ||
                    htmlText.match(new RegExp(`<meta name="${prop}" content="([^"]*)"`, 'i'));
                return match ? match[1] : "";
            };

            name = getMeta("og:title");
            description = getMeta("og:description");
            coverImage = getMeta("og:image");

            // Clean up Name
            name = name.replace(/ \| Spotify Playlist$/i, '')
                .replace(/ \| Audiomack$/i, '')
                .replace(/ on Audiomack$/i, '')
                .trim();

            // 2. Platform Specific Stats Parsing
            if (url.includes("spotify.com")) {
                if (description) {
                    // Spotify: "Listen on Spotify: ... · 123,456 likes · 50 songs"
                    const followersMatch = description.match(/([\d,.]+[KMB]?)\s+(likes|followers|saves)/i);
                    if (followersMatch) followers = parseCount(followersMatch[1]);

                    const songsMatch = description.match(/([\d,]+)\s+(songs|tracks)/i);
                    if (songsMatch) songsCount = parseInt(songsMatch[1].replace(/,/g, ''), 10);
                }
            }
            else if (url.includes("audiomack.com")) {
                // Audiomack usually has stats in description or specific schema
                // Description often: "Stream ... by ... on desktop and mobile. Play over 265 million tracks..." - generic
                // We might need to look for specific patterns in HTML body if OG tags don't have stats.
                // Audiomack often puts stats in title or description isn't reliable for stats on OG.
                // Let's try to find stats in the raw HTML if possible, or default to 0.

                // Audiomack specific scraping often requires looking for specific JSON blobs or counting elements which is flaky on simple scrape.
                // However, sometimes description contains "X plays, Y favorites".
                // Let's attempt generic parse from description just in case.
                const favoritesMatch = description.match(/([\d,.]+[KMB]?)\s+(favorites|likes)/i);
                if (favoritesMatch) followers = parseCount(favoritesMatch[1]);

                // If name is still empty, fallback
                if (!name) name = "Audiomack Playlist";
            }

        } catch (err) {
            console.warn("Direct scrape failed:", err);
        }

        // METHOD 2: Library Fallback (Spotify Only)
        if ((!name || songsCount === 0) && url.includes("spotify.com")) {
            try {
                const data = await getDetails(url);
                if (data) {
                    if (!name) name = data.preview?.title || data.title || "";
                    if (!coverImage) coverImage = data.preview?.image || data.image || "";
                    // @ts-ignore
                    if (songsCount === 0 && data.tracks) {
                        // @ts-ignore
                        songsCount = Array.isArray(data.tracks) ? data.tracks.length : 0;
                    }
                }
            } catch (libErr) {
                console.warn("Library fallback failed:", libErr);
            }
        }

        // Final Defaults
        if (!name) name = "Imported Playlist";
        if (!coverImage) coverImage = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop";

        return NextResponse.json({
            name,
            followers,
            songsCount,
            coverImage,
            description,
            success: true
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function parseCount(str: string): number {
    if (!str) return 0;
    const valStr = str.replace(/,/g, '').trim().toUpperCase();
    if (valStr.endsWith('K')) return parseFloat(valStr) * 1000;
    if (valStr.endsWith('M')) return parseFloat(valStr) * 1000000;
    if (valStr.endsWith('B')) return parseFloat(valStr) * 1000000000;
    return parseFloat(valStr) || 0;
}
