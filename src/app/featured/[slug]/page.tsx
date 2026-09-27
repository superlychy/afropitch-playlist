import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Music2, ArrowLeft } from "lucide-react";

interface Feature {
    id: string;
    slug: string;
    week_start: string;
    headline: string | null;
    story: string | null;
    bio: string | null;
    qa: { q: string; a: string }[] | null;
    photo_url: string | null;
    cover_art_url: string | null;
    socials: Record<string, string> | null;
    artist_id: string | null;
    artist_name: string | null;
    song_title: string | null;
}

async function getFeature(slug: string): Promise<Feature | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("featured_artists")
        .select("id, slug, week_start, headline, story, bio, qa, photo_url, cover_art_url, socials, artist_id, submission_id")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
    if (!data) return null;

    let artist_name: string | null = null;
    if (data.artist_id) {
        const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.artist_id)
            .maybeSingle();
        artist_name = (prof?.full_name as string) ?? null;
    }
    let song_title: string | null = null;
    if (data.submission_id) {
        const { data: sub } = await supabase
            .from("submissions")
            .select("song_title")
            .eq("id", data.submission_id)
            .maybeSingle();
        song_title = (sub?.song_title as string) ?? null;
    }
    return { ...(data as any), artist_name, song_title };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const feature = await getFeature(slug);
    const siteUrl = "https://afropitchplay.best";
    if (!feature) return { title: "Featured Artist | AfroPitch" };

    const name = feature.artist_name ?? "Featured Artist";
    const description =
        feature.bio?.slice(0, 160) ??
        feature.headline ??
        `${name} is AfroPitch's Featured Artist of the Week — discover their story, sound, and music.`;
    // Artist photo if uploaded, otherwise the song's cover art (set when the draft is created).
    const image = feature.photo_url ?? feature.cover_art_url;

    return {
        title: `${name} — Featured Artist of the Week | AfroPitch`,
        description,
        keywords: [name, "afrobeats artist", "african musician", "featured artist", "AfroPitch", feature.song_title ?? ""].filter(Boolean),
        openGraph: {
            title: `${name} — Featured Artist of the Week | AfroPitch`,
            description,
            url: `${siteUrl}/featured/${feature.slug}`,
            type: "article",
            ...(image ? { images: [{ url: image }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: `${name} — Featured Artist of the Week | AfroPitch`,
            description,
            ...(image ? { images: [image] } : {}),
        },
        alternates: { canonical: `${siteUrl}/featured/${feature.slug}` },
    };
}

export default async function FeaturedArtistPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const feature = await getFeature(slug);
    if (!feature) notFound();

    const name = feature.artist_name ?? "Featured Artist";
    const image = feature.photo_url ?? feature.cover_art_url;

    // Normalize socials: "@handle" becomes a full profile URL.
    const socialLinks: { label: string; url: string }[] = [];
    const socials = feature.socials ?? {};
    const norm = (key: string, base: string) => {
        const raw = (socials[key] ?? "").trim();
        if (!raw) return;
        if (/^https?:\/\//i.test(raw)) return { label: key, url: raw };
        const handle = raw.replace(/^@/, "");
        return { label: key, url: `${base}${handle}` };
    };
    const labels: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", x: "X", spotify: "Spotify" };
    for (const [key, base] of [["instagram", "https://instagram.com/"], ["tiktok", "https://tiktok.com/@"], ["x", "https://x.com/"], ["spotify", ""]] as const) {
        if (key === "spotify") {
            const raw = (socials.spotify ?? "").trim();
            if (raw && /^https?:\/\//i.test(raw)) socialLinks.push({ label: "Spotify", url: raw });
            continue;
        }
        const link = norm(key, base);
        if (link) socialLinks.push({ label: labels[key], url: link.url });
    }
    const weekLabel = feature.week_start
        ? new Date(feature.week_start + "T00:00:00").toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name,
        description: feature.bio ?? feature.headline ?? undefined,
        image: image ?? undefined,
        ...(feature.song_title
            ? { track: { "@type": "MusicRecording", name: feature.song_title, byArtist: { "@type": "MusicGroup", name } } }
            : {}),
    };

    return (
        <main className="w-full mx-auto max-w-3xl px-4 py-16 md:py-24">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Link href="/featured" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-yellow-400 mb-8">
                <ArrowLeft className="w-4 h-4" /> All featured artists
            </Link>

            <div className="space-y-8">
                <div className="text-center space-y-4">
                    <div className="inline-block rounded-full border border-yellow-500/30 bg-yellow-950/30 px-4 py-1.5 text-sm text-yellow-300">
                        ⭐ Featured Artist of the Week
                    </div>
                    {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={image}
                            alt={name}
                            className="w-40 h-40 rounded-full object-cover mx-auto border-2 border-yellow-500/40 shadow-xl shadow-yellow-500/10"
                        />
                    )}
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white">{name}</h1>
                    {feature.headline && (
                        <p className="text-xl text-yellow-200/90 font-medium max-w-xl mx-auto">{feature.headline}</p>
                    )}
                    {socialLinks.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {socialLinks.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold px-4 py-2 rounded-full border border-white/15 bg-white/5 text-gray-200 hover:border-yellow-500/50 hover:text-yellow-300 transition-colors"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    )}
                    {weekLabel && (
                        <p className="text-sm text-gray-500 inline-flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4" /> Week of {weekLabel}
                        </p>
                    )}
                </div>

                {feature.bio && (
                    <Card className="border-yellow-500/20 bg-gradient-to-b from-yellow-950/20 to-black/60">
                        <CardContent className="pt-6 pb-6 px-6 sm:px-8">
                            <h2 className="text-lg font-bold text-white mb-3">About {name}</h2>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{feature.bio}</p>
                        </CardContent>
                    </Card>
                )}

                {feature.qa && feature.qa.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Music2 className="w-5 h-5 text-yellow-400" /> In {name.split(" ")[0]}'s words
                        </h2>
                        {feature.qa.map((item, i) => (
                            <Card key={i} className="border-white/10 bg-white/5">
                                <CardContent className="pt-5 pb-5 px-6">
                                    <p className="text-yellow-200/90 font-semibold text-sm mb-2">{item.q}</p>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-[15px]">{item.a}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {feature.story && (
                    <Card className="border-white/10 bg-white/5">
                        <CardContent className="pt-6 pb-6 px-6 sm:px-8">
                            <h2 className="text-lg font-bold text-white mb-3">Why we picked {name.split(" ")[0]}</h2>
                            <p className="text-gray-400 leading-relaxed whitespace-pre-line">{feature.story}</p>
                        </CardContent>
                    </Card>
                )}

                <div className="text-center pt-4">
                    <p className="text-gray-500 text-sm mb-4">
                        Are you an artist? Get your music heard by real curators.
                    </p>
                    <Link
                        href="/portal"
                        className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl px-8 py-3.5 transition-colors"
                    >
                        Submit your song
                    </Link>
                </div>
            </div>
        </main>
    );
}
