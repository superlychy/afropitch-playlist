"use client";

import { curators } from "@/../config/curators";
import { notFound, useParams } from "next/navigation";
import { BadgeCheck, Globe, Instagram, Music2, Twitter, Users, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pricingConfig } from "@/../config/pricing";

export default function CuratorProfile() {
    // In a real app, this would be server-side or use a hook to fetch data
    // Since 'curators' is a static mock file, we can just find the item
    const params = useParams();
    const id = params.id as string;

    // Find curator (Case insensitive handling if useful, but exact ID preferred)
    const curator = curators.find((c) => c.id === id);

    if (!curator) {
        // Return 404 UI
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold text-white">Curator Not Found</h1>
                <Link href="/curators">
                    <Button variant="outline">Browse All Curators</Button>
                </Link>
            </div>
        );
    }

    const totalFollowers = curator.playlists.reduce((acc, curr) => acc + curr.followers, 0);

    return (
        <div className="min-h-screen pb-20">
            {/* Header / Cover Area - Simulating a profile banner */}
            <div className="w-full h-48 md:h-64 bg-gradient-to-b from-green-900/40 to-black border-b border-white/5 relative">
                <div className="absolute top-8 left-4 md:left-8">
                    <Link href="/curators" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Curators
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row items-end md:items-start gap-6 md:gap-8 mb-12">
                    {/* Profile Image */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-5xl font-bold text-white shadow-2xl border-4 border-black">
                        {curator.name.charAt(0)}
                    </div>

                    {/* Profile Details */}
                    <div className="flex-1 space-y-4 pt-2 text-center md:text-left">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <h1 className="text-3xl md:text-4xl font-bold text-white">{curator.name}</h1>
                                {curator.verified && (
                                    <div className="text-green-500 bg-green-500/10 p-1 rounded-full">
                                        <BadgeCheck className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-400 text-lg max-w-2xl">{curator.bio}</p>
                        </div>

                        {/* Socials & Stats */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                            {curator.socials?.instagram && (
                                <a href={`https://instagram.com/${curator.socials.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-pink-400 transition-colors">
                                    <Instagram className="w-4 h-4" /> @{curator.socials.instagram}
                                </a>
                            )}
                            {curator.socials?.twitter && (
                                <a href={`https://twitter.com/${curator.socials.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                                    <Twitter className="w-4 h-4" /> @{curator.socials.twitter}
                                </a>
                            )}
                            {curator.socials?.website && (
                                <a href={curator.socials.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors">
                                    <Globe className="w-4 h-4" /> Website
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Box */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-w-[200px] text-center md:text-right hidden md:block">
                        <div className="space-y-4">
                            <div>
                                <span className="block text-3xl font-bold text-white">{curator.playlists.length}</span>
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
                        {curator.playlists.map((playlist) => (
                            <Card key={playlist.id} className="bg-white/5 border-white/5 hover:bg-white/[0.07] transition-all group overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Playlist Cover Strip */}
                                    <div className={`h-24 w-full ${playlist.coverImage} relative`}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute bottom-4 left-4 text-white">
                                            <p className="font-bold text-lg">{playlist.name}</p>
                                            <p className="text-xs text-gray-300 opacity-80">{playlist.genre}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5rem]">{playlist.description}</p>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1.5 text-gray-300">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                {playlist.followers.toLocaleString()} <span className="text-xs text-gray-600">active listeners</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-sm">
                                                <span className="block text-xs text-gray-500">Submission Fee</span>
                                                <span className="font-bold text-white">
                                                    {playlist.submissionFee === 0
                                                        ? <span className="text-green-400">FREE</span>
                                                        : `${pricingConfig.currency}${playlist.submissionFee.toLocaleString()}`
                                                    }
                                                </span>
                                            </div>
                                            <Link href={`/submit?playlist=${playlist.id}`}>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform">
                                                    Submit Song <ArrowRight className="w-3 h-3 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
