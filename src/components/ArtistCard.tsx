import Link from "next/link";

export interface ArtistProfile {
    id: string;
    full_name: string;
    profile_slug: string;
    photo_url: string | null;
    bio: string | null;
    instagram: string | null;
    twitter: string | null;
    tiktok: string | null;
    youtube: string | null;
    website: string | null;
}

// Normalize a handle or URL into a clickable link.
export function socialUrl(kind: "instagram" | "twitter" | "tiktok" | "youtube" | "website", raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    const handle = v.replace(/^@/, "");
    if (!handle) return null;
    switch (kind) {
        case "instagram": return `https://instagram.com/${handle}`;
        case "twitter": return `https://x.com/${handle}`;
        case "tiktok": return `https://tiktok.com/@${handle}`;
        case "youtube": return `https://youtube.com/@${handle}`;
        default: return null;
    }
}

const SOCIAL_LABELS: Record<string, string> = {
    instagram: "Instagram",
    twitter: "X",
    tiktok: "TikTok",
    youtube: "YouTube",
    website: "Website",
};

export function ArtistSocials({ profile, className = "" }: { profile: ArtistProfile; className?: string }) {
    const entries: { kind: "instagram" | "twitter" | "tiktok" | "youtube" | "website"; url: string }[] = [];
    (["instagram", "twitter", "tiktok", "youtube"] as const).forEach((kind) => {
        const raw = profile[kind];
        if (raw) {
            const url = socialUrl(kind, raw);
            if (url) entries.push({ kind, url });
        }
    });
    if (profile.website?.trim()) {
        const w = profile.website.trim();
        entries.push({ kind: "website", url: /^https?:\/\//i.test(w) ? w : `https://${w}` });
    }
    if (entries.length === 0) return null;
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {entries.map((e) => (
                <a
                    key={e.kind}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-zinc-300 border border-white/10 rounded-full px-3 py-1.5 hover:border-[#22C55E]/50 hover:text-white transition-colors"
                >
                    {SOCIAL_LABELS[e.kind]}
                </a>
            ))}
        </div>
    );
}

// Compact artist card — reusable anywhere in the app (playlist pages, features, search).
export function ArtistCard({ profile }: { profile: ArtistProfile }) {
    return (
        <Link
            href={`/artist/${profile.profile_slug}`}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 hover:border-[#22C55E]/40 transition-colors"
        >
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                {profile.photo_url ? (
                    <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-lg font-bold text-zinc-600">{profile.full_name.charAt(0).toUpperCase()}</span>
                )}
            </div>
            <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{profile.full_name}</p>
                {profile.bio && <p className="text-zinc-500 text-xs truncate">{profile.bio}</p>}
            </div>
        </Link>
    );
}
