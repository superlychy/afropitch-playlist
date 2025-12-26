"use client";

import { useState } from "react";
import { curators, Curator, Playlist } from "@/../config/curators";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Music2, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CuratorsPage() {


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

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {curators.map((curator) => (
                    <div key={curator.id} className="space-y-4">
                        <Card
                            className="cursor-pointer transition-all border-white/10 bg-black/40 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10"
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
        </div>
    );
}
