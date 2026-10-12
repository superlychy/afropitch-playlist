import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

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
    is_presale: boolean;
}

function PresaleBadge() {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-yellow-500 text-black rounded-full px-2.5 py-0.5 uppercase tracking-wider">
            AfroPitch presale
        </span>
    );
}

const CATEGORY_LABELS: Record<string, string> = {
    concert: "Concert",
    festival: "Festival",
    awards: "Awards",
    industry: "Industry",
    competition: "Competition",
    party: "Party",
    tour: "Tour",
    showcase: "Showcase",
};

const PER_PAGE = 15;

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

function EventCard({ event, live, showPresale }: { event: EventRow; live?: boolean; showPresale?: boolean }) {
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
                                {showPresale && event.is_presale && <PresaleBadge />}
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

function PartnerBanner({ event, showPresale }: { event: EventRow; showPresale: boolean }) {
    return (
        <section className="mb-12">
            <Link href={`/events/${event.slug}`} className="block group">
                <Card className="overflow-hidden border-yellow-500/40 bg-gradient-to-br from-yellow-950/30 via-white/5 to-white/5 group-hover:border-yellow-500/70 transition-colors">
                    <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
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
                                    <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest">
                                        Partner event
                                    </span>
                                    {showPresale && event.is_presale && <PresaleBadge />}
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
                    </CardContent>
                </Card>
            </Link>
        </section>
    );
}

type EventsSearchParams = { page?: string; category?: string; location?: string; q?: string };

const parseFilters = (sp: EventsSearchParams) => {
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const category = Object.keys(CATEGORY_LABELS).includes(sp.category ?? "")
        ? (sp.category as string)
        : null;
    const location = sp.location?.trim() ? sp.location.trim().slice(0, 80) : null;
    const q = sp.q?.trim() ? sp.q.trim().slice(0, 80) : null;
    return { page, category, location, q };
};

const buildQs = (f: { page?: number; category?: string | null; location?: string | null; q?: string | null }) => {
    const qs = new URLSearchParams({
        ...(f.page && f.page > 1 ? { page: String(f.page) } : {}),
        ...(f.category ? { category: f.category } : {}),
        ...(f.location ? { location: f.location } : {}),
        ...(f.q ? { q: f.q } : {}),
    }).toString();
    return qs ? `?${qs}` : "";
};

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<EventsSearchParams>;
}): Promise<Metadata> {
    const { page, category, location } = parseFilters(await searchParams);
    const qs = buildQs({ page, category, location });
    const catName = category ? ` ${CATEGORY_LABELS[category]}` : "";
    const locName = location ? ` in ${location}` : "";
    return {
        title: `African Music Events${catName}${locName} | AfroPitch`,
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
        alternates: {
            canonical: `https://afropitchplay.best/events${qs}`,
        },
        openGraph: {
            title: `African Music Events${catName}${locName} | AfroPitch`,
            description:
                "Concerts, festivals, award shows and industry nights across Nigeria and Africa.",
            url: `https://afropitchplay.best/events${qs}`,
            type: "website",
        },
    };
}

