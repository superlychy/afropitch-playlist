import type { Metadata } from "next";
import Link from "next/link";
import { FeaturedArtistView } from "@/components/FeaturedArtistView";
import { createClient } from "@/lib/supabase-server";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Featured Artist of the Week | AfroPitch",
    description:
        "Every week AfroPitch spotlights one African artist on the rise — their story, their sound, and the song you need to hear.",
    keywords: [
        "african artist spotlight",
        "afrobeats artist of the week",
        "amapiano new artists",
        "AfroPitch featured artist",
    ],
    openGraph: {
        title: "Featured Artist of the Week | AfroPitch",
        description:
            "One African artist on the rise, spotlighted every week.",
        url: "https://afropitchplay.best/featured",
        type: "website",
    },
};

async function FeaturedArchive() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("featured_artists")
        .select("id, slug, week_start, headline, artist_id")
        .eq("status", "published")
        .not("slug", "is", null)
        .order("week_start", { ascending: false });

    if (!data || data.length <= 1) return null;

    const withNames = await Promise.all(
        data.slice(1).map(async (f: any) => {
            let name = "Featured Artist";
            if (f.artist_id) {
                const { data: prof } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", f.artist_id)
                    .maybeSingle();
                if (prof?.full_name) name = prof.full_name as string;
            }
            return { ...f, name };
        })
    );

    return (
        <div className="mt-16">
            <h2 className="text-xl font-bold text-white mb-4">Past features</h2>
            <div className="space-y-2">
                {withNames.map((f: any) => (
                    <Link
                        key={f.id}
                        href={`/featured/${f.slug}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 hover:border-yellow-500/40 hover:bg-yellow-950/10 transition-colors group"
                    >
                        <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{f.name}</p>
                            <p className="text-sm text-gray-500 truncate">
                                {f.headline ||
                                    (f.week_start
                                        ? `Week of ${new Date(f.week_start + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`
                                        : "")}
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-yellow-400 flex-shrink-0 transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function FeaturedPage() {
    return (
        <main className="w-full mx-auto max-w-4xl px-4 py-16 md:py-24">
            <div className="text-center space-y-4 mb-12">
                <div className="inline-block rounded-full border border-yellow-500/30 bg-yellow-950/30 px-4 py-1.5 text-sm text-yellow-300">
                    ⭐ Featured Artist of the Week
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    This week's <span className="text-yellow-400">spotlight</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Every week we pick one African artist on the rise — not just the
                    numbers, but the sound, the story, and the staying power.
                </p>
            </div>
            <FeaturedArtistView />
            <FeaturedArchive />
        </main>
    );
}
