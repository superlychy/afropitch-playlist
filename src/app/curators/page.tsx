"use client";

import { useState } from "react";
import { curators, Curator, Playlist } from "@/../config/curators";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Music2, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CuratorsPage() {
    const [selectedCurator, setSelectedCurator] = useState<string | null>(null);

    const toggleCurator = (id: string) => {
        if (selectedCurator === id) {
            setSelectedCurator(null);
        } else {
            setSelectedCurator(id);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Meet Our <span className="text-green-500">Curators</span>
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Choose who listens to your music. Browse verified curators and submit directly to their specific playlists.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {curators.map((curator) => (
                    <div key={curator.id} className="space-y-4">
                        <Card
                            className={`cursor-pointer transition-all border-white/10 bg-black/40 hover:border-green-500/50 ${selectedCurator === curator.id ? 'ring-2 ring-green-500' : ''}`}
                            onClick={() => toggleCurator(curator.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-xl font-bold text-white">
                                        {curator.name.charAt(0)}
                                    </div>
                                    {curator.verified && (
                                        <div className="flex items-center gap-1 text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">
                                            <BadgeCheck className="w-3 h-3" /> Verified
                                        </div>
                                    )}
                                </div>
                                <CardTitle className="mt-4 text-xl">{curator.name}</CardTitle>
                                <CardDescription className="line-clamp-2">{curator.bio}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Music2 className="w-4 h-4" /> {curator.playlists.length} Playlists
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="ghost" className="w-full text-green-400 hover:text-green-300 hover:bg-green-400/10">
                                    {selectedCurator === curator.id ? "Hide Playlists" : "View Playlists"}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Expanded Playlist View */}
                        {selectedCurator === curator.id && (
                            <div className="ml-4 space-y-3 border-l-2 border-green-500/20 pl-4 animate-in slide-in-from-top-2 duration-200">
                                {curator.playlists.map((playlist) => (
                                    <Card key={playlist.id} className="bg-white/5 border-none">
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`w-10 h-10 rounded shrink-0 ${playlist.coverImage} flex items-center justify-center`}>
                                                    <Music2 className="w-5 h-5 text-white/50" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white text-sm truncate">{playlist.name}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                                        <span>{playlist.genre}</span> • <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {playlist.followers.toLocaleString()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <Link href={`/submit?playlist=${playlist.id}`}>
                                                <Button size="sm" className="bg-white/10 hover:bg-green-600 text-white shrink-0">
                                                    Pitch <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
