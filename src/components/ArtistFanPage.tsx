import Link from "next/link";
import { Play } from "lucide-react";
import { ArtistSocials, type ArtistProfile } from "./ArtistCard";

export interface FanSong {
    id: string;
    song_title: string;
    song_link: string | null;
    apple_music_url: string | null;
    audiomack_url: string | null;
    boomplay_url: string | null;
    cover_art_url: string | null;
    playlist: { name: string; playlist_link: string | null } | null;
}

function platformLinks(song: FanSong): { label: string; url: string }[] {
    const links: { label: string; url: string }[] = [];
    const push = (label: string, url: string | null) => {
        if (url?.trim()) links.push({ label, url: url.trim() });
    };
    push("Spotify", song.song_link);
    push("Apple Music", song.apple_music_url);
    push("Audiomack", song.audiomack_url);
    push("Boomplay", song.boomplay_url);
    return links;
}

// The artist fan page: photo, bio, socials, songs with platform + playlist links.
// Used by /artist/[slug] and by /track/[slug] (with the clicked song featured).
// The bio always shows; feature Q&A answers are reserved for Spotlight features.
export function ArtistFanPage({
    profile,
    songs,
    featuredSongId,
    viral,
}: {
    profile: ArtistProfile;
    songs: FanSong[];
    featuredSongId?: string;
    viral?: { clicks: number; needed: number };
}) {
    const ordered = [...songs].sort((a, b) =>
        a.id === featuredSongId ? -1 : b.id === featuredSongId ? 1 : 0
    );
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
                    {profile.bio && <p className="text-zinc-400 text-sm mt-2 max-w-xl">{profile.bio}</p>}
                    <ArtistSocials profile={profile} className="mt-4 justify-center sm:justify-start" />
                </div>
            </div>

            {/* Viral strip (track-link visits only) */}
            {viral && (
                <div className="mt-8 bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Viral Progress</span>
                        <span className={`font-bold ${viral.clicks >= viral.needed ? "text-yellow-400" : "text-green-400"}`}>
                            {viral.clicks}/{viral.needed} Clicks
                        </span>
                    </div>
                    <div className="h-2.5 w-full bg-black/50 rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all"
                            style={{ width: `${Math.min(Math.round((viral.clicks / viral.needed) * 100), 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Share this link to boost the ranking.</p>
                </div>
            )}

            {/* Songs */}
            <section className="mt-10">
                <h2 className="text-lg font-bold text-white mb-4">Songs on AfroPitch playlists</h2>
                {ordered.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No songs live on playlists yet.</p>
                ) : (
                    <div className="space-y-3">
                        {ordered.map((song) => (
                            <div
                                key={song.id}
                                className={`bg-white/5 border rounded-2xl p-4 flex items-center gap-4 ${
                                    song.id === featuredSongId ? "border-[#22C55E]/50" : "border-white/10"
                                }`}
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                                    {song.cover_art_url ? (
                                        <img src={song.cover_art_url} alt={song.song_title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Play className="w-5 h-5 text-zinc-600" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-white text-sm truncate">{song.song_title}</p>
                                    {song.playlist && (
                                        <p className="text-[#22C55E] text-xs font-semibold mt-0.5 truncate">
                                            On {song.playlist.name}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {platformLinks(song).map((l) => (
                                            <a
                                                key={l.label}
                                                href={l.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] font-semibold text-zinc-300 border border-white/10 rounded-full px-2.5 py-1 hover:border-[#22C55E]/50 hover:text-white transition-colors"
                                            >
                                                {l.label}
                                            </a>
                                        ))}
                                        {song.playlist?.playlist_link && (
                                            <a
                                                href={song.playlist.playlist_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] font-bold text-[#04120a] bg-[#22C55E] rounded-full px-2.5 py-1"
                                            >
                                                Playlist
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <p className="text-center text-zinc-600 text-xs mt-12">
                Discover African music on <Link href="/" className="text-zinc-400 font-semibold">AfroPitch</Link>
            </p>
        </div>
    );
}
