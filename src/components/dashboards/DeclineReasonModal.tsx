"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { XCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// The six approved decline reasons plus custom (Max, 2026-10-11), plus the
// playlist suggestion reason (Max, 2026-10-19): when the curator picks it,
// they also pick another playlist on the platform (same tier or cheaper) and
// the artist can accept the suggestion to auto-resubmit the song there.
export const DECLINE_REASON_OPTIONS = [
    { code: "not_fit", label: "Does not fit this playlist's vibe" },
    { code: "wrong_genre", label: "Wrong genre for this playlist" },
    { code: "mix_quality", label: "Mix or production quality" },
    { code: "structure", label: "Song structure needs work" },
    { code: "vocals", label: "Vocals are off key or unclear" },
    { code: "not_right_now", label: "Good song, not right now" },
    { code: "suggest_playlist", label: "Suggest another playlist" },
    { code: "custom", label: "Custom reason" },
] as const;

export type DeclineReasonCode = (typeof DECLINE_REASON_OPTIONS)[number]["code"];

interface SuggestedPlaylist {
    id: string;
    name: string;
    submission_fee: number;
    type: string;
}

// The feedback text the artist sees on their dashboard: the short label for
// button reasons, the typed text for a custom reason, the picked playlist
// name for a suggestion.
export function declineFeedbackText(code: string, customText: string): string {
    if (code === "custom") return customText.trim();
    if (code === "suggest_playlist") return customText.trim() ? `Suggested playlist: ${customText.trim()}` : "Declined";
    return DECLINE_REASON_OPTIONS.find((o) => o.code === code)?.label ?? "Declined";
}

interface DeclineReasonModalProps {
    onClose: () => void;
    onConfirm: (reasonCode: DeclineReasonCode, feedback: string, suggestedPlaylistId?: string | null) => void;
    /** Playlist the submission is currently pitched to (excluded from suggestions). */
    currentPlaylistId?: string;
    /** Fee the artist paid for this submission; suggestions must cost no more. */
    currentFee?: number;
}

export function DeclineReasonModal({ onClose, onConfirm, currentPlaylistId, currentFee }: DeclineReasonModalProps) {
    const [selectedCode, setSelectedCode] = useState<DeclineReasonCode>("not_fit");
    const [customText, setCustomText] = useState("");
    const [playlists, setPlaylists] = useState<SuggestedPlaylist[]>([]);
    const [playlistSearch, setPlaylistSearch] = useState("");
    const [selectedPlaylist, setSelectedPlaylist] = useState<SuggestedPlaylist | null>(null);
    const [playlistsLoading, setPlaylistsLoading] = useState(false);

    const isCustom = selectedCode === "custom";
    const isSuggest = selectedCode === "suggest_playlist";

    // Load active playlists when the suggestion reason is picked. The server
    // RPC re-checks the same-tier-or-cheaper rule, this is just the UI filter.
    useEffect(() => {
        if (!isSuggest) return;
        setPlaylistsLoading(true);
        supabase
            .from("playlists")
            .select("id, name, submission_fee, type")
            .eq("is_active", true)
            .order("name", { ascending: true })
            .then(({ data }) => {
                const maxFee = Number(currentFee ?? 0);
                const filtered = (data ?? []).filter(
                    (p: SuggestedPlaylist) =>
                        p.id !== currentPlaylistId && Number(p.submission_fee ?? 0) <= maxFee
                );
                setPlaylists(filtered);
                setPlaylistsLoading(false);
            });
    }, [isSuggest, currentPlaylistId, currentFee]);

    const visiblePlaylists = playlists.filter((p) =>
        p.name.toLowerCase().includes(playlistSearch.toLowerCase())
    );

    const canConfirm = isCustom
        ? customText.trim().length > 0
        : isSuggest
            ? selectedPlaylist !== null
            : true;

    const handleConfirm = () => {
        if (isSuggest) {
            onConfirm(selectedCode, declineFeedbackText(selectedCode, selectedPlaylist?.name ?? ""), selectedPlaylist?.id ?? null);
        } else {
            onConfirm(selectedCode, declineFeedbackText(selectedCode, customText));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#141417] border border-white/10 p-6 rounded-[20px] w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg text-[#F87171] flex items-center gap-2">
                    <XCircle className="w-5 h-5" /> Decline Submission
                </h3>
                <p className="text-sm text-zinc-400">Pick the reason that fits best. The artist receives the email template for that reason.</p>

                <div className="space-y-3">
                    <Label>Reason</Label>
                    <div className="grid grid-cols-1 gap-2">
                        {DECLINE_REASON_OPTIONS.map((option) => (
                            <div
                                key={option.code}
                                className={`p-3 rounded-xl border cursor-pointer transition-colors text-sm ${selectedCode === option.code ? "bg-[rgba(239,68,68,0.15)] border-[#F87171] text-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"}`}
                                onClick={() => { setSelectedCode(option.code); setSelectedPlaylist(null); }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>

                {isSuggest && (
                    <div className="space-y-2">
                        <Label>Pick a playlist for this song</Label>
                        <p className="text-xs text-zinc-500">
                            Same tier or cheaper than what the artist paid. The fee they paid returns to
                            their wallet and covers the resubmission.
                        </p>
                        <Input
                            value={playlistSearch}
                            onChange={(e) => setPlaylistSearch(e.target.value)}
                            placeholder="Search playlists..."
                            className="bg-black/40 border-white/10"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {playlistsLoading && <p className="text-xs text-zinc-500 p-2">Loading playlists...</p>}
                            {!playlistsLoading && visiblePlaylists.length === 0 && (
                                <p className="text-xs text-zinc-500 p-2">No playlists available at this tier or below.</p>
                            )}
                            {visiblePlaylists.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPlaylist(p)}
                                    className={`p-2.5 rounded-xl border cursor-pointer text-sm flex items-center justify-between gap-2 ${selectedPlaylist?.id === p.id ? "bg-[rgba(34,197,94,0.12)] border-[#22C55E] text-white" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"}`}
                                >
                                    <span className="truncate">{p.name}</span>
                                    <span className="flex items-center gap-1.5 shrink-0 text-xs">
                                        <span className="text-zinc-500">{Number(p.submission_fee) > 0 ? `₦${Number(p.submission_fee).toLocaleString()}` : "Free"}</span>
                                        {selectedPlaylist?.id === p.id && <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isCustom && (
                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder="Type the reason for the artist..."
                            className="min-h-[80px] bg-black/40 border-white/10"
                        />
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="destructive"
                        disabled={!canConfirm}
                        onClick={handleConfirm}
                    >
                        Confirm Decline
                    </Button>
                </div>
            </div>
        </div>
    );
}
