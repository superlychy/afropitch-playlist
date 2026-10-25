import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { EventSearchBox } from "@/components/EventSearchBox";
import { EventFilters } from "@/components/EventFilters";
import { BannerCarousel, type BannerEvent } from "@/components/BannerCarousel";
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
    gospel: "Gospel",
    comedy: "Comedy",
    cultural: "Cultural",
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

type EventsSearchParams = {
    page?: string;
    category?: string;
    location?: string; // legacy alias for city
    country?: string;
    state?: string;
    city?: string;
    q?: string;
    price?: string;
};

const parseFilters = (sp: EventsSearchParams) => {
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const category = Object.keys(CATEGORY_LABELS).includes(sp.category ?? "")
        ? (sp.category as string)
        : null;
    const clean = (v?: string) => (v?.trim() ? v.trim().slice(0, 80) : null);
    const country = clean(sp.country);
    const state = clean(sp.state);
    // `city` is the current param; `location` is the legacy alias.
    const city = clean(sp.city) ?? clean(sp.location);
    const q = clean(sp.q);
    const price = sp.price === "free" || sp.price === "paid" ? sp.price : null;
    return { page, category, country, state, city, q, price };
};

const buildQs = (f: {
    page?: number;
    category?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    q?: string | null;
    price?: "free" | "paid" | null;
}) => {
    const qs = new URLSearchParams({
        ...(f.page && f.page > 1 ? { page: String(f.page) } : {}),
        ...(f.category ? { category: f.category } : {}),
        ...(f.country ? { country: f.country } : {}),
        ...(f.state ? { state: f.state } : {}),
        ...(f.city ? { city: f.city } : {}),
        ...(f.q ? { q: f.q } : {}),
        ...(f.price ? { price: f.price } : {}),
    }).toString();
    return qs ? `?${qs}` : "";
};

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<EventsSearchParams>;
}): Promise<Metadata> {
    const { page, category, country, state, city, price } = parseFilters(await searchParams);
    const qs = buildQs({ page, category, country, state, city, price });
    const catName = category ? ` ${CATEGORY_LABELS[category]}` : "";
    const locName = city ? ` in ${city}` : state ? ` in ${state}` : country ? ` in ${country}` : "";
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
    const { page, category, country: countryParam, state: stateParam, city: cityParam, q, price } = parseFilters(await searchParams);
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
    // Banner event ids: JSON array in partner_banner_event_ids, falling back
    // to the old single partner_banner_event_id key.
    const parseIds = (v: unknown): string[] => {
        if (typeof v !== "string" || !v || v === "null") return [];
        try {
            const a = JSON.parse(v);
            if (Array.isArray(a)) return a.filter((x) => typeof x === "string" && x);
        } catch {
            /* not JSON — fall through */
        }
        return v.includes(",")
            ? v.split(",").map((s) => s.trim()).filter(Boolean)
            : [v];
    };
    const bannerEnabled = isOn(settings.get("partner_banner_enabled"));
    const badgeEnabled = isOn(settings.get("presale_badge_enabled"));
    let bannerIds = parseIds(settings.get("partner_banner_event_ids"));
    if (bannerIds.length === 0) {
        const single = asId(settings.get("partner_banner_event_id"));
        if (single) bannerIds = [single];
    }

    let bannerEvents: BannerEvent[] = [];
    if (bannerEnabled && bannerIds.length > 0) {
        const { data: bes } = await supabase
            .from("events")
            .select(baseSelect)
            .in("id", bannerIds)
            .eq("status", "published")
            // Auto-off: an ended event drops out of the banner by itself.
            .gt("ends_at", nowIso)
            .order("starts_at", { ascending: true });
        const nowMs = Date.now();
        bannerEvents = ((bes as EventRow[] | null) ?? []).map((e) => ({
            ...e,
            live:
                new Date(e.starts_at).getTime() <= nowMs &&
                new Date(e.ends_at).getTime() >= nowMs,
        }));
    }
    const bannerIdSet = new Set(bannerEvents.map((e) => e.id));

    // Location tree is built from the published events themselves, so a new
    // country/state/city appears in the filters automatically when its first
    // event publishes.
    const { data: locRows } = await supabase
        .from("events")
        .select("country, state, city")
        .eq("status", "published");
    const locationTree: Record<string, Record<string, Set<string>>> = {};
    for (const r of locRows ?? []) {
        const c = (r.country ?? "").trim() || "Unknown";
        const s = (r.state ?? "").trim() || (r.city ?? "").trim() || "Unknown";
        const ct = (r.city ?? "").trim();
        if (!ct) continue;
        locationTree[c] ??= {};
        locationTree[c][s] ??= new Set();
        locationTree[c][s].add(ct);
    }
    const tree: import("@/components/EventFilters").LocationTree = {};
    for (const [c, states] of Object.entries(locationTree)) {
        tree[c] = {};
        for (const [s, cities] of Object.entries(states)) {
            tree[c][s] = [...cities];
        }
    }
    // Validate the selected location against the tree (stale URLs fall back).
    const country = tree[countryParam] ? countryParam : null;
    const state = country && tree[country][stateParam] ? stateParam : null;
    const city = country && state && tree[country][state].includes(cityParam ?? "") ? cityParam : null;

    const applyFilters = <T,>(q2: T): T => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = q2 as any;
        if (category) query = query.eq("category", category);
        if (price === "free") query = query.eq("is_free", true);
        else if (price === "paid") query = query.eq("is_free", false);
        // Most specific location level wins: city > state > country.
        if (city) query = query.eq("city", city);
        else if (state) query = query.eq("state", state);
        else if (country) query = query.eq("country", country);
        if (q) {
            // Escape PostgREST `or` special chars so the search term can't break the filter.
            const safe = q.replace(/[%(),]/g, "").trim();
            if (safe) {
                // supabase-js .or() wraps the filter in parens itself, so pass
                // the bare list. Adding our own parens gives or=((...)) and
                // PostgREST rejects it with 400.
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

    // Banner events are excluded from the regular lists to avoid duplication —
    // but not when searching, so a search always shows every match.
    const excludeBanners = !q;
    const live = ((liveData ?? []) as EventRow[]).filter((e) => !excludeBanners || !bannerIdSet.has(e.id));
    const upcoming = ((upcomingData ?? []) as EventRow[]).filter((e) => !excludeBanners || !bannerIdSet.has(e.id));
    const past = ((pastData ?? []) as EventRow[]).filter((e) => !excludeBanners || !bannerIdSet.has(e.id));
    const totalPages = Math.max(1, Math.ceil((upcomingCount ?? 0) / PER_PAGE));
    const pageHref = (p: number) => `/events${buildQs({ page: p, category, country, state, city, q, price })}`;

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
                <div className="pt-2">
                    <Link
                        href="/events/submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition-colors"
                    >
                        List your event
                    </Link>
                    <p className="text-sm text-gray-500 mt-2">Free listings, reviewed before they go live.</p>
                </div>
            </div>

            {bannerEvents.length > 0 && (
                <BannerCarousel banners={bannerEvents} showPresale={badgeEnabled} />
            )}

            <EventFilters
                tree={tree}
                categories={Object.keys(CATEGORY_LABELS)}
                current={{ category, country, state, city, q, price }}
            />

            <div className="flex justify-center mb-12">
                <EventSearchBox
                    initial={q ?? ""}
                    category={category}
                    country={country}
                    state={state}
                    city={city}
                />
            </div>

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
