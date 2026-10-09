"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, X, CalendarPlus, Mail } from "lucide-react";

type Vote = "interested" | "not_interested" | null;

export interface EventReminderInfo {
    title: string;
    starts_at: string;
    ends_at: string;
    venue: string | null;
    city: string;
}

function downloadIcs(info: EventReminderInfo) {
    const fmt = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const start = new Date(info.starts_at);
    const end = new Date(info.ends_at);
    const location = [info.venue, info.city].filter(Boolean).join(", ");
    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AfroPitch//Events//EN",
        "BEGIN:VEVENT",
        `UID:${Date.now()}@afropitchplay.best`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${info.title}`,
        `LOCATION:${location}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${info.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function InterestButtons({
    eventId,
    event,
    userEmail,
}: {
    eventId: string;
    event: EventReminderInfo;
    userEmail: string | null;
}) {
    const [mine, setMine] = useState<Vote>(null);
    const [busy, setBusy] = useState(false);
    const [showReminder, setShowReminder] = useState(false);
    const [email, setEmail] = useState("");
    const [remindBusy, setRemindBusy] = useState(false);
    const [remindMsg, setRemindMsg] = useState<string | null>(null);
    const [remindDone, setRemindDone] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/events/interest?event_id=${encodeURIComponent(eventId)}`)
            .then((r) => r.json())
            .then((d) => {
                if (cancelled || !d.ok) return;
                setMine(d.mine ?? null);
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
                setMine(d.mine ?? null);
                if (next === "interested") {
                    setRemindMsg(null);
                    setRemindDone(false);
                    setShowReminder(true);
                }
            }
        } catch {
            // voting must never break the page
        } finally {
            setBusy(false);
        }
    };

    const saveEmailReminder = async (address: string) => {
        if (remindBusy || !address.trim()) return;
        setRemindBusy(true);
        setRemindMsg(null);
        try {
            const res = await fetch("/api/events/remind", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId, email: address.trim() }),
            });
            const d = await res.json().catch(() => ({}));
            if (d.ok) {
                setRemindDone(true);
                setRemindMsg("Reminder set. We'll email you before the event.");
            } else {
                setRemindMsg(d.error || "Could not save the reminder.");
            }
        } catch {
            setRemindMsg("Could not save the reminder.");
        } finally {
            setRemindBusy(false);
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
                    Interested
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
                    Not interested
                </button>
            </div>

            {showReminder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowReminder(false)}>
                    <div
                        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-6 text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-white font-bold text-lg">Get a reminder</h3>
                            <button onClick={() => setShowReminder(false)} className="text-gray-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-5">
                            You're interested in {event.title}. Want us to remind you before it starts?
                            {userEmail && <span className="block mt-1 text-gray-500">We'll email {userEmail}.</span>}
                        </p>
                        {!remindDone ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => downloadIcs(event)}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:border-yellow-500/40 transition-colors"
                                >
                                    <CalendarPlus className="w-4 h-4" />
                                    Add to my calendar
                                </button>
                                {userEmail ? (
                                    <button
                                        onClick={() => saveEmailReminder(userEmail)}
                                        disabled={remindBusy}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 px-4 py-3 text-sm font-bold text-black transition-colors"
                                    >
                                        <Mail className="w-4 h-4" />
                                        {remindBusy ? "Saving…" : `Email me a reminder`}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Email address"
                                            className="flex-1 min-w-0 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/50"
                                        />
                                        <button
                                            onClick={() => saveEmailReminder(email)}
                                            disabled={remindBusy || !email.trim()}
                                            className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 px-4 py-3 text-sm font-bold text-black transition-colors"
                                        >
                                            <Mail className="w-4 h-4" />
                                            {remindBusy ? "Saving…" : "Remind me"}
                                        </button>
                                    </div>
                                )}
                                {remindMsg && <p className="text-xs text-gray-500">{remindMsg}</p>}
                            </div>
                        ) : (
                            <p className="text-sm text-green-400">{remindMsg}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
