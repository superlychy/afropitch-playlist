import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArtistFanPage } from "@/components/ArtistFanPage";
import type { ArtistProfile } from "@/components/ArtistCard";

export const dynamic = "force-dynamic";

const getAdminSupabase = () =>
    createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface Props {
    params: { slug: string };
}

async function getArtist(slug: string): Promise<{
    profile: ArtistProfile;
    feature: { slug: string | null; headline: string | null; story: string | null; qa: { q: string; a: string }[] | null } | null;
    songs: { id: string; song_title: string; cover_art_url: string | null; tracking_slug: string | null; playlist: { name: string } | null }[];
} | null> {
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, profile_slug, photo_url, bio, instagram, twitter, tiktok, youtube, website")
        .eq("profile_slug", slug)
        .single();
    if (!profile) return null;

    // A published Spotlight feature unlocks the story + Q&A on the artist page.
    const { data: feature } = await supabase
        .from("featured_artists")
        .select("slug, headline, story, qa")
        .eq("artist_id", profile.id)
        .eq("status", "published")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

    const { data: songs } = await supabase
        .from("submissions")
        .select("id, song_title, cover_art_url, tracking_slug, playlist:playlists(name)")
        .eq("artist_id", profile.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

    return {
        profile: profile as ArtistProfile,
        feature,
        songs: ((songs || []) as any[]).map((s) => ({
            id: s.id,
            song_title: s.song_title,
            cover_art_url: s.cover_art_url,
            tracking_slug: s.tracking_slug,
            playlist: Array.isArray(s.playlist) ? s.playlist[0] ?? null : s.playlist,
        })),
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await Promise.resolve(params);
    const data = await getArtist(slug);
    if (!data) return { title: "Artist not found | AfroPitch" };
    const { profile } = data;
    return {
        title: `${profile.full_name} | AfroPitch`,
        description: profile.bio || `Listen to ${profile.full_name} on AfroPitch.`,
        openGraph: {
            title: `${profile.full_name} | AfroPitch`,
            description: profile.bio || `Listen to ${profile.full_name} on AfroPitch.`,
            ...(profile.photo_url ? { images: [profile.photo_url] } : {}),
        },
    };
}

export default async function ArtistPage({ params }: Props) {
    const { slug } = await Promise.resolve(params);
    const data = await getArtist(slug);

    if (!data) {
        return (
            <main className="w-full mx-auto max-w-3xl px-4 py-24 text-center">
                <h1 className="text-2xl font-bold text-white">Artist not found</h1>
                <p className="text-zinc-500 text-sm mt-2">This artist page does not exist.</p>
                <Link href="/" className="text-[#22C55E] text-sm font-bold mt-4 inline-block">
                    Back home
                </Link>
            </main>
        );
    }

    return (
        <main className="w-full mx-auto max-w-3xl px-4 py-16 md:py-24">
            <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-yellow-400 mb-8"
            >
                <ArrowLeft className="w-4 h-4" /> Home
            </Link>
            <ArtistFanPage profile={data.profile} feature={data.feature} songs={data.songs} />
        </main>
    );
}
