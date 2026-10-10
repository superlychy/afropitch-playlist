import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin, ArrowLeft, Building2 } from "lucide-react";
import { TicketButton } from "./TicketButton";
import { InterestButtons } from "./InterestButtons";

interface EventDetail {
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
    ticket_url: string | null;
    is_free: boolean;
    organizer: string | null;
    category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    concert: "Concert",
    festival: "Festival",
    awards: "Awards",
    industry: "Industry",
    competition: "Competition",
};

async function getEvent(slug: string): Promise<EventDetail | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("events")
        .select("id, title, slug, starts_at, ends_at, venue, city, country, image_url, description, ticket_url, is_free, organizer, category")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
    return (data as EventDetail | null) ?? null;
}

function formatDateTime(iso: string) {
    const d = new Date(iso);
    return (
        d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
        ", " +
        d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    );
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const event = await getEvent(slug);
    const siteUrl = "https://afropitchplay.best";
    if (!event) return { title: "Event | AfroPitch" };

    const description =
        event.description?.slice(0, 160) ??
        `${event.title} in ${event.city}, ${event.country}. Dates, venue and tickets on AfroPitch.`;
    const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;

    return {
        // Root layout appends "| AfroPitch Playlist" via its title template;
        // keep this short and name-led so Google doesn't rewrite it.
        title: event.title,
        description,
        keywords: [event.title, `${categoryLabel} ${event.city}`, `events in ${event.city}`, event.venue ?? "", "AfroPitch", "african music events"].filter(Boolean),
        openGraph: {
            title: `${event.title} | AfroPitch`,
            description,
            url: `${siteUrl}/events/${event.slug}`,
            type: "article",
            ...(event.image_url ? { images: [{ url: event.image_url }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: `${event.title} | AfroPitch`,
            description,
            ...(event.image_url ? { images: [event.image_url] } : {}),
        },
        alternates: { canonical: `${siteUrl}/events/${event.slug}` },
    };
}

export default async function EventDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const event = await getEvent(slug);
    if (!event) notFound();

    // Logged-in users get reminder emails without typing their address.
    const {
        data: { user },
    } = await (await createClient()).auth.getUser();
    const userEmail = user?.email ?? null;

    // Traction metric: log the view. Fire-and-forget so a logging failure
    // can never break the page render.
    createClient()
        .then((supabase) =>
            supabase.from("event_analytics").insert({ event_id: event.id, kind: "view" })
        )
        .then(
            () => {},
            () => {}
        );

    const now = Date.now();
    const isLive =
        new Date(event.starts_at).getTime() <= now && new Date(event.ends_at).getTime() >= now;
    const isPast = new Date(event.ends_at).getTime() < now;
    const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category;
    const locationName = event.venue ? `${event.venue}, ${event.city}` : event.city;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.title,
        startDate: event.starts_at,
        endDate: event.ends_at,
        eventStatus: "https://schema.org/EventScheduled",
        location: {
            "@type": "Place",
            name: locationName,
            address: {
                "@type": "PostalAddress",
                addressLocality: event.city,
                addressCountry: event.country,
            },
        },
        ...(event.image_url ? { image: [event.image_url] } : {}),
        ...(event.description ? { description: event.description } : {}),
        ...(event.organizer ? { organizer: { "@type": "Organization", name: event.organizer } } : {}),
        ...(event.ticket_url
            ? { offers: { "@type": "Offer", url: event.ticket_url, availability: "https://schema.org/InStock" } }
            : event.is_free
              ? { offers: { "@type": "Offer", price: "0", priceCurrency: "NGN", availability: "https://schema.org/InStock" } }
              : {}),
    };

    return (
        <main className="w-full mx-auto max-w-3xl px-4 py-16 md:py-24">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-yellow-400 mb-8">
                <ArrowLeft className="w-4 h-4" /> All events
            </Link>

            <div className="space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isLive && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-600 text-white rounded-full px-3 py-1 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now
                            </span>
                        )}
                        {isPast && (
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider border border-white/10 rounded-full px-3 py-1">
                                Past event
                            </span>
                        )}
                        <span className="text-xs font-semibold text-yellow-400/90 uppercase tracking-wider border border-yellow-500/30 bg-yellow-950/30 rounded-full px-3 py-1">
                            {categoryLabel}
                        </span>
                    </div>

                    {event.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full rounded-2xl object-cover border border-white/10 max-h-96"
                        />
                    )}

                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                        {event.title}
                    </h1>

                    <div className="space-y-2 text-gray-300">
                        <p className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            {formatDateTime(event.starts_at)}
                        </p>
                        <p className="flex items-center gap-2 text-gray-500 text-sm pl-6">
                            Ends {formatDateTime(event.ends_at)}
                        </p>
                        <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            {locationName}, {event.country}
                        </p>
                        {event.organizer && (
                            <p className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                Organized by {event.organizer}
                            </p>
                        )}
                    </div>
                </div>

                {event.description && (
                    <Card className="border-white/10 bg-white/5">
                        <CardContent className="pt-6 pb-6 px-6 sm:px-8">
                            <h2 className="text-lg font-bold text-white mb-3">About this event</h2>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{event.description}</p>
                        </CardContent>
                    </Card>
                )}

                {event.ticket_url && !isPast ? (
                    <div className="text-center pt-2">
                        <TicketButton eventId={event.id} ticketUrl={event.ticket_url} />
                        <p className="text-xs text-gray-600 mt-3">
                            Tickets are sold by the event organizer. You will leave AfroPitch.
                        </p>
                    </div>
                ) : event.is_free && !isPast ? (
                    <div className="text-center pt-2">
                        <span className="inline-block rounded-full border border-green-500/30 bg-green-950/30 px-6 py-3 text-base font-semibold text-green-300">
                            Free entry
                        </span>
                    </div>
                ) : null}

                {!isPast && (
                    <InterestButtons
                        eventId={event.id}
                        event={{
                            title: event.title,
                            starts_at: event.starts_at,
                            ends_at: event.ends_at,
                            venue: event.venue,
                            city: event.city,
                        }}
                        userEmail={userEmail}
                    />
                )}
            </div>
        </main>
    );
}
