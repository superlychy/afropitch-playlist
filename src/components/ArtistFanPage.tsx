import Link from "next/link";
import { Star, Disc3, ChevronRight } from "lucide-react";
import { ArtistSocials, type ArtistProfile } from "./ArtistCard";

export interface PublishedFeature {
    slug: string | null;
    headline: string | null;
    story: string | null;
    qa: { q: string; a: string }[] | null;
}

export interface ArtistSong {
    id: string;
    song_title: string;
    cover_art_url: string | null;
    tracking_slug: string | null;
    playlist: { name: string } | null;
}

// The artist page: photo, bio, socials, songs.
// The bio always shows; the story + Q&A only appear once the artist has a
// published Spotlight feature. Each song links to its own song page
// (the tracking link), where its platform links live.
export function ArtistFanPage({
    profile,
    feature,
    songs = [],
}: {
    profile: ArtistProfile;
    feature?: PublishedFeature | null;
    songs?: ArtistSong[];
}) {
    const qa = Array.isArray(feature?.qa) ? feature.qa.filter((item) => item?.a?.trim()) : [];
    const showFeature = !!feature && (!!feature.story?.trim() || qa.length > 0);

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center">
                    {profile.photo_url ? (
                        <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-bold text-zinc-600">
                            {profile.full_name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="min-w-0">
                    <h1 className="text-3xl font-extrabold text-white">{profile.full_name}</h1>
                    {profile.bio && (
                        <p className="text-zinc-400 text-sm mt-2 max-w-xl text-left whitespace-pre-line">
                            {profile.bio}
                        </p>
                    )}
                    <ArtistSocials profile={profile} className="mt-4 justify-center sm:justify-start" />
                </div>
            </div>

            {/* Spotlight feature: unlocked by a published feature */}
            {showFeature && (
                <section className="mt-10 bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-400">
                            {feature.headline?.trim() || "Featured Artist"}
                        </span>
                    </div>
                    {feature.story?.trim() && (
                        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                            {feature.story}
                        </p>
                    )}
                    {qa.length > 0 && (
                        <div className="mt-6 space-y-5">
                            {qa.map((item, i) => (
                                <div key={i}>
                                    <p className="text-white font-bold text-sm">{item.q}</p>
                                    <p className="text-zinc-400 text-sm mt-1 leading-relaxed whitespace-pre-line">
                                        {item.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {feature.slug && (
                        <Link
                            href={`/featured/${feature.slug}`}
                            className="inline-block mt-6 text-xs font-bold text-[#22C55E] hover:underline"
                        >
                            Read the full feature
                        </Link>
                    )}
                </section>
            )}

            {/* Songs: each links to its own song page with its platform links */}
            {songs.length > 0 && (
                <section className="mt-10">
                    <h2 className="text-lg font-bold text-white mb-4">Songs</h2>
                    <div className="space-y-3">
                        {songs.map((song) => {
                            const inner = (
                                <>
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                                        {song.cover_art_url ? (
                                            <img src={song.cover_art_url} alt={song.song_title} className="w-full h-full object-cover" />
                                        ) : (
                                            <Disc3 className="w-5 h-5 text-zinc-600" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white text-sm truncate">{song.song_title}</p>
                                        {song.playlist && (
                                            <p className="text-[#22C55E] text-xs font-semibold mt-0.5 truncate">
                                                On {song.playlist.name}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                                </>
                            );
                            const cls =
                                "bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:border-[#22C55E]/40 transition-colors";
                            return song.tracking_slug ? (
                                <Link key={song.id} href={`/track/${song.tracking_slug}`} className={cls}>
                                    {inner}
                                </Link>
                            ) : (
                                <div key={song.id} className={cls}>
                                    {inner}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <p className="text-center text-zinc-600 text-xs mt-12">
                Discover African music on <Link href="/" className="text-zinc-400 font-semibold">AfroPitch</Link>
            </p>
        </div>
    );
}
