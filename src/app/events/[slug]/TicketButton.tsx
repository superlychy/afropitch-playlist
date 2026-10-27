"use client";

import { Ticket } from "lucide-react";

// Get Tickets is a real link, not a scripted popup: the ticket page opens in
// a new tab from the click itself, on every browser. The click is logged
// fire-and-forget (never awaited) so a slow or failed logging request can
// never delay, block, or downgrade the navigation to the same tab.
export function TicketButton({ eventId, ticketUrl }: { eventId: string; ticketUrl: string }) {
    const handleClick = () => {
        try {
            fetch("/api/events/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId }),
                keepalive: true,
            }).catch(() => {
                // analytics must never break the ticket flow
            });
        } catch {
            // analytics must never break the ticket flow
        }
    };

    return (
        <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl px-8 py-3.5 transition-colors"
        >
            <Ticket className="w-5 h-5" />
            Get tickets
        </a>
    );
}
