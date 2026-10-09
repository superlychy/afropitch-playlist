import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

export const metadata: Metadata = {
    title: "African Music Events | AfroPitch",
    description:
        "Discover concerts, festivals, award shows and industry events across Nigeria and Africa. Never miss the shows that matter, from Felabration to the next big night in Lagos.",
    keywords: [
        "african music events",
        "afrobeats concerts",
        "nigeria music festivals",
        "african award shows",
        "lagos concerts",
        "amapiano events",
    ],
    openGraph: {
        title: "African Music Events | AfroPitch",
        description:
            "Concerts, festivals, award shows and industry events across Nigeria and Africa. Find your next night out.",
        url: "https://afropitchplay.best/events",
        type: "website",
    },
};

interface EventRow {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    venue: string | null;
    city: string;
    country: string;
    image_url: string | null;
    description: string | null;
    category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    concert: "Concert",
    festival: "Festival",
    awards: "Awards",
    industry: "Industry",
    competition: "Competition",
};

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

function EventCard({ event, live }: { event: EventRow; live?: boolean }) {
    return (
        <Link href={`/events/${event.slug}`} className="block group">
            <Card className={`overflow-hidden transition-colors ${live ? "border-red-500/40 bg-red-950/10" : "border-white/10 bg-white/5 group-hover:border-yellow-500/40"}`}>
                <CardContent className="p-0">
                    <div className="flex gap-4 p-4 sm:p-5">
                        {event.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0 border border-white/10"
                            />
                        ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-green-900/40 to-yellow-900/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                                <Ticket className="w-8 h-8 text-gray-600" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                {live && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-600 text-white rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now
                                    </span>
                                )}
                                <span className="text-[11px] font-semibold text-yellow-400/90 uppercase tracking-wider">
                                    {CATEGORY_LABELS[event.category] ?? event.category}
                                </span>
                            </div>
                            <h3 className="text-white font-bold text-lg leading-snug mt-1 group-hover:text-yellow-300 transition-colors line-clamp-2">
                                {event.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1.5 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                                {formatDateRange(event.starts_at, event.ends_at)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {event.city}{event.venue ? ` · ${event.venue}` : ""}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default async function EventsPage() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("events")
        .select("id, title, slug, starts_at, ends_at, venue, city, country, image_url, description, category")
        .eq("status", "published")
        .order("starts_at", { ascending: true });

    const rows = (data ?? []) as EventRow[];
    const now = Date.now();

    const live = rows
        .filter((e) => new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const upcoming = rows.filter((e) => new Date(e.starts_at).getTime() > now);
    const past = rows
        .filter((e) => new Date(e.ends_at).getTime() < now)
        .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime());

    return (
        <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24">
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    African music <span className="text-yellow-400">events</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Concerts, festivals, award shows and industry nights across
                    Nigeria and Africa. Find your next night out.
                </p>
            </div>

            {live.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Happening now
                    </h2>
                    <div className="space-y-3">
                        {live.map((e) => (
                            <EventCard key={e.id} event={e} live />
                        ))}
                    </div>
                </section>
            )}

            <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4">Upcoming</h2>
                {upcoming.length > 0 ? (
                    <div className="space-y-3">
                        {upcoming.map((e) => (
                            <EventCard key={e.id} event={e} />
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed border-white/10 bg-white/5">
                        <CardContent className="pt-8 pb-8 text-center">
                            <p className="text-gray-400">No upcoming events yet. Check back soon.</p>
                        </CardContent>
                    </Card>
                )}
            </section>

            {past.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-white mb-4">Past events</h2>
                    <div className="space-y-3 opacity-75">
                        {past.map((e) => (
                            <EventCard key={e.id} event={e} />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
