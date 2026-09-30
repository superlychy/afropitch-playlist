"use client";

import { X, ExternalLink } from "lucide-react";
import { parseSpotifyEmbed } from "./format";
import { SongArtwork } from "./SongArtwork";

interface Props {
    review: any | null;
    onClose: () => void;
}

/** 30-second Spotify preview player in a modal. */
export function PreviewModal({ review, onClose }: Props) {
    if (!review) return null;

    const embed = review.song_link ? parseSpotifyEmbed(review.song_link) : null;
    const src = embed ? `https://open.spotify.com/embed/${embed.kind}/${embed.id}` : null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-[#141417] border border-white/10 rounded-[20px] p-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <SongArtwork src={review.cover_art_url} title={review.song_title || "track"} className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{review.song_title || "Untitled"}</h3>
                        <p className="text-sm text-zinc-400 truncate">{review.artist_name || ""}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl border border-white/10 bg-[#1B1B1F] flex items-center justify-center text-zinc-400 hover:text-white"
                        aria-label="Close preview"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {src ? (
                    <iframe
                        src={src}
                        width="100%"
                        height={embed?.kind === "album" ? "352" : "152"}
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title={`Spotify preview: ${review.song_title || "track"}`}
                        className="rounded-xl"
                    />
                ) : (
                    <div className="bg-[#1B1B1F] border border-white/10 rounded-xl p-5 text-center space-y-3">
                        <p className="text-sm text-zinc-400">No inline preview for this link.</p>
                        {review.song_link && (
                            <a
                                href={review.song_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-[#22C55E] text-[#04120a] font-bold text-sm rounded-xl px-4 py-2.5"
                            >
                                <ExternalLink className="w-4 h-4" /> Open track link
                            </a>
                        )}
                    </div>
                )}

                <p className="text-[11px] text-zinc-500 text-center">30-second preview provided by Spotify</p>
            </div>
        </div>
    );
}
