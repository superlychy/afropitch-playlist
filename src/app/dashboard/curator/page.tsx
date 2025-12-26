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

// Mock Playlists for the dashboard
const MY_PLAYLISTS = [
    { id: 1, name: "Afro Hits 2024", followers: 15400, submissions: 12, type: "regular" },
    { id: 2, name: "Underground Vibes", followers: 8200, submissions: 5, type: "regular" },
    { id: 3, name: "Piano Exclusive", followers: 45000, submissions: 20, type: "exclusive" },
];

export default function CuratorDashboard() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // Modal State
    const [showAddPlaylist, setShowAddPlaylist] = useState(false);
    const [newPlaylistType, setNewPlaylistType] = useState<"regular" | "exclusive">("regular");
    const [customPrice, setCustomPrice] = useState(7000);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== "curator")) {
            router.push("/portal");
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (!user) return null;

    // Mock Data (Simulate mixed tier and discounted submissions)
    const pendingReviews = [
        // Standard Price: 3000 * 0.8 = 2400
        { id: 1, artist: "Burna Boy", song: "Last Last", tier: "Standard", submitted: "2 hours ago", potentialEarnings: 2400 },
        // Express Price: 5000 * 0.8 = 4000
        { id: 2, artist: "Wizkid", song: "Essence", tier: "Express", submitted: "1 day ago", potentialEarnings: 4000 },
        // Discounted Bulk Submission (10% off): 3000 * 0.9 = 2700 * 0.8 = 2160
        { id: 3, artist: "Davido", song: "Unavailable", tier: "Standard (Bulk)", submitted: "3 hours ago", potentialEarnings: 2160 },
    ];

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
                        <div className="text-2xl font-bold text-white">14</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-red-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Declined</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">3</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Avg. Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">4.2 Hrs</div>
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
                {MY_PLAYLISTS.map((pl) => (
                    <Card key={pl.id} className="bg-white/5 border-none">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded flex items-center justify-center ${pl.type === 'exclusive' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-gray-800 text-gray-400'}`}>
                                    {pl.type === 'exclusive' ? <Star className="w-6 h-6" /> : <ListMusic className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="font-bold text-white flex items-center gap-2">
                                        {pl.name}
                                        {pl.type === 'exclusive' && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Exclusive</span>}
                                    </p>
                                    <p className="text-sm text-gray-400">{pl.followers.toLocaleString()} Followers</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-green-500">{pl.submissions}</span>
                                <span className="text-xs text-gray-500">Active Submissions</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Playlist Modal (Custom) */}
            {showAddPlaylist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-lg shadow-xl p-6 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white">Add New Playlist</h3>
                            <p className="text-sm text-gray-400">Add a playlist to start receiving submissions.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Playlist Name</Label>
                                <Input placeholder="e.g. Afro Vibes 2024" className="bg-white/5 border-white/10" />
                            </div>
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
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                                alert("Playlist Added (Mock)! Type: " + newPlaylistType);
                                setShowAddPlaylist(false);
                            }}>Add Playlist</Button>
                        </div>
                    </div>
                </div>
            )}

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
                                    <Button variant="ghost" className="flex-1 md:flex-none text-red-400 hover:text-red-300 hover:bg-red-900/20">Decline</Button>
                                    <Button className="flex-1 md:flex-none bg-green-600 hover:bg-green-700">Review & Pitch</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="mt-8 text-xs text-gray-500 text-center">
                * Earnings are released to your wallet after the artist verifies the playlist placement.
                <br />You receive 80% of the submission fee. Platform fee varies based on discounts applied.
            </p>
        </div>
    );
}
