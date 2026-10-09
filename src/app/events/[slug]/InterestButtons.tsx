"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type Vote = "interested" | "not_interested" | null;

export function InterestButtons({ eventId }: { eventId: string }) {
    const [interested, setInterested] = useState(0);
    const [notInterested, setNotInterested] = useState(0);
    const [mine, setMine] = useState<Vote>(null);
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/events/interest?event_id=${encodeURIComponent(eventId)}`)
            .then((r) => r.json())
            .then((d) => {
                if (cancelled || !d.ok) return;
                setInterested(d.interested ?? 0);
                setNotInterested(d.not_interested ?? 0);
                setMine(d.mine ?? null);
                setLoaded(true);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [eventId]);

    const vote = async (value: Exclude<Vote, null>) => {
        if (busy) return;
        setBusy(true);
        // Tapping your current choice again removes the vote.
        const next: Vote = mine === value ? null : value;
        try {
            const res = await fetch("/api/events/interest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId, value: next }),
            });
            const d = await res.json().catch(() => ({}));
            if (d.ok) {
                setInterested(d.interested ?? 0);
                setNotInterested(d.not_interested ?? 0);
                setMine(d.mine ?? null);
            }
        } catch {
            // voting must never break the page
        } finally {
            setBusy(false);
        }
    };

    const base =
        "inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60";

    return (
        <div className="text-center pt-2">
            <p className="text-sm text-gray-500 mb-3">Are you going?</p>
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={() => vote("interested")}
                    disabled={busy}
                    className={`${base} ${
                        mine === "interested"
                            ? "border-green-500/60 bg-green-950/40 text-green-300"
                            : "border-white/15 bg-white/5 text-gray-300 hover:border-green-500/40"
                    }`}
                >
                    <ThumbsUp className="w-4 h-4" />
                    Interested{loaded ? ` (${interested})` : ""}
                </button>
                <button
                    onClick={() => vote("not_interested")}
                    disabled={busy}
                    className={`${base} ${
                        mine === "not_interested"
                            ? "border-red-500/60 bg-red-950/40 text-red-300"
                            : "border-white/15 bg-white/5 text-gray-300 hover:border-red-500/40"
                    }`}
                >
                    <ThumbsDown className="w-4 h-4" />
                    Not interested{loaded ? ` (${notInterested})` : ""}
                </button>
            </div>
        </div>
    );
}
