/** Shared formatting helpers for the admin dashboard. */

export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "just now";
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return d.toLocaleDateString();
}

export function formatCompact(n: number): string {
    return new Intl.NumberFormat("en", { notation: "compact" }).format(n || 0);
}

export function formatNaira(n: number): string {
    return `\u20A6${Math.round(n || 0).toLocaleString()}`;
}

/** Playlist tier (pricing tier) shown as a pill on review cards. */
export function tierMeta(type: string | null | undefined): { label: string; className: string } {
    const t = (type || "standard").toLowerCase();
    switch (t) {
        case "express":
            return { label: "EXPRESS", className: "bg-amber-500/15 text-amber-400" };
        case "exclusive":
            return { label: "EXCLUSIVE", className: "bg-purple-500/15 text-purple-300" };
        case "free":
            return { label: "FREE", className: "bg-green-500/15 text-green-400" };
        default:
            return { label: "STANDARD", className: "bg-blue-500/15 text-blue-400" };
    }
}

/** Deterministic pseudo-random bar heights for the decorative waveform. */
export function waveformBars(seed: string, count = 14): number[] {
    let h = 7;
    const s = String(seed || "x");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return Array.from({ length: count }, (_, i) => {
        h = (h * 1103515245 + 12345 + i * 97) >>> 0;
        return 30 + (h % 65);
    });
}
