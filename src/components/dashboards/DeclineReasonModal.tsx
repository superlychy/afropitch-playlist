"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { XCircle } from "lucide-react";

// The six approved decline reasons plus a custom option (Max, 2026-10-11).
// The code is stored on submissions.decline_reason via the
// process_submission_review RPC and decides which email template the
// artist receives. Only mix_quality carries the mixing offer.
export const DECLINE_REASON_OPTIONS = [
    { code: "not_fit", label: "Does not fit this playlist's vibe" },
    { code: "wrong_genre", label: "Wrong genre for this playlist" },
    { code: "mix_quality", label: "Mix or production quality" },
    { code: "structure", label: "Song structure needs work" },
    { code: "vocals", label: "Vocals are off key or unclear" },
    { code: "not_right_now", label: "Good song, not right now" },
    { code: "custom", label: "Custom reason" },
] as const;

export type DeclineReasonCode = (typeof DECLINE_REASON_OPTIONS)[number]["code"];

// The feedback text the artist sees on their dashboard: the short label for
// button reasons, the typed text for a custom reason.
export function declineFeedbackText(code: string, customText: string): string {
    if (code === "custom") return customText.trim();
    return DECLINE_REASON_OPTIONS.find((o) => o.code === code)?.label ?? "Declined";
}

interface DeclineReasonModalProps {
    onClose: () => void;
    onConfirm: (reasonCode: DeclineReasonCode, feedback: string) => void;
}

export function DeclineReasonModal({ onClose, onConfirm }: DeclineReasonModalProps) {
    const [selectedCode, setSelectedCode] = useState<DeclineReasonCode>("not_fit");
    const [customText, setCustomText] = useState("");

    const isCustom = selectedCode === "custom";
    const canConfirm = !isCustom || customText.trim().length > 0;

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
                                onClick={() => setSelectedCode(option.code)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>

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
                        onClick={() => onConfirm(selectedCode, declineFeedbackText(selectedCode, customText))}
                    >
                        Confirm Decline
                    </Button>
                </div>
            </div>
        </div>
    );
}
