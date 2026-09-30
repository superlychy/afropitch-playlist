"use client";

import { Check, X, Play, Zap } from "lucide-react";
import { SongArtwork } from "./SongArtwork";
import { tierBadge, timeAgo, waveHeights } from "./format";

interface Props {
    review: any;
    currency: string;
    onAccept: () => void;
    onDecline: () => void;
    onArchive: () => void;
    onToggleBoost: () => void;
    onPlay: () => void;
}

export function ReviewCard({ review, currency, onAccept, onDecline, onArchive, onToggleBoost, onPlay }: Props) {
    const isPending = review.status === "pending";
    const isAccepted = review.status === "accepted";
    const tierLabel = review.tier ? String(review.tier).charAt(0).toUpperCase() + String(review.tier).slice(1) : "";
    const bars = waveHeights(String(review.id), 26);
    const hotCount = Math.ceil(bars.length * 0.2);

    return (
        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-3.5 md:p-[18px]">
            {/* Top row */}
            <div className="flex gap-3 md:gap-3.5 mb-3">
                <SongArtwork
                    src={review.cover_art_url}
                    title={review.song_title || "track"}
                    className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-[14px] md:rounded-2xl"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {tierLabel && (
                            <span className={`text-[10px] font-extrabold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full ${tierBadge(review.tier)}`}>
                                {tierLabel}
                            </span>
                        )}
                        <span className="text-[11px] text-zinc-500">
                            {timeAgo(review.created_at)}
                            {review.playlist?.name && <span className="hidden md:inline"> · {review.playlist.name}</span>}
                        </span>
                    </div>
                    <h3 className="text-[16px] md:text-[18px] font-bold text-white truncate">{review.song_title || "Untitled"}</h3>
                    <p className="text-[13px] text-zinc-400 truncate">{review.artist_name || ""}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[#22C55E] text-[15px] md:text-[17px] font-bold">
                        {currency}{Number(review.amount_paid || 0).toLocaleString()}
                    </p>
                    <span className="text-[10px] md:text-[11px] text-zinc-500">{isAccepted ? "earned" : "payout"}</span>
                </div>
            </div>

            {/* Preview player */}
            {isPending && review.song_link && (
                <button
                    onClick={onPlay}
                    className="w-full flex items-center gap-2.5 bg-black border border-white/10 rounded-[14px] px-3 py-2.5 mb-2.5 text-left hover:border-[#22C55E]/40 transition-colors"
                >
                    <span className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 text-[#04120a] fill-[#04120a] ml-0.5" />
                    </span>
                    <span className="flex-1 h-7 flex items-center gap-[2.5px] overflow-hidden" aria-hidden="true">
                        {bars.map((h, i) => (
                            <i
                                key={i}
                                style={{ height: `${h}%` }}
                                className={`w-[3px] rounded-sm shrink-0 ${i < hotCount ? "bg-[#22C55E]" : "bg-[#3F3F46]"}`}
                            />
                        ))}
                    </span>
                    <span className="text-[11px] text-zinc-500 shrink-0">0:30</span>
                </button>
            )}

            {/* Bio */}
            {(review.artist?.bio || review.artist?.instagram || review.artist?.twitter) && (
                <div className="text-[12px] md:text-[12.5px] text-zinc-400 bg-[#1B1B1F] rounded-xl px-3 py-2.5 mb-3 leading-relaxed">
                    <span className="text-zinc-500 font-semibold">Bio: </span>
                    {review.artist?.bio || "No bio provided."}
                    {(review.artist?.instagram || review.artist?.twitter) && (
                        <span className="flex gap-3 mt-1.5">
                            {review.artist?.instagram && (
                                <a
                                    href={`https://instagram.com/${review.artist.instagram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-white"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    IG: @{review.artist.instagram}
                                </a>
                            )}
                            {review.artist?.twitter && (
                                <a
                                    href={`https://twitter.com/${review.artist.twitter}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-white"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    TW: @{review.artist.twitter}
                                </a>
                            )}
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            {isPending ? (
                <div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        <button
                            onClick={onAccept}
                            className="rounded-[14px] md:rounded-xl bg-[#22C55E] text-[#04120a] font-extrabold text-[15px] md:text-sm py-[15px] md:py-3 flex items-center justify-center gap-2 hover:brightness-110"
                        >
                            <Check className="w-[18px] h-[18px] md:w-4 md:h-4" strokeWidth={3} /> Accept
                        </button>
                        <button
                            onClick={onDecline}
                            className="rounded-[14px] md:rounded-xl bg-transparent border-[1.5px] border-[rgba(239,68,68,0.5)] text-[#F87171] font-extrabold text-[15px] md:text-sm py-[15px] md:py-3 flex items-center justify-center gap-2 hover:bg-red-500/10"
                        >
                            <X className="w-[18px] h-[18px] md:w-4 md:h-4" strokeWidth={3} /> Decline
                        </button>
                        <button
                            onClick={onArchive}
                            className="hidden md:flex rounded-xl bg-[#1B1B1F] border border-white/10 text-zinc-400 font-bold text-sm py-3 items-center justify-center gap-2 hover:text-white hover:border-white/25"
                        >
                            Archive
                        </button>
                    </div>
                    <button
                        onClick={onArchive}
                        className="md:hidden w-full mt-2 text-[12px] text-zinc-500 hover:text-zinc-300 py-1.5"
                    >
                        Archive instead
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2.5">
                    <span
                        className={`text-[10px] font-extrabold uppercase tracking-[0.5px] px-3.5 py-[7px] rounded-full ${
                            isAccepted ? "bg-[rgba(34,197,94,0.15)] text-[#22C55E]" : "bg-[rgba(239,68,68,0.12)] text-[#F87171]"
                        }`}
                    >
                        {review.status}
                    </span>
                    {isAccepted && (
                        <button
                            onClick={onToggleBoost}
                            title={review.ranking_boosted_at ? "Remove boost" : "Boost ranking"}
                            className={`ml-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold border transition-colors ${
                                review.ranking_boosted_at
                                    ? "bg-[#22C55E] border-[#22C55E] text-[#04120a]"
                                    : "border-white/10 bg-[#1B1B1F] text-white hover:border-[#22C55E]/50"
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            {review.ranking_boosted_at ? "Rising" : "Boost"}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
