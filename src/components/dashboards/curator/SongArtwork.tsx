import { Music } from "lucide-react";
import { artworkGradient } from "./format";

interface Props {
    src?: string | null;
    title: string;
    className?: string;
}

/** Album artwork with a branded gradient placeholder fallback. */
export function SongArtwork({ src, title, className = "w-16 h-16 rounded-[14px]" }: Props) {
    if (src && src.startsWith("http")) {
        return <img src={src} alt={`${title} cover art`} className={`${className} object-cover shrink-0`} />;
    }
    return (
        <div
            className={`${className} flex items-center justify-center shrink-0`}
            style={{ background: artworkGradient(title) }}
            role="img"
            aria-label={`${title} cover art`}
        >
            <Music className="w-6 h-6 text-black/60" />
        </div>
    );
}
