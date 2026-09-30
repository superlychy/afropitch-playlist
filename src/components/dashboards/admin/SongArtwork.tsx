import { Music } from "lucide-react";

/**
 * Song/album artwork with a branded gradient placeholder fallback.
 * Mirrors the platform rule: songs without artwork get a branded gradient
 * placeholder with a music icon (never an invented cover).
 */
export function SongArtwork({
    src,
    title,
    className = "w-16 h-16",
    rounded = "rounded-[14px]",
}: {
    src?: string | null;
    title?: string;
    className?: string;
    rounded?: string;
}) {
    if (src) {
        return <img src={src} alt={title || "Cover art"} className={`object-cover ${rounded} ${className}`} />;
    }
    return (
        <div
            className={`flex items-center justify-center bg-gradient-to-br from-green-500/25 via-[#1B1B1F] to-amber-500/15 ${rounded} ${className}`}
            role="img"
            aria-label={title || "No artwork"}
        >
            <Music className="w-2/5 h-2/5 text-white/25" />
        </div>
    );
}
