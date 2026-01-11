"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Music2, Share2, User } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

export default function PlaylistDetail() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const [playlist, setPlaylist] = useState<any>(null);
    const [curator, setCurator] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            // Fetch playlist
            const { data: plData, error: plError } = await supabase
                .from('playlists')
                .select('*')
                .eq('id', id)
                .single();

            if (plError || !plData) {
                console.error(plError);
                setIsLoading(false);
                return; // Handle 404
            }
            setPlaylist(plData);

            // Fetch curator
            const { data: curData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', plData.curator_id)
                .single();

            if (curData) setCurator(curData);
            setIsLoading(false);
        };

        if (id) fetchDetails();
    }, [id]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>;
    if (!playlist) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Playlist not found</div>;

    // Parse song count from description if available
    const songCountMatch = (playlist.description || "").match(/(\d+)\s+(songs|items|tracks)/i);
    const songCount = songCountMatch ? parseInt(songCountMatch[1]) : 0;

    const getPlatformName = (link: string) => {
        if (!link) return 'Playlist';
        if (link.includes('spotify.com')) return 'Spotify';
        if (link.includes('audiomack.com')) return 'Audiomack';
        if (link.includes('apple.com')) return 'Apple Music';
        if (link.includes('deezer.com')) return 'Deezer';
        if (link.includes('soundcloud.com')) return 'SoundCloud';
        if (link.includes('youtube.com') || link.includes('youtu.be')) return 'YouTube';
        return 'Playlist';
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Nav Back */}
            <div className="p-6">
                <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white pl-0 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
            </div>

            <div className="max-w-5xl mx-auto px-6">
                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Cover Image */}
                    <div className="w-full md:w-80 aspect-square rounded-2xl overflow-hidden shadow-2xl relative group bg-zinc-900 border border-white/10">
                        {playlist.cover_image?.startsWith('http') ? (
                            <img src={playlist.cover_image} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music2 className="w-20 h-20 text-gray-600" /></div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {playlist.playlist_link && (
                                <a href={playlist.playlist_link} target="_blank" rel="noreferrer">
                                    <Button variant="outline" className="gap-2 bg-white text-black hover:bg-gray-200 border-none">Listen <ExternalLink className="w-4 h-4" /></Button>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-6 pt-4">
                        <div>
                            <span className="text-green-500 font-bold tracking-wider text-sm uppercase mb-2 block">{playlist.genre}</span>
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">{playlist.name}</h1>
                            <p className="text-xl text-gray-300 max-w-2xl">{playlist.description}</p>
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm text-gray-400 border-y border-white/10 py-6">
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-lg">{playlist.followers.toLocaleString()}</span>
                                <span>Followers</span>
                            </div>
                            {songCount > 0 && (
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-lg">{songCount}</span>
                                    <span>Items</span>
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-lg">
                                    {playlist.type === 'exclusive'
                                        ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                        : playlist.type === 'express'
                                            ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                            : playlist.type === 'standard'
                                                ? `${pricingConfig.currency}${pricingConfig.tiers.standard.price.toLocaleString()}`
                                                : playlist.submission_fee > 0 ? `${pricingConfig.currency}${playlist.submission_fee.toLocaleString()}` : 'Free'
                                    }
                                </span>
                                <span>Submission Fee</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Link href={`/submit?playlist=${playlist.id}`} className="flex-1 md:flex-none">
                                <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700 h-12 px-8 text-lg">
                                    Submit Song
                                </Button>
                            </Link>
                            {playlist.playlist_link && (
                                <a href={playlist.playlist_link} target="_blank" rel="noreferrer">
                                    <Button variant="outline" className="h-12 border-white/20 hover:bg-white/10 gap-2">
                                        Open in {getPlatformName(playlist.playlist_link)} <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </a>
                            )}
                        </div>

                        {/* Curator Info */}
                        {curator && (
                            <div className="bg-white/5 rounded-xl p-6 mt-8 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push(`/curators/${curator.id}`)}>
                                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-xl font-bold overflow-hidden text-white/50">
                                    {curator.avatar_url ? <img src={curator.avatar_url} className="w-full h-full object-cover" /> : (curator.full_name?.[0] || "C")}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Curated by</p>
                                    <p className="font-bold text-white hover:underline">{curator.full_name || curator.email?.split("@")[0]}</p>
                                </div>
                                <ArrowLeft className="w-4 h-4 text-gray-500 ml-auto rotate-180" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

