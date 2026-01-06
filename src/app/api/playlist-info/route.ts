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

        // METHOD 1: Direct HTML Scraping (Fastest, avoids some rate limits)
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const htmlText = await response.text();

            // Meta Tags
            const titleMatch = htmlText.match(/<meta property="og:title" content="([^"]*)"/);
            const descMatch = htmlText.match(/<meta property="og:description" content="([^"]*)"/);
            const imageMatch = htmlText.match(/<meta property="og:image" content="([^"]*)"/);

            name = titleMatch ? titleMatch[1].replace(/ \| Spotify Playlist$/i, '').trim() : "";
            description = descMatch ? descMatch[1] : "";
            coverImage = imageMatch ? imageMatch[1] : "";

            // Parse Description: "Listen on Spotify: ... · 123,456 likes · 50 songs"
            if (description) {
                // Likes/Followers
                const followersMatch = description.match(/([\d,.]+[KMB]?)\s+(likes|followers|saves)/i);
                if (followersMatch) {
                    let valStr = followersMatch[1].replace(/,/g, '');
                    if (valStr.toUpperCase().includes('K')) followers = parseFloat(valStr) * 1000;
                    else if (valStr.toUpperCase().includes('M')) followers = parseFloat(valStr) * 1000000;
                    else followers = parseInt(valStr, 10);
                }

                // Songs/Tracks
                const songsMatch = description.match(/([\d,]+)\s+(songs|tracks)/i);
                if (songsMatch) {
                    songsCount = parseInt(songsMatch[1].replace(/,/g, ''), 10);
                }
            }
        } catch (err) {
            console.warn("Direct scrape failed, trying library fallback...", err);
        }

        // METHOD 2: spotify-url-info Fallback (If Method 1 failed or returned incomplete data)
        if (!name || songsCount === 0) {
            try {
                // Note: getDetails often fails in serverless if not polyfilled correctly, but worth a try as fallback
                const data = await getDetails(url);
                if (data) {
                    if (!name) name = data.preview?.title || data.title || "";
                    if (!coverImage) coverImage = data.preview?.image || data.image || "";

                    // Library might return 'tracks' array or count
                    // @ts-ignore
                    if (songsCount === 0 && data.tracks) {
                        // @ts-ignore
                        songsCount = Array.isArray(data.tracks) ? data.tracks.length : 0;
                    }
                }
            } catch (libErr) {
                console.warn("Library fallback also failed:", libErr);
            }
        }

        // Final sanity check defaults
        if (!name) name = "Imported Playlist";

        console.log("Result:", { name, followers, songsCount });

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
