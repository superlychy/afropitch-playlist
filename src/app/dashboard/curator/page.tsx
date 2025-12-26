"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, XCircle, Clock, Settings, User, Plus, ListMusic, MoreVertical, Star, Zap } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea for custom reason


// Mock Playlists for the dashboard
import { supabase } from "@/lib/supabase";

interface Playlist {
    id: string;
    name: string;
    followers: number;
    submissions: number; // calculated or mocked for now
    type: "regular" | "exclusive";
    cover_image: string;
    description?: string;
}

export default function CuratorDashboard() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // Modal State
    const [showAddPlaylist, setShowAddPlaylist] = useState(false);
    const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);

    // Form State
    const [newName, setNewName] = useState("");
    const [newPlaylistType, setNewPlaylistType] = useState<"regular" | "exclusive">("regular");
    const [newFollowers, setNewFollowers] = useState(0);
    const [newCoverImage, setNewCoverImage] = useState("");
    const [newPlaylistLink, setNewPlaylistLink] = useState("");
    const [customPrice, setCustomPrice] = useState(7000);
    const [isCreating, setIsCreating] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [songsCount, setSongsCount] = useState(0);

    const [stats, setStats] = useState({ accepted: 0, declined: 0, responseTime: null as string | null });
    const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
    const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);

    // Decline Modal State
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [subToDecline, setSubToDecline] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState("Song not properly mixed");
    const [customDeclineReason, setCustomDeclineReason] = useState("");
    const [isDeclining, setIsDeclining] = useState(false);

    const declineOptions = [
        "Song not properly mixed",
        "Below the standard of the playlist",
        "Bad song link",
        "Other"
    ];

    useEffect(() => {
        if (!isLoading && (!user || user.role !== "curator")) {
            router.push("/portal");
        }
    }, [user, isLoading, router]);

    // Fetch Curator Playlists
    useEffect(() => {
        if (user?.id) {
            const fetchPlaylists = async () => {
                const { data, error } = await supabase
                    .from('playlists')
                    .select('*, submissions(count)')
                    .eq('curator_id', user.id);

                if (error) {
                    console.error("Error fetching playlists:", error);
                    return;
                }

                if (data) {
                    setMyPlaylists(data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        followers: p.followers,
                        submissions: p.submissions?.[0]?.count || 0,
                        type: p.type,
                        cover_image: p.cover_image || 'bg-gray-800',
                        description: p.description
                    })));
                }
            };
            fetchPlaylists();
        }
    }, [user]);

    // Fetch Stats
    useEffect(() => {
        if (user?.id) {
            const fetchStats = async () => {
                // Fetch Accepted
                const { count: acceptedCount } = await supabase
                    .from('submissions')
                    .select('*, playlists!inner(curator_id)', { count: 'exact', head: true })
                    .eq('playlists.curator_id', user.id)
                    .eq('status', 'accepted');

                // Fetch Declined
                const { count: declinedCount } = await supabase
                    .from('submissions')
                    .select('*, playlists!inner(curator_id)', { count: 'exact', head: true })
                    .eq('playlists.curator_id', user.id)
                    .eq('status', 'declined');

                setStats({
                    accepted: acceptedCount || 0,
                    declined: declinedCount || 0,
                    responseTime: null // Placeholder for now as we don't track response time yet
                });
            };
            fetchStats();
        }
    }, [user]);

    const fetchPlaylistInfo = async (url: string) => {
        // if (!url || !url.includes('spotify.com/playlist')) return; // Allow generic for now
        if (!url || url.length < 10) return;

        setIsFetchingInfo(true);
        try {
            const res = await fetch('/api/playlist-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.name) setNewName(data.name);
                if (data.followers) setNewFollowers(data.followers);
                if (data.coverImage) setNewCoverImage(data.coverImage);
                if (data.songsCount) setSongsCount(data.songsCount);
            } else {
                console.error(data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingInfo(false);
        }
    };

    // Auto-fetch when link changes (debounce slightly or just on blur/paste)
    useEffect(() => {
        if (newPlaylistLink.length > 10) {
            const timer = setTimeout(() => {
                fetchPlaylistInfo(newPlaylistLink);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [newPlaylistLink]);


    const handleCreatePlaylist = async () => {
        if (!user) return;
        setIsCreating(true);

        const { error } = await supabase.from('playlists').insert([{
            curator_id: user.id,
            name: newName,
            genre: 'Afrobeats', // Hardcoded for this simplified form
            followers: newFollowers,
            cover_image: newCoverImage || 'bg-gray-800',
            type: newPlaylistType,
            submission_fee: newPlaylistType === 'exclusive' ? customPrice : 0,
            description: `Playlist with ${songsCount} songs`, // Storing song count in description
            playlist_link: newPlaylistLink,
            is_active: true
        }]);

        if (error) {
            alert("Error creating playlist: " + error.message);
        } else {
            // Refresh
            const { data } = await supabase.from('playlists').select('*').eq('curator_id', user.id);
            if (data) setMyPlaylists(data as any);
            setShowAddPlaylist(false);
            // Reset form
            setNewName("");
            setNewFollowers(0);
            setNewCoverImage("");
            setNewPlaylistLink("");
            setSongsCount(0);
        }
        setIsCreating(false);
    };

    const togglePlaylistSongs = async (playlistId: string) => {
        if (expandedPlaylistId === playlistId) {
            setExpandedPlaylistId(null);
            setPlaylistSongs([]);
            return;
        }

        setExpandedPlaylistId(playlistId);
        setIsLoadingSongs(true);
        const { data } = await supabase
            .from('submissions')
            .select('*')
            .eq('playlist_id', playlistId)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false });

        if (data) setPlaylistSongs(data);
        setIsLoadingSongs(false);
    };

    const openDeclineModal = (id: string) => {
        setSubToDecline(id);
        setDeclineReason("Song not properly mixed");
        setCustomDeclineReason("");
        setShowDeclineModal(true);
    };

    const confirmDecline = async () => {
        if (!subToDecline) return;
        setIsDeclining(true);

        const finalReason = declineReason === "Other" ? customDeclineReason : declineReason;

        const { error } = await supabase
            .from('submissions')
            .update({
                status: 'declined',
                feedback: finalReason
            })
            .eq('id', subToDecline);

        if (error) {
            alert("Error declining submission: " + error.message);
        } else {
            // Remove from local list
            setPendingReviews(prev => prev.filter(p => p.id !== subToDecline));
            setStats(prev => ({ ...prev, declined: prev.declined + 1 }));
            setShowDeclineModal(false);
            setSubToDecline(null);
        }
        setIsDeclining(false);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (!user) return null;

    // Mock Data (Simulate mixed tier and discounted submissions)
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);

    useEffect(() => {
        if (user?.id) {
            const fetchReviews = async () => {
                // Fetch submissions where the related playlist belongs to this curator
                const { data, error } = await supabase
                    .from('submissions')
                    .select('*, playlists!inner(curator_id)')
                    .eq('playlists.curator_id', user.id)
                    .eq('status', 'pending');

                if (data) {
                    setPendingReviews(data.map((s: any) => ({
                        id: s.id,
                        artist: s.artist_name,
                        song: s.song_title,
                        tier: s.tier,
                        submitted: new Date(s.created_at).toLocaleDateString(), // simplified date
                        potentialEarnings: s.amount_paid * 0.8 // 80% cut
                    })));
                }
            };
            fetchReviews();
        }
    }, [user]);

    return (
        <div className="container mx-auto px-4 max-w-6xl py-12 relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400">Welcome back, <span className="text-green-500">{user.name}</span></p>
                </div>
                <div className="text-right flex items-center gap-4">
                    <div>
                        <span className="block text-sm text-gray-400">Net Earnings</span>
                        <span className="text-3xl font-bold text-white">{pricingConfig.currency}{user.earnings.toLocaleString()}</span>
                    </div>
                    <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10" title="Manage Profile">
                        <Settings className="w-5 h-5 text-gray-400" />
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="bg-black/40 border-green-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Accepted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.accepted}</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-red-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Declined</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.declined}</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Avg. Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.responseTime || "N/A"}</div>
                    </CardContent>
                </Card>
            </div>

            {/* My Playlists Section */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">My Playlists</h2>
                <Button onClick={() => setShowAddPlaylist(true)} className="bg-white text-black hover:bg-gray-200">
                    <Plus className="w-4 h-4 mr-2" /> Add Playlist
                </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
                {myPlaylists.map((pl) => (
                    <Card key={pl.id} className="bg-white/5 border-none">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded flex items-center justify-center overflow-hidden ${pl.cover_image?.startsWith('http') ? '' : pl.cover_image}`}>
                                    {pl.cover_image?.startsWith('http') ? (
                                        <img src={pl.cover_image} alt={pl.name} className="w-full h-full object-cover" />
                                    ) : (
                                        pl.type === 'exclusive' ? <Star className="w-6 h-6 text-yellow-500" /> : <ListMusic className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-white flex items-center gap-2">
                                        {pl.name}
                                        {pl.type === 'exclusive' && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Exclusive</span>}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {pl.followers.toLocaleString()} Followers
                                        {pl.submissions > 0 || true ? ( // Always show if we parsed it from description
                                            (() => {
                                                // Try to extract song count stashed in description for now
                                                // Desc format: "Playlist with X songs"
                                                const match = (pl.description || "").match(/(\d+)\s+songs/);
                                                return match ? ` • ${match[1]} Songs` : "";
                                            })()
                                        ) : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-green-500">{pl.submissions}</span>
                                <span className="text-xs text-gray-500">Active Submissions</span>
                            </div>
                        </CardContent>
                        <div className="px-4 pb-4">
                            <Button
                                variant="ghost"
                                className="w-full text-xs text-gray-400 hover:text-white hover:bg-white/5 h-8"
                                onClick={() => togglePlaylistSongs(pl.id)}
                            >
                                {expandedPlaylistId === pl.id ? "Hide Songs" : "View Accepted Songs"}
                            </Button>

                            {expandedPlaylistId === pl.id && (
                                <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                                    {isLoadingSongs ? (
                                        <div className="text-center py-4 text-gray-500 text-xs">Loading songs...</div>
                                    ) : playlistSongs.length > 0 ? (
                                        playlistSongs.map((song) => (
                                            <div key={song.id} className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5 text-xs">
                                                <span className="text-white font-medium">{song.song_title} - {song.artist_name}</span>
                                                <span className="text-gray-500">{new Date(song.created_at).toLocaleDateString()}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500 text-xs">No accepted songs yet.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add Playlist Modal (Custom) */}
            {
                showAddPlaylist && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-lg shadow-xl p-6 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white">Add New Playlist</h3>
                                <p className="text-sm text-gray-400">Add a playlist to start receiving submissions.</p>
                            </div>


                            <div className="space-y-2">
                                <Label>Playlist Link</Label>
                                <div className="relative">
                                    <Input
                                        placeholder="https://open.spotify.com/playlist/..."
                                        className="bg-white/5 border-white/10 pr-8"
                                        value={newPlaylistLink}
                                        onChange={(e) => setNewPlaylistLink(e.target.value)}
                                    />
                                    {isFetchingInfo && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                </div>
                                {!newPlaylistLink.includes("spotify.com") && newPlaylistLink.length > 5 && <p className="text-xs text-blue-400">Attempting to fetch info from general link...</p>}
                            </div>

                            {newName && (
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10 flex gap-4 items-center animate-in fade-in">
                                    <div className="w-16 h-16 bg-zinc-800 rounded overflow-hidden shrink-0">
                                        {newCoverImage ? <img src={newCoverImage} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No Img</div>}
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                        <p className="font-bold text-white truncate text-sm">{newName}</p>
                                        <p className="text-xs text-gray-400">{newFollowers.toLocaleString()} Followers • {songsCount} Songs</p>
                                    </div>
                                </div>
                            )}

                            {!newName && !isFetchingInfo && newPlaylistLink.length > 10 && (
                                <p className="text-xs text-yellow-500/80 mb-4">Fetching playlist details...</p>
                            )}

                            {/* Manual Inputs Fallback (if auto-fetch fails or user wants to edit) - Only show if Name is empty after fetch attempt or initial state */}
                            {!newName && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="space-y-2">
                                        <Label>Playlist Name</Label>
                                        <Input
                                            placeholder="e.g. Afro Vibes 2024"
                                            className="bg-white/5 border-white/10"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cover Image URL (Optional)</Label>
                                        <Input
                                            placeholder="https://..."
                                            className="bg-white/5 border-white/10"
                                            value={newCoverImage}
                                            onChange={(e) => setNewCoverImage(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Followers / Saves</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="bg-white/5 border-white/10"
                                            value={newFollowers}
                                            onChange={(e) => setNewFollowers(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Number of Songs</Label>
                                        <Input
                                            type="number"
                                            value={songsCount}
                                            onChange={(e) => setSongsCount(Number(e.target.value))}
                                            className="bg-white/5 border-white/10"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Playlist Type</Label>
                                <Select
                                    value={newPlaylistType}
                                    onChange={(e) => setNewPlaylistType(e.target.value as "regular" | "exclusive")}
                                    className="bg-white/5 border-white/10 text-white"
                                >
                                    <option value="regular" className="bg-zinc-900">Regular (Standard Pricing)</option>
                                    <option value="exclusive" className="bg-zinc-900">Exclusive (Custom Pricing)</option>
                                </Select>
                                <p className="text-xs text-gray-400">
                                    {newPlaylistType === "regular" ? "Standard tiers applied (3,000 / 5,000)." : "You set the price. 24-hour review time required."}
                                </p>
                            </div>

                            {newPlaylistType === "exclusive" && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Custom Submission Fee (₦)</Label>
                                    <Input
                                        type="number"
                                        value={customPrice}
                                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                                        className="bg-white/5 border-yellow-500/50 text-yellow-500 font-bold"
                                    />
                                    <p className="text-xs text-yellow-500/80">Exclusive playlists must command a premium.</p>
                                </div>
                            )}

                            {newPlaylistType === "regular" && (
                                <div className="p-3 bg-white/5 rounded text-sm text-gray-400 space-y-1">
                                    <div className="flex justify-between"><span>Standard Review:</span> <span>₦3,000</span></div>
                                    <div className="flex justify-between"><span>Express Review:</span> <span>₦5,000</span></div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                            <Button variant="outline" onClick={() => setShowAddPlaylist(false)}>Cancel</Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreatePlaylist} disabled={isCreating}>
                                {isCreating ? "Creating..." : "Add Playlist"}
                            </Button>
                        </div>
                    </div>

                )
            }

            <h2 className="text-xl font-bold text-white mb-4">Pending Reviews</h2>
            <div className="space-y-4">
                {pendingReviews.map((review) => (
                    <Card key={review.id} className="bg-white/5 border-none">
                        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-900/40 flex items-center justify-center text-green-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{review.song} <span className="text-gray-400 font-normal">by {review.artist}</span></h3>
                                    <p className="text-sm text-gray-400">Tier: {review.tier} • Submitted {review.submitted}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="text-right mr-4 hidden md:block">
                                    <span className="block text-xs text-gray-500">You Receive</span>
                                    <span className="font-bold text-green-400">{pricingConfig.currency}{review.potentialEarnings.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button variant="ghost" onClick={() => openDeclineModal(review.id)} className="flex-1 md:flex-none text-red-400 hover:text-red-300 hover:bg-red-900/20">Decline</Button>
                                    <Button className="flex-1 md:flex-none bg-green-600 hover:bg-green-700">Review & Pitch</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Decline Reason Modal */}
                {showDeclineModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-lg shadow-xl p-6 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white">Decline Submission</h3>
                                <p className="text-sm text-gray-400">Please provide a reason for declining.</p>
                            </div>

                            <div className="space-y-3">
                                <Label>Reason</Label>
                                <div className="space-y-2">
                                    {declineOptions.map((option) => (
                                        <div key={option}
                                            className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-colors ${declineReason === option ? 'bg-red-900/20 border-red-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            onClick={() => setDeclineReason(option)}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${declineReason === option ? 'border-red-500' : 'border-gray-500'}`}>
                                                {declineReason === option && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                                            </div>
                                            <span className="text-sm text-white">{option}</span>
                                        </div>
                                    ))}
                                </div>

                                {declineReason === "Other" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Custom Reason</Label>
                                        <Textarea
                                            placeholder="Please explain why..."
                                            className="bg-white/5 border-white/10 min-h-[100px]"
                                            value={customDeclineReason}
                                            onChange={(e) => setCustomDeclineReason(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <Button variant="outline" onClick={() => setShowDeclineModal(false)}>Cancel</Button>
                                <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDecline} disabled={isDeclining}>
                                    {isDeclining ? "Declining..." : "Confirm Decline"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <p className="mt-8 text-xs text-gray-500 text-center">
                * Earnings are released to your wallet after the artist verifies the playlist placement.
                <br />You receive 80% of the submission fee. Platform fee varies based on discounts applied.
            </p>
        </div >
    );
}
