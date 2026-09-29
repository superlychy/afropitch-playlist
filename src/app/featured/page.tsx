import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Music2 } from "lucide-react";

export const metadata: Metadata = {
    title: "AfroPitch Spotlight | AfroPitch",
    description:
        "The AfroPitch Spotlight champions African artists on the rise — Artist of the Season, Artist of the Week and Rising Artist: their stories, their sound, and the songs you need to hear.",
    keywords: [
        "afropitch spotlight",
        "african artist spotlight",
        "artist of the week afrobeats",
        "artist of the season afrobeats",
        "rising african artists",
        "amapiano new artists",
        "AfroPitch featured artist",
    ],
    openGraph: {
        title: "AfroPitch Spotlight | AfroPitch",
        description:
            "The artists we're championing right now — across every tier.",
        url: "https://afropitchplay.best/featured",
        type: "website",
    },
};

// Display order: prestige first. Any headline not listed here automatically
// gets its own section after these, so future categories need no code changes.
const TIER_ORDER = ["Artist of the Season", "Artist of the Week", "Rising Artist"];

const TIER_META: Record<string, { emoji: string; blurb: string }> = {
    "Artist of the Season": {
        emoji: "🌟",
        blurb: "Our quarterly crown — one artist carrying the sound of the season.",
    },
    "Artist of the Week": {
        emoji: "⭐",
        blurb: "Every week, one African artist on the rise.",
    },
    "Rising Artist": {
        emoji: "🚀",
        blurb: "New names breaking through — hear them first.",
    },
};

interface SpotlightFeature {
    id: string;
    slug: string | null;
    week_start: string;
    headline: string | null;
    story: string | null;
    artist_id: string | null;
    photo_url: string | null;
    cover_art_url: string | null;
    name: string;
}

function formatDate(weekStart: string) {
    return new Date(weekStart + "T00:00:00").toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function HolderCard({ feature }: { feature: SpotlightFeature }) {
    // Artist photo if uploaded, otherwise the song's cover art — same fallback as the detail page.
    const image = feature.photo_url ?? feature.cover_art_url;

    const card = (
        <Card className="border-yellow-500/20 bg-gradient-to-b from-yellow-950/20 to-black/60 overflow-hidden">
            <CardContent className="pt-8 pb-8 px-6 sm:px-10 space-y-5">
                <div className="flex items-center gap-5">
                    {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={image}
                            alt={feature.name}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10 flex-shrink-0"
                        />
                    )}
                    <div className="min-w-0">
                        <p className="text-xs text-yellow-500/80 uppercase tracking-widest">
                            {formatDate(feature.week_start)}
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                            {feature.name}
                        </h2>
                    </div>
                </div>
                {feature.story && (
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line line-clamp-4">
                        {feature.story}
                    </p>
                )}
            </CardContent>
        </Card>
    );

    if (!feature.slug) return card;

    return (
        <Link href={`/featured/${feature.slug}`} className="block cursor-pointer">
            {card}
        </Link>
    );
}

function ComingSoonCard() {
    return (
        <Card className="bg-white/5 border-dashed border-white/10 p-10 text-center">
            <Music2 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Announcing soon. Watch this space.</p>
        </Card>
    );
}

export default async function FeaturedPage() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("featured_artists")
        .select("id, slug, week_start, headline, story, artist_id, photo_url, cover_art_url")
        .eq("status", "published")
        .not("slug", "is", null)
        .order("week_start", { ascending: false });

    const rows = (data ?? []) as SpotlightFeature[];

    // Resolve artist names in one query.
    const ids = [...new Set(rows.map((r) => r.artist_id).filter(Boolean))] as string[];
    const names: Record<string, string> = {};
    if (ids.length > 0) {
        const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
        for (const p of (profs ?? []) as { id: string; full_name: string | null }[]) {
            if (p.full_name) names[p.id] = p.full_name;
        }
    }
    const features = rows.map((r) => ({
        ...r,
        name: (r.artist_id && names[r.artist_id]) || "Featured Artist",
    }));

    // Group by tier; the current holder is the latest published per tier.
    const byTier = new Map<string, SpotlightFeature[]>();
    for (const f of features) {
        const tier = f.headline || "Spotlight";
        if (!byTier.has(tier)) byTier.set(tier, []);
        byTier.get(tier)!.push(f);
    }

    const sections = [
        ...TIER_ORDER.map((tier) => ({ tier, holder: byTier.get(tier)?.[0] ?? null })),
        ...[...byTier.keys()]
            .filter((t) => !TIER_ORDER.includes(t))
            .map((tier) => ({ tier, holder: byTier.get(tier)?.[0] ?? null })),
    ];

    // Archive: everything except the current holder of each tier.
    const currentIds = new Set(
        sections.map((s) => s.holder?.id).filter(Boolean) as string[]
    );
    const archive = features.filter((f) => !currentIds.has(f.id));

    return (
        <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24">
            <div className="text-center space-y-4 mb-12">
                <div className="inline-block rounded-full border border-yellow-500/30 bg-yellow-950/30 px-4 py-1.5 text-sm text-yellow-300">
                    ✨ The AfroPitch Spotlight
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Artists we&apos;re <span className="text-yellow-400">championing</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    One stage, every tier — from weekly risers to the artist of the
                    season. The sound, the story, and the staying power.
                </p>
            </div>

            {sections.map(({ tier, holder }) => {
                const meta = TIER_META[tier] ?? { emoji: "✨", blurb: "" };
                return (
                    <section key={tier} className="mb-14">
                        <div className="mb-5">
                            <h2 className="text-2xl font-bold text-white">
                                {meta.emoji} {tier}
                            </h2>
                            {meta.blurb && (
                                <p className="text-gray-400 mt-1">{meta.blurb}</p>
                            )}
                        </div>
                        {holder ? <HolderCard feature={holder} /> : <ComingSoonCard />}
                    </section>
                );
            })}

            {archive.length > 0 && (
                <div className="mt-16">
                    <h2 className="text-xl font-bold text-white mb-4">Past spotlights</h2>
                    <div className="space-y-2">
                        {archive.map((f) => (
                            <Link
                                key={f.id}
                                href={`/featured/${f.slug}`}
                                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 hover:border-yellow-500/40 hover:bg-yellow-950/10 transition-colors group"
                            >
                                <div className="min-w-0">
                                    <p className="text-white font-semibold truncate">{f.name}</p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {f.headline}
                                        {f.week_start ? ` · ${formatDate(f.week_start)}` : ""}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-yellow-400 flex-shrink-0 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
