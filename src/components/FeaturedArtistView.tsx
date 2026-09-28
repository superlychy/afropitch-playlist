"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Music2 } from "lucide-react";

interface Feature {
    id: string;
    slug: string | null;
    week_start: string;
    headline: string;
    story: string;
    artist_id: string | null;
    photo_url: string | null;
    cover_art_url: string | null;
}

export function FeaturedArtistView() {
    const [feature, setFeature] = useState<Feature | null>(null);
    const [artistName, setArtistName] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase
                .from("featured_artists")
                .select("id, slug, week_start, headline, story, artist_id, photo_url, cover_art_url")
                .eq("status", "published")
                .order("week_start", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) {
                setFeature(data as Feature);
                if (data.artist_id) {
                    const { data: prof } = await supabase
                        .from("profiles")
                        .select("full_name")
                        .eq("id", data.artist_id)
                        .maybeSingle();
                    if (prof?.full_name) setArtistName(prof.full_name as string);
                }
            }
            setLoading(false);
        })();
    }, []);

    if (loading) return <p className="text-gray-500 text-center">Loading this week's feature…</p>;

    if (!feature) {
        return (
            <Card className="bg-white/5 border-dashed border-white/10 p-10 text-center">
                <Music2 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                    The first featured artist drops soon. Watch this space.
                </p>
            </Card>
        );
    }

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
                            alt={artistName || "Featured artist"}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10 flex-shrink-0"
                        />
                    )}
                    <div className="min-w-0">
                        <p className="text-xs text-yellow-500/80 uppercase tracking-widest">
                            Week of {new Date(feature.week_start + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                            {artistName || "Featured Artist"}
                        </h2>
                        {feature.headline && (
                            <p className="text-lg text-yellow-200/90 font-medium mt-1">{feature.headline}</p>
                        )}
                    </div>
                </div>
                {feature.story && (
                    <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {feature.story}
                    </div>
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
