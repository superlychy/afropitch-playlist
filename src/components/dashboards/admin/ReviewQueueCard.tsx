import { useMemo, useState } from "react";
import { Play, Send, ExternalLink, X } from "lucide-react";
import { SongArtwork } from "./SongArtwork";
import { tierMeta, timeAgo, waveformBars } from "./utils";

/**
 * Review queue card per the admin mockup: artwork, title/artist/playlist,
 * tier + time pills, 30s preview row, Accept/Decline, featured email button.
 * The playlist-first gate lives one level up (confirmation on Accept).
 *
 * Preview plays inline in the card (Spotify embed), and the song's own
 * link is always visible on the card so it can be opened in Spotify
 * directly to add the track to the playlist. Links that cannot be
 * embedded (non-Spotify) fall back to the page-level preview modal.
 */

function spotifyEmbedUrl(link: string | null | undefined): string | null {
    if (!link) return null;
    const m = link.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

function songLinkLabel(link: string): string {
    const l = link.toLowerCase();
    if (l.includes("spotify")) return "Open in Spotify";
    if (l.includes("apple")) return "Open in Apple Music";
    if (l.includes("youtu")) return "Open on YouTube";
    if (l.includes("audiomack")) return "Open on Audiomack";
    if (l.includes("soundcloud")) return "Open on SoundCloud";
    if (l.includes("boomplay")) return "Open on Boomplay";
    return "Open song link";
}
export function ReviewQueueCard({
    song,
    playlistName,
    playlistType,
    onPreview,
    onAccept,
    onDecline,
    onQuickDecline,
    onHide,
    onFeatured,
    layout = "card",
}: {
    song: any;
    playlistName: string;
    playlistType?: string | null;
    onPreview: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onQuickDecline?: () => void;
    onHide?: () => void;
    onFeatured: () => void;
    /** "card" = stacked mobile style, "row" = horizontal desktop style */
    layout?: "card" | "row";
}) {
    const tier = tierMeta(playlistType);
    const bars = useMemo(() => waveformBars(String(song?.id || "x")), [song?.id]);
    const art = song?.cover_art_url || null;
    const [playing, setPlaying] = useState(false);
    const embed = spotifyEmbedUrl(song?.song_link);
    const songLink: string | null = song?.song_link || null;

    const handlePlay = () => {
        if (embed) setPlaying(true);
        else onPreview();
    };

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
                onClick={handlePlay}
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

    const previewBlock = (
        <div className="flex flex-col gap-1.5">
            {playing && embed ? (
                <div className="flex items-start gap-1.5">
                    <iframe
                        src={embed}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-xl flex-1 min-w-0"
                        title={`Preview of ${song?.song_title || "song"}`}
                    />
                    <button
                        onClick={() => setPlaying(false)}
                        aria-label="Close preview player"
                        title="Close preview"
                        className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#A1A1AA] hover:text-white"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                previewRow
            )}
            {songLink && (
                <a
                    href={songLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22C55E] hover:text-[#4ADE80] pl-1"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {songLinkLabel(songLink)}
                </a>
            )}
        </div>
    );

    // Quick decline: free submissions only (server-enforced too), no reason, no email.
    const canQuickDecline = !!onQuickDecline && Number(song?.amount_paid || 0) === 0;

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
            {(canQuickDecline || onHide) && (
                <div className={layout === "row" ? "flex gap-2 shrink-0" : "grid grid-cols-2 gap-2"}>
                    {canQuickDecline && (
                        <button
                            onClick={onQuickDecline}
                            title="Decline without asking a reason and without sending an email (free submissions only)"
                            className="bg-transparent border border-white/[0.12] text-[#A1A1AA] font-bold text-xs rounded-xl px-4 py-2.5 hover:text-white hover:border-white/30"
                        >
                            Quick decline
                        </button>
                    )}
                    {onHide && (
                        <button
                            onClick={onHide}
                            title="Hide from the review queue. No decision, no email, no refund. Reversible."
                            className="bg-transparent border border-white/[0.12] text-[#A1A1AA] font-bold text-xs rounded-xl px-4 py-2.5 hover:text-white hover:border-white/30"
                        >
                            Hide
                        </button>
                    )}
                </div>
            )}
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
                <div className="flex-1 min-w-[200px]">{previewBlock}</div>
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
            <div className="mb-3">{previewBlock}</div>
            <div className="space-y-2">{actions}</div>
        </div>
    );
}
