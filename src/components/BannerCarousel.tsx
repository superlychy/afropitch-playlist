"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

export interface BannerEvent {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    venue: string | null;
    city: string;
    image_url: string | null;
    is_presale: boolean;
    live: boolean;
}

function formatDateRange(startsAt: string, endsAt: string) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
        return `${start.toLocaleDateString(undefined, dateOpts)}, ${start.toLocaleTimeString(undefined, timeOpts)} - ${end.toLocaleTimeString(undefined, timeOpts)}`;
    }
    return `${start.toLocaleDateString(undefined, dateOpts)} - ${end.toLocaleDateString(undefined, dateOpts)}`;
}

function BannerCard({ event, showPresale }: { event: BannerEvent; showPresale: boolean }) {
    return (
        <Link href={`/events/${event.slug}`} className="block group h-full">
            <div className="overflow-hidden rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-950/30 via-white/5 to-white/5 group-hover:border-yellow-500/70 transition-colors h-full">
                <div className="flex flex-col sm:flex-row h-full">
                    {event.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full sm:w-64 h-44 sm:h-auto object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-full sm:w-64 h-44 sm:h-auto bg-gradient-to-br from-green-900/50 to-yellow-900/50 flex items-center justify-center flex-shrink-0">
                            <Ticket className="w-12 h-12 text-gray-600" />
                        </div>
                    )}
                    <div className="p-6 sm:p-8 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            {event.live ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-600 text-white rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now
                                </span>
                            ) : (
                                <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest">
                                    Partner event
                                </span>
                            )}
                            {showPresale && event.is_presale && (
                                <span className="inline-flex items-center text-[11px] font-bold bg-yellow-500 text-black rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                                    AfroPitch presale
                                </span>
                            )}
                        </div>
                        <h2 className="text-white font-extrabold text-2xl sm:text-3xl leading-tight group-hover:text-yellow-300 transition-colors">
                            {event.title}
                        </h2>
                        <p className="text-sm text-gray-300 mt-3 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 flex-shrink-0" />
                            {formatDateRange(event.starts_at, event.ends_at)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1.5 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {event.city}{event.venue ? ` · ${event.venue}` : ""}
                        </p>
                        <span className="inline-block mt-5 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-bold text-black">
                            Get tickets
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// Swipeable partner banner. One event renders as a single card;
// several become a swipeable carousel with dots.
export function BannerCarousel({
    banners,
    showPresale,
}: {
    banners: BannerEvent[];
    showPresale: boolean;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    if (banners.length === 0) return null;

    const onScroll = () => {
        const el = trackRef.current;
        if (!el || banners.length < 2) return;
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setActive(Math.max(0, Math.min(banners.length - 1, i)));
    };

    const goTo = (i: number) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    };

    return (
        <section className="mb-12">
            <div
                ref={trackRef}
                onScroll={onScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4"
                style={{ scrollbarWidth: "none" }}
            >
                {banners.map((b) => (
                    <div key={b.id} className="snap-center shrink-0 w-full sm:w-[85%]">
                        <BannerCard event={b} showPresale={showPresale} />
                    </div>
                ))}
            </div>
            {banners.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                    {banners.map((b, i) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={`Show ${b.title}`}
                            className={`h-2 rounded-full transition-all ${
                                i === active ? "w-6 bg-yellow-500" : "w-2 bg-white/20 hover:bg-white/40"
                            }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
