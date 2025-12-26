"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BadgeCheck, Music2, Users, ArrowRight, ListMusic, User, Search, Filter } from "lucide-react";

import Link from "next/link";
import { pricingConfig } from "@/../config/pricing";

export default function PlaylistsPage() {
    const [activeTab, setActiveTab] = useState<"playlists" | "curators">("playlists");
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [curators, setCurators] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("All");

    const genres = ["All", "Afrobeats", "Amapiano", "Hip Hop", "RnB", "Pop", "Alternative"]; // Add more as needed

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Playlists with error handling and timeout
                const fetchPlaylistsPromise = supabase
                    .from('playlists')
                    .select('*')
                    .eq('is_active', true)
                    .order('followers', { ascending: false });

                const fetchCuratorsPromise = supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'curator');

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Request timed out")), 5000)
                );

                const [plResult, curResult] = await Promise.allSettled([
                    Promise.race([fetchPlaylistsPromise, timeoutPromise]),
                    Promise.race([fetchCuratorsPromise, timeoutPromise])
                ]);

                // Handle Playlists Result
                if (plResult.status === 'fulfilled' && (plResult.value as any).data) {
                    const plData = (plResult.value as any).data;
                    const mapped = plData.map((p: any) => {
                        const match = (p.description || "").match(/(\d+)\s+songs/i);
                        return { ...p, songCount: match ? match[1] : null };
                    });
                    setPlaylists(mapped);
                } else {
                    console.error("Playlists fetch failed or timed out", plResult);
                    // Fallback Mock Data for testing if backend fails
                    setPlaylists([
                        { id: '1', name: 'Afro Hits', description: 'Top Afrobeat hits. 50 songs', followers: 1200, cover_image: null, genre: 'Afrobeats', submission_fee: 3000, songCount: '50' },
                        { id: '2', name: 'Chill Vibes', description: 'Relaxing tunes. 30 songs', followers: 800, cover_image: null, genre: 'RnB', submission_fee: 0, songCount: '30' }
                    ]);
                }

                // Handle Curators Result
                if (curResult.status === 'fulfilled' && (curResult.value as any).data) {
                    setCurators((curResult.value as any).data);
                } else {
                    console.error("Curators fetch failed or timed out", curResult);
                    setCurators([
                        { id: 'c1', full_name: 'DJ Noni', bio: 'Curator for top hits', avatar_url: null, role: 'curator' }
                    ]);
                }

            } catch (err) {
                console.error("Unexpected error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredPlaylists = playlists.filter(pl => {
        const matchesSearch = pl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (pl.description || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenre = selectedGenre === "All" || (pl.genre && pl.genre.toLowerCase() === selectedGenre.toLowerCase()); // Simple exact match or loosen it
        return matchesSearch && matchesGenre;
    });

    const filteredCurators = curators.filter(cur => {
        const matchesSearch = (cur.full_name || "Curator").toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });


    return (
        <div className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24 min-h-screen">
            <div className="text-center mb-12 space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Discover <span className="text-green-500">Music</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Browse top-tier playlists or find your favorite curators to pitch your music to.
                </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="max-w-2xl mx-auto mb-10 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search playlists or curators..."
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {activeTab === "playlists" && (
                    <div className="w-full md:w-48">
                        <Select
                            className="bg-white/5 border-white/10 text-white"
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                        >
                            {genres.map(g => (
                                <option key={g} value={g} className="bg-zinc-900 text-white">{g}</option>
                            ))}
                        </Select>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-12">
                <div className="bg-white/5 p-1 rounded-full flex gap-1 border border-white/10">
                    <button
                        onClick={() => setActiveTab("playlists")}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "playlists" ? "bg-green-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        Playlists
                    </button>
                    <button
                        onClick={() => setActiveTab("curators")}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "curators" ? "bg-green-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        Curators
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="text-center py-20 text-gray-500">Loading {activeTab}...</div>
            )}

            {!isLoading && activeTab === "playlists" && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPlaylists.length === 0 && <div className="text-center w-full col-span-full text-gray-500">No playlists found.</div>}
                    {filteredPlaylists.map((playlist) => (
                        <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group">
                            <Card className="bg-white/5 border-white/5 hover:bg-white/[0.07] transition-all overflow-hidden h-full flex flex-col">
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
                                        <p className="text-sm text-gray-400 line-clamp-2">{playlist.description}</p>
                                        <div className="flex items-center justify-between text-sm text-gray-400">
                                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {playlist.followers.toLocaleString()}</span>
                                            {playlist.songCount && <span className="text-xs bg-white/10 px-2 py-1 rounded-full">{playlist.songCount} Songs</span>}
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-sm">
                                                <span className="block text-[10px] text-gray-500 uppercase tracking-wider">Fee</span>
                                                <span className="font-bold text-white">
                                                    {playlist.submission_fee === 0
                                                        ? <span className="text-green-400">FREE</span>
                                                        : `${pricingConfig.currency}${playlist.submission_fee.toLocaleString()}`
                                                    }
                                                </span>
                                            </div>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform" onClick={(e) => {
                                                e.preventDefault();
                                                window.location.href = `/submit?playlist=${playlist.id}`;
                                            }}>
                                                Submit
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {!isLoading && activeTab === "curators" && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCurators.length === 0 && <div className="text-center w-full col-span-full text-gray-500">No curators found.</div>}
                    {filteredCurators.map((curator) => (
                        <div key={curator.id} className="space-y-4">
                            <Card
                                className="cursor-pointer transition-all border-white/10 bg-black/40 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10 h-full"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-2 border-white/10">
                                            {curator.avatar_url ? (
                                                <img src={curator.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                curator.full_name?.[0] || <User className="w-8 h-8 text-gray-500" />
                                            )}
                                        </div>
                                        {/* Mocking Verified status for now, or check real DB column if exists */}
                                        {/* {curator.verified && ( */}
                                        <div className="flex items-center gap-1 text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">
                                            <BadgeCheck className="w-3 h-3" /> Curator
                                        </div>
                                        {/* )} */}
                                    </div>
                                    <CardTitle className="mt-4 text-xl text-white">{curator.full_name || "Curator"}</CardTitle>
                                    <CardDescription className="line-clamp-2 text-gray-400 min-h-[2.5rem]">{curator.bio || "No bio available."}</CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-4">
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
