"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronRight } from "lucide-react";

// Slim collapsed profile-completion banner for the artist dashboard home.
// The full editor lives in the Profile popup; this just shows progress.
const QUESTION_KEYS = ["story", "inspiration", "next"];

export function ProfileCompletionBanner({ userId, onOpen }: { userId: string; onOpen: () => void }) {
    const [pct, setPct] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from("profiles")
                .select("photo_url, bio, instagram, twitter, tiktok, youtube, website, feature_answers")
                .eq("id", userId)
                .single();
            if (!data) {
                setPct(0);
                return;
            }
            let done = 0;
            if (data.photo_url) done++;
            if ((data.bio || "").trim().length >= 20) done++;
            if ([data.instagram, data.twitter, data.tiktok, data.youtube, data.website].some((s) => (s || "").trim())) done++;
            const answers = (data.feature_answers as Record<string, string>) || {};
            if (QUESTION_KEYS.every((k) => (answers[k] || "").trim().length >= 10)) done++;
            setPct(Math.round((done / 4) * 100));
        })();
    }, [userId]);

    if (pct === null || pct === 100) return null;

    return (
        <button
            onClick={onOpen}
            className="w-full flex items-center gap-3 bg-[#141417] border border-white/[0.08] rounded-2xl px-4 py-3 text-left"
        >
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-bold text-white">Public profile</span>
                    <span className="text-xs font-bold text-yellow-400">{pct}%</span>
                </div>
                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">Finish it to become eligible for featuring.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        </button>
    );
}
