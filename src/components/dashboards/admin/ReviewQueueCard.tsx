import { useMemo } from "react";
import { Play, Send } from "lucide-react";
import { SongArtwork } from "./SongArtwork";
import { tierMeta, timeAgo, waveformBars } from "./utils";

/**
 * Review queue card per the admin mockup: artwork, title/artist/playlist,
 * tier + time pills, 30s preview row, Accept/Decline, featured email button.
 * The playlist-first gate lives one level up (confirmation on Accept).
 */
export function ReviewQueueCard({
    song,
    playlistName,
    playlistType,
    onPreview,
    onAccept,
    onDecline,
    onFeatured,
    layout = "card",
}: {
    song: any;
    playlistName: string;
    playlistType?: string | null;
    onPreview: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onFeatured: () => void;
    /** "card" = stacked mobile style, "row" = horizontal desktop style */
    layout?: "card" | "row";
}) {
    const tier = tierMeta(playlistType);
    const bars = useMemo(() => waveformBars(String(song?.id || "x")), [song?.id]);
    const art = song?.cover_art_url || null;

    const top = (
        <>
            <SongArtwork src={art} title={song?.song_title} className={layout === "row" ? "w-[72px] h-[72px]" : "w-16 h-16"} />
            <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-white truncate">{song?.song_title || "Untitled Track"}</h3>
                <p className="text-xs text-[#A1A1AA] truncate">
                    {song?.artist?.full_name || "Unknown Artist"} &middot; {playlistName}
                </p>
                <div className="flex gap-1.5 items-center mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full tracking-[0.4px] ${tier.className}`}>
                        {tier.label}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-[#1B1B1F] text-[#71717A]">
                        {timeAgo(song?.created_at)}
                    </span>
                </div>
            </div>
        </>
    );

    const previewRow = (
        <div className="flex items-center gap-2.5 bg-black border border-white/[0.08] rounded-xl py-2 pl-2 pr-3">
            <button
                onClick={onPreview}
                aria-label="Play 30 second preview"
                title="Play 30s preview"
                className="w-[38px] h-[38px] rounded-full bg-[#22C55E] flex items-center justify-center shrink-0"
            >
                <Play className="w-[15px] h-[15px] text-[#04120a] fill-[#04120a] ml-0.5" />
            </button>
            <div className="flex-1 flex items-center gap-[2px] h-[26px]" aria-hidden="true">
                {bars.map((h, i) => (
                    <i key={i} className="w-[3px] bg-[#3F3F46] rounded-sm" style={{ height: `${h}%` }} />
                ))}
            </div>
            <span className="text-[11px] text-[#71717A] tabular-nums shrink-0">30s preview</span>
        </div>
    );

    const actions = (
        <>
            <div className={layout === "row" ? "flex gap-2 shrink-0" : "grid grid-cols-2 gap-2"}>
                <button
                    onClick={onAccept}
                    className="bg-[#22C55E] text-[#04120a] font-extrabold text-sm rounded-xl px-4 py-3"
                >
                    Accept
                </button>
                <button
                    onClick={onDecline}
                    className="bg-transparent border-[1.5px] border-red-400/50 text-red-400 font-extrabold text-sm rounded-xl px-4 py-3"
                >
                    Decline
                </button>
            </div>
            {layout === "card" && (
                <button
                    onClick={onFeatured}
                    className="w-full bg-[#1B1B1F] border border-white/[0.08] text-amber-400 font-bold text-xs rounded-[10px] py-2.5 flex items-center justify-center gap-2"
                >
                    <Send className="w-3.5 h-3.5" /> Send featured questionnaire
                </button>
            )}
        </>
    );

    if (layout === "row") {
        return (
            <div className="flex gap-4 p-3.5 border border-white/[0.08] rounded-2xl bg-[#101012] items-center">
                {top}
                {previewRow}
                <div className="flex flex-col gap-2 shrink-0">
                    {actions}
                    <button
                        onClick={onFeatured}
                        className="w-full bg-[#1B1B1F] border border-white/[0.08] text-amber-400 font-bold text-xs rounded-[10px] py-2 flex items-center justify-center gap-2"
                    >
                        <Send className="w-3.5 h-3.5" /> Featured
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-3.5 mb-3">
            <div className="flex gap-3 mb-3">{top}</div>
            <div className="mb-3">{previewRow}</div>
            <div className="space-y-2">{actions}</div>
        </div>
    );
}
