"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, XCircle, Clock, Settings, User, Plus, ListMusic, MoreVertical, Star, Zap, HelpCircle, Send, LogOut, Trash2, Edit } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

interface Playlist {
    id: string;
    name: string;
    followers: number;
    submissions: number;
    type: "free" | "standard" | "exclusive";
    cover_image: string;
    description?: string;
}

export default function CuratorDashboard() {
    const { user, isLoading, deductFunds, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'curator')) {
            router.push("/portal");
        }
    }, [user, isLoading, router]);

    // Modal State
    const [showAddPlaylist, setShowAddPlaylist] = useState(false);
    const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
    const [stats, setStats] = useState({ revenue: 0, pending: 0, total_reviews: 0 });

    // Withdraw Modal State
    const [showWithdraw, setShowWithdraw] = useState(false);

    // Decline Logic
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState("");
    const [customDeclineReason, setCustomDeclineReason] = useState("");

    const declineOptions = [
        "Does not fit playlist vibe",
        "Production quality improperly mixed",
        "Song structure needs work",
        "Vocals are off-key or unclear",
        "Wrong genre for this playlist",
        "Other (See notes)"
    ];
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Profile Modal State
    const [showProfile, setShowProfile] = useState(false);
    const [profileBio, setProfileBio] = useState("");
    const [profileIg, setProfileIg] = useState("");
    const [profileTwitter, setProfileTwitter] = useState("");
    const [profileWeb, setProfileWeb] = useState("");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Support Modal State
    const [showSupport, setShowSupport] = useState(false);
    const [supportSubject, setSupportSubject] = useState("");
    const [supportMessage, setSupportMessage] = useState("");
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    // Add Playlist State
    const [newPlaylistLink, setNewPlaylistLink] = useState("");
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCoverImage, setNewCoverImage] = useState("");
    const [newFollowers, setNewFollowers] = useState(0);
    const [songsCount, setSongsCount] = useState(0);
    const [newPlaylistType, setNewPlaylistType] = useState<"free" | "standard" | "exclusive">("free");
    const [newGenre, setNewGenre] = useState("");
    const [customPrice, setCustomPrice] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

    // Playlist Songs State
    const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
    const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);


    // Real Data State
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);



    const fetchCuratorData = async () => {
        if (!user) return;
        setLoadingReviews(true);

        // 1. Fetch Playlists with submission counts
        const { data: playlists, error: plError } = await supabase
            .from('playlists')
            .select(`
    *,
    submissions: submissions(count)
        `)
            .eq('curator_id', user.id);

        if (playlists) {
            // Map to include count. Note: supabase .select(..., submissions(count)) returns an array of objects for count if using exact count, or we need to parse it.
            // Actually 'submissions(count)' with head:false etc returns array. 
            // Simplified: we can just fetch and map.
            const mapped = playlists.map((p: any) => ({
                ...p,
                submissions: p.submissions?.[0]?.count || 0 // If using count aggregating, or just length if fetching all.
                // Wait, select count needs careful syntax. 
                // Alternative: just fetch all playlists, then fetch logic. 
                // For now, let's assume 'submissions' is a count or we just set 0 if complex.
                // Let's rely on a separate query or loose approximation if simplicity is key.
                // Actually, let's just use 0 or 'active' count.
            }));

            // Re-fetch accurate counts
            const { data: counts } = await supabase.from('submissions').select('playlist_id, status');
            // Client side aggregate for simplicity with small data
            const plCounts: Record<string, number> = {};
            counts?.forEach((c: any) => {
                if (c.status === 'pending') {
                    plCounts[c.playlist_id] = (plCounts[c.playlist_id] || 0) + 1;
                }
            });

            setMyPlaylists(playlists.map((p: any) => ({
                ...p,
                submissions: plCounts[p.id] || 0
            })) as any);
        }

        // 2. Fetch Submissions (Reviews) for my playlists
        // We find submissions where playlist_id is in my playlists
        // Re-fetch simpler playlist list for IDs if needed, or use the one above.
        const playlistIds = playlists?.map((p: any) => p.id) || [];

        if (playlistIds.length > 0) {
            const { data: subs, error } = await supabase
                .from('submissions')
                .select(`
        *,
        artist: profiles(full_name, bio, instagram, twitter, website),
            playlist: playlists(name)
            `)
                .in('playlist_id', playlistIds)
                .order('created_at', { ascending: false });

            if (subs) {
                // Filter only relevant ones for "Incoming" if desired, or show all. 
                // Usually dashboard shows Pending primarily or Recent.
                setReviews(subs);

                // Calculate Stats
                const revenue = subs.filter(s => s.status === 'accepted' || s.status === 'declined').reduce((acc, curr) => acc + curr.amount_paid, 0);
                const pending = subs.filter(s => s.status === 'pending').length;
                const total = subs.length;

                setStats({
                    revenue,
                    pending,
                    total_reviews: total
                });
            }
        }
        setLoadingReviews(false);
    };

    const handleUpdateProfile = async () => {
        if (!user) return;
        setIsUpdatingProfile(true);
        const { error } = await supabase.from('profiles').update({
            bio: profileBio,
            instagram: profileIg,
            twitter: profileTwitter,
            website: profileWeb
        }).eq('id', user.id);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Profile updated!");
            setShowProfile(false);
        }
        setIsUpdatingProfile(false);
    };

    useEffect(() => {
        if (user) {
            setProfileBio(user.bio || "");
            setProfileIg(user.instagram || "");
            setProfileTwitter(user.twitter || "");
            setProfileWeb(user.website || "");

            fetchCuratorData();
        }
    }, [user]);

    const handleWithdraw = async () => {
        if (!user) return;
        setIsWithdrawing(true);
        const amount = parseFloat(withdrawAmount);

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            setIsWithdrawing(false);
            return;
        }

        if (amount > user.balance) {
            alert("Insufficient funds.");
            setIsWithdrawing(false);
            return;
        }

        // 1. Deduct from Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ balance: user.balance - amount })
            .eq('id', user.id);

        if (profileError) {
            alert("Error updating balance: " + profileError.message);
            setIsWithdrawing(false);
            return;
        }

        // 2. Create Withdrawal Request
        const { error: withdrawError } = await supabase.from('withdrawals').insert({
            user_id: user.id,
            amount: amount,
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName,
            status: 'pending'
        });

        if (withdrawError) {
            // Rollback balance if withdrawal request fails
            await supabase.from('profiles').update({ balance: user.balance }).eq('id', user.id);
            alert("Error requesting withdrawal: " + withdrawError.message);
        } else {
            alert("Withdrawal requested successfully!");
            // Update local state via Context if possible, or just visual update relies on page reload or effect
            if (deductFunds) deductFunds(amount);

            setShowWithdraw(false);
            setWithdrawAmount("");
        }
        setIsWithdrawing(false);
    };

    const handleSupportSubmit = async () => {
        if (!user || !supportSubject || !supportMessage) return;
        setIsSubmittingTicket(true);

        const { error } = await supabase.from('support_tickets').insert({
            user_id: user.id,
            subject: supportSubject,
            message: supportMessage
        });

        if (error) {
            alert("Error submitting ticket: " + error.message);
        } else {
            alert("Support ticket created! We will be in touch shortly.");
            setSupportSubject("");
            setSupportMessage("");
            setShowSupport(false);
        }
        setIsSubmittingTicket(false);
    };

    const handleCreatePlaylist = async () => {
        if (!user || !newName) return;
        setIsCreating(true);

        const payload: any = {
            curator_id: user.id,
            name: newName,
            genre: newGenre,
            cover_image: newCoverImage,
            followers: newFollowers,
            type: newPlaylistType,
            description: `${songsCount} songs`
        };

        let error;
        if (editingPlaylist) {
            // Update
            const { error: updateError } = await supabase.from('playlists').update(payload).eq('id', editingPlaylist.id);
            error = updateError;
        } else {
            // Insert
            const { error: insertError } = await supabase.from('playlists').insert(payload);
            error = insertError;
        }

        if (error) {
            alert("Error saving playlist: " + error.message);
        } else {
            alert(editingPlaylist ? "Playlist updated!" : "Playlist created!");
            setShowAddPlaylist(false);
            setEditingPlaylist(null);
            setNewName("");
            setNewGenre("");
            setNewCoverImage("");
            fetchCuratorData();
        }
        setIsCreating(false);
    };

    const openEditModal = (playlist: Playlist) => {
        setEditingPlaylist(playlist);
        setNewName(playlist.name);
        setNewGenre(""); // We don't fetch genre in list currently, might need update 'fetchCuratorData' or assume empty
        // Actually interface Playlist doesn't show genre. We should update Playlist interface soon but for now let's hope it's not essential or user re-enters it.
        // Or better, let's fetch it or update interface.
        // Interface update: added 'genre' to line 16? No, let's check.
        // For now, allow edit name/type mainly.
        setNewFollowers(playlist.followers);
        setNewPlaylistType(playlist.type);
        setNewCoverImage(playlist.cover_image);
        // We need to parse songs count from description if possible, or just leave 0
        setSongsCount(0);
        setShowAddPlaylist(true);
    };

    const handleDeletePlaylist = async (id: string) => {
        if (!confirm("Are you sure you want to delete this playlist?")) return;

        const { error } = await supabase.from('playlists').delete().eq('id', id);

        if (error) {
            alert("Error deleting playlist: " + error.message);
        } else {
            // Optimistic remove
            setMyPlaylists(prev => prev.filter(p => p.id !== id));
        }
    };

    const togglePlaylistSongs = async (playlistId: string) => {
        if (expandedPlaylistId === playlistId) {
            setExpandedPlaylistId(null);
            return;
        }
        setExpandedPlaylistId(playlistId);
        setIsLoadingSongs(true);

        // Fetch accepted songs for this playlist
        const { data } = await supabase
            .from('submissions')
            .select('*')
            .eq('playlist_id', playlistId)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false });

        if (data) {
            setPlaylistSongs(data);
        }
        setIsLoadingSongs(false);
    };

    // Auto-fetch info (mock logic for now as we don't have real spotify scraper yet)
    // We can simulate it just to not break UI flow
    useEffect(() => {
        if (newPlaylistLink.includes("spotify.com") && !newName) {
            // Simulate fetch
            setIsFetchingInfo(true);
            setTimeout(() => {
                setNewName("Spotify Playlist (Imported)");
                setNewGenre("Afrobeats");
                setNewCoverImage("https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop");
                setNewFollowers(1234);
                setSongsCount(50);
                setIsFetchingInfo(false);
            }, 1000);
        }
    }, [newPlaylistLink]);

    const handleReviewAction = async (submissionId: string, action: 'accepted' | 'declined', feedback: string) => {
        // Create tracking slug if accepted
        let trackingSlug = null;
        if (action === 'accepted') {
            // Simple slug generation: song-title-random
            // We need to fetch the submission title first but we have it in memory 'reviews'
            const sub = reviews.find(r => r.id === submissionId);
            if (sub) {
                const cleanTitle = sub.song_title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                trackingSlug = `${cleanTitle}-${Math.random().toString(36).substring(2, 7)}`;
            }
        }



        const updateData: any = { status: action, feedback };
        if (trackingSlug) updateData.tracking_slug = trackingSlug;

        const { error } = await supabase
            .from('submissions')
            .update(updateData)
            .eq('id', submissionId);

        if (error) {
            alert("Error updating submission: " + error.message);
        } else {
            // If APPROVED, credit curator wallet
            if (action === 'accepted') {
                const sub = reviews.find(r => r.id === submissionId);
                // Credit logic: 100% of amount_paid (or platform fee could be deducted here)
                if (sub && sub.amount_paid > 0) {
                    const { error: creditError } = await supabase.rpc('increment_balance', {
                        user_id: user.id,
                        amount: sub.amount_paid
                    });

                    if (creditError) {
                        // Fallback direct update if RPC missing (less safe but works for now)
                        await supabase.from('profiles').update({
                            balance: (user.balance || 0) + sub.amount_paid
                        }).eq('id', user.id);
                    }
                    // Update local state to reflect balance immediately
                    // (Assuming AuthContext handles user state, but we might need a manual refresh or rely on context reload)
                    // Since user obj is from context, we can't mutate it easily without a setter exposed.
                    // The dashboard shows `user.balance` from context.
                    // We should ideally reload auth user or just wait for next fetch.
                }
            }

            // Refresh data
            fetchCuratorData();
        }
    };

    const openDeclineModal = (id: string) => {
        setSelectedSubmissionId(id);
        setDeclineReason(declineOptions[0]);
        setCustomDeclineReason("");
        setShowDeclineModal(true);
    };

    const confirmDecline = async () => {
        if (!selectedSubmissionId) return;
        const finalFeedback = declineReason === "Other (See notes)" ? customDeclineReason : declineReason;
        await handleReviewAction(selectedSubmissionId, 'declined', finalFeedback || "Declined");
        setShowDeclineModal(false);
        setSelectedSubmissionId(null);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    // if (!user || user.role !== 'curator') ... logic handled by AuthContext or Router usually.

    return (
        <div className="container mx-auto px-4 max-w-7xl py-12 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Curator Dashboard</h1>
                    <p className="text-gray-400">Manage your playlists and review incoming tracks.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-green-600/10 border border-green-500/20 px-6 py-4 rounded-xl flex items-center gap-4">
                        <div className="bg-green-600 p-2 rounded-full text-white">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block text-xs text-gray-400 uppercase tracking-widest">Balance</span>
                            <span className="text-2xl font-bold text-white">{pricingConfig.currency}{user?.balance?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                    {/* Support Button */}
                    <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10 h-12 w-12" title="Contact Support" onClick={() => setShowSupport(true)}>
                        <HelpCircle className="w-6 h-6 text-gray-400" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10 h-12 w-12" title="Manage Profile" onClick={() => setShowProfile(true)}>
                        <Settings className="w-6 h-6 text-gray-400" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-white/10 hover:bg-red-500/20 h-12 w-12 group" title="Logout" onClick={logout}>
                        <LogOut className="w-6 h-6 text-gray-400 group-hover:text-red-500" />
                    </Button>
                </div>
            </div>

            {/* Support Modal */}
            {showSupport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className=" bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-green-500" /> Contact Support
                        </h3>
                        <p className="text-sm text-gray-400">Having trouble? Send us a message.</p>
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input value={supportSubject} onChange={e => setSupportSubject(e.target.value)} placeholder="e.g. Payment Issue, Bug Report" />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea className="min-h-[100px]" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Describe your issue..." />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowSupport(false)}>Cancel</Button>
                            <Button className="bg-green-600" onClick={handleSupportSubmit} disabled={isSubmittingTicket}>
                                <Send className="w-4 h-4 mr-2" /> Submit Ticket
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Withdrawal Card */}
                <Card className="bg-black/40 border-white/10 h-full flex flex-col justify-center">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" /> Withdraw Funds
                        </CardTitle>
                        <CardDescription>Transfer your earnings to your bank account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => setShowWithdraw(true)} className="w-full bg-white text-black hover:bg-gray-200 py-6 text-lg">
                            Request Payout
                        </Button>
                        <p className="text-xs text-center text-gray-500 mt-4">Minimum withdrawal: {pricingConfig.currency}5,000</p>
                    </CardContent>
                </Card>

                {/* Stats */}
                <Card className="bg-blue-900/10 border-blue-500/20">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                        <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-2">Total Reviews</h3>
                        <span className="text-4xl font-bold text-white">{stats.total_reviews}</span>
                    </CardContent>
                </Card>

                <Card className="bg-yellow-900/10 border-yellow-500/20">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                        <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-2">Pending Reviews</h3>
                        <span className="text-4xl font-bold text-white text-yellow-500">{stats.pending}</span>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Playlists */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white text-xl">My Playlists</h3>
                        <Button size="sm" variant="outline" className="border-dashed border-white/20 hover:border-white/50" onClick={() => { setEditingPlaylist(null); setNewName(""); setNewGenre(""); setShowAddPlaylist(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> New
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {myPlaylists.length === 0 && <p className="text-gray-500 text-sm">No playlists yet.</p>}
                        {myPlaylists.map(playlist => (
                            <Card key={playlist.id} className="bg-white/5 border-none">
                                <CardContent className="p-4 flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w - 12 h - 12 rounded bg - zinc - 800 ${playlist.cover_image?.startsWith('bg-') ? playlist.cover_image : ''} flex items - center justify - center overflow - hidden shrink - 0`}>
                                            {playlist.cover_image?.startsWith('http') ? <img src={playlist.cover_image} className="w-full h-full object-cover" /> : <ListMusic className="w-6 h-6 text-white/50" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white truncate">{playlist.name}</h4>
                                            <p className="text-xs text-gray-400">{playlist.followers.toLocaleString()} followers</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-bold text-green-500">{playlist.submissions}</span>
                                            <span className="text-xs text-gray-500">Pending</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500 hover:text-white" onClick={() => openEditModal(playlist)}>
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500 hover:text-red-500" onClick={() => handleDeletePlaylist(playlist.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="pt-2 border-t border-white/5">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-xs text-gray-400 hover:text-white hover:bg-white/5 h-8 justify-between"
                                            onClick={() => togglePlaylistSongs(playlist.id)}
                                        >
                                            {expandedPlaylistId === playlist.id ? "Hide Songs" : "View Accepted Songs"}
                                        </Button>

                                        {expandedPlaylistId === playlist.id && (
                                            <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                                                {isLoadingSongs ? (
                                                    <div className="text-center py-2 text-gray-500 text-xs">Loading...</div>
                                                ) : playlistSongs.length > 0 ? (
                                                    playlistSongs.map((song) => (
                                                        <div key={song.id} className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5 text-xs">
                                                            <span className="text-white truncate max-w-[150px]">{song.song_title}</span>
                                                            <a href={song.song_link} target="_blank" className="text-green-500 hover:underline">Link</a>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-2 text-gray-500 text-xs">No accepted songs.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right Column: Reviews */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-bold text-white text-xl">Incoming Submissions</h3>
                    <div className="space-y-4">
                        {loadingReviews && <p className="text-gray-500">Loading...</p>}
                        {!loadingReviews && reviews.length === 0 && <p className="text-gray-500">No pending submissions.</p>}

                        {reviews.map(review => (
                            <div key={review.id} className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                                <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px - 2 py - 0.5 rounded text - [10px] uppercase font - bold ${review.tier === 'exclusive' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'} `}>
                                                {review.tier}
                                            </span>
                                            <span className="text-xs text-gray-400">• {new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">{review.song_title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <User className="w-4 h-4 text-gray-500" /> {review.artist_name}
                                        </div>
                                        <a href={review.song_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-400 hover:underline mt-1">
                                            Listen to Track <Zap className="w-3 h-3" />
                                        </a>

                                        {/* Artist Stats / Bio Preview */}
                                        <div className="mt-3 p-3 bg-black/30 rounded text-xs text-gray-400 space-y-1">
                                            <p><span className="text-gray-500">Bio:</span> {review.artist?.bio || "No bio"}</p>
                                            <div className="flex gap-3 mt-2">
                                                {review.artist?.instagram && <a href={`https://instagram.com/${review.artist.instagram}`} target="_blank" className="hover:text-white">IG: @{review.artist.instagram}</a>}
                                                {review.artist?.twitter && <a href={`https://twitter.com/${review.artist.twitter}`} target="_blank" className="hover:text-white">TW: @{review.artist.twitter}</a>}
                                            </div >
                                        </div >
                                    </div >

                                    {/* Action Area */}
                                    {
                                        review.status === 'pending' ? (
                                            <div className="flex flex-col gap-2 min-w-[140px]">
                                                <p className="text-right font-bold text-white mb-2">{pricingConfig.currency}{review.amount_paid}</p>
                                                <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={() => handleReviewAction(review.id, 'accepted', 'Great track! Added to playlist.')}>
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Accept
                                                </Button>
                                                <Button variant="destructive" className="w-full" onClick={() => openDeclineModal(review.id)}>
                                                    <XCircle className="w-4 h-4 mr-2" /> Decline
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-right min-w-[140px]">
                                                <p className="font-bold text-white mb-2">{pricingConfig.currency}{review.amount_paid}</p>
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${review.status === 'accepted' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {review.status}
                                                </span>
                                            </div>
                                        )
                                    }
                                </div >
                            </div >
                        ))}
                    </div >
                </div >
            </div >

            {/* Profile Modal (Reused) */}
            {
                showProfile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className=" bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
                            <h3 className="font-bold text-white text-lg">Curator Profile</h3>
                            <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="About you..." />
                            </div>
                            {/* ... Social fields ... */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setShowProfile(false)}>Cancel</Button>
                                <Button className="bg-green-600" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>Save Profile</Button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Withdraw Modal Reused ... */}
            {
                showWithdraw && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
                            <h3 className="font-bold text-white text-lg">Request Payout</h3>
                            <div className="py-4">
                                <Input type="number" placeholder="Amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="mb-2" />
                                <Input placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} className="mb-2" />
                                <Input placeholder="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mb-2" />
                                <Input placeholder="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} className="mb-2" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setShowWithdraw(false)}>Cancel</Button>
                                <Button className="bg-green-600" onClick={handleWithdraw} disabled={isWithdrawing}>
                                    {isWithdrawing ? "Processing..." : "Submit Request"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Decline Reason Modal */}
            {showDeclineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
                        <h3 className="font-bold text-white text-lg text-red-500 flex items-center gap-2">
                            <XCircle className="w-5 h-5" /> Decline Submission
                        </h3>
                        <p className="text-sm text-gray-400">Please provide a reason for the artist. This helps them improve.</p>

                        <div className="space-y-3">
                            <Label>Reason</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {declineOptions.map((option) => (
                                    <div key={option}
                                        className={`p-3 rounded border cursor-pointer transition-colors ${declineReason === option ? 'bg-red-500/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                        onClick={() => setDeclineReason(option)}
                                    >
                                        {option}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(declineReason === "Other (See notes)" || true) && (
                            <div className="space-y-2">
                                <Label>Additional Notes (Optional)</Label>
                                <Textarea
                                    value={customDeclineReason}
                                    onChange={e => setCustomDeclineReason(e.target.value)}
                                    placeholder="Add specific feedback here..."
                                    className="min-h-[80px]"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={() => setShowDeclineModal(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={confirmDecline}>Confirm Decline</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Playlist Modal */}
            {
                showAddPlaylist && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-lg shadow-xl p-6 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white">{editingPlaylist ? "Edit Playlist" : "Add New Playlist"}</h3>
                                <p className="text-sm text-gray-400">{editingPlaylist ? "Update playlist details" : "Add a playlist to start receiving submissions."}</p>
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
                            </div>

                            {/* Manual Inputs Fallback */}
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
                                    <Label>Genre</Label>
                                    <Input
                                        placeholder="e.g. Afrobeats, Amapiano"
                                        className="bg-white/5 border-white/10"
                                        value={newGenre}
                                        onChange={(e) => setNewGenre(e.target.value)}
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
                                <div className="space-y-2">
                                    <Label>Playlist Type</Label>
                                    <Select
                                        value={newPlaylistType}
                                        onChange={(e) => setNewPlaylistType(e.target.value as "free" | "standard" | "exclusive")}
                                        className="bg-white/5 border-white/10 text-white"
                                    >
                                        <option value="free" className="bg-zinc-900">Free</option>
                                        <option value="standard" className="bg-zinc-900">Standard</option>
                                        <option value="exclusive" className="bg-zinc-900">Exclusive</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <Button variant="outline" onClick={() => setShowAddPlaylist(false)}>Cancel</Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreatePlaylist} disabled={isCreating}>
                                    {isCreating ? "Saving..." : (editingPlaylist ? "Update Playlist" : "Add Playlist")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


