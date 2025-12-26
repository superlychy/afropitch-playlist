import { NextRequest, NextResponse } from 'next/server';
import { getDetails } from 'spotify-url-info';
// Note: spotify-url-info might need 'spotify-url-info/fetch' depending on the version and environment.
// Since we are server-side, we should use a fetch-compatible approach or the default if it supports node.
// However, the standard package has fetch variants.
// Let's try to import from the main package first, but usually for extensive use we need a more robust scraper.
// Given the constraints and likely 'npm install spotify-url-info' installed the package, 
// we will wrap it. 

// Actually, spotify-url-info (by microlink) uses fetch.
import fetch from 'cross-fetch'; // Next.js polyfills fetch, but spotify-url-info might expect it differently? 
// Actually, generic fetch is available in Next.js Server Components / API Routes.

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Basic validation - Removed restriction to allow other platforms
        // if (!url.includes('spotify.com/playlist')) {
        //    return NextResponse.json({ error: 'Only Spotify playlist URLs are supported currently.' }, { status: 400 });
        // }

        // We'll try to fetch the page HTML and scrape basic info if the library fails or as a fallback
        // because spotify-url-info often breaks without updates.
        // Let's try a direct fetch approach for reliability without keys first.

        const response = await fetch(url);
        const htmlText = await response.text();

        // Regex for basic metadata (Open Graph tags are usually present)
        // <meta property="og:title" content="Playlist Name" />
        // <meta property="og:description" content="... · 1234 likes · 50 songs" />
        // <meta property="og:image" content="..." />

        const titleMatch = htmlText.match(/<meta property="og:title" content="([^"]*)"/);
        const descMatch = htmlText.match(/<meta property="og:description" content="([^"]*)"/);
        const imageMatch = htmlText.match(/<meta property="og:image" content="([^"]*)"/);

        const name = titleMatch ? titleMatch[1] : '';
        const description = descMatch ? descMatch[1] : '';
        const coverImage = imageMatch ? imageMatch[1] : '';

        // Description usually contains "likes" and "songs" count
        // Example: "Listen on Spotify: ... · 123,456 likes · 50 songs"

        let followers = 0;
        let songsCount = 0;



        if (description) {
            // Check for "likes", "followers", "saves"
            // Patterns: "1,234 likes", "500 followers", "saved by 20 people", "10K subscribers"
            const followersMatch = description.match(/([\d,.]+[KMB]?)\s+(likes|followers|saves|subscribers|fans)/i);

            if (followersMatch) {
                let valStr = followersMatch[1].replace(/,/g, '');
                if (valStr.toUpperCase().includes('K')) followers = parseFloat(valStr) * 1000;
                else if (valStr.toUpperCase().includes('M')) followers = parseFloat(valStr) * 1000000;
                else followers = parseInt(valStr, 10);
            }

            // Check for "songs", "tracks"
            // Patterns: "50 songs", "100 tracks", "Duration: 50 songs"
            const songsMatch = description.match(/([\d,]+)\s+(songs|tracks|videos)/i);
            if (songsMatch) {
                songsCount = parseInt(songsMatch[1].replace(/,/g, ''), 10);
            }
        }

        return NextResponse.json({
            name,
            followers,
            songsCount,
            coverImage,
            description
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
