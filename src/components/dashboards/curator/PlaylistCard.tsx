"use client";

import { RefreshCw, Edit, Trash2, ChevronDown, Zap } from "lucide-react";
import type { Playlist } from "./types";
import { SongArtwork } from "./SongArtwork";
import { formatFollowers } from "./format";

interface Props {
    playlist: Playlist;
    expanded: boolean;
    songs: any[];
    loadingSongs: boolean;
    isRefreshing: boolean;
    onToggleSongs: () => void;
    onRefresh: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleBoost: (id: string) => void;
}

export function PlaylistCard({
    playlist,
    expanded,
    songs,
    loadingSongs,
    isRefreshing,
    onToggleSongs,
    onRefresh,
    onEdit,
    onDelete,
    onToggleBoost,
}: Props) {
    return (
        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-4">
            <div className="flex items-center gap-4">
                <SongArtwork
                    src={playlist.cover_image}
                    title={playlist.name}
                    className="w-12 h-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate">{playlist.name}</h4>
                    <p className="text-xs text-zinc-400">{formatFollowers(playlist.followers)} followers</p>
                </div>
                <div className="text-right shrink-0">
                    <span className="block font-bold text-[#22C55E]">{playlist.submissions}</span>
                    <span className="text-xs text-zinc-500">Pending</span>
                </div>
            </div>

            <div className="flex gap-1 justify-end mt-1">
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    title="Refresh metadata from Spotify"
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white rounded-lg"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
                <button
                    onClick={onEdit}
                    title="Edit playlist"
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white rounded-lg"
                >
                    <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onDelete}
                    title="Delete playlist"
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-500 rounded-lg"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="pt-1 mt-1 border-t border-white/5">
                <button
                    onClick={onToggleSongs}
                    className="w-full text-xs text-zinc-400 hover:text-white hover:bg-white/5 h-9 flex items-center justify-between px-1 rounded-lg"
                >
                    <span>{expanded ? "Hide songs" : "View accepted songs"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                    <div className="mt-2 space-y-2">
                        {loadingSongs ? (
                            <div className="text-center py-2 text-zinc-500 text-xs">Loading...</div>
                        ) : songs.length > 0 ? (
                            songs.map((song) => (
                                <div
                                    key={song.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-white truncate max-w-[140px]">{song.song_title}</span>
                                        {song.ranking_boosted_at && (
                                            <span className="text-[10px] bg-[#22C55E] text-black px-1.5 py-0.5 rounded font-bold animate-pulse">
                                                Rising
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {song.song_link && (
                                            <a href={song.song_link} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">
                                                Link
                                            </a>
                                        )}
                                        <button
                                            onClick={() => onToggleBoost(song.id)}
                                            title="Notify artist of ranking boost"
                                            className={`w-6 h-6 flex items-center justify-center rounded ${
                                                song.ranking_boosted_at ? "text-[#22C55E]" : "text-zinc-600 hover:text-[#22C55E]"
                                            }`}
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-2 text-zinc-500 text-xs">No accepted songs.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