export default async function EventsPage({
    searchParams,
}: {
    searchParams: Promise<EventsSearchParams>;
}) {
    const { page, category, location: locationParam, q } = parseFilters(await searchParams);
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const baseSelect =
        "id, title, slug, starts_at, ends_at, venue, city, country, image_url, description, category, is_presale";

    // Partner placement switches (both ship OFF; the admin flips them when a deal goes live).
    // site_settings.value is TEXT: "true"/"false", event id, or "".
    const { data: settingRows } = await supabase.from("site_settings").select("key, value");
    const settings = new Map((settingRows ?? []).map((r) => [r.key, r.value]));
    const isOn = (v: unknown) => v === true || v === "true";
    const asId = (v: unknown) =>
        typeof v === "string" && v !== "" && v !== "null" ? v : null;
    const bannerEnabled = isOn(settings.get("partner_banner_enabled"));
    const badgeEnabled = isOn(settings.get("presale_badge_enabled"));
    const bannerEventId = asId(settings.get("partner_banner_event_id"));

    let bannerEvent: EventRow | null = null;
    if (bannerEnabled && bannerEventId) {
        const { data: be } = await supabase
            .from("events")
            .select(baseSelect)
            .eq("id", bannerEventId)
            .eq("status", "published")
            .maybeSingle();
        bannerEvent = (be as EventRow | null) ?? null;
    }

    // Location list is built from the published events themselves, so a new
    // city appears in the filter automatically when its first event publishes.
    const { data: locRows } = await supabase
        .from("events")
        .select("city, country")
        .eq("status", "published");
    const locCounts = new Map<string, { city: string; country: string; count: number }>();
    for (const r of locRows ?? []) {
        const cur = locCounts.get(r.city) ?? { city: r.city, country: r.country, count: 0 };
        cur.count++;
        locCounts.set(r.city, cur);
    }
    const locations = [...locCounts.values()].sort(
        (a, b) => b.count - a.count || a.city.localeCompare(b.city)
    );
    const location = locations.some((l) => l.city === locationParam) ? locationParam : null;

    const applyFilters = <T,>(q2: T): T => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = q2 as any;
        if (category) query = query.eq("category", category);
        if (location) query = query.eq("city", location);
        if (q) {
            // Escape PostgREST `or` special chars so the search term can't break the filter.
            const safe = q.replace(/[%(),]/g, "").trim();
            if (safe) {
                query = query.or(
                    `title.ilike.%${safe}%,venue.ilike.%${safe}%,city.ilike.%${safe}%,organizer.ilike.%${safe}%`
                );
            }
        }
        return query as T;
    };

    // Happening now (shown on page 1 only).
    const { data: liveData } =
        page === 1
            ? await applyFilters(
                  supabase
                      .from("events")
                      .select(baseSelect)
                      .eq("status", "published")
                      .lte("starts_at", nowIso)
                      .gte("ends_at", nowIso)
                      .order("starts_at", { ascending: true })
              )
            : { data: [] };

    // Upcoming, nearest first, paginated.
    const from = (page - 1) * PER_PAGE;
    const to = from + PER_PAGE - 1;
    const { data: upcomingData, count: upcomingCount } = await applyFilters(
        supabase
            .from("events")
            .select(baseSelect, { count: "exact" })
            .eq("status", "published")
            .gt("starts_at", nowIso)
            .order("starts_at", { ascending: true })
            .range(from, to)
    );

    // Past events, most recent first (latest 12).
    const { data: pastData } = await applyFilters(
        supabase
            .from("events")
            .select(baseSelect)
            .eq("status", "published")
            .lt("ends_at", nowIso)
            .order("ends_at", { ascending: false })
            .limit(12)
    );

    const live = ((liveData ?? []) as EventRow[]).filter((e) => e.id !== bannerEvent?.id);
    const upcoming = ((upcomingData ?? []) as EventRow[]).filter((e) => e.id !== bannerEvent?.id);
    const past = ((pastData ?? []) as EventRow[]).filter((e) => e.id !== bannerEvent?.id);
    const totalPages = Math.max(1, Math.ceil((upcomingCount ?? 0) / PER_PAGE));
    const pageHref = (p: number) => `/events${buildQs({ page: p, category, location, q })}`;

    const pillCls = (active: boolean) =>
        `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            active
                ? "bg-yellow-500 text-black"
                : "border border-white/15 bg-white/5 text-gray-300 hover:border-yellow-500/40"
        }`;

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

            <form action="/events" method="get" className="flex justify-center mb-6">
                {category && <input type="hidden" name="category" value={category} />}
                {location && <input type="hidden" name="location" value={location} />}
                <div className="relative w-full max-w-md">
                    <input
                        type="search"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Search events, venues, cities…"
                        className="w-full rounded-full bg-white/5 border border-white/15 px-5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/60"
                    />
                    {q && (
                        <Link
                            href={`/events${buildQs({ category, location })}`}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white"
                        >
                            Clear
                        </Link>
                    )}
                </div>
            </form>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
                <Link href={`/events${buildQs({ location, q })}`} className={pillCls(!category)}>
                    All
                </Link>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <Link
                        key={key}
                        href={`/events${buildQs({ category: key, location, q })}`}
                        className={pillCls(category === key)}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2 mb-12">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                    <MapPin className="w-3.5 h-3.5" /> Location
                </span>
                <Link href={`/events${buildQs({ category, q })}`} className={pillCls(!location)}>
                    All locations
                </Link>
                {locations.map((l) => (
                    <Link
                        key={l.city}
                        href={`/events${buildQs({ category, location: l.city, q })}`}
                        className={pillCls(location === l.city)}
                    >
                        {l.city}
                    </Link>
                ))}
            </div>

            {bannerEvent && <PartnerBanner event={bannerEvent} showPresale={badgeEnabled} />}

            {live.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Happening now
                    </h2>
                    <div className="space-y-3">
                        {live.map((e) => (
                            <EventCard key={e.id} event={e} live showPresale={badgeEnabled} />
                        ))}
                    </div>
                </section>
            )}

            <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4">Upcoming</h2>
                {upcoming.length > 0 ? (
                    <>
                        <div className="space-y-3">
                            {upcoming.map((e) => (
                                <EventCard key={e.id} event={e} showPresale={badgeEnabled} />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                {page > 1 ? (
                                    <Link
                                        href={pageHref(page - 1)}
                                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 hover:border-yellow-500/40 transition-colors"
                                    >
                                        ← Previous
                                    </Link>
                                ) : (
                                    <span className="rounded-xl border border-white/5 px-4 py-2 text-sm text-gray-700">
                                        ← Previous
                                    </span>
                                )}
                                <span className="text-sm text-gray-500 px-2">
                                    Page {page} of {totalPages}
                                </span>
                                {page < totalPages ? (
                                    <Link
                                        href={pageHref(page + 1)}
                                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 hover:border-yellow-500/40 transition-colors"
                                    >
                                        Next →
                                    </Link>
                                ) : (
                                    <span className="rounded-xl border border-white/5 px-4 py-2 text-sm text-gray-700">
                                        Next →
                                    </span>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <Card className="border-dashed border-white/10 bg-white/5">
                        <CardContent className="pt-8 pb-8 text-center">
                            <p className="text-gray-400">
                                {location
                                    ? `No upcoming events in ${location} yet. Check back soon.`
                                    : "No upcoming events yet. Check back soon."}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </section>

            {past.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-white mb-4">Past events</h2>
                    <div className="space-y-3 opacity-75">
                        {past.map((e) => (
                            <EventCard key={e.id} event={e} showPresale={badgeEnabled} />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
