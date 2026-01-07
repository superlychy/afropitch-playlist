"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BadgeCheck, Music2, Users, ArrowRight, ListMusic, User, Search, Filter, CheckCircle } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { pricingConfig } from "@/../config/pricing";

export default function PlaylistsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"playlists" | "curators">("playlists");
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [curators, setCurators] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("All");
    const [selectedPrice, setSelectedPrice] = useState("all");
    const [error, setError] = useState(false);

    // Selection State
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);

    const genres = ["All", "Afrobeats", "Amapiano", "Hip Hop", "RnB", "Pop", "Alternative"];

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Playlists
                const fetchPlaylistsPromise = supabase
                    .from('playlists')
                    .select('*, curator:profiles!curator_id(role, verification_status)')
                    .eq('is_active', true)
                    .order('followers', { ascending: false });

                // Fetch Curators
                const fetchCuratorsPromise = supabase
                    .from('profiles')
                    .select('*, playlists(count)')
                    .or('role.eq.curator,role.eq.admin');

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Request timed out")), 15000)
                );

                const [plResult, curResult] = await Promise.allSettled([
                    Promise.race([fetchPlaylistsPromise, timeoutPromise]),
                    Promise.race([fetchCuratorsPromise, timeoutPromise])
                ]);

                // Handle Playlists
                if (plResult.status === 'fulfilled' && (plResult.value as any).data) {
                    const plData = (plResult.value as any).data;
                    const mapped = plData
                        .filter((p: any) => p.curator?.role === 'admin' || p.curator?.verification_status === 'verified')
                        .map((p: any) => {
                            const match = (p.description || "").match(/(\d+)\s+(songs|items|tracks)/i);
                            return { ...p, songCount: match ? parseInt(match[1]) : null };
                        });
                    setPlaylists(mapped);
                } else {
                    console.error("Playlists fetch failed", plResult);
                    setError(true);
                }

                // Handle Curators
                if (curResult.status === 'fulfilled' && (curResult.value as any).data) {
                    const cData = (curResult.value as any).data;
                    const verifiedCurators = cData.filter((c: any) => c.role === 'admin' || c.verification_status === 'verified');
                    setCurators(verifiedCurators.map((c: any) => ({
                        ...c,
                        playlistCount: c.playlists?.[0]?.count || 0
                    })));
                } else {
                    console.error("Curators fetch failed", curResult);
                    setCurators([]);
                }

            } catch (err) {
                console.error("Unexpected error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setSelectedPlaylistIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const proceedToSubmit = () => {
        if (selectedPlaylistIds.length === 0) return;
        // Join IDs with commas to pass as query param
        const idsParam = selectedPlaylistIds.join(",");
        router.push(`/submit?playlists=${idsParam}`);
    };

    const filteredPlaylists = playlists.filter(pl => {
        const matchesSearch = pl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (pl.description || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenre = selectedGenre === "All" || (pl.genre && pl.genre.toLowerCase() === selectedGenre.toLowerCase());
        const matchesPrice = selectedPrice === "all" ||
            (selectedPrice === "standard" && (!pl.type || pl.type === "standard")) ||
            pl.type === selectedPrice;
        return matchesSearch && matchesGenre && matchesPrice;
    });

    const filteredCurators = curators.filter(cur => {
        const matchesSearch = (cur.full_name || "Curator").toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });


    return (
        <div className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24 min-h-screen relative pb-32">
            {error && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 min-h-[50vh]">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <h2 className="text-xl font-bold text-white">Connection Error</h2>
                    <p className="text-gray-400">Unable to load data. Please refresh the page.</p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 border-white/10 hover:bg-white/10">
                        Refresh Page
                    </Button>
                </div>
            )}

            {!error && (
                <>
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
                        {activeTab === "playlists" && (
                            <div className="w-full md:w-48">
                                <Select
                                    className="bg-white/5 border-white/10 text-white"
                                    value={selectedPrice}
                                    onChange={(e) => setSelectedPrice(e.target.value)}
                                >
                                    <option value="all" className="bg-zinc-900 text-white">All Prices</option>
                                    <option value="free" className="bg-zinc-900 text-white">Free Submission</option>
                                    <option value="standard" className="bg-zinc-900 text-white">Standard ({pricingConfig.currency}{pricingConfig.tiers.standard.price.toLocaleString()})</option>
                                    <option value="express" className="bg-zinc-900 text-white">Express Only ({pricingConfig.currency}{pricingConfig.tiers.express.price.toLocaleString()})</option>
                                    <option value="exclusive" className="bg-zinc-900 text-white">Exclusive ({pricingConfig.currency}{pricingConfig.tiers.exclusive.price.toLocaleString()})</option>
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
                            {filteredPlaylists.map((playlist) => {
                                const isSelected = selectedPlaylistIds.includes(playlist.id);
                                return (
                                    <div key={playlist.id} onClick={(e) => toggleSelection(playlist.id, e)} className="cursor-pointer h-full">
                                        <Card className={`group h-full flex flex-col backdrop-blur-sm transition-all duration-300 overflow-hidden shadow-lg ${isSelected ? 'bg-green-900/10 border-green-500 shadow-green-900/20' : 'bg-black/60 border-white/10 hover:bg-black/80 hover:border-green-500/30'}`}>
                                            <CardContent className="p-0 flex flex-col h-full">
                                                {/* Playlist Cover Strip */}
                                                <div className="w-full h-48 relative overflow-hidden bg-zinc-800">
                                                    {playlist.cover_image?.startsWith('http') ? (
                                                        <img src={playlist.cover_image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/20"><Music2 className="w-12 h-12" /></div>
                                                    )}
                                                    <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-green-500/20' : 'bg-gradient-to-t from-black/90 via-black/20 to-transparent'}`} />

                                                    {/* Selection Checkmark Overlay */}
                                                    {isSelected && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                            <div className="bg-green-500 rounded-full p-3 shadow-lg scale-110">
                                                                <CheckCircle className="w-8 h-8 text-black" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-4 left-4 text-white p-2">
                                                        <p className="font-bold text-lg leading-tight">{playlist.name}</p>
                                                        <p className="text-xs text-green-400 font-medium mt-1 uppercase">{playlist.genre}</p>
                                                    </div>
                                                </div>

                                                <div className="p-5 space-y-4 flex-1 flex flex-col">
                                                    <p className="text-sm text-gray-400 line-clamp-2">
                                                        {(playlist.description && !playlist.description.match(/^0\s+(songs|items)/i)) ? playlist.description : "No description available."}
                                                    </p>
                                                    <div className="flex items-center justify-between text-sm text-gray-400">
                                                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {playlist.followers.toLocaleString()}</span>
                                                        {(playlist.songCount || 0) > 0 && <span className="text-xs bg-white/10 px-2 py-1 rounded-full">{playlist.songCount} Items</span>}
                                                    </div>

                                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3">
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
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/playlist/${playlist.id}`} onClick={(e) => e.stopPropagation()}>
                                                                <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/10 text-white">
                                                                    View
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                size="sm"
                                                                className={`shadow-lg transition-all ${isSelected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                                                onClick={(e) => toggleSelection(playlist.id, e)}
                                                            >
                                                                {isSelected ? "Remove" : "Select"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {!isLoading && activeTab === "curators" && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredCurators.length === 0 && <div className="text-center w-full col-span-full text-gray-500">No curators found.</div>}
                            {filteredCurators.map((curator) => (
                                <div key={curator.id} className="space-y-4">
                                    <Card
                                        className="cursor-pointer transition-all duration-300 border-white/10 bg-black/60 backdrop-blur-sm hover:bg-black/80 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10 h-full"
                                    >
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-2 border-white/10">
                                                    {curator.role === 'admin' ? (
                                                        <img src="/admin_avatar.png" className="w-full h-full object-cover" alt="Admin" />
                                                    ) : curator.avatar_url ? (
                                                        <img src={curator.avatar_url} className="w-full h-full object-cover" alt={curator.full_name} />
                                                    ) : (
                                                        curator.full_name?.[0] || <User className="w-8 h-8 text-gray-500" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">
                                                    <BadgeCheck className="w-3 h-3" /> Curator
                                                </div>
                                            </div>
                                            <CardTitle className="mt-4 text-xl text-white">{curator.full_name || "Curator"}</CardTitle>
                                            <div className="flex items-center gap-2 text-xs text-green-400 font-bold mb-1">
                                                <ListMusic className="w-3 h-3" />
                                                {curator.playlistCount !== undefined ? curator.playlistCount : 0} Playlists
                                            </div>
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
                </>
            )}

            {/* Floating Selection Bar */}
            <div className={`fixed bottom-0 left-0 right-0 bg-black/90 border-t border-green-500/30 backdrop-blur-xl p-4 transition-transform duration-300 z-50 ${selectedPlaylistIds.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="container mx-auto max-w-6xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-500 text-black font-bold w-10 h-10 rounded-full flex items-center justify-center text-lg animate-bounce">
                            {selectedPlaylistIds.length}
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">
                                {selectedPlaylistIds.length} Playlist{selectedPlaylistIds.length !== 1 ? 's' : ''} Selected
                            </p>
                            <p className="text-xs text-gray-400">Ready for submission</p>
                        </div>
                    </div>
                    <Button
                        size="lg"
                        onClick={proceedToSubmit}
                        className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 rounded-full shadow-lg shadow-green-900/20"
                    >
                        Proceed to Checkout <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div >
    );
}
