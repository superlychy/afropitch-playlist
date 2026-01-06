"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { BadgeCheck, Globe, Instagram, Music2, Twitter, Users, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pricingConfig } from "@/../config/pricing";
import { supabase } from "@/lib/supabase";

export default function CuratorProfile() {
    const params = useParams();
    const id = params.id as string;
    const [curator, setCurator] = useState<any>(null);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCuratorData = async () => {
            if (id === 'admin') {
                // Mock Admin Profile
                setCurator({
                    id: 'admin',
                    full_name: 'AfroPitch Team',
                    bio: 'Official in-house curation team. We manage the top editorial playlists on the platform.',
                    avatar_url: '/logo-icon.png',
                    verification_status: 'verified'
                });

                // Fetch All Admin Playlists
                // First get admin IDs
                const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
                const adminIds = admins?.map(a => a.id) || [];

                if (adminIds.length > 0) {
                    const { data: plData } = await supabase
                        .from('playlists')
                        .select('*')
                        .in('curator_id', adminIds)
                        .eq('is_active', true);

                    if (plData) setPlaylists(plData);
                } else {
                    setPlaylists([]);
                }
                setIsLoading(false);
                return;
            }

            // Fetch Real Profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !profile) {
                setIsLoading(false);
                return;
            }
            setCurator(profile);

            // Fetch Playlists
            const { data: plData } = await supabase
                .from('playlists')
                .select('*')
                .eq('curator_id', id)
                .eq('is_active', true);

            if (plData) setPlaylists(plData);
            setIsLoading(false);
        };

        if (id) fetchCuratorData();
    }, [id]);

    if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading profile...</div>;

    if (!curator) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-black text-white">
                <h1 className="text-2xl font-bold">Curator Not Found</h1>
                <Link href="/curators">
                    <Button variant="outline">Browse All Curators</Button>
                </Link>
            </div>
        );
    }

    const totalFollowers = playlists.reduce((acc, curr) => acc + (curr.followers || 0), 0);

    return (
        <div className="min-h-screen pb-20 bg-black">
            {/* Header / Cover Area - Simulating a profile banner */}
            <div className="w-full h-48 md:h-64 bg-zinc-900 border-b border-white/5 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-black/80"></div>
                <div className="absolute top-8 left-4 md:left-8 z-10">
                    <Link href="/curators" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Curators
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row items-end md:items-start gap-6 md:gap-8 mb-12">
                    {/* Profile Image */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-zinc-800 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-4 border-black overflow-hidden">
                        {curator.avatar_url ? (
                            <img src={curator.avatar_url} alt={curator.full_name} className="w-full h-full object-cover" />
                        ) : (
                            curator.full_name?.[0] || "C"
                        )}
                    </div>

                    {/* Profile Details */}
                    <div className="flex-1 space-y-4 pt-2 text-center md:text-left">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <h1 className="text-3xl md:text-4xl font-bold text-white">{curator.full_name || "Curator"}</h1>
                                {/* <div className="text-green-500 bg-green-500/10 p-1 rounded-full"><BadgeCheck className="w-6 h-6" /></div> */}
                            </div>
                            <p className="text-gray-400 text-lg max-w-2xl">{curator.bio || "No bio yet."}</p>
                        </div>

                        {/* Socials & Stats - (Socials columns usually not in basic profile schema yet, mocking for layout) */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                            {/* Future: Add social links here if added to DB */}
                        </div>
                    </div>

                    {/* Quick Stats Box */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-w-[200px] text-center md:text-right hidden md:block">
                        <div className="space-y-4">
                            <div>
                                <span className="block text-3xl font-bold text-white">{playlists.length}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">Active Playlists</span>
                            </div>
                            <div className="h-px bg-white/10 w-full" />
                            <div>
                                <span className="block text-2xl font-bold text-green-500">{totalFollowers.toLocaleString()}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">Total Reach</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Playlists Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Music2 className="text-green-500 w-6 h-6" /> Available Playlists
                    </h2>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {playlists.map((playlist) => {
                            // Parse song count
                            const songMatch = (playlist.description || "").match(/(\d+)\s+(songs|items|tracks)/i);
                            const songs = songMatch ? parseInt(songMatch[1]) : null;

                            return (
                                <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group">
                                    <Card className="bg-white/5 border-white/5 hover:bg-white/[0.07] transition-all overflow-hidden h-full">
                                        <CardContent className="p-0 flex flex-col h-full">
                                            {/* Playlist Cover Strip */}
                                            <div className="w-full h-48 relative overflow-hidden bg-zinc-800">
                                                {playlist.cover_image?.startsWith('http') ? (
                                                    <img src={playlist.cover_image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/20"><Music2 className="w-12 h-12" /></div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                                <div className="absolute bottom-4 left-4 text-white p-2">
                                                    <p className="font-bold text-lg leading-tight">{playlist.name}</p>
                                                    <p className="text-xs text-green-400 font-medium mt-1 uppercase">{playlist.genre}</p>
                                                </div>
                                            </div>

                                            <div className="p-5 space-y-4 flex-1 flex flex-col">
                                                <div className="flex items-center justify-between text-sm text-gray-400">
                                                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {playlist.followers.toLocaleString()}</span>
                                                    {songs && songs > 0 && <span className="text-xs bg-white/10 px-2 py-1 rounded-full">{songs} Items</span>}
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div className="text-sm">
                                                        <span className="block text-[10px] text-gray-500 uppercase tracking-wider">Fee</span>
                                                        <span className="font-bold text-white">
                                                            {playlist.type === 'exclusive'
                                                                ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                                                : playlist.type === 'express'
                                                                    ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                                                    : playlist.type === 'standard'
                                                                        ? `${pricingConfig.currency}${pricingConfig.tiers.standard.price.toLocaleString()}`
                                                                        : playlist.submission_fee > 0
                                                                            ? `${pricingConfig.currency}${playlist.submission_fee.toLocaleString()}`
                                                                            : <span className="text-green-400">FREE</span>
                                                            }
                                                        </span>
                                                    </div>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform" onClick={(e) => {
                                                        e.preventDefault(); // prevent triggering parent link
                                                        window.location.href = `/submit?playlist=${playlist.id}`;
                                                    }}>
                                                        Submit
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
