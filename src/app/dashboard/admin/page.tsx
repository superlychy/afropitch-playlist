"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Music, Users, Trophy } from "lucide-react";

// ----------------------------------------------------------------------
// MOCK DATA for ADMIN VIEW
// ----------------------------------------------------------------------
// In a real app, this would come from your backend API: GET /api/admin/stats
// Groups mock submissions by Playlist (Curator)
// ----------------------------------------------------------------------

const MOCK_PLAYLIST_DATA = [
    {
        playlistId: "pl_1",
        playlistName: "Lagos Heat (Curated by Lagos Vibes)",
        songs: [
            { id: "s1", title: "Amapiano Vibes", artist: "Burna Boy", clicks: 142, status: "active" },
            { id: "s2", title: "City Boys", artist: "Burna Boy", clicks: 890, status: "active" },
            { id: "s3", title: "Unavailable", artist: "Davido", clicks: 1200, status: "active" },
            { id: "s4", title: "Soweto", artist: "Victony", clicks: 45, status: "active" }
        ]
    },
    {
        playlistId: "pl_2",
        playlistName: "Nairobi Drill (Curated by Kenyan Hype)",
        songs: [
            { id: "k1", title: "Kaskie Vibes", artist: "Bien", clicks: 320, status: "active" },
            { id: "k2", title: "Angela", artist: "Boutross", clicks: 550, status: "active" },
            { id: "k3", title: "My Hit Song", artist: "Upcoming Artist", clicks: 12, status: "active" }
        ]
    }
];

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Simple security check
        if (!user || user.role !== "admin") {
            // Uncomment in production or when login flow supports admin
            // router.push("/portal");
        }
    }, [user, router]);

    // LOGIC: Sort songs by clicks (Descending) to show who should be #1
    const analyzedPlaylists = MOCK_PLAYLIST_DATA.map(playlist => {
        const sortedSongs = [...playlist.songs].sort((a, b) => b.clicks - a.clicks);
        return {
            ...playlist,
            songs: sortedSongs
        };
    });

    // Calculate total platform stats
    const totalClicks = analyzedPlaylists.reduce((acc, pl) => acc + pl.songs.reduce((sAcc, s) => sAcc + s.clicks, 0), 0);
    const totalActiveSongs = analyzedPlaylists.reduce((acc, pl) => acc + pl.songs.length, 0);

    // if (!user) return null; // blocked for now until login flow is updated, or we just render for testing

    return (
        <div className="container mx-auto px-4 max-w-7xl py-12">
            <div className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Master View</h1>
                    <p className="text-gray-400">Monitor playlist performance and ranking logic.</p>
                </div>
                <div className="flex gap-4">
                    <Card className="bg-blue-600/10 border-blue-500/20 px-4 py-2">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="text-blue-500 w-8 h-8" />
                            <div>
                                <span className="block text-xs text-gray-400 uppercase">Total Clicks</span>
                                <span className="text-xl font-bold text-white">{totalClicks.toLocaleString()}</span>
                            </div>
                        </div>
                    </Card>
                    <Card className="bg-purple-600/10 border-purple-500/20 px-4 py-2">
                        <div className="flex items-center gap-3">
                            <Music className="text-purple-500 w-8 h-8" />
                            <div>
                                <span className="block text-xs text-gray-400 uppercase">Active Songs</span>
                                <span className="text-xl font-bold text-white">{totalActiveSongs}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid gap-12">
                {analyzedPlaylists.map((playlist) => (
                    <div key={playlist.playlistId} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-green-500" />
                                {playlist.playlistName}
                            </h2>
                            <span className="text-sm text-gray-500">{playlist.songs.length} Tracks Tracking</span>
                        </div>

                        {/* TABLE HEADER */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="col-span-1 text-center">Rank</div>
                            <div className="col-span-1 text-center">Trend</div>
                            <div className="col-span-5">Song Details</div>
                            <div className="col-span-3 text-right">Click Count</div>
                            <div className="col-span-2 text-right">Action</div>
                        </div>

                        <div className="space-y-2">
                            {playlist.songs.map((song, index) => {
                                const isTop = index === 0;
                                const isTop3 = index < 3;

                                return (
                                    <div
                                        key={song.id}
                                        className={`grid grid-cols-12 gap-4 px-4 py-4 rounded-lg border items-center transition-all ${isTop
                                                ? 'bg-gradient-to-r from-green-900/20 to-black border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {/* Rank */}
                                        <div className="col-span-1 flex justify-center">
                                            {isTop ? (
                                                <div className="w-8 h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center font-bold shadow-lg">
                                                    1
                                                </div>
                                            ) : (
                                                <span className={`text-lg font-mono ${isTop3 ? 'text-white' : 'text-gray-500'}`}>
                                                    #{index + 1}
                                                </span>
                                            )}
                                        </div>

                                        {/* Trend */}
                                        <div className="col-span-1 flex justify-center">
                                            {isTop3 ? (
                                                <TrendingUp className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </div>

                                        {/* Song Details */}
                                        <div className="col-span-5">
                                            <p className={`font-bold ${isTop ? 'text-xl text-white' : 'text-base text-gray-200'}`}>
                                                {song.title}
                                            </p>
                                            <p className="text-sm text-gray-400">{song.artist}</p>
                                        </div>

                                        {/* Clicks */}
                                        <div className="col-span-3 text-right">
                                            <div className="inline-flex flex-col items-end">
                                                <span className="text-xl font-mono font-bold text-white">{song.clicks.toLocaleString()}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">Total Clicks</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                <Trophy className={`w-4 h-4 ${isTop ? 'text-yellow-500' : 'text-gray-600'}`} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
