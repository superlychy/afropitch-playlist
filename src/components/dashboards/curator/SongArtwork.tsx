"use client";

import { useState } from "react";
import { Music } from "lucide-react";
import { artworkGradient } from "./format";

interface Props {
    src?: string | null;
    title: string;
    className?: string;
}

/** Album artwork with a branded gradient placeholder fallback (also used when the cover URL fails to load). */
export function SongArtwork({ src, title, className = "w-16 h-16 rounded-[14px]" }: Props) {
    const [failed, setFailed] = useState(false);
    if (src && src.startsWith("http") && !failed) {
        return <img src={src} alt={`${title} cover art`} className={`${className} object-cover shrink-0`} onError={() => setFailed(true)} />;
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
