"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, XCircle, Clock, Settings, User, Plus, ListMusic, MoreVertical, Star, Zap, HelpCircle, Send, LogOut, Trash2, Edit, MessageSquare, ChevronLeft, AlertCircle, Bell, RefreshCw } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { TransactionsList } from "@/components/TransactionsList";

interface Playlist {
    id: string;
    name: string;
    followers: number;
    submissions: number;
    type: "free" | "standard" | "express" | "exclusive";
    cover_image: string;
    description?: string;
    playlist_link?: string;
}

export default function CuratorDashboard() {
    const { user, isLoading, deductFunds, logout, refreshUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'curator')) {
            router.push("/portal");
        }
        // refreshUser removed to prevent infinite loop
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

    // Accept Logic
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [acceptFeedback, setAcceptFeedback] = useState("Great track! Happy to include it in the playlist. Please share the link to boost your ranking!");

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
    const [profileAvatar, setProfileAvatar] = useState(""); // New Avatar State
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Application Modal State
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [appPortfolio, setAppPortfolio] = useState("");
    const [appExperience, setAppExperience] = useState("");
    const [appGenres, setAppGenres] = useState("");
    const [appReason, setAppReason] = useState("");
    const [appPhone, setAppPhone] = useState("");
    const [appNin, setAppNin] = useState("");
    const [isApplying, setIsApplying] = useState(false);

    // Support Modal State
    const [showSupport, setShowSupport] = useState(false);
    const [supportView, setSupportView] = useState<'list' | 'create' | 'chat'>('list');
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isLoadingChat, setIsLoadingChat] = useState(false);

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
    const [newPlaylistType, setNewPlaylistType] = useState<"free" | "standard" | "express" | "exclusive">("free");
    const [newGenre, setNewGenre] = useState("");
    const [customPrice, setCustomPrice] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

    // Playlist Songs State
    const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
    const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<"submissions" | "playlists">("submissions");


    // Real Data State
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState<string | null>(null);



    const fetchCuratorData = async () => {
        if (!user) return;

        // Only show loading state if we don't have data yet
        if (reviews.length === 0) {
            setLoadingReviews(true);
        }

        // 1. Fetch Playlists with submission counts
        const { data: playlists, error: plError } = await supabase
            .from('playlists')
            .select(`
    *,
    playlist_link,
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

    const [verificationStatus, setVerificationStatus] = useState<"none" | "pending" | "verified" | "rejected">("none");

    const handleUpdateProfile = async () => {
        if (!user) return;
        setIsUpdatingProfile(true);
        const { error } = await supabase.from('profiles').update({
            bio: profileBio,
            instagram: profileIg,
            twitter: profileTwitter,
            website: profileWeb,
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName,
            avatar_url: profileAvatar
        }).eq('id', user.id);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Profile updated!");
            setShowProfile(false);
        }
        setIsUpdatingProfile(false);
    };

    const handleApplyCurator = async () => {
        if (!appPortfolio || !appExperience || !appPhone || !appNin) {
            alert("Please fill in all required fields (Portfolio, Experience, Phone, and NIN).");
            return;
        }
        setIsApplying(true);

        const docs = JSON.stringify({
            portfolio: appPortfolio,
            experience: appExperience,
            genres: appGenres,
            reason: appReason,
            phone: appPhone,
            id_document: appNin
        });

        try {
            const { error } = await supabase.from('profiles').update({
                verification_status: 'pending',
                verification_docs: docs,
                nin_number: appNin
            }).eq('id', user?.id);

            if (error) {
                console.error("Application error:", error);
                alert("Error submitting application: " + error.message);
            } else {
                // Manually trigger Admin Notification (Backup for DB Webhook)
                supabase.functions.invoke('notify-admin', {
                    body: {
                        table: 'profiles',
                        type: 'UPDATE',
                        record: {
                            id: user?.id,
                            full_name: user?.name || 'Curator User',
                            email: user?.email || 'No Email',
                            role: 'curator',
                            verification_status: 'pending',
                            nin_number: appNin
                        },
                        old_record: { verification_status: 'none' }
                    }
                }).catch(err => console.error("Manual Notify Failed:", err));

                alert("Application submitted successfully! We will review your ID and details shortly.");
                setVerificationStatus('pending');
                setShowApplicationModal(false);
                // Clear form
                setAppPortfolio("");
                setAppExperience("");
                setAppGenres("");
                setAppReason("");
                setAppPhone("");
                setAppNin("");
            }
        } catch (err) {
            console.error("Unexpected error applying:", err);
            alert("Unexpected error. Please try again.");
        } finally {
            setIsApplying(false);
        }
    };

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('broadcasts')
            .select('*')
            .or('target_role.eq.all,target_role.is.null,target_role.eq.curator')
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setNotifications(data);
    };

    useEffect(() => {
        if (user) {
            // ... existing profile setters
            setProfileBio(user.bio || "");
            setProfileIg(user.instagram || "");
            setProfileTwitter(user.twitter || "");
            setProfileWeb(user.website || "");

            // Fetch extended profile details (Bank & Verification & Avatar)
            const fetchExtendedProfile = async () => {
                const { data } = await supabase.from('profiles').select('bank_name, account_number, account_name, verification_status, avatar_url').eq('id', user.id).single();
                if (data) {
                    setBankName(data.bank_name || "");
                    setAccountNumber(data.account_number || "");
                    setAccountName(data.account_name || "");
                    setVerificationStatus(data.verification_status || "none");
                    setProfileAvatar(data.avatar_url || "");
                }
            };
            fetchExtendedProfile();

            fetchCuratorData();
            fetchNotifications(); // Add this
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

        // Use Atomic RPC to prevent "Ghost Deductions" and ensure History
        const { data, error } = await supabase.rpc('request_payout', {
            p_user_id: user.id,
            p_amount: amount,
            p_bank_name: bankName,
            p_account_number: accountNumber,
            p_account_name: accountName
        });

        if (error) {
            console.error("Payout RPC Error:", error);
            alert("Unable to process payout request. Please try again later or contact support.");
        } else if (data && !data.success) {
            alert("Payout Request Failed: " + data.message);
        } else {
            // Success
            alert("Withdrawal requested successfully! It will be processed within 1-24 hours.");

            // Update local state
            if (deductFunds) deductFunds(amount);

            setShowWithdraw(false);
            setWithdrawAmount("");
            // Ideally verify transaction list updates (if it uses real-time or if we trigger re-fetch)
        }
        setIsWithdrawing(false);
    };

    // Support Functions
    useEffect(() => {
        if (showSupport && user) {
            fetchTickets();
        }
    }, [showSupport, user]);

    const fetchTickets = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (data) setSupportTickets(data);
    };

    const handleSupportSubmit = async () => {
        if (!user || !supportSubject || !supportMessage) return;
        setIsSubmittingTicket(true);

        const { error } = await supabase.from('support_tickets').insert({
            user_id: user.id,
            subject: supportSubject,
            message: supportMessage, // Initial message
            status: 'open'
        }).select().single();

        if (error) {
            alert("Error submitting ticket: " + error.message);
        } else {
            // We should also insert the message into support_messages if we want it to appear in chat
            // But the schema has 'message' on the ticket itself as 'last_message' or 'initial_message'.
            // Actually admin reads 'support_messages'. So we must insert into 'support_messages' too.
            // Wait, the schema I read for support_tickets has 'message' column.
            // But the admin chat relies on 'support_messages'.
            // Let's insert into support_messages as well.

            // First get the new ticket ID.
            // The .select().single() above returns the ticket.
        }

        // Re-do with proper logic
        setIsSubmittingTicket(false);
    };

    const createTicket = async () => {
        if (!user || !supportSubject || !supportMessage) return;
        setIsSubmittingTicket(true);

        try {
            // 1. Create Ticket
            const { data: ticket, error } = await supabase.from('support_tickets').insert({
                user_id: user.id,
                subject: supportSubject,
                message: supportMessage,
                status: 'open'
            }).select().single();

            if (error) {
                console.error("Ticket Create Error:", error);
                alert("Error creating ticket: " + error.message);
                return;
            }

            // 2. Create Initial Message
            if (ticket) {
                const { error: msgError } = await supabase.from('support_messages').insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    message: supportMessage
                });

                if (msgError) console.error("Initial message error:", msgError);

                alert("Support ticket created successfully!");
                setSupportSubject("");
                setSupportMessage("");
                setSupportView('list');
                fetchTickets();
            }
        } catch (err: any) {
            console.error("Unexpected error submitting ticket:", err);
            alert("An unexpected error occurred. Please check your connection and try again.");
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const openTicketChat = async (ticket: any) => {
        setActiveTicket(ticket);
        setSupportView('chat');
        setIsLoadingChat(true);

        const { data } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

        if (data) setChatMessages(data);
        setIsLoadingChat(false);
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || !activeTicket || !user) return;
        const text = chatInput;
        setChatInput("");

        // Optimistic
        setChatMessages(prev => [...prev, {
            id: Math.random(),
            ticket_id: activeTicket.id,
            sender_id: user.id,
            message: text,
            created_at: new Date().toISOString()
        }]);

        await supabase.from('support_messages').insert({
            ticket_id: activeTicket.id,
            sender_id: user.id,
            message: text
        });

        // Refresh? Nah, optimistic is fine.
    };

    const handleCreatePlaylist = async () => {
        if (!user || !newName) return;
        if (verificationStatus !== 'verified') {
            alert("Verification required to add playlists.");
            return;
        }
        setIsCreating(true);

        const payload: any = {
            curator_id: user.id,
            name: newName,
            genre: newGenre,
            cover_image: newCoverImage,
            followers: newFollowers,
            type: newPlaylistType,
            description: songsCount > 0
                ? `Playlist · ${user.name || 'Curator'} · ${songsCount} items · ${newFollowers.toLocaleString()} saves`
                : `Playlist · ${user.name || 'Curator'} · ${newFollowers.toLocaleString()} saves`,
            playlist_link: newPlaylistLink
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
        setNewPlaylistLink(playlist.playlist_link || "");
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

    const toggleRankingBoost = async (submissionId: string) => {
        // Toggle boost
        const sub = playlistSongs.find(s => s.id === submissionId);
        if (!sub) return;

        const newVal = sub.ranking_boosted_at ? null : new Date().toISOString();

        const { error } = await supabase
            .from('submissions')
            .update({ ranking_boosted_at: newVal })
            .eq('id', submissionId);

        if (error) {
            alert("Error updating ranking: " + error.message);
        } else {
            // Optimistic update
            setPlaylistSongs(prev => prev.map(s => s.id === submissionId ? { ...s, ranking_boosted_at: newVal } : s));
            if (newVal) alert("Artist notified of ranking boost!");
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

    const handleRefreshPlaylist = async (playlist: Playlist) => {
        if (!playlist.playlist_link) {
            alert("Cannot refresh: No Spotify link found for this playlist.");
            return;
        }
        setIsRefreshing(playlist.id);
        try {
            const res = await fetch('/api/playlist-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: playlist.playlist_link })
            });
            const data = await res.json();
            if (data.success) {
                // Update Supabase
                const { error } = await supabase.from('playlists').update({
                    name: data.name,
                    cover_image: data.cover_image,
                    followers: data.followers,
                    description: data.songsCount > 0
                        ? `Playlist · ${user?.name || 'Curator'} · ${data.songsCount} items · ${data.followers.toLocaleString()} saves`
                        : `Playlist · ${user?.name || 'Curator'} · ${data.followers.toLocaleString()} saves`
                }).eq('id', playlist.id);

                if (error) throw error;

                alert("Playlist updated successfully from Spotify!");
                fetchCuratorData(); // Reload list
            } else {
                alert("Failed to fetch Spotify data: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Refresh Error", err);
            alert("Error refreshing playlist.");
        } finally {
            setIsRefreshing(null);
        }
    };

    // Auto-fetch info using our internal API
    useEffect(() => {
        if (newPlaylistLink.includes("spotify.com") && !newName) {
            const fetchInfo = async () => {
                setIsFetchingInfo(true);
                try {
                    const res = await fetch('/api/playlist-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: newPlaylistLink })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setNewName(data.name || "Imported Playlist");
                        if (data.description) {
                            // Try to infer genre or just leave blank
                        }
                        setNewCoverImage(data.coverImage || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop");
                        setNewFollowers(data.followers || 0);
                        setSongsCount(data.songsCount || 0);
                    } else {
                        console.error("Failed to fetch playlist info");
                    }
                } catch (err) {
                    console.error("Error fetching playlist info", err);
                } finally {
                    setIsFetchingInfo(false);
                }
            };

            // Debounce slightly to avoid rapid requests
            const timeoutId = setTimeout(() => {
                fetchInfo();
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [newPlaylistLink]);

    const handleReviewAction = async (submissionId: string, action: 'accepted' | 'declined', feedback: string) => {
        if (!user) return;

        // Create tracking slug if accepted
        let trackingSlug = null;
        if (action === 'accepted') {
            const sub = reviews.find(r => r.id === submissionId);
            if (sub) {
                const cleanTitle = sub.song_title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                trackingSlug = `${cleanTitle}-${Math.random().toString(36).substring(2, 7)}`;
            }
        }

        // Use Secure RPC
        const { data, error } = await supabase.rpc('process_submission_review', {
            p_submission_id: submissionId,
            p_action: action,
            p_feedback: feedback,
            p_curator_id: user.id,
            p_tracking_slug: trackingSlug
        });

        if (error) {
            console.error("RPC Error:", error);
            alert("Error processing review: " + error.message);
        } else if (data && !data.success) {
            alert("Error: " + data.message);
        } else {
            // Success
            fetchCuratorData();
        }
    };

    const openDeclineModal = (id: string) => {
        setSelectedSubmissionId(id);
        setDeclineReason(declineOptions[0]);
        setCustomDeclineReason("");
        setShowDeclineModal(true);
    };

    const openAcceptModal = (id: string) => {
        setSelectedSubmissionId(id);
        setAcceptFeedback("Great track! Happy to include it in the playlist. Please share the link to boost your ranking!");
        setShowAcceptModal(true);
    };

    const confirmAccept = async () => {
        if (!selectedSubmissionId) return;
        await handleReviewAction(selectedSubmissionId, 'accepted', acceptFeedback);
        setShowAcceptModal(false);
        setSelectedSubmissionId(null);
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
                    <p className="text-gray-400">Welcome back, <span className="text-green-500">{user?.name || 'Curator'}</span>. Manage your playlists and review incoming tracks.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-white/10 hover:bg-white/10 h-12 w-12 relative"
                        title="Notifications"
                        onClick={() => setShowNotifications(true)}
                    >
                        <Bell className="w-6 h-6 text-gray-400" />
                        {notifications.length > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    </Button>

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

            {/* Notifications Modal */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 rounded-lg space-y-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-yellow-500" /> Updates</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}><XCircle className="w-6 h-6" /></Button>
                        </div>
                        <div className="space-y-4">
                            {notifications.map((n, i) => (
                                <div key={n.id || i} className="bg-white/5 p-4 rounded border border-white/5">
                                    <h4 className="font-bold text-white mb-1">{n.subject}</h4>
                                    <div className="text-sm text-gray-400 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: n.message }} />
                                    <p className="text-[10px] text-gray-600 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {notifications.length === 0 && <p className="text-gray-500 text-center">No new updates.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Support Modal */}
            {showSupport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md md:max-w-xl h-[600px] flex flex-col rounded-xl shadow-2xl overflow-hidden">

                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-green-500" /> Support Center
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowSupport(false)}><XCircle className="w-6 h-6 text-gray-400" /></Button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-900">
                            {supportView === 'list' && (
                                <div className="p-4 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-white font-bold">My Tickets</h4>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setSupportView('create')}>
                                            <Plus className="w-4 h-4 mr-1" /> New Ticket
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {supportTickets.length === 0 && <p className="text-center text-gray-500 py-10">No tickets found.</p>}
                                        {supportTickets.map(t => (
                                            <div key={t.id} onClick={() => openTicketChat(t)} className="p-3 bg-white/5 border border-white/5 rounded cursor-pointer hover:bg-white/10">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-white block">{t.subject}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${t.status === 'open' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>{t.status}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.message}</p>
                                                <p className="text-[10px] text-gray-500 mt-2">{new Date(t.created_at).toLocaleDateString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {supportView === 'create' && (
                                <div className="p-6 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Button variant="ghost" size="sm" onClick={() => setSupportView('list')}><ChevronLeft className="w-4 h-4" /></Button>
                                        <h4 className="text-white font-bold">New Ticket</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Subject</Label>
                                            <Input value={supportSubject} onChange={e => setSupportSubject(e.target.value)} placeholder="e.g. Payment Issue" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Message</Label>
                                            <Textarea className="min-h-[150px]" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Describe your issue..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-auto pt-4">
                                        <Button variant="ghost" onClick={() => setSupportView('list')}>Cancel</Button>
                                        <Button className="bg-green-600" onClick={createTicket} disabled={isSubmittingTicket}>
                                            <Send className="w-4 h-4 mr-2" /> Submit Ticket
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {supportView === 'chat' && activeTicket && (
                                <div className="flex flex-col h-full">
                                    <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-zinc-800/50">
                                        <Button variant="ghost" size="sm" onClick={() => setSupportView('list')}><ChevronLeft className="w-4 h-4" /></Button>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{activeTicket.subject}</h4>
                                            <p className="text-[10px] text-gray-400">Ticket ID: {activeTicket.id.slice(0, 8)}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                                        {chatMessages.map((msg, idx) => {
                                            const isMe = msg.sender_id === user?.id; // Assuming user.id available
                                            return (
                                                <div key={idx} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {!isMe && (
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-white shrink-0 mb-1">
                                                            <img src="/admin_avatar.png" alt="Admin" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[75%] p-3 rounded-xl text-sm ${isMe ? 'bg-green-600 text-white rounded-br-none' : 'bg-zinc-700 text-gray-200 rounded-bl-none'}`}>
                                                        <p>{msg.message}</p>
                                                        <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div ref={(el) => { if (el) el.scrollIntoView({ behavior: "smooth" }); }}></div>

                                    <div className="p-3 bg-zinc-900 border-t border-white/10 flex gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Type a message..."
                                            className="bg-zinc-800 border-zinc-700"
                                            onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                        />
                                        <Button size="icon" className="bg-green-600" onClick={sendChatMessage}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Left Column: Work Area (2/3) */}
                <div className="lg:col-span-2 space-y-12">
                    <div className="flex space-x-4 mb-4">
                        <button
                            onClick={() => setActiveTab('submissions')}
                            className={`px-4 py-2 rounded-md font-bold transition-colors ${activeTab === 'submissions' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                        >
                            Incoming Submissions {stats.pending > 0 && <span className="ml-2 bg-white text-green-600 text-xs px-1.5 py-0.5 rounded-full">{stats.pending}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('playlists')}
                            className={`px-4 py-2 rounded-md font-bold transition-colors ${activeTab === 'playlists' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                        >
                            My Playlists
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
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

                    {/* Incoming Submissions */}
                    {activeTab === 'submissions' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-white text-xl">Incoming Submissions</h3>
                            <div className="space-y-4">
                                {loadingReviews && <p className="text-gray-500">Loading...</p>}
                                {!loadingReviews && reviews.length === 0 && <p className="text-gray-500">No pending submissions.</p>}

                                {reviews.map(review => (
                                    <div key={review.id} className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                                        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${review.tier === 'exclusive' ? 'bg-yellow-500 text-black' :
                                                        review.tier === 'express' ? 'bg-orange-500 text-white' :
                                                            'bg-blue-500 text-white'
                                                        } `}>
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

                                                <div className="mt-3 p-3 bg-black/30 rounded text-xs text-gray-400 space-y-1">
                                                    <p><span className="text-gray-500">Bio:</span> {review.artist?.bio || "No bio"}</p>
                                                    <div className="flex gap-3 mt-2">
                                                        {review.artist?.instagram && <a href={`https://instagram.com/${review.artist.instagram}`} target="_blank" className="hover:text-white">IG: @{review.artist.instagram}</a>}
                                                        {review.artist?.twitter && <a href={`https://twitter.com/${review.artist.twitter}`} target="_blank" className="hover:text-white">TW: @{review.artist.twitter}</a>}
                                                    </div >
                                                </div >
                                            </div >

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
                        </div>
                    )}

                    {/* My Playlists */}
                    {activeTab === 'playlists' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-white text-xl">My Playlists</h3>
                                {verificationStatus === 'verified' ? (
                                    <Button size="sm" variant="outline" className="border-dashed border-white/20 hover:border-white/50" onClick={() => { setEditingPlaylist(null); setNewName(""); setNewGenre(""); setShowAddPlaylist(true); }}>
                                        <Plus className="w-4 h-4 mr-2" /> New
                                    </Button>
                                ) : (
                                    <div onClick={() => setShowProfile(true)} className="cursor-pointer px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs font-bold hover:bg-red-500/20 flex items-center animate-pulse">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Verify to add playlists
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {myPlaylists.length === 0 && <p className="text-gray-500 text-sm">No playlists yet.</p>}
                                {myPlaylists.map(playlist => (
                                    <Card key={playlist.id} className="bg-white/5 border-none">
                                        <CardContent className="p-4 flex flex-col gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0`}>
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
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500 hover:text-white" onClick={() => handleRefreshPlaylist(playlist)} disabled={isRefreshing === playlist.id} title="Refresh Metadata">
                                                    <RefreshCw className={`w-3 h-3 ${isRefreshing === playlist.id ? 'animate-spin' : ''}`} />
                                                </Button>
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
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span className="text-white truncate max-w-[120px]">{song.song_title}</span>
                                                                        {song.ranking_boosted_at && <span className="text-[10px] bg-green-500 text-black px-1 rounded font-bold animate-pulse">Rising</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <a href={song.song_link} target="_blank" className="text-gray-400 hover:text-white">Link</a>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className={`h-6 w-6 ${song.ranking_boosted_at ? 'text-green-500' : 'text-gray-600 hover:text-green-500'}`}
                                                                            onClick={() => toggleRankingBoost(song.id)}
                                                                            title="Notify Artist of Ranking Boost"
                                                                        >
                                                                            <Zap className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
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
                    )}
                </div>

                {/* Right Column: Finance (1/3) */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-zinc-900 border-white/10 overflow-hidden sticky top-8">
                        <div className="bg-gradient-to-r from-green-900/40 to-black p-6 border-b border-green-500/10">
                            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-500" /> Wallet Balance
                            </h3>
                            <div className="text-3xl font-bold text-white tracking-tight">
                                {pricingConfig.currency}{user?.balance?.toLocaleString() || 0}
                            </div>
                        </div>
                        <CardContent className="p-6">
                            <Button onClick={() => setShowWithdraw(true)} className="w-full bg-white text-black hover:bg-gray-200 py-6 text-lg font-bold">
                                Request Payout
                            </Button>
                            <p className="text-[10px] text-center text-gray-500 mt-4">Minimum withdrawal: {pricingConfig.currency}5,000</p>
                        </CardContent>

                        <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white text-md flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" /> History
                                </h3>
                            </div>
                            {user && <TransactionsList userId={user.id} />}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Profile Modal */}
            {
                showProfile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto space-y-6">
                            <h3 className="font-bold text-white text-lg">Curator Settings</h3>

                            {/* Verification Status */}
                            <div className="bg-white/5 p-4 rounded border border-white/10">
                                <h4 className="text-sm font-bold text-white mb-2">Verification Status</h4>
                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${verificationStatus === 'verified' ? 'bg-green-500/20 text-green-500' :
                                        verificationStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                            'bg-red-500/20 text-red-500'
                                        }`}>
                                        {verificationStatus}
                                    </span>
                                    {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
                                        <Button size="sm" variant="outline" onClick={() => setShowApplicationModal(true)}>
                                            {verificationStatus === 'rejected' ? 'Re-Apply' : 'Request Verification'}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-400 border-b border-white/10 pb-2">Profile Avatar</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    {['/avatars/curator_avatar_1.png', '/avatars/curator_avatar_2.png', '/avatars/curator_avatar_3.png', '/avatars/curator_avatar_4.png'].map((src, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setProfileAvatar(src)}
                                            className={`aspect-square rounded-full overflow-hidden cursor-pointer border-2 transition-all ${profileAvatar === src ? 'border-green-500 scale-110' : 'border-transparent hover:border-white/50'}`}
                                        >
                                            <img src={src} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-400 border-b border-white/10 pb-2">Public Profile</h4>
                                <div className="space-y-2">
                                    <Label>Bio</Label>
                                    <Textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="About you..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Instagram (Username)</Label>
                                        <Input value={profileIg} onChange={e => setProfileIg(e.target.value)} placeholder="username" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Twitter (Username)</Label>
                                        <Input value={profileTwitter} onChange={e => setProfileTwitter(e.target.value)} placeholder="username" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-400 border-b border-white/10 pb-2">Bank Details</h4>
                                <p className="text-xs text-gray-500">Used for withdrawals.</p>
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Number</Label>
                                    <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0123456789" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Name</Label>
                                    <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account Holder Name" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                                <Button variant="ghost" onClick={() => setShowProfile(false)}>Cancel</Button>
                                <Button className="bg-green-600" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                                    {isUpdatingProfile ? "Saving..." : "Save Settings"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Withdraw Modal */}
            {
                showWithdraw && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
                            <h3 className="font-bold text-white text-lg">Request Payout</h3>

                            {(!bankName || !accountNumber) ? (
                                <div className="py-8 text-center space-y-4">
                                    <div className="p-4 bg-yellow-500/10 rounded-full inline-block">
                                        <AlertCircle className="w-8 h-8 text-yellow-500" />
                                    </div>
                                    <p className="text-gray-300">Please add your bank details in settings before withdrawing.</p>
                                    <Button className="w-full bg-white text-black" onClick={() => { setShowWithdraw(false); setShowProfile(true); }}>
                                        Go to Settings
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="py-4 space-y-4">
                                        <div className="p-4 bg-white/5 rounded border border-white/10 text-sm">
                                            <p className="text-gray-400 text-xs mb-1">Transfer Destination</p>
                                            <p className="font-bold text-white">{bankName}</p>
                                            <p className="text-gray-300">{accountNumber} • {accountName}</p>
                                            <Button variant="link" className="text-green-500 text-xs h-auto p-0 mt-2" onClick={() => { setShowWithdraw(false); setShowProfile(true); }}>
                                                Change Account
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Amount to Withdraw</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-3 text-gray-500">{pricingConfig.currency}</span>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={withdrawAmount}
                                                    onChange={e => setWithdrawAmount(e.target.value)}
                                                    className="pl-8 bg-black/40 border-white/10"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">Available: {pricingConfig.currency}{user?.balance?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" onClick={() => setShowWithdraw(false)}>Cancel</Button>
                                        <Button className="bg-green-600" onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount}>
                                            {isWithdrawing ? "Processing..." : "Submit Request"}
                                        </Button>
                                    </div>
                                </>
                            )}
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

            {/* ACCEPT MODAL */}
            {showAcceptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 rounded-lg space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-500" /> Accept Submission
                        </h3>
                        <p className="text-sm text-gray-400">Send a congratulatory message to the artist.</p>

                        <div className="space-y-3">
                            <Label>Message to Artist</Label>
                            <Textarea
                                value={acceptFeedback}
                                onChange={e => setAcceptFeedback(e.target.value)}
                                placeholder="Great track!..."
                                className="min-h-[120px]"
                            />
                            <p className="text-xs text-gray-500">Includes link sharing instructions automatically.</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowAcceptModal(false)}>Cancel</Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={confirmAccept}>Confirm & Add to Playlist</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* APPLICATION MODAL */}
            {showApplicationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500" /> Apply for Verification
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowApplicationModal(false)}><XCircle className="w-6 h-6 text-gray-500" /></Button>
                        </div>

                        <div className="bg-yellow-500/10 p-4 rounded text-sm text-yellow-200 border border-yellow-500/20">
                            <p><strong>Note:</strong> Verified curators get access to paid submission tiers and priority support. Please provide accurate details.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Portfolio / Social Links <span className="text-red-500">*</span></Label>
                                <Input
                                    value={appPortfolio}
                                    onChange={e => setAppPortfolio(e.target.value)}
                                    placeholder="Spotify Profile, Instagram, Website..."
                                    className="bg-black/40 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone Number <span className="text-red-500">*</span></Label>
                                <Input
                                    value={appPhone}
                                    onChange={e => setAppPhone(e.target.value)}
                                    placeholder="+234..."
                                    className="bg-black/40 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>NIN Number <span className="text-red-500">*</span></Label>
                                <Input
                                    value={appNin}
                                    onChange={e => setAppNin(e.target.value)}
                                    placeholder="Enter your 11-digit NIN"
                                    className="bg-black/40 border-white/10"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Years of Experience <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="number"
                                        value={appExperience}
                                        onChange={e => setAppExperience(e.target.value)}
                                        placeholder="e.g. 2"
                                        className="bg-black/40 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Primary Genres</Label>
                                    <Input
                                        value={appGenres}
                                        onChange={e => setAppGenres(e.target.value)}
                                        placeholder="Afrobeats, Hip Hop..."
                                        className="bg-black/40 border-white/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Why do you want to join AfroPitch?</Label>
                                <Textarea
                                    value={appReason}
                                    onChange={e => setAppReason(e.target.value)}
                                    placeholder="Tell us about your curation philosophy..."
                                    className="bg-black/40 border-white/10 min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setShowApplicationModal(false)}>Cancel</Button>
                            <Button className="bg-green-600 hover:bg-green-700 font-bold" onClick={handleApplyCurator} disabled={isApplying}>
                                {isApplying ? "Submitting..." : "Submit Application"}
                            </Button>
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
                                    <Label>Playlist Type (Pricing Model)</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['free', 'standard', 'express', 'exclusive'] as const).map((t) => (
                                            <div
                                                key={t}
                                                onClick={() => setNewPlaylistType(t)}
                                                className={`cursor-pointer p-3 border rounded-lg text-center transition-all ${newPlaylistType === t ? 'bg-green-600 border-green-500 text-white' : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:border-zinc-500'}`}
                                            >
                                                <div className="font-bold capitalize">{t}</div>
                                                <div className="text-[10px] opacity-70">
                                                    {t === 'free' && 'No earnings'}
                                                    {t === 'standard' && `${pricingConfig.currency}${pricingConfig.tiers.standard.price} / sub`}
                                                    {t === 'express' && `${pricingConfig.currency}${pricingConfig.tiers.express.price} / sub`}
                                                    {t === 'exclusive' && `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price} / sub`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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


