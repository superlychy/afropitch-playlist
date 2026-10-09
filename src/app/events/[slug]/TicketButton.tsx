"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";

export function TicketButton({ eventId, ticketUrl }: { eventId: string; ticketUrl: string }) {
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        if (busy) return;
        setBusy(true);
        // Log the click, then open the ticket page. Never block the user:
        // the ticket page opens even if the logging request fails.
        try {
            await fetch("/api/events/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId }),
            });
        } catch {
            // analytics must never break the ticket flow
        } finally {
            setBusy(false);
            window.open(ticketUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-70 text-black font-bold rounded-xl px-8 py-3.5 transition-colors"
        >
            <Ticket className="w-5 h-5" />
            {busy ? "Opening…" : "Get tickets"}
        </button>
    );
}
