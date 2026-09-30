"use client";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, HelpCircle, Settings, LogOut, CheckCircle, XCircle, Plus, ListMusic, Zap, Send, ChevronLeft, AlertCircle, RefreshCw, Star, TrendingUp, Wallet, Music4 } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { TransactionsList } from "@/components/TransactionsList";
import { ReviewCard } from "@/components/dashboards/curator/ReviewCard";
import { PlaylistCard } from "@/components/dashboards/curator/PlaylistCard";
import { PreviewModal } from "@/components/dashboards/curator/PreviewModal";
import type { Playlist } from "@/components/dashboards/curator/types";
import { timeAgo, formatFollowers, currentMonthName, isThisMonth } from "@/components/dashboards/curator/format";

type View = "queue" | "playlists" | "earnings" | "profile";
type TierFilter = "all" | "express" | "standard";

export default function CuratorDashboard() {
    const { user, isLoading, deductFunds, logout, refreshUser } = useAuth();
    const { toast } = useToast();
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
    const chatBottomRef = useRef<HTMLDivElement>(null);
    const chatChannelRef = useRef<any>(null);

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

    // View State (mobile tab bar / desktop sidebar)
    const [view, setView] = useState<View>("queue");
    const [tierFilter, setTierFilter] = useState<TierFilter>("all");
    const [previewReview, setPreviewReview] = useState<any>(null);

    // Real Data State
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const fetchCuratorData = useCallback(async (isRefetch = false) => {
        if (!user) return;

        // Only show loading state on very first fetch for this session
        if (!hasFetched.current && !isRefetch) {
            setLoadingReviews(true);
        }

        try {
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
                // Re-fetch accurate counts
                const { data: counts } = await supabase.from('submissions').select('playlist_id, status');
                // Client side aggregate for simplicity with small data
                const plCounts: Record<string, number> = {};
                if (counts) {
                    counts.forEach((c: any) => {
                        if (c.status === 'pending') {
                            plCounts[c.playlist_id] = (plCounts[c.playlist_id] || 0) + 1;
                        }
                    });
                }

                setMyPlaylists(playlists.map((p: any) => ({
                    ...p,
                    submissions: plCounts[p.id] || 0
                })) as any);
            }

            // 2. Fetch Submissions (Reviews) for my playlists
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
            } else {
                // reset if no playlists found
                setReviews([]);
            }
        } catch (error) {
            console.error("Error fetching curator data:", error);
        } finally {
            setLoadingReviews(false);
            hasFetched.current = true;
        }
    }, [user]);

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
            toast("Error: " + error.message, "error");
        } else {
            toast("Profile updated!", "success");
            setShowProfile(false);
        }
        setIsUpdatingProfile(false);
    };

    const handleApplyCurator = async () => {
        if (!appPortfolio || !appExperience || !appPhone || !appNin) {
            toast("Please fill in all required fields (Portfolio, Experience, Phone, and NIN).", "error");
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
                toast("Error submitting application: " + error.message, "error");
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
                        old_record: { verification_status: verificationStatus }
                    }
                }).catch(err => console.error("Manual Notify Failed:", err));

                toast("Application submitted! We will review your details shortly.", "success");
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
            toast("Unexpected error. Please try again.", "error");
        } finally {
            setIsApplying(false);
        }
    };

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);

    const toggleNotification = (id: string) => {
        setExpandedNotificationId(prev => prev === id ? null : id);
    };

    const fetchNotifications = async () => {
        if (!user) return;

        let query = supabase
            .from('broadcasts')
            .select('*')
            .or('target_role.eq.all,target_role.is.null,target_role.eq.curator');

        // Filter by user creation date if available (don't show old news)
        if (user.created_at) {
            query = query.gt('created_at', user.created_at);
        }

        const { data } = await query
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setNotifications(data);
    };

    useEffect(() => {
        if (user?.id) {
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

            // Realtime Subscription
            const channel = supabase
                .channel('curator-dashboard-updates')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'submissions' },
                    (payload) => {
                        // Refetch nicely without UI toggle flicker
                        fetchCuratorData(true);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.id, fetchCuratorData]);

    const handleWithdraw = async () => {
        if (!user) return;
        setIsWithdrawing(true);
        const amount = parseFloat(withdrawAmount);

        if (isNaN(amount) || amount <= 0) {
            toast("Please enter a valid amount.", "error");
            setIsWithdrawing(false);
            return;
        }


        if (amount > user.balance) {
            toast("Insufficient funds.", "error");
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
            toast("Unable to process payout. Please try again or contact support.", "error");
        } else if (data && !data.success) {
            toast("Payout Failed: " + data.message, "error");
        } else {
            // Success
            toast("Withdrawal requested! Processing within 1-24 hours.", "success");

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
                toast("Error creating ticket: " + error.message, "error");
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

                toast("Support ticket created!", "success");
                setSupportSubject("");
                setSupportMessage("");
                setSupportView('list');
                fetchTickets();
            }
        } catch (err: any) {
            console.error("Unexpected error submitting ticket:", err);
            toast("An unexpected error occurred.", "error");
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

        // Cleanup previous channel
        if (chatChannelRef.current) {
            supabase.removeChannel(chatChannelRef.current);
        }

        // Subscribe to new messages in this ticket (realtime)
        const channel = supabase
            .channel(`support-chat-${ticket.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
                (payload) => {
                    setChatMessages(prev => {
                        // Avoid duplicates (we may have added it optimistically)
                        if (prev.some(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                }
            )
            .subscribe();

        chatChannelRef.current = channel;
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
            toast("Verification required to add playlists.", "warning");
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
            description: (() => {
                let desc = `Playlist · ${user.name || 'Curator'}`;
                if (songsCount > 0) desc += ` · ${songsCount} items`;
                if (newFollowers > 0) desc += ` · ${newFollowers.toLocaleString()} saves`;
                return desc;
            })(),
            playlist_link: newPlaylistLink
        };

        let error: any = null;

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
            toast("Error saving playlist: " + error.message, "error");
        } else {
            toast(editingPlaylist ? "Playlist updated!" : "Playlist created!", "success");
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
        setNewGenre("");
        setNewFollowers(playlist.followers);
        setNewPlaylistType(playlist.type);
        setNewCoverImage(playlist.cover_image);
        setSongsCount(0);
        setShowAddPlaylist(true);
    };

    const handleDeletePlaylist = async (id: string) => {
        if (!confirm("Are you sure you want to delete this playlist?")) return;

        const { error } = await supabase.from('playlists').delete().eq('id', id);

        if (error) {
            toast("Error deleting playlist: " + error.message, "error");
        } else {
            setMyPlaylists(prev => prev.filter(p => p.id !== id));
        }
    };

    const toggleRankingBoost = async (submissionId: string) => {
        const sub = playlistSongs.find(s => s.id === submissionId) || reviews.find(s => s.id === submissionId);
        if (!sub) return;

        const newVal = sub.ranking_boosted_at ? null : new Date().toISOString();

        const { error } = await supabase
            .from('submissions')
            .update({ ranking_boosted_at: newVal })
            .eq('id', submissionId);

        if (error) {
            toast("Error updating ranking: " + error.message, "error");
        } else {
            setPlaylistSongs(prev => prev.map(s => s.id === submissionId ? { ...s, ranking_boosted_at: newVal } : s));
            setReviews(prev => prev.map(s => s.id === submissionId ? { ...s, ranking_boosted_at: newVal } : s));
            if (newVal) toast("Artist notified of ranking boost!", "success");
        }
    };

    const togglePlaylistSongs = async (playlistId: string) => {
        if (expandedPlaylistId === playlistId) {
            setExpandedPlaylistId(null);
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

        if (data) {
            setPlaylistSongs(data);
        }
        setIsLoadingSongs(false);
    };

    const handleRefreshPlaylist = async (playlist: Playlist) => {
        if (!playlist.playlist_link) {
            toast("Cannot refresh: No Spotify link found.", "warning");
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
                    description: (() => {
                        let desc = `Playlist · ${user?.name || 'Curator'}`;
                        if (data.songsCount > 0) desc += ` · ${data.songsCount} items`;
                        if (data.followers > 0) desc += ` · ${data.followers.toLocaleString()} saves`;
                        return desc;
                    })()
                }).eq('id', playlist.id);

                if (error) throw error;

                toast("Playlist updated from Spotify!", "success");
                fetchCuratorData(); // Reload list
            } else {
                toast("Failed to fetch Spotify data: " + (data.error || "Unknown error"), "error");
            }
        } catch (err) {
            console.error("Refresh Error", err);
            toast("Error refreshing playlist.", "error");
        } finally {
            setIsRefreshing(null);
        }
    };

    // Auto-fetch info using our internal API
    useEffect(() => {
        if (newPlaylistLink && !newName) {
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
                // strict check for url validity optionally
                if (newPlaylistLink.includes("http")) fetchInfo();
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [newPlaylistLink]);

    const handleReviewAction = async (submissionId: string, action: 'accepted' | 'declined' | 'archived', feedback: string) => {
        if (!user) return;

        // All actions (including archived) go through the secure RPC below so the
        // money logic runs: archived refunds the artist, like a decline.

        // Create tracking slug if accepted
        let trackingSlug = null;
        if (action === 'accepted') {
            const sub = reviews.find(r => r.id === submissionId);
            if (sub) {
                const cleanTitle = (sub.song_title || 'track').replace(/[^a-z0-9]/gi, '-').toLowerCase();
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
            toast("Error processing review: " + error.message, "error");
        } else if (data && !data.success) {
            toast("Error: " + data.message, "error");
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

    // Derived data for the new layout
    const month = currentMonthName();
    const pendingReviews = reviews.filter((r: any) => r.status === 'pending');
    const decidedReviews = reviews.filter((r: any) => r.status !== 'pending');
    const visiblePending = tierFilter === 'all' ? pendingReviews : pendingReviews.filter((r: any) => r.tier === tierFilter);
    const expressPending = pendingReviews.filter((r: any) => r.tier === 'express').length;
    const acceptedCount = reviews.filter((r: any) => r.status === 'accepted').length;
    const totalFollowers = myPlaylists.reduce((acc, p) => acc + (Number(p.followers) || 0), 0);
    const monthEarned = reviews
        .filter((r: any) => (r.status === 'accepted' || r.status === 'declined') && isThisMonth(r.created_at))
        .reduce((acc: number, r: any) => acc + (Number(r.amount_paid) || 0), 0);

    const firstPlaylistName = myPlaylists[0]?.name;
    const queueSubtitle = view === 'queue'
        ? `${stats.pending} waiting${firstPlaylistName ? ` · ${firstPlaylistName}${myPlaylists.length > 1 ? ` and ${myPlaylists.length - 1} more` : ''}` : ''}`
        : view === 'playlists'
            ? `${myPlaylists.length} playlist${myPlaylists.length === 1 ? '' : 's'}`
            : view === 'earnings'
                ? 'Wallet and payout history'
                : 'Settings and verification';

    const viewTitle = view === 'queue' ? 'Review queue' : view === 'playlists' ? 'My playlists' : view === 'earnings' ? 'Earnings' : 'Profile';

    if (isLoading) return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-zinc-500">Loading dashboard...</div>;

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white antialiased">
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-[248px] flex-col border-r border-white/10 bg-[#0A0A0B] px-3.5 py-6 z-30">
                <div className="flex items-center gap-2.5 px-2.5 pb-5">
                    <span className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#22C55E] to-[#0E7A3D] flex items-center justify-center text-[18px] font-black text-[#04120a]">A</span>
                    <span className="font-extrabold text-[18px]">AfroPitch</span>
                </div>

                <nav className="flex flex-col gap-1">
                    <button
                        onClick={() => setView('queue')}
                        className={`flex items-center gap-3 px-3 py-[11px] rounded-xl text-sm font-semibold transition-colors ${view === 'queue' ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Music4 className="w-[18px] h-[18px]" />
                        Review queue
                        {stats.pending > 0 && (
                            <span className="ml-auto bg-[#EF4444] text-white text-[11px] font-extrabold rounded-full px-2 py-0.5">{stats.pending}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('playlists')}
                        className={`flex items-center gap-3 px-3 py-[11px] rounded-xl text-sm font-semibold transition-colors ${view === 'playlists' ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ListMusic className="w-[18px] h-[18px]" />
                        My playlists
                    </button>
                    <button
                        onClick={() => setView('earnings')}
                        className={`flex items-center gap-3 px-3 py-[11px] rounded-xl text-sm font-semibold transition-colors ${view === 'earnings' ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <TrendingUp className="w-[18px] h-[18px]" />
                        Earnings
                    </button>
                    <button
                        onClick={() => setShowSupport(true)}
                        className="flex items-center gap-3 px-3 py-[11px] rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <HelpCircle className="w-[18px] h-[18px]" />
                        Support
                    </button>
                    <button
                        onClick={() => setView('profile')}
                        className={`flex items-center gap-3 px-3 py-[11px] rounded-xl text-sm font-semibold transition-colors ${view === 'profile' ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings className="w-[18px] h-[18px]" />
                        Settings
                    </button>
                </nav>

                <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2.5 bg-[#141417] border border-white/10 rounded-[14px] p-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#22C55E] flex items-center justify-center font-extrabold text-[#04120a] text-[13px] shrink-0">
                            {(user?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold truncate">{user?.name || 'Curator'}</p>
                            <p className="text-[11px] text-zinc-500">Curator</p>
                        </div>
                        <button onClick={logout} title="Logout" className="text-zinc-500 hover:text-red-400 p-1.5">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MOBILE TOPBAR */}
            <header className="md:hidden sticky top-0 z-20 bg-[rgba(10,10,11,0.92)] backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <h1 className="text-[18px] font-bold leading-tight">{viewTitle}</h1>
                    <p className="text-xs text-zinc-500 truncate">{queueSubtitle}</p>
                </div>
                <button
                    onClick={() => setShowNotifications(true)}
                    title="Notifications"
                    className="w-10 h-10 rounded-xl border border-white/10 bg-[#141417] flex items-center justify-center relative shrink-0"
                >
                    <Bell className="w-5 h-5 text-zinc-400" />
                    {notifications.length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-[#0A0A0B]" />}
                </button>
            </header>

            {/* DESKTOP TOPBAR */}
            <div className="hidden md:block md:pl-[248px]">
                <div className="flex items-center gap-3.5 px-8 pt-7">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{viewTitle}</h1>
                        <p className="text-[13px] text-zinc-500 mt-0.5">{queueSubtitle}</p>
                    </div>
                    <button
                        onClick={() => setShowNotifications(true)}
                        title="Notifications"
                        className="ml-auto w-[42px] h-[42px] rounded-xl border border-white/10 bg-[#141417] flex items-center justify-center relative"
                    >
                        <Bell className="w-5 h-5 text-zinc-400" />
                        {notifications.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-[#0A0A0B]" />}
                    </button>
                </div>
            </div>

            <main className="md:pl-[248px] px-4 md:px-8 pb-32 md:pb-12 pt-4 md:pt-6">
                {/* ============ QUEUE VIEW ============ */}
                {view === 'queue' && (
                    <div className="space-y-4">
                        {/* Mobile: earnings card + segmented control */}
                        <div className="md:hidden space-y-3.5">
                            <div className="rounded-[20px] border border-[rgba(34,197,94,0.3)] bg-gradient-to-br from-[#14532D] to-[#052E16] p-[18px] flex items-center gap-3">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[1px] text-[#BBF7D0]">Earned in {month}</p>
                                    <p className="text-[28px] font-extrabold tracking-tight">{pricingConfig.currency}{monthEarned.toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => setShowWithdraw(true)}
                                    className="ml-auto bg-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold"
                                >
                                    Withdraw
                                </button>
                            </div>
                            <div className="grid grid-cols-2 bg-[#141417] border border-white/10 rounded-[14px] p-1">
                                <button
                                    onClick={() => setView('queue')}
                                    className="rounded-[10px] font-bold text-[13px] py-[11px] bg-[#22C55E] text-[#04120a]"
                                >
                                    Queue <span className="bg-black/20 rounded-full px-1.5 py-0.5 text-[11px] ml-1">{stats.pending}</span>
                                </button>
                                <button
                                    onClick={() => setView('playlists')}
                                    className="rounded-[10px] font-bold text-[13px] py-[11px] text-zinc-400"
                                >
                                    Playlists
                                </button>
                            </div>
                        </div>

                        {/* Desktop: stats row */}
                        <div className="hidden md:grid grid-cols-4 gap-3.5">
                            <div className="bg-[#141417] border border-white/10 rounded-[18px] p-[18px]">
                                <p className="text-zinc-500 text-xs uppercase tracking-[0.8px]">Pending reviews</p>
                                <p className="text-[30px] font-extrabold tracking-tight mt-1.5">{stats.pending}</p>
                                <p className="text-[#22C55E] text-xs font-bold mt-0.5">{expressPending} express</p>
                            </div>
                            <div className="bg-[#141417] border border-white/10 rounded-[18px] p-[18px]">
                                <p className="text-zinc-500 text-xs uppercase tracking-[0.8px]">Active playlists</p>
                                <p className="text-[30px] font-extrabold tracking-tight mt-1.5">{myPlaylists.length}</p>
                                <p className="text-[#22C55E] text-xs font-bold mt-0.5">{formatFollowers(totalFollowers)} followers</p>
                            </div>
                            <div className="bg-[#141417] border border-white/10 rounded-[18px] p-[18px]">
                                <p className="text-zinc-500 text-xs uppercase tracking-[0.8px]">Reviewed total</p>
                                <p className="text-[30px] font-extrabold tracking-tight mt-1.5">{stats.total_reviews}</p>
                                <p className="text-[#22C55E] text-xs font-bold mt-0.5">{acceptedCount} accepted</p>
                            </div>
                            <div className="rounded-[18px] border border-[rgba(34,197,94,0.35)] bg-gradient-to-br from-[#14532D] to-[#052E16] p-[18px]">
                                <p className="text-[#BBF7D0]/80 text-xs uppercase tracking-[0.8px]">Earned in {month}</p>
                                <p className="text-[30px] font-extrabold tracking-tight mt-1.5">{pricingConfig.currency}{monthEarned.toLocaleString()}</p>
                                <button onClick={() => setShowWithdraw(true)} className="text-[#22C55E] text-xs font-bold mt-0.5 hover:underline">
                                    Withdraw →
                                </button>
                            </div>
                        </div>

                        {/* Desktop: filter chips */}
                        <div className="hidden md:flex items-center">
                            <h2 className="text-[17px] font-bold">Waiting for you</h2>
                            <div className="ml-auto flex gap-2">
                                {(['all', 'express', 'standard'] as TierFilter[]).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setTierFilter(f)}
                                        className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${tierFilter === f
                                            ? 'bg-[#22C55E] border-[#22C55E] text-[#04120a]'
                                            : 'border-white/10 bg-[#141417] text-zinc-400 hover:text-white'}`}
                                    >
                                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cards */}
                        {loadingReviews && <p className="text-zinc-500 text-sm py-6 text-center">Loading reviews...</p>}
                        {!loadingReviews && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {visiblePending.map((review) => (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        currency={pricingConfig.currency}
                                        onAccept={() => handleReviewAction(review.id, 'accepted', 'Great track! Added to playlist.')}
                                        onDecline={() => openDeclineModal(review.id)}
                                        onArchive={() => handleReviewAction(review.id, 'archived' as any, 'Archived.')}
                                        onToggleBoost={() => toggleRankingBoost(review.id)}
                                        onPlay={() => setPreviewReview(review)}
                                    />
                                ))}
                            </div>
                        )}
                        {!loadingReviews && decidedReviews.length > 0 && (
                            <div className="pt-2">
                                <p className="text-[11px] uppercase tracking-[1px] text-zinc-500 mb-3">Recently decided</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {decidedReviews.map((review) => (
                                        <ReviewCard
                                            key={review.id}
                                            review={review}
                                            currency={pricingConfig.currency}
                                            onAccept={() => handleReviewAction(review.id, 'accepted', 'Great track! Added to playlist.')}
                                            onDecline={() => openDeclineModal(review.id)}
                                            onArchive={() => handleReviewAction(review.id, 'archived' as any, 'Archived.')}
                                            onToggleBoost={() => toggleRankingBoost(review.id)}
                                            onPlay={() => setPreviewReview(review)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {!loadingReviews && reviews.length === 0 && (
                            <div className="bg-[#141417] border border-white/10 rounded-[20px] p-10 text-center">
                                <p className="text-zinc-400 font-semibold">No submissions yet.</p>
                                <p className="text-zinc-500 text-sm mt-1">New pitches to your playlists will appear here.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ============ PLAYLISTS VIEW ============ */}
                {view === 'playlists' && (
                    <div className="space-y-4 max-w-3xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[17px] font-bold md:hidden">My playlists</h2>
                            <span className="hidden md:block text-sm text-zinc-500">{myPlaylists.length} playlist{myPlaylists.length === 1 ? '' : 's'}</span>
                            {verificationStatus === 'verified' ? (
                                <button
                                    onClick={() => { setEditingPlaylist(null); setNewName(""); setNewGenre(""); setShowAddPlaylist(true); }}
                                    className="flex items-center gap-1.5 text-sm font-bold border border-dashed border-white/20 hover:border-white/50 rounded-xl px-3 py-2 text-zinc-300"
                                >
                                    <Plus className="w-4 h-4" /> New
                                </button>
                            ) : (
                                <button
                                    onClick={() => setView('profile')}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-xl text-[#F87171] text-xs font-bold hover:bg-[rgba(239,68,68,0.2)] animate-pulse"
                                >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Verify to add playlists
                                </button>
                            )}
                        </div>

                        {myPlaylists.length === 0 && (
                            <div className="bg-[#141417] border border-white/10 rounded-[20px] p-10 text-center">
                                <p className="text-zinc-400 font-semibold">No playlists yet.</p>
                                <p className="text-zinc-500 text-sm mt-1">Add a playlist to start receiving submissions.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {myPlaylists.map((playlist) => (
                                <PlaylistCard
                                    key={playlist.id}
                                    playlist={playlist}
                                    expanded={expandedPlaylistId === playlist.id}
                                    songs={expandedPlaylistId === playlist.id ? playlistSongs : []}
                                    loadingSongs={isLoadingSongs}
                                    isRefreshing={isRefreshing === playlist.id}
                                    onToggleSongs={() => togglePlaylistSongs(playlist.id)}
                                    onRefresh={() => handleRefreshPlaylist(playlist)}
                                    onEdit={() => openEditModal(playlist)}
                                    onDelete={() => handleDeletePlaylist(playlist.id)}
                                    onToggleBoost={toggleRankingBoost}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ============ EARNINGS VIEW ============ */}
                {view === 'earnings' && (
                    <div className="space-y-4 max-w-2xl">
                        <div className="rounded-[20px] border border-[rgba(34,197,94,0.3)] bg-gradient-to-br from-[#14532D] to-[#052E16] p-6">
                            <p className="text-[11px] uppercase tracking-[1px] text-[#BBF7D0] flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Wallet balance
                            </p>
                            <p className="text-4xl font-extrabold tracking-tight mt-2">
                                {pricingConfig.currency}{user?.balance?.toLocaleString() || 0}
                            </p>
                            <p className="text-xs text-[#BBF7D0]/70 mt-1">Earned in {month}: {pricingConfig.currency}{monthEarned.toLocaleString()}</p>
                            <button
                                onClick={() => setShowWithdraw(true)}
                                className="mt-4 w-full bg-white text-black rounded-xl py-3.5 text-base font-bold hover:bg-zinc-200"
                            >
                                Request Payout
                            </button>
                            <p className="text-[10px] text-center text-[#BBF7D0]/60 mt-3">Minimum withdrawal: {pricingConfig.currency}5,000</p>
                        </div>

                        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-4">
                            <h3 className="font-bold text-white mb-3 px-1">History</h3>
                            {user && <TransactionsList userId={user.id} />}
                        </div>
                    </div>
                )}

                {/* ============ PROFILE VIEW ============ */}
                {view === 'profile' && (
                    <div className="space-y-4 max-w-2xl">
                        {/* Verification status */}
                        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-5">
                            <h3 className="text-sm font-bold text-white mb-3">Verification status</h3>
                            <div className="flex items-center justify-between">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${verificationStatus === 'verified' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]' :
                                    verificationStatus === 'pending' ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B]' :
                                        'bg-[rgba(239,68,68,0.12)] text-[#F87171]'
                                    }`}>
                                    {verificationStatus}
                                </span>
                                {(verificationStatus === 'none' || verificationStatus === 'rejected') && (
                                    <Button size="sm" variant="outline" className="border-white/10" onClick={() => setShowApplicationModal(true)}>
                                        {verificationStatus === 'rejected' ? 'Re-apply' : 'Request verification'}
                                    </Button>
                                )}
                            </div>
                            {verificationStatus === 'pending' && (
                                <p className="text-xs text-zinc-500 mt-3">Your application is under review. We will notify you once it is approved.</p>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-5">
                            <h3 className="text-sm font-bold text-zinc-400 mb-3">Profile avatar</h3>
                            <div className="grid grid-cols-4 gap-4 max-w-xs">
                                {['/avatars/curator_avatar_1.png', '/avatars/curator_avatar_2.png', '/avatars/curator_avatar_3.png', '/avatars/curator_avatar_4.png'].map((src, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setProfileAvatar(src)}
                                        className={`aspect-square rounded-full overflow-hidden cursor-pointer border-2 transition-all ${profileAvatar === src ? 'border-[#22C55E] scale-110' : 'border-transparent hover:border-white/50'}`}
                                    >
                                        <img src={src} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Public profile */}
                        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-5 space-y-4">
                            <h3 className="text-sm font-bold text-zinc-400">Public profile</h3>
                            <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="About you..." className="bg-black/40 border-white/10" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Instagram (username)</Label>
                                    <Input value={profileIg} onChange={e => setProfileIg(e.target.value)} placeholder="username" className="bg-black/40 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Twitter (username)</Label>
                                    <Input value={profileTwitter} onChange={e => setProfileTwitter(e.target.value)} placeholder="username" className="bg-black/40 border-white/10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input value={profileWeb} onChange={e => setProfileWeb(e.target.value)} placeholder="https://..." className="bg-black/40 border-white/10" />
                            </div>
                        </div>

                        {/* Bank details */}
                        <div className="bg-[#141417] border border-white/10 rounded-[20px] p-5 space-y-4">
                            <h3 className="text-sm font-bold text-zinc-400">Bank details</h3>
                            <p className="text-xs text-zinc-500">Used for withdrawals.</p>
                            <div className="space-y-2">
                                <Label>Bank name</Label>
                                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" className="bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Account number</Label>
                                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0123456789" className="bg-black/40 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Account name</Label>
                                <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account holder name" className="bg-black/40 border-white/10" />
                            </div>
                        </div>

                        <Button className="w-full bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold py-6" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                            {isUpdatingProfile ? "Saving..." : "Save settings"}
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="border-white/10 py-5" onClick={() => setShowSupport(true)}>
                                <HelpCircle className="w-4 h-4 mr-2" /> Support
                            </Button>
                            <Button variant="outline" className="border-white/10 py-5 hover:border-red-500/50 hover:text-red-400" onClick={logout}>
                                <LogOut className="w-4 h-4 mr-2" /> Logout
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* MOBILE TAB BAR */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[rgba(16,16,19,0.96)] backdrop-blur-xl border-t border-white/10 grid grid-cols-4 px-1 pt-2.5 pb-[22px]">
                <button onClick={() => setView('queue')} className={`relative flex flex-col items-center gap-1 text-[10px] font-semibold py-1 ${view === 'queue' ? 'text-[#22C55E]' : 'text-zinc-500'}`}>
                    <Music4 className="w-[22px] h-[22px]" />
                    Queue
                    {stats.pending > 0 && (
                        <span className="absolute top-0 right-[calc(50%-24px)] bg-[#EF4444] text-white text-[9px] font-extrabold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">{stats.pending}</span>
                    )}
                </button>
                <button onClick={() => setView('playlists')} className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 ${view === 'playlists' ? 'text-[#22C55E]' : 'text-zinc-500'}`}>
                    <ListMusic className="w-[22px] h-[22px]" />
                    Playlists
                </button>
                <button onClick={() => setView('earnings')} className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 ${view === 'earnings' ? 'text-[#22C55E]' : 'text-zinc-500'}`}>
                    <TrendingUp className="w-[22px] h-[22px]" />
                    Earnings
                </button>
                <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 ${view === 'profile' ? 'text-[#22C55E]' : 'text-zinc-500'}`}>
                    <Settings className="w-[22px] h-[22px]" />
                    Profile
                </button>
            </nav>

            {/* ============ NOTIFICATIONS MODAL ============ */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#141417] border border-white/10 w-full max-w-md p-6 rounded-[20px] space-y-5 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-[#F59E0B]" /> Updates</h3>
                            <button onClick={() => setShowNotifications(false)} className="text-zinc-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-3">
                            {notifications.length === 0 && (
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <h4 className="font-bold text-white mb-1">Welcome to AfroPitch!</h4>
                                    <p className="text-sm text-zinc-400 mb-2">
                                        We are excited to have you as a curator. Add your playlists and start reviewing submissions to earn.
                                    </p>
                                    <p className="text-[10px] text-zinc-600">Just now</p>
                                </div>
                            )}

                            {notifications.map((n, i) => {
                                const isExpanded = expandedNotificationId === n.id;
                                return (
                                    <div
                                        key={n.id || i}
                                        className="bg-white/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                        onClick={() => toggleNotification(n.id)}
                                    >
                                        <h4 className="font-bold text-white mb-1 flex justify-between items-start">
                                            <span>{n.subject}</span>
                                            <span className="text-[10px] text-zinc-500 font-normal ml-2 shrink-0 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{isExpanded ? 'Collapse' : 'Read'}</span>
                                        </h4>
                                        <div className={`text-sm text-zinc-400 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {n.message ? n.message.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : ''}
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SUPPORT MODAL ============ */}
            {showSupport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#141417] border border-white/10 w-full max-w-md md:max-w-xl h-[600px] max-h-[85vh] flex flex-col rounded-[20px] shadow-2xl overflow-hidden">

                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-[#22C55E]" /> Support Center
                            </h3>
                            <button onClick={() => setShowSupport(false)} className="text-zinc-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            {supportView === 'list' && (
                                <div className="p-4 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-white font-bold">My Tickets</h4>
                                        <Button size="sm" className="bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold" onClick={() => setSupportView('create')}>
                                            <Plus className="w-4 h-4 mr-1" /> New Ticket
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {supportTickets.length === 0 && <p className="text-center text-zinc-500 py-10">No tickets found.</p>}
                                        {supportTickets.map(t => (
                                            <div key={t.id} onClick={() => openTicketChat(t)} className="p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-white block">{t.subject}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${t.status === 'open' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]' : 'bg-zinc-500/20 text-zinc-500'}`}>{t.status}</span>
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{t.message}</p>
                                                <p className="text-[10px] text-zinc-500 mt-2">{new Date(t.created_at).toLocaleDateString()}</p>
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
                                            <Input value={supportSubject} onChange={e => setSupportSubject(e.target.value)} placeholder="e.g. Payment Issue" className="bg-black/40 border-white/10" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Message</Label>
                                            <Textarea className="min-h-[150px] bg-black/40 border-white/10" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Describe your issue..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-auto pt-4">
                                        <Button variant="ghost" onClick={() => setSupportView('list')}>Cancel</Button>
                                        <Button className="bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold" onClick={createTicket} disabled={isSubmittingTicket}>
                                            <Send className="w-4 h-4 mr-2" /> Submit Ticket
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {supportView === 'chat' && activeTicket && (
                                <div className="flex flex-col h-full">
                                    <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-[#1B1B1F]">
                                        <Button variant="ghost" size="sm" onClick={() => setSupportView('list')}><ChevronLeft className="w-4 h-4" /></Button>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{activeTicket.subject}</h4>
                                            <p className="text-[10px] text-zinc-400">Ticket ID: {activeTicket.id.slice(0, 8)}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                                        {isLoadingChat && <p className="text-center text-zinc-500 text-sm">Loading messages...</p>}
                                        {chatMessages.map((msg, idx) => {
                                            const isMe = msg.sender_id === user?.id;
                                            return (
                                                <div key={idx} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {!isMe && (
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-white shrink-0 mb-1">
                                                            <img src="/admin_avatar.png" alt="Admin" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[75%] p-3 rounded-xl text-sm ${isMe ? 'bg-[#22C55E] text-[#04120a] rounded-br-none' : 'bg-zinc-700 text-zinc-200 rounded-bl-none'}`}>
                                                        <p>{msg.message}</p>
                                                        <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div ref={chatBottomRef} />

                                    <div className="p-3 bg-[#141417] border-t border-white/10 flex gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Type a message..."
                                            className="bg-black/40 border-white/10"
                                            onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                        />
                                        <Button size="icon" className="bg-[#22C55E] hover:brightness-110 text-[#04120a] shrink-0" onClick={sendChatMessage}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ WITHDRAW MODAL ============ */}
            {showWithdraw && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#141417] border border-white/10 p-6 rounded-[20px] w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-white text-lg">Request Payout</h3>

                        {(!bankName || !accountNumber) ? (
                            <div className="py-8 text-center space-y-4">
                                <div className="p-4 bg-[rgba(245,158,11,0.1)] rounded-full inline-block">
                                    <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
                                </div>
                                <p className="text-zinc-300">Please add your bank details in settings before withdrawing.</p>
                                <Button className="w-full bg-white text-black hover:bg-zinc-200 font-bold" onClick={() => { setShowWithdraw(false); setView('profile'); }}>
                                    Go to Settings
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="py-4 space-y-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm">
                                        <p className="text-zinc-400 text-xs mb-1">Transfer Destination</p>
                                        <p className="font-bold text-white">{bankName}</p>
                                        <p className="text-zinc-300">{accountNumber} · {accountName}</p>
                                        <Button variant="link" className="text-[#22C55E] text-xs h-auto p-0 mt-2" onClick={() => { setShowWithdraw(false); setView('profile'); }}>
                                            Change Account
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Amount to Withdraw</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-zinc-500">{pricingConfig.currency}</span>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={withdrawAmount}
                                                onChange={e => setWithdrawAmount(e.target.value)}
                                                className="pl-8 bg-black/40 border-white/10"
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500">Available: {pricingConfig.currency}{user?.balance?.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setShowWithdraw(false)}>Cancel</Button>
                                    <Button className="bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold" onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount}>
                                        {isWithdrawing ? "Processing..." : "Submit Request"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ============ DECLINE MODAL ============ */}
            {showDeclineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#141417] border border-white/10 p-6 rounded-[20px] w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg text-[#F87171] flex items-center gap-2">
                            <XCircle className="w-5 h-5" /> Decline Submission
                        </h3>
                        <p className="text-sm text-zinc-400">Please provide a reason for the artist. This helps them improve.</p>

                        <div className="space-y-3">
                            <Label>Reason</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {declineOptions.map((option) => (
                                    <div key={option}
                                        className={`p-3 rounded-xl border cursor-pointer transition-colors text-sm ${declineReason === option ? 'bg-[rgba(239,68,68,0.15)] border-[#F87171] text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
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
                                    className="min-h-[80px] bg-black/40 border-white/10"
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

            {/* ============ ACCEPT MODAL ============ */}
            {showAcceptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#141417] border border-white/10 w-full max-w-md p-6 rounded-[20px] space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-[#22C55E]" /> Accept Submission
                        </h3>
                        <p className="text-sm text-zinc-400">Send a congratulatory message to the artist.</p>

                        <div className="space-y-3">
                            <Label>Message to Artist</Label>
                            <Textarea
                                value={acceptFeedback}
                                onChange={e => setAcceptFeedback(e.target.value)}
                                placeholder="Great track!..."
                                className="min-h-[120px] bg-black/40 border-white/10"
                            />
                            <p className="text-xs text-zinc-500">Includes link sharing instructions automatically.</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowAcceptModal(false)}>Cancel</Button>
                            <Button className="bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold" onClick={confirmAccept}>Confirm & Add to Playlist</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ APPLICATION MODAL ============ */}
            {showApplicationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#141417] border border-white/10 p-6 rounded-[20px] w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-[#F59E0B]" /> Apply for Verification
                            </h3>
                            <button onClick={() => setShowApplicationModal(false)} className="text-zinc-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>

                        <div className="bg-[rgba(245,158,11,0.08)] p-4 rounded-xl text-sm text-[#FDE68A] border border-[rgba(245,158,11,0.2)]">
                            <p><strong>Note:</strong> Verified curators get access to paid submission tiers and priority support. Please provide accurate details.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Portfolio / Social Links <span className="text-[#F87171]">*</span></Label>
                                <Input
                                    value={appPortfolio}
                                    onChange={e => setAppPortfolio(e.target.value)}
                                    placeholder="Spotify Profile, Instagram, Website..."
                                    className="bg-black/40 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone Number <span className="text-[#F87171]">*</span></Label>
                                <Input
                                    value={appPhone}
                                    onChange={e => setAppPhone(e.target.value)}
                                    placeholder="+234..."
                                    className="bg-black/40 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>NIN Number <span className="text-[#F87171]">*</span></Label>
                                <Input
                                    value={appNin}
                                    onChange={e => setAppNin(e.target.value)}
                                    placeholder="Enter your 11-digit NIN"
                                    className="bg-black/40 border-white/10"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Years of Experience <span className="text-[#F87171]">*</span></Label>
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
                            <Button className="bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold" onClick={handleApplyCurator} disabled={isApplying}>
                                {isApplying ? "Submitting..." : "Submit Application"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ ADD / EDIT PLAYLIST MODAL ============ */}
            {showAddPlaylist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-[#141417] border border-white/10 rounded-[20px] shadow-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white">{editingPlaylist ? "Edit Playlist" : "Add New Playlist"}</h3>
                            <p className="text-sm text-zinc-400">{editingPlaylist ? "Update playlist details" : "Add a playlist to start receiving submissions."}</p>
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
                                {isFetchingInfo && <div className="absolute right-3 top-3"><div className="w-4 h-4 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin"></div></div>}
                            </div>
                        </div>

                        <div className="space-y-4">
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
                                            className={`cursor-pointer p-3 border rounded-xl text-center transition-all ${newPlaylistType === t ? 'bg-[#22C55E] border-[#22C55E] text-[#04120a]' : 'bg-[#1B1B1F] border-white/10 text-zinc-400 hover:border-white/25'}`}
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
                            <Button variant="outline" className="border-white/10" onClick={() => setShowAddPlaylist(false)}>Cancel</Button>
                            <Button className="bg-[#22C55E] hover:brightness-110 text-[#04120a] font-bold" onClick={handleCreatePlaylist} disabled={isCreating}>
                                {isCreating ? "Saving..." : (editingPlaylist ? "Update Playlist" : "Add Playlist")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SPOTIFY PREVIEW MODAL ============ */}
            <PreviewModal review={previewReview} onClose={() => setPreviewReview(null)} />
        </div>
    );
}
