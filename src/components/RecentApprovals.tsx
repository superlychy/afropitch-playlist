"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Music, CheckCircle2 } from "lucide-react";

interface Approval {
    id: string;
    song_title: string;
    artist: {
        full_name: string;
    } | null;
    playlist: {
        name: string;
    } | null;
    created_at: string;
}

export function RecentApprovals() {
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApprovals = async () => {
            const { data } = await supabase
                .from('submissions')
                .select('id, song_title, created_at, artist:profiles!artist_id(full_name), playlist:playlists(name)')
                .eq('status', 'accepted')
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                setApprovals(data as any); // Casting for ease due to join structure
            }
            setLoading(false);
        };

        fetchApprovals();

        // Realtime subscription could be added here, but simple polling or just static recent fetch is safer for now.
    }, []);

    // Cycle through approvals
    useEffect(() => {
        if (approvals.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % approvals.length);
        }, 4000); // Change every 4 seconds

        return () => clearInterval(interval);
    }, [approvals]);

    if (loading) {
        return (
            <div className="border border-white/10 bg-black/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (approvals.length === 0) {
        // Fallback mockup if no data
        return (
            <div className="border border-white/10 bg-black/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl relaitve overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Music className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                        <div className="h-4 w-32 bg-gray-800 rounded animate-pulse mb-2" />
                        <div className="h-3 w-24 bg-gray-800/60 rounded animate-pulse" />
                    </div>
                </div>
                <div className="space-y-3">
                    <p className="text-gray-400 text-sm">Waiting for the next approval...</p>
                </div>
            </div>
        );
    }

    const current = approvals[currentIndex];

    return (
        <div className="relative group">
            <div className="absolute inset-0 bg-green-500/5 rounded-2xl blur-xl group-hover:bg-green-500/10 transition-all duration-500" />
            <div className="border border-white/10 bg-black/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl relative transition-all duration-500">
                <div key={current.id} className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                            <Music className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-white text-lg line-clamp-1">{current.song_title}</h3>
                            <p className="text-sm text-gray-400">by {current.artist?.full_name || 'Unknown Artist'}</p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Added to <span className="text-white font-medium">{current.playlist?.name || 'Curated Playlist'}</span></span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-green-500 h-full rounded-full animate-[loading_2s_ease-in-out_infinite] w-[80%]" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-between items-center text-sm">
                        <span className="text-green-400 font-bold flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Approved for Playlist
                        </span>
                        <span className="text-gray-500 text-xs">
                            Just now
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
