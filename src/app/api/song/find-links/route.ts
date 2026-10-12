import { NextRequest, NextResponse } from "next/server";

// Suggests Apple Music (iTunes) and Deezer links for a song, given its title
// and artist name. Uses the free, keyless iTunes Search API and Deezer search
// API. Results are SUGGESTIONS only — the artist confirms the right match in
// the form before anything is saved (never auto-apply a fuzzy match).
// Spotify, Audiomack, Boomplay and YouTube Music have no free lookup and stay
// manual entry.

const UA = "Mozilla/5.0 (AfroPitch)";

async function findItunes(title: string, artist: string): Promise<string | null> {
    try {
        const q = encodeURIComponent(`${artist} ${title}`);
        const res = await fetch(
            `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=5`,
            { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const t = title.toLowerCase();
        const a = artist.toLowerCase();
        // Prefer a result whose title and artist both resemble the query.
        const results: any[] = data.results || [];
        const scored = results
            .map((r) => {
                const rt = String(r.trackName || "").toLowerCase();
                const ra = String(r.artistName || "").toLowerCase();
                let score = 0;
                if (rt.includes(t) || t.includes(rt)) score += 2;
                if (ra.includes(a) || a.includes(ra)) score += 2;
                return { r, score };
            })
            .sort((x, y) => y.score - x.score);
        const best = scored[0];
        if (best && best.score >= 2 && best.r.trackViewUrl) return best.r.trackViewUrl;
        return null;
    } catch {
        return null;
    }
}

async function findDeezer(title: string, artist: string): Promise<string | null> {
    try {
        const q = encodeURIComponent(`${artist} ${title}`);
        const res = await fetch(`https://api.deezer.com/search?limit=5&q=${q}`, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const t = title.toLowerCase();
        const a = artist.toLowerCase();
        const tracks: any[] = data.data || [];
        const scored = tracks
            .map((tr) => {
                const rt = String(tr.title || "").toLowerCase();
                const ra = String(tr.artist?.name || "").toLowerCase();
                let score = 0;
                if (rt.includes(t) || t.includes(rt)) score += 2;
                if (ra.includes(a) || a.includes(ra)) score += 2;
                return { tr, score };
            })
            .sort((x, y) => y.score - x.score);
        const best = scored[0];
        if (best && best.score >= 2 && best.tr.link) return best.tr.link;
        return null;
    } catch {
        return null;
    }
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
