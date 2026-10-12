import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArtistFanPage, type FanSong } from "@/components/ArtistFanPage";
import type { ArtistProfile } from "@/components/ArtistCard";

export const dynamic = "force-dynamic";

const getAdminSupabase = () =>
    createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface Props {
    params: { slug: string };
}

async function getArtist(slug: string): Promise<{ profile: ArtistProfile; songs: FanSong[] } | null> {
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, profile_slug, photo_url, bio, instagram, twitter, tiktok, youtube, website")
        .eq("profile_slug", slug)
        .single();
    if (!profile) return null;

    const { data: songs } = await supabase
        .from("submissions")
        .select(
            "id, song_title, song_link, apple_music_url, audiomack_url, boomplay_url, cover_art_url, playlist:playlists(name, playlist_link)"
        )
        .eq("artist_id", profile.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

    return {
        profile: profile as ArtistProfile,
        songs: ((songs || []) as any[]).map((s) => ({
            ...s,
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
            <ArtistFanPage profile={data.profile} songs={data.songs} />
        </main>
    );
}
