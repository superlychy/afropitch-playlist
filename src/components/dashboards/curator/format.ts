export function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

export function formatFollowers(n: number): string {
    const v = Number(n) || 0;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return `${v}`;
}

export function tierBadge(tier: string): string {
    switch (tier) {
        case "express":
            return "bg-[#F59E0B] text-black";
        case "exclusive":
            return "bg-yellow-400 text-black";
        case "standard":
            return "bg-[#3B82F6] text-white";
        default:
            return "bg-zinc-600 text-white";
    }
}

const GRADIENTS = [
    "linear-gradient(135deg,#22C55E,#F59E0B)",
    "linear-gradient(135deg,#8B5CF6,#22C55E)",
    "linear-gradient(135deg,#3B82F6,#22C55E)",
    "linear-gradient(135deg,#F59E0B,#EF4444)",
    "linear-gradient(135deg,#EC4899,#8B5CF6)",
    "linear-gradient(135deg,#22C55E,#0E7A3D)",
];

export function artworkGradient(seed: string): string {
    let h = 0;
    const s = seed || "track";
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return GRADIENTS[h % GRADIENTS.length];
}

export function parseSpotifyEmbed(url: string): { kind: "track" | "album"; id: string } | null {
    const m = url.match(/open\.spotify\.com\/(track|album|intl-[a-z-]+\/track|intl-[a-z-]+\/album)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    const kind = m[1].includes("album") ? "album" : "track";
    return { kind, id: m[2] };
}

/** Deterministic pseudo-random waveform bar heights (25-95%) from a seed string. */
export function waveHeights(seed: string, count: number): number[] {
    let h = 2166136261;
    const s = seed || "x";
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
        h ^= h << 13;
        h ^= h >>> 17;
        h ^= h << 5;
        out.push(25 + (Math.abs(h) % 70));
    }
    return out;
}

export function currentMonthName(): string {
    return new Date().toLocaleString("en", { month: "long" });
}

export function isThisMonth(iso: string): boolean {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
