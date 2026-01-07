"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Music2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CuratorsPage() {
    const [curatorList, setCuratorList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurators = async () => {
            // 1. Fetch Real Curators
            const { data: realCurators } = await supabase
                .from('profiles')
                .select('*, playlists(*)')
                .eq('role', 'curator')
                .eq('verification_status', 'verified');

            // 2. Fetch Admin Playlists Count (for AfroPitch Team)
            const { count } = await supabase
                .from('playlists')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .in('curator_id', (await supabase.from('profiles').select('id').eq('role', 'admin')).data?.map(a => a.id) || []);

            const afropitchTeam = {
                id: 'admin', // Virtual ID for routing
                name: 'AfroPitch Team',
                bio: 'Official in-house curation team. We manage the top editorial playlists on the platform.',
                verified: true,
                playlistCount: count || 0,
                avatar: '/logo-icon.png', // Assuming site icon exists or use a placeholder
                isTeam: true
            };

            const mappedCurators = realCurators ? realCurators.map(c => ({
                id: c.id,
                name: c.full_name || 'Curator',
                bio: c.bio || 'Music Curator on AfroPitch.',
                verified: c.verification_status === 'verified',
                playlistCount: c.playlists?.length || 0,
                avatar: c.avatar_url
            })) : [];

            // Prepend Team
            setCuratorList([afropitchTeam, ...mappedCurators]);
            setLoading(false);
        };
        fetchCurators();
    }, []);

    return (
        <div className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Meet Our <span className="text-green-500">Curators</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Choose who listens to your music. Browse verified curators and submit directly to their specific playlists.
                </p>
            </div>

            {loading ? (
                <div className="text-center text-gray-500">Loading curators...</div>
            ) : (
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {curatorList.length === 0 && <p className="text-gray-500 col-span-full text-center">No curators found.</p>}
                    {curatorList.map((curator) => (
                        <div key={curator.id} className="space-y-4">
                            <Card
                                className="cursor-pointer transition-all border-white/10 bg-black/40 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                                            {curator.avatar ? (
                                                <img src={curator.avatar} alt={curator.name} className="w-full h-full object-cover" />
                                            ) : (
                                                curator.name.charAt(0)
                                            )}
                                        </div>
                                        {curator.verified && (
                                            <div className="flex items-center gap-1 text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">
                                                <BadgeCheck className="w-3 h-3" /> Verified
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="mt-4 text-xl text-white">{curator.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 text-gray-400">{curator.bio}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Music2 className="w-4 h-4" /> {curator.playlistCount} Playlists
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link href={`/curators/${curator.id}`} className="w-full">
                                        <Button variant="ghost" className="w-full text-green-400 hover:text-green-300 hover:bg-green-400/10 group">
                                            View Profile <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
