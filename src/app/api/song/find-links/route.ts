import { NextRequest, NextResponse } from "next/server";

// Suggests Apple Music (iTunes) and Deezer links for a song, given its title
// and artist name. Uses the free, keyless iTunes Search API and Deezer search
// API. Results are SUGGESTIONS only — the artist confirms the right match in
// the form before anything is saved (never auto-apply a fuzzy match).
// Spotify, Audiomack, Boomplay and YouTube Music have no free lookup and stay
// manual entry.

const UA = "Mozilla/5.0 (AfroPitch)";

// Normalize for comparison: lowercase, drop bracketed tags like "(feat. X)"
// or "[remix]", strip feat/ft/featuring credits, remove punctuation.
function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/[\(\[][^\)\]]*[\)\]]/g, " ")
        .replace(/\b(feat|ft|featuring)\b\.?\s+.+$/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function scoreMatch(title: string, artist: string, rt: string, ra: string): number {
    const t = normalize(title);
    const a = normalize(artist);
    const nt = normalize(rt);
    const na = normalize(ra);
    if (!t || !nt) return 0;
    let score = 0;
    if (nt.includes(t) || t.includes(nt)) score += 2;
    if (a && na && (na.includes(a) || a.includes(na))) score += 2;
    return score;
}

async function fetchJson(url: string): Promise<any | null> {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function findItunes(title: string, artist: string): Promise<string | null> {
    // Try "artist title" first, then title-only as a fallback.
    const queries = [`${artist} ${title}`, title];
    let best: { url: string; score: number } | null = null;
    for (const q of queries) {
        const data = await fetchJson(
            `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=8`
        );
        const results: any[] = data?.results || [];
        for (const r of results) {
            const score = scoreMatch(title, artist, String(r.trackName || ""), String(r.artistName || ""));
            if (r.trackViewUrl && (!best || score > best.score)) {
                best = { url: r.trackViewUrl, score };
            }
        }
        if (best && best.score >= 4) break; // strong match, stop searching
    }
    return best && best.score >= 2 ? best.url : null;
}

async function findDeezer(title: string, artist: string): Promise<string | null> {
    // Strict artist/track search first, then a general query as fallback.
    const queries = [
        `artist:"${artist}" track:"${title}"`,
        `${artist} ${title}`,
    ];
    let best: { url: string; score: number } | null = null;
    for (const q of queries) {
        const data = await fetchJson(
            `https://api.deezer.com/search?limit=8&q=${encodeURIComponent(q)}`
        );
        const tracks: any[] = data?.data || [];
        for (const tr of tracks) {
            const score = scoreMatch(title, artist, String(tr.title || ""), String(tr.artist?.name || ""));
            if (tr.link && (!best || score > best.score)) {
                best = { url: tr.link, score };
            }
        }
        if (best && best.score >= 4) break; // strong match, stop searching
    }
    return best && best.score >= 2 ? best.url : null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const title = String(body?.title || "").trim();
        const artist = String(body?.artist || "").trim();
        if (!title || !artist) {
            return NextResponse.json({ ok: false, error: "Song title and artist name are required." }, { status: 400 });
        }
        const [appleMusic, deezer] = await Promise.all([findItunes(title, artist), findDeezer(title, artist)]);
        return NextResponse.json({ ok: true, appleMusic, deezer });
    } catch {
        return NextResponse.json({ ok: false, error: "Lookup failed." }, { status: 500 });
    }
}
