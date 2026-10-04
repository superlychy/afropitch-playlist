"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Users, Trophy, DollarSign, ShieldAlert, CheckCircle, XCircle, MessageSquare, LogOut, Bell, Plus, Search, Loader2, Send, RefreshCw, Zap, Eye, ChevronLeft, Link2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TransactionsList } from "@/components/TransactionsList";
import { pricingConfig } from "@/../config/pricing";
import AnalyticsPage from "./analytics/page";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminMessageForm } from "@/components/AdminMessageForm";
import { CustomEmailForm } from "@/components/CustomEmailForm";
import { AdminInbox } from "@/components/AdminInbox";
import { AdminMixing } from "@/components/AdminMixing";
import { AdminFeatured } from "@/components/AdminFeatured";
import { usePagination, PaginationControls, FilterButtons } from "@/components/admin/Pagination";
import { StatCard } from "@/components/dashboards/admin/StatCard";
import { AlertBanner } from "@/components/dashboards/admin/AlertBanner";
import { ReviewQueueCard } from "@/components/dashboards/admin/ReviewQueueCard";
import { PlaylistRow } from "@/components/dashboards/admin/PlaylistRow";
import { AdminSidebar, AdminBottomNav, AdminMoreSheet, type PlaylistSubTab, type NavCounts } from "@/components/dashboards/admin/AdminNav";
import { formatCompact, formatNaira } from "@/components/dashboards/admin/utils";
import { Wallet, UserPlus } from "lucide-react";

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    balance: number;
    is_blocked: boolean;
    created_at: string;
    is_online?: boolean;
    last_activity_at?: string;
}

interface WithdrawalRequest {
    id: string;
    user_id: string;
    user_name: string;
    user_withdrawable: number;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    bank_details: string;
    reason: string;
    date: string;
    processed_at: string | null;
    paid_reference: string | null;
}

interface SupportTicket {
    id: string;
    user_name: string;
    subject: string;
    status: 'open' | 'closed';
    last_message: string;
    date: string;
}

interface ChatMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    is_admin: boolean;
}

interface AdminPlaylist {
    id: string;
    curator_id: string;
    curator_name?: string;
    name: string;
    followers: number;
    type: string;
    playlist_link?: string;
    created_at: string;
    verification_status?: string;
}

interface TopPlaylist {
    playlist_id: string;
    playlist_name: string;
    curator_name: string;
    total_clicks: number;
}

const VALID_TABS = ["overview", "analytics", "users", "withdrawals", "transactions", "support", "playlists", "submissions", "mixing", "featured", "applications", "broadcast", "inbox"] as const;
type AdminTab = typeof VALID_TABS[number];

export default function AdminDashboard() {
    const { user, isLoading, logout } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // Refs for realtime support chat
    const userRef = useRef(user);
    const chatChannelRef = useRef<any>(null);
    useEffect(() => { userRef.current = user; }, [user]);

    // Persist active tab across refreshes
    const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('admin_active_tab');
            if (saved && VALID_TABS.includes(saved as AdminTab)) return saved as AdminTab;
        }
        return 'overview';
    });
    const setActiveTab = (tab: AdminTab) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') localStorage.setItem('admin_active_tab', tab);
    };

    // DATA STATE
    const [usersList, setUsersList] = useState<AdminUser[]>([]);
    const [messageUser, setMessageUser] = useState<AdminUser | null>(null);
    const [pendingCurators, setPendingCurators] = useState<any[]>([]); // Registered curators awaiting verification
    const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
    const [curatorApplications, setCuratorApplications] = useState<any[]>([]); // External public applicants
    const [viewApplication, setViewApplication] = useState<{ kind: 'curator' | 'external', data: any } | null>(null); // Details modal
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);

    const [allPlaylists, setAllPlaylists] = useState<AdminPlaylist[]>([]);
    const [acceptedSongCounts, setAcceptedSongCounts] = useState<Record<string, number>>({});
    const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
    const [topCampaigns, setTopCampaigns] = useState<any[]>([]);
    const [topPlaylists, setTopPlaylists] = useState<TopPlaylist[]>([]);

    // Curator playlist verification state
    const [verificationSongUrl, setVerificationSongUrl] = useState('');
    const [verificationSongInput, setVerificationSongInput] = useState('');
    const [savingVerificationSong, setSavingVerificationSong] = useState(false);

    // Song Management State
    const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
    const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);

    // Nav chrome state
    const [showMoreSheet, setShowMoreSheet] = useState(false);
    const [headerSearch, setHeaderSearch] = useState("");
    const [showNotifications, setShowNotifications] = useState(false);

    // Financial Stats — sourced from real DB data
    const [finStats, setFinStats] = useState({
        totalDeposits: 0,       // Total ₦ deposited by artists (transactions.type='deposit')
        totalSubmissionFees: 0, // Total ₦ paid as submission fees (non-declined submissions)
        platformRevenue: 0,     // AfroPitch's cut (100% own playlists + 30% 3rd-party)
        curatorEarnings: 0,     // Total curator cuts (70% of 3rd-party submissions)
        artistHoldings: 0,      // Sum of all artist wallet balances
        curatorHoldings: 0,     // Sum of all curator wallet balances
        adminHoldings: 0,       // Sum of admin wallet balances
        totalEcosystem: 0,      // Total money across ALL wallets
        pendingWithdrawals: 0,  // Pending payout requests
        approvedWithdrawals: 0, // Completed payouts
    });

    const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;
    const openTicketsCount = tickets.filter(t => t.status === 'open').length;

    // Chat State
    const [showChat, setShowChat] = useState(false);
    const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);

    // Add User State
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPass, setNewUserPass] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState<"artist" | "curator" | "admin">("curator");
    const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
    const [isAddingUser, setIsAddingUser] = useState(false);

    // Top Up State
    const [showTopUp, setShowTopUp] = useState<AdminUser | null>(null);
    const [fundingAmount, setFundingAmount] = useState<string>("");
    const [adminIsProcessing, setAdminIsProcessing] = useState(false);

    // Custom Email State
    const [showCustomEmail, setShowCustomEmail] = useState(false);

    const refreshUsers = async () => {
        setIsRefreshingUsers(true);
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (users) {
            setUsersList(users as AdminUser[]);
            // Also refresh pending counts
            const { data: pending } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'curator')
                .eq('verification_status', 'pending');
            if (pending) setPendingCurators(pending);
        }
        setIsRefreshingUsers(false);
    };

    // Edit Playlist State
    const [showEditPlaylist, setShowEditPlaylist] = useState(false);
    const [adminEditingPlaylist, setAdminEditingPlaylist] = useState<AdminPlaylist | null>(null);
    const [adminNewName, setAdminNewName] = useState("");
    const [adminNewFollowers, setAdminNewFollowers] = useState(0);
    const [adminIsSaving, setAdminIsSaving] = useState(false);
    const [playlistTab, setPlaylistTab] = useState<PlaylistSubTab>("submissions"); // Inner tab state for Playlists section
    const [playlistFilter, setPlaylistFilter] = useState<"all" | "admin" | "user">("all");
    const [playlistSearch, setPlaylistSearch] = useState("");

    // Featured email state (send branded questionnaire email from a submission row)
    const [featuredEmailSub, setFeaturedEmailSub] = useState<any | null>(null);
    // Song preview state (Spotify 30s embed in the playlist submissions tab)
    const [previewSong, setPreviewSong] = useState<any | null>(null);

    const spotifyEmbedUrl = (link: string | null | undefined): string | null => {
        if (!link) return null;
        const m = link.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
        return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
    };

    const [featuredEmailCategory, setFeaturedEmailCategory] = useState<"artist-of-the-week" | "rising-artist" | "artist-of-the-season">("artist-of-the-week");
    const [sendingFeaturedEmail, setSendingFeaturedEmail] = useState(false);

    const sendFeaturedEmail = async () => {
        if (!featuredEmailSub) return;
        setSendingFeaturedEmail(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/admin/send-featured-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    submission_id: featuredEmailSub.id,
                    category: featuredEmailCategory,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to send email");
            toast(`Featured email sent to ${featuredEmailSub.artist?.full_name || "artist"}.`, "success");
            setFeaturedEmailSub(null);
        } catch (e: any) {
            toast("Error: " + (e.message || "Failed to send email"), "error");
        }
        setSendingFeaturedEmail(false);
    };

    // Add Playlist State (Admin)
    const [showAddPlaylist, setShowAddPlaylist] = useState(false);
    const [newPlaylistLink, setNewPlaylistLink] = useState("");
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [fetchedPlaylistInfo, setFetchedPlaylistInfo] = useState<any>(null);
    const [newPlaylistType, setNewPlaylistType] = useState<"standard" | "express" | "exclusive" | "free">("standard");
    const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);

    // Broadcast State
    const [broadcastSubject, setBroadcastSubject] = useState("");
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [broadcastChannel, setBroadcastChannel] = useState<'email' | 'in_app' | 'both'>('email');
    const [broadcastTargetRole, setBroadcastTargetRole] = useState<'all' | 'artist' | 'curator'>('all');
    const [broadcastAddressing, setBroadcastAddressing] = useState<'dear_all' | 'dear_name'>('dear_all');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

    // ---- Client-side list filters (data fetching is unchanged; only rendering is sliced) ----
    const [userSearch, setUserSearch] = useState("");
    const [userRole, setUserRole] = useState("all");
    const [subSearch, setSubSearch] = useState("");
    const [subStatus, setSubStatus] = useState("all");
    const [withdrawalStatus, setWithdrawalStatus] = useState("all");
    const [ticketSearch, setTicketSearch] = useState("");
    const [ticketStatus, setTicketStatus] = useState("all");

    // ---- Derived filtered lists + pagination (50 per page) ----
    const filteredUsers = usersList.filter(u => {
        const matchesRole = userRole === "all" || u.role === userRole;
        const q = userSearch.trim().toLowerCase();
        const matchesSearch = !q
            || (u.full_name || "").toLowerCase().includes(q)
            || (u.email || "").toLowerCase().includes(q);
        return matchesRole && matchesSearch;
    });
    const usersPag = usePagination(filteredUsers.length);

    const filteredSubmissions = allSubmissions.filter(s => {
        const matchesStatus = subStatus === "all" || s.status === subStatus;
        const q = subSearch.trim().toLowerCase();
        const matchesSearch = !q
            || (s.song_title || "").toLowerCase().includes(q)
            || (s.artist?.full_name || "").toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
    });
    const submissionsPag = usePagination(filteredSubmissions.length);

    const filteredWithdrawals = withdrawals.filter(w => withdrawalStatus === "all" || w.status === withdrawalStatus);
    const withdrawalsPag = usePagination(filteredWithdrawals.length);

    const filteredTickets = tickets.filter(t => {
        const matchesStatus = ticketStatus === "all" || t.status === ticketStatus;
        const q = ticketSearch.trim().toLowerCase();
        const matchesSearch = !q
            || (t.subject || "").toLowerCase().includes(q)
            || (t.user_name || "").toLowerCase().includes(q)
            || (t.last_message || "").toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
    });
    const ticketsPag = usePagination(filteredTickets.length);

    const pendingSongs = playlistSongs.filter(s => s.status === "pending");
    const pendingSongsPag = usePagination(pendingSongs.length);

    const filteredPlaylists = allPlaylists
        .filter(p => {
            const adminIds = new Set(usersList.filter(u => u.role === "admin").map(u => u.id));
            if (playlistFilter === "admin") return adminIds.has(p.curator_id);
            if (playlistFilter === "user") return !adminIds.has(p.curator_id);
            return true;
        })
        .filter(p => !playlistSearch || p.name.toLowerCase().includes(playlistSearch.toLowerCase()));
    const playlistsPag = usePagination(filteredPlaylists.length);

    const pendingCuratorsPag = usePagination(pendingCurators.length);
    const curatorAppsPag = usePagination(curatorApplications.length);

    // Notify Admin on Login
    useEffect(() => {
        if (user && user.role === 'admin') {
            const hasNotified = sessionStorage.getItem('admin_notified');
            if (!hasNotified) {
                const email = user.email || 'Admin';
                supabase.functions.invoke('notify-admin', {
                    body: {
                        event_type: 'ADMIN_LOGIN',
                        user_data: { email }
                    }
                }).then(() => {
                    sessionStorage.setItem('admin_notified', 'true');
                }).catch(err => console.error("Login notify error", err));
            }
        }
    }, [user]);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== "admin")) {
            router.push("/portal");
            return;
        }

        if (!user) return;

        const fetchData = async () => {
            // 0. Fetch verification song link setting
            fetchVerificationSongUrl();

            // 1. Fetch Users
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (users) setUsersList(users as AdminUser[]);

            // New: Fetch Pending Curators
            const { data: pending } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'curator')
                .eq('verification_status', 'pending');

            if (pending) setPendingCurators(pending);

            // Fetch public curator_applications (from /curators/join page)
            const { data: extApps } = await supabase
                .from('curator_applications')
                .select('*')
                .or('status.is.null,status.eq.pending')
                .order('created_at', { ascending: false });
            if (extApps) setCuratorApplications(extApps);

            // New: Count Pending Submissions
            const { count: subCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            setPendingSubmissionsCount(subCount || 0);


            // 2. Fetch Withdrawals (with user names joined)
            const { data: withdrawsJoined } = await supabase
                .from('withdrawals')
                .select('*, profiles(full_name, withdrawable_balance)')
                .order('created_at', { ascending: false });

            if (withdrawsJoined) {
                setWithdrawals(withdrawsJoined.map((w: any) => ({
                    id: w.id,
                    user_id: w.user_id,
                    user_name: w.profiles?.full_name || 'Unknown',
                    user_withdrawable: Number(w.profiles?.withdrawable_balance) || 0,
                    amount: w.amount,
                    status: w.status,
                    bank_details: `${w.bank_name} - ${w.account_number}${w.account_name ? ` (${w.account_name})` : ''}`,
                    reason: w.reason || '',
                    date: new Date(w.created_at).toLocaleDateString(),
                    processed_at: w.processed_at || null,
                    paid_reference: w.paid_reference || null
                })));
            }

            // 3. Fetch Tickets
            const { data: supportTicks, error: ticketError } = await supabase
                .from('support_tickets')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });

            if (supportTicks) {
                setTickets(supportTicks.map((t: any) => ({
                    id: t.id,
                    user_name: t.profiles?.full_name || 'Unknown',
                    subject: t.subject,
                    status: t.status,
                    last_message: t.message,
                    date: new Date(t.created_at).toLocaleDateString()
                })));
            }

            // 4. Fetch All Playlists
            const { data: playlistsData } = await supabase
                .from('playlists')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });

            if (playlistsData) {
                setAllPlaylists(playlistsData.map((p: any) => ({
                    id: p.id,
                    curator_id: p.curator_id,
                    curator_name: p.profiles?.full_name || 'Unknown',
                    name: p.name,
                    followers: p.followers,
                    type: p.type,
                    playlist_link: p.playlist_link,
                    created_at: new Date(p.created_at).toLocaleDateString(),
                    verification_status: p.verification_status || 'unverified'
                })));
            }

            // Accepted-song counts per playlist (for the overview playlists panel)
            const { data: acceptedRows } = await supabase
                .from('submissions')
                .select('playlist_id')
                .eq('status', 'accepted');
            const accCounts: Record<string, number> = {};
            acceptedRows?.forEach((r: any) => {
                if (r.playlist_id) accCounts[r.playlist_id] = (accCounts[r.playlist_id] || 0) + 1;
            });
            setAcceptedSongCounts(accCounts);

            // Fetch Pending Songs for Admin Global Review
            fetchGlobalPendingSongs();

            // 5. Fetch Top Campaigns (by clicks)
            const { data: topClicks } = await supabase
                .from('submissions')
                .select('*, artist:profiles!artist_id(full_name), playlist:playlists(name)')
                .neq('status', 'declined') // Exclude declined songs
                .order('clicks', { ascending: false })
                .limit(5);

            if (topClicks) {
                setTopCampaigns(topClicks);
            }

            // 6. Fetch Top Playlists (RPC)
            const { data: topPl } = await supabase.rpc('get_top_playlists_by_clicks', { limit_count: 5 });
            if (topPl) {
                setTopPlaylists(topPl);
            }

            // 7. Finance Stats — sourced from real DB tables
            const [{ data: depositTxns }, { data: financeWithdrawals }, { data: financeSubs }] = await Promise.all([
                supabase.from('transactions').select('amount').eq('type', 'deposit'),
                supabase.from('withdrawals').select('amount, status, processed_at'),
                supabase.from('submissions').select('amount_paid, status, playlist:playlists(curator_id)').gt('amount_paid', 0),
            ]);

            // Wallet balances by role (from already-fetched users list)
            const artistHoldings = users?.filter((u: any) => u.role === 'artist')
                .reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0) || 0;
            const curatorHoldings = users?.filter((u: any) => u.role === 'curator')
                .reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0) || 0;
            const adminHoldings = users?.filter((u: any) => u.role === 'admin')
                .reduce((acc: number, curr: any) => acc + Number(curr.balance || 0), 0) || 0;

            // Total deposits ever made
            const totalDeposits = depositTxns?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

            // Submission fees (only non-declined ones count as real revenue)
            let totalSubmissionFees = 0;
            let platformRevenue = 0;
            let curatorEarnings = 0;
            // Any admin-owned playlist keeps 100% (matches process_submission_review,
            // which checks the playlist owner's role, not the logged-in admin).
            const adminIds = new Set(
                (users || []).filter((u: any) => u.role === 'admin').map((u: any) => u.id)
            );
            financeSubs?.forEach((s: any) => {
                if (s.status === 'declined' || s.status === 'rejected') return;
                const amt = Number(s.amount_paid || 0);
                totalSubmissionFees += amt;
                const isAdminPlaylist = !!s.playlist?.curator_id && adminIds.has(s.playlist.curator_id);
                if (isAdminPlaylist) {
                    platformRevenue += amt; // Admin keeps 100%
                } else {
                    platformRevenue += amt * 0.30;
                    curatorEarnings += amt * 0.70;
                }
            });

            const approvedWithdrawals = financeWithdrawals
                ?.filter((w: any) => w.status === 'approved' && w.processed_at)
                .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const pendingWithdrawalAmt = financeWithdrawals
                ?.filter((w: any) => w.status === 'pending')
                .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            setFinStats({
                totalDeposits,
                totalSubmissionFees,
                platformRevenue,
                curatorEarnings,
                artistHoldings,
                curatorHoldings,
                adminHoldings,
                totalEcosystem: artistHoldings + curatorHoldings + adminHoldings,
                pendingWithdrawals: pendingWithdrawalAmt,
                approvedWithdrawals,
            });
        };

        fetchData();

        // Set up real-time subscriptions for automatic updates
        const profilesSubscription = supabase
            .channel('admin-profiles-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                (payload) => {
                    console.log('Profile change detected:', payload);
                    // Refetch users when any profile changes
                    refreshUsers();
                }
            )
            .subscribe();

        const withdrawalsSubscription = supabase
            .channel('admin-withdrawals-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'withdrawals' },
                (payload) => {
                    console.log('Withdrawal change detected:', payload);
                    fetchData();
                }
            )
            .subscribe();

        const ticketsSubscription = supabase
            .channel('admin-tickets-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'support_tickets' },
                (payload) => {
                    console.log('Ticket change detected:', payload);
                    fetchData();
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            profilesSubscription.unsubscribe();
            withdrawalsSubscription.unsubscribe();
            ticketsSubscription.unsubscribe();
        };

    }, [user, isLoading, router]);

    // ACTIONS
    const toggleUserBlock = async (userId: string) => {
        // Toggle locally first
        const target = usersList.find(u => u.id === userId);
        if (!target) return;
        if (target.role === 'admin') {
            toast("Admin accounts cannot be blocked.", "error");
            return;
        }
        if (userId === user?.id) {
            toast("You cannot block yourself.", "error");
            return;
        }
        const newStatus = !target.is_blocked;

        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: newStatus } : u));

        // Call Supabase
        const { error } = await supabase.from('profiles').update({ is_blocked: newStatus }).eq('id', userId);
        if (error) {
            toast("Error updating user block status: " + error.message, "error");
            // Revert on error
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: !newStatus } : u));
        }
    };

    const deleteUser = async (userId: string) => {
        if (userId === user?.id) {
            toast("You cannot delete your own admin account.", "error");
            return;
        }
        if (confirm("Are you sure you want to delete this user? Their login, profile, and history will be permanently removed. This cannot be undone.")) {
            // Optimistic Update
            setUsersList(prev => prev.filter(u => u.id !== userId));

            try {
                const res = await fetch("/api/admin/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "delete", userId }),
                });
                const result = await res.json().catch(() => null);
                if (!res.ok || !result?.success) {
                    throw new Error(result?.error || "Delete failed");
                }
                toast("User deleted permanently.", "success");
            } catch (err: any) {
                toast("Error deleting user: " + (err?.message || "unknown error"), "error");
                refreshUsers();
            }
        }
    };

    const handleTopUp = async () => {
        if (!showTopUp || !fundingAmount) return;

        const amount = parseFloat(fundingAmount);
        if (isNaN(amount) || amount <= 0) {
            toast("Please enter a valid amount > 0", "error");
            return;
        }

        setAdminIsProcessing(true);
        const { error } = await supabase.rpc('admin_top_up_user', {
            p_user_id: showTopUp.id,
            p_amount: amount,
            p_description: `Admin Top Up by ${user?.email}`
        });

        if (error) {
            toast("Top Up Failed: " + error.message, "error");
        } else {
            toast("Successfully added funds!", "success");
            setShowTopUp(null);
            setFundingAmount("");
            refreshUsers();
        }
        setAdminIsProcessing(false);
    };

    const deletePlaylist = async (id: string) => {
        if (!confirm("Are you sure you want to delete this playlist? This will also permanently delete ALL of its submissions, click history, and earnings records. This action cannot be undone.")) return;

        const { error } = await supabase.from('playlists').delete().eq('id', id);

        if (error) {
            toast("Error deleting playlist: " + error.message, "error");
        } else {
            setAllPlaylists(prev => prev.filter(p => p.id !== id));
            toast("Playlist deleted successfully.", "success");
        }
    };

    const handleWithdrawal = async (id: string, action: 'approve' | 'reject' | 'mark_paid') => {
        const withdrawal = withdrawals.find(w => w.id === id);
        if (!withdrawal) {
            toast("Withdrawal not found.", "error");
            return;
        }

        // Mark as paid: record the transfer reference so approved vs actually-paid is visible
        if (action === 'mark_paid') {
            const ref = prompt(`Enter the transfer reference for the ${pricingConfig.currency}${withdrawal.amount.toLocaleString()} payout to ${withdrawal.user_name}:`);
            if (ref === null) return; // cancelled
            const reference = ref.trim();
            if (!reference) {
                toast("A transfer reference is required to mark a payout as paid.", "error");
                return;
            }
            const prevProcessedAt = withdrawal.processed_at;
            const prevReference = withdrawal.paid_reference;
            const paidAt = new Date().toISOString();
            try {
                setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, processed_at: paidAt, paid_reference: reference } : w));

                const { error } = await supabase.from('withdrawals').update({
                    processed_at: paidAt,
                    processed_by: user?.id || null,
                    paid_reference: reference
                }).eq('id', id);

                if (error) {
                    throw error;
                }

                toast("Payout marked as paid.", "success");
            } catch (error: any) {
                console.error('Error marking payout as paid:', error);
                toast(`Error marking payout as paid: ${error.message || 'Unknown error'}`, "error");
                setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, processed_at: prevProcessedAt, paid_reference: prevReference } : w));
            }
            return;
        }

        // Confirm action
        const confirmMsg = action === 'approve'
            ? `Approve withdrawal of ${withdrawal.amount} for ${withdrawal.user_name}?`
            : `Reject withdrawal of ${withdrawal.amount} for ${withdrawal.user_name}? Funds will be refunded to their wallet.`;

        if (!confirm(confirmMsg)) return;

        // Store original status for rollback
        const originalStatus = withdrawal.status;

        try {
            if (action === 'reject') {
                // Optimistic update
                setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'rejected' } : w));

                const { data, error } = await supabase.rpc('reject_withdrawal', {
                    p_withdrawal_id: id,
                    p_reason: 'Rejected by Admin'
                });

                if (error) {
                    throw error;
                }
                if (data && data.success === false) {
                    throw new Error(data.message || "Withdrawal was not rejected.");
                }

                toast("Withdrawal rejected and funds refunded to user's wallet.", "success");

            } else {
                // Approve Logic
                // Optimistic update
                setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'approved' } : w));

                const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', id);

                if (error) {
                    throw error;
                }

                toast("Withdrawal approved. Send the transfer, then mark it as paid.", "success");
            }
        } catch (error: any) {
            console.error(`Error ${action}ing withdrawal:`, error);
            toast(`Error ${action}ing withdrawal: ${error.message || 'Unknown error'}`, "error");

            // Revert optimistic update on error
            setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: originalStatus } : w));
        }
    };


    const initiateChatWithUser = async (userId: string, userName: string) => {
        if (!user) return;

        const subject = `Regarding Withdrawal Request`;
        const message = `Hello ${userName}, regarding your recent withdrawal request...`;

        const { data: existingTicket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'open')
            .eq('subject', subject)
            .single();

        if (existingTicket) {
            openChat(existingTicket);
        } else {
            const { data: newTicket, error } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: userId,
                    subject: subject,
                    message: message,
                    status: 'open'
                })
                .select()
                .single();

            if (error) {
                toast("Could not start chat (check Admin Policy): " + error.message, "error");
            } else if (newTicket) {
                await supabase.from('support_messages').insert({
                    ticket_id: newTicket.id,
                    sender_id: user.id,
                    message: message
                });

                openChat({
                    ...newTicket,
                    user_name: userName,
                    last_message: message,
                    date: new Date().toLocaleDateString()
                });
            }
        }
    };

    // PLAYLIST FUNCTIONS
    const fetchPlaylistInfo = async () => {
        setIsFetchingInfo(true);

        // If it looks like a Spotify link, try to fetch info
        if (newPlaylistLink.includes("spotify.com")) {
            try {
                const response = await fetch('/api/playlist-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: newPlaylistLink }),
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                setFetchedPlaylistInfo(data);
            } catch (err: any) {
                console.warn("Auto-fetch failed, falling back to manual entry:", err.message);
                // Fallback to manual
                setFetchedPlaylistInfo({ name: "", description: "", coverImage: "", followers: 0 });
            }
        } else {
            // Manual Entry for other platforms (Apple Music, Audiomack, etc.)
            setFetchedPlaylistInfo({ name: "", description: "", coverImage: "", followers: 0 });
        }

        setIsFetchingInfo(false);
    };

    const addPlaylist = async () => {
        if (!fetchedPlaylistInfo || !user) return;
        setIsSavingPlaylist(true);

        try {
            const { error } = await supabase.from('playlists').insert({
                name: fetchedPlaylistInfo.name,
                description: fetchedPlaylistInfo.description,
                cover_image: fetchedPlaylistInfo.coverImage,
                followers: fetchedPlaylistInfo.followers,
                playlist_link: newPlaylistLink,
                curator_id: user.id,

                genre: "Multi-Genre", // Default or add selector
                type: newPlaylistType,
                submission_fee: pricingConfig.tiers[newPlaylistType].price,
                is_active: true
            }).select().single();

            if (error) {
                throw error;
            } else {
                toast("Playlist added successfully! It will appear under 'AfroPitch Team Playlists'.", "success");
                setShowAddPlaylist(false);
                setNewPlaylistLink("");
                setFetchedPlaylistInfo(null);
                // Refresh playlists data
                const { data: playlistsData } = await supabase
                    .from('playlists')
                    .select('*, profiles(full_name)')
                    .order('created_at', { ascending: false });
                if (playlistsData) {
                    setAllPlaylists(playlistsData.map((p: any) => ({
                        id: p.id,
                        curator_id: p.curator_id,
                        curator_name: p.profiles?.full_name || 'Unknown',
                        name: p.name,
                        followers: p.followers,
                        type: p.type,
                        playlist_link: p.playlist_link,
                        created_at: new Date(p.created_at).toLocaleDateString()
                    })));
                }
            }
        } catch (err: any) {
            console.error("Add Playlist Error:", err);
            toast("Error adding playlist: " + err.message, "error");
        } finally {
            setIsSavingPlaylist(false);
        }
    };

    const handleRefreshPlaylist = async (playlist: any) => {
        if (!playlist.playlist_link) {
            toast("Cannot refresh: No Spotify link found.", "error");
            return;
        }
        setIsRefreshing(playlist.id);
        try {
            const res = await fetch('/api/playlist-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: playlist.playlist_link })
            });

            // Check if response is JSON
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                throw new Error("Invalid server response: " + text.slice(0, 100));
            }

            const data = await res.json();
            if (data.name) { // api returns { name, ... } or { error }
                // Update Supabase (name, cover, followers only — never clobber
                // the curated description with a generated string)
                const { error } = await supabase.from('playlists').update({
                    name: data.name,
                    cover_image: data.coverImage,
                    followers: data.followers,
                }).eq('id', playlist.id);

                if (error) throw error;

                // Update local state without reload
                setAllPlaylists(prev => prev.map(p => p.id === playlist.id ? {
                    ...p,
                    name: data.name,
                    followers: data.followers,
                    // Optional: update cover_image and description in local state if we tracked it fully
                } : p));

                toast(`Playlist "${data.name}" updated!`, "success");
            } else {
                throw new Error(data.error || "Unknown validation error");
            }
        } catch (err: any) {
            console.error("Refresh Error:", err);
            toast("Error refreshing playlist: " + err.message, "error");
        } finally {
            setIsRefreshing(null);
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
            .select('*, artist:profiles(full_name)')
            .eq('playlist_id', playlistId)
            .order('created_at', { ascending: false });

        if (data) setPlaylistSongs(data);
        setIsLoadingSongs(false);
    };

    // New Function to fetch specific Pending Songs globally
    const fetchGlobalPendingSongs = async () => {
        const { data } = await supabase
            .from('submissions')
            .select('*, artist:profiles(full_name), playlist:playlists(name, type)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (data) setPlaylistSongs(data);
    };

    const fetchAllSubmissions = async () => {
        const { data } = await supabase
            .from('submissions')
            .select('*, artist:profiles!artist_id(full_name, email), playlist:playlists(name, curator:profiles!curator_id(full_name))')
            .order('created_at', { ascending: false });
        if (data) setAllSubmissions(data);
    };

    const toggleRankingBoost = async (submissionId: string) => {
        const sub = allSubmissions.find(s => s.id === submissionId);
        if (!sub) return;
        const newVal = sub.ranking_boosted_at ? null : new Date().toISOString();
        const { error } = await supabase.from('submissions').update({ ranking_boosted_at: newVal }).eq('id', submissionId);
        if (error) {
            toast("Error updating ranking: " + error.message, "error");
        } else {
            setAllSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, ranking_boosted_at: newVal } : s));
            if (newVal) toast("Artist notified of ranking boost!", "success");
        }
    };

    useEffect(() => {
        if (activeTab === 'submissions') fetchAllSubmissions();
    }, [activeTab]);

    const handleSubmissionAction = async (submissionId: string, action: 'accepted' | 'declined' | 'archived') => {
        const sub = playlistSongs.find(s => s.id === submissionId);
        if (!sub) return;

        let feedback = "Reviewed by Admin";
        if (action === 'declined') {
            const reason = prompt("Enter reason for rejection (optional):", "Does not fit playlist vibe");
            if (reason === null) return; // cancelled
            if (reason) feedback = reason;
        }

        let trackingSlug = null;
        if (action === 'accepted') {
            // Playlist-first gate: the track must be on the Spotify playlist
            // BEFORE the status flips, because accepting emails the artist
            // immediately and they will check the playlist. (A live Spotify
            // check isn't possible: the server has no Spotify API credentials,
            // so this is an explicit confirmation at the point of action.)
            const playlistName = allPlaylists.find(p => p.id === sub.playlist_id)?.name || 'the playlist';
            const artistName = sub.artist?.full_name || 'the artist';
            const confirmed = confirm(
                `Accept "${sub.song_title || 'Untitled'}" for ${playlistName}?\n\n${artistName} will be emailed right away. Only accept if the track is already on the Spotify playlist.`
            );
            if (!confirmed) return;

            const cleanTitle = (sub.song_title || 'track').replace(/[^a-z0-9]/gi, '-').toLowerCase();
            trackingSlug = `${cleanTitle}-${Math.random().toString(36).substring(2, 7)}`;
        }

        try {
            const { data, error } = await supabase.rpc('process_submission_review', {
                p_submission_id: submissionId,
                p_action: action,
                p_feedback: feedback,
                p_curator_id: user?.id,
                p_tracking_slug: trackingSlug
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.message || "Review was not applied.");

            const successMsg = action === 'accepted'
                ? "Song accepted! Artist notified and link tracking generated."
                : action === 'archived'
                    ? "Submission archived. Refund processed to artist wallet."
                    : "Song rejected. Refund processed to artist wallet.";
            toast(successMsg, "success");

            // Update local state
            setPlaylistSongs(prev => prev.map(s => s.id === submissionId ? { ...s, status: action } : s));
            // Keep the pending badge in sync without a reload
            if (sub.status === 'pending') {
                setPendingSubmissionsCount(prev => Math.max(0, prev - 1));
            }
        } catch (err: any) {
            console.error("Submission Action Error:", err);
            toast(`Error processing submission: ${err.message}`, "error");
        }
    };

    // CHAT FUNCTIONS
    const openChat = async (ticket: SupportTicket) => {
        setActiveTicket(ticket);
        setShowChat(true);

        const { data } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

        if (data) {
            setChatMessages(data.map((m: any) => ({
                ...m,
                is_admin: user?.id === m.sender_id
            })));
        } else {
            setChatMessages([]);
        }

        // Cleanup previous realtime channel
        if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);

        // Subscribe to new messages in this ticket
        const channel = supabase
            .channel(`admin-chat-${ticket.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
                (payload) => {
                    setChatMessages(prev => {
                        if (prev.some(m => m.id === payload.new.id)) return prev;
                        return [...prev, {
                            ...(payload.new as ChatMessage),
                            is_admin: userRef.current?.id === (payload.new as { sender_id: string }).sender_id
                        }];
                    });
                }
            )
            .subscribe();

        chatChannelRef.current = channel;
    };

    const sendMessage = async () => {
        if (!chatInput.trim() || !activeTicket || !user) return;
        setSendingMsg(true);

        const text = chatInput;
        // Optimistic
        const optimMsg: ChatMessage = {
            id: Math.random().toString(),
            ticket_id: activeTicket.id,
            sender_id: user.id!,
            message: text,
            created_at: new Date().toISOString(),
            is_admin: true
        };
        setChatMessages(prev => [...prev, optimMsg]);
        setChatInput("");

        const { error } = await supabase.from('support_messages').insert({
            ticket_id: activeTicket.id,
            sender_id: user.id,
            message: text
        });

        if (error) {
            toast("Failed to send: " + error.message, "error");
            // Remove the optimistic message so the chat doesn't show unsent text
            setChatMessages(prev => prev.filter(m => m.id !== optimMsg.id));
        } else {
            // Reopen the ticket if the admin replied to a closed one
            if (activeTicket.status === 'closed') {
                await supabase.from('support_tickets').update({ status: 'open' }).eq('id', activeTicket.id);
                setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'open' } : t));
                setActiveTicket({ ...activeTicket, status: 'open' });
            }
        }
        setSendingMsg(false);
    };

    const handleAddUser = async () => {
        if (!newUserEmail || !newUserPass) {
            toast("Email and password are required.", "error");
            return;
        }
        setIsAddingUser(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    email: newUserEmail,
                    password: newUserPass,
                    name: newName,
                    role: newRole,
                }),
            });
            const result = await res.json().catch(() => null);
            if (!res.ok || !result?.success) {
                throw new Error(result?.error || "Could not create user");
            }
            toast(`User created: ${newUserEmail} (${newRole})`, "success");
            setShowAddUser(false);
            setNewName("");
            setNewUserEmail("");
            setNewUserPass("");
            refreshUsers();
        } catch (err: any) {
            toast("Error creating user: " + (err?.message || "unknown error"), "error");
        } finally {
            setIsAddingUser(false);
        }
    };

    // ---- Curator playlist verification helpers ----
    const fetchVerificationSongUrl = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'curator_verification_song_url').single();
        if (data) {
            setVerificationSongUrl(data.value || '');
            setVerificationSongInput(data.value || '');
        }
    };

    const saveVerificationSongUrl = async () => {
        setSavingVerificationSong(true);
        const { error } = await supabase.from('app_settings').upsert({ key: 'curator_verification_song_url', value: verificationSongInput.trim(), updated_at: new Date().toISOString() });
        setSavingVerificationSong(false);
        if (error) {
            toast("Error saving song link: " + error.message, "error");
        } else {
            setVerificationSongUrl(verificationSongInput.trim());
            toast("Verification song link saved.", "success");
        }
    };

    const handlePlaylistVerification = async (playlistId: string, action: 'verified' | 'unverified') => {
        const { error } = await supabase.from('playlists').update({ verification_status: action }).eq('id', playlistId);
        if (error) {
            toast("Error updating playlist: " + error.message, "error");
        } else {
            setAllPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, verification_status: action } : p));
            toast(action === 'verified' ? "Playlist verified. Tell the curator to remove the test song." : "Playlist marked unverified.", "success");
        }
    };

    const handleCuratorAction = async (id: string, action: 'verified' | 'rejected') => {
        const { data, error } = await supabase
            .from('profiles')
            .update({ verification_status: action })
            .eq('id', id)
            .select();

        if (error) {
            toast("Error updating status: " + error.message, "error");
        } else if (!data || data.length === 0) {
            toast("Update failed: Permission denied or user not found.", "error");
        } else {
            setPendingCurators(prev => prev.filter(c => c.id !== id));

            // Dedup: clear the same person from the external-applications queue if present
            const curatorEmail = data[0]?.email;
            if (curatorEmail) {
                const mapped = action === 'verified' ? 'approved' : 'rejected';
                await supabase
                    .from('curator_applications')
                    .update({ status: mapped })
                    .eq('email', curatorEmail)
                    .or('status.is.null,status.eq.pending');
                setCuratorApplications(prev => prev.filter(a => a.email !== curatorEmail));
            }

            // Send in-app notification to the curator
            const msg = action === 'verified'
                ? 'Congratulations! Your curator account has been verified. You can now add playlists and receive paid submissions.'
                : 'Your curator verification application was not approved. Please contact support for more info.';

            await supabase.from('notifications').insert({
                user_id: id,
                title: action === 'verified' ? 'Curator Account Verified!' : 'Verification Not Approved',
                message: msg,
                is_read: false
            });

            // Also open a support ticket so it appears in their chat
            const { data: ticket } = await supabase.from('support_tickets').insert({
                user_id: id,
                subject: action === 'verified' ? 'Your Account is Verified' : 'Verification Update',
                message: msg,
                status: 'closed'
            }).select().single();

            if (ticket) {
                await supabase.from('support_messages').insert({
                    ticket_id: ticket.id,
                    sender_id: user?.id,
                    message: msg
                });
            }

            toast(`Curator application ${action}`, "success");
        }
    };

    const handleExternalAppAction = async (appId: string, action: 'approved' | 'rejected') => {
        const { data, error } = await supabase
            .from('curator_applications')
            .update({ status: action })
            .eq('id', appId)
            .select();

        if (error) {
            toast('Error: ' + error.message, "error");
            return;
        }
        if (!data || data.length === 0) {
            toast("Update failed: Permission denied or application not found.", "error");
            return;
        }
        // Dedup: clear the same person from the registered-curator queue if present
        const appEmail = data[0]?.email;
        if (appEmail) {
            const mapped = action === 'approved' ? 'verified' : 'rejected';
            await supabase
                .from('profiles')
                .update({ verification_status: mapped })
                .eq('email', appEmail)
                .eq('role', 'curator')
                .eq('verification_status', 'pending');
            setPendingCurators(prev => prev.filter(c => c.email !== appEmail));
        }
        setCuratorApplications(prev => prev.filter(a => a.id !== appId));
        toast(`Application ${action}.`, "success");
    };

    const handleSendBroadcast = async () => {
        if (!broadcastSubject || !broadcastMessage) {
            toast("Please fill in subject and message.", "error");
            return;
        }
        setIsSendingBroadcast(true);

        try {
            let finalMessage = broadcastMessage;
            // Handle Addressing Mode logic
            if (broadcastAddressing === 'dear_name') {
                finalMessage = `<p>Hi {{name}},</p><br/>` + finalMessage;
            } else {
                finalMessage = `<p>Dear All,</p><br/>` + finalMessage;
            }

            const { error } = await supabase.from('broadcasts').insert({
                subject: broadcastSubject,
                message: finalMessage,
                sender_id: user?.id,
                channel: broadcastChannel,
                target_role: broadcastTargetRole
            });

            if (error) {
                console.error("Broadcast Error:", error);
                toast("Error sending broadcast: " + error.message, "error");
            } else {
                toast("Broadcast queued successfully! Users will receive it shortly.", "success");
                setBroadcastSubject("");
                setBroadcastMessage("");
            }
        } catch (err: any) {
            console.error("Unexpected Broadcast Error:", err);
            toast("An unexpected error occurred while sending broadcast.", "error");
        } finally {
            setIsSendingBroadcast(false);
        }
    };

    const handleTestWebhook = async () => {
        if (!confirm("Send a test notification to your configured Webhook?")) return;
        try {
            const { data, error } = await supabase.functions.invoke('notify-admin', {
                body: {
                    event_type: 'MANUAL_LOG',
                    message: "Test Notification from Admin Dashboard"
                }
            });
            if (error) {
                console.error("Invoke Error:", error);
                toast(`Invoke Failed: ${error.message}. Check Console for details.`, "error");
            }
            else toast("Test sent! Check your Discord/Slack.", "error");
        } catch (e: any) {
            toast("Unexpected Client Error: " + e.message, "error");
        }
    };

    // ---- Navigation (sidebar, bottom tabs, more sheet) ----
    const navigate = (tab: string, sub?: PlaylistSubTab) => {
        if (VALID_TABS.includes(tab as AdminTab)) {
            if (tab === "playlists" && sub) setPlaylistTab(sub);
            setActiveTab(tab as AdminTab);
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToReviewQueue = () => {
        navigate("playlists", "submissions");
    };

    // ---- Derived overview values ----
    const navCounts: NavCounts = {
        pendingSubmissions: pendingSubmissionsCount,
        withdrawals: pendingWithdrawalsCount,
        openTickets: openTicketsCount,
        applications: pendingCurators.length + curatorApplications.length,
    };
    const totalAlerts = pendingWithdrawalsCount + openTicketsCount + pendingCurators.length + curatorApplications.length + pendingSubmissionsCount;
    const totalFollowers = allPlaylists.reduce((acc, p) => acc + Number(p.followers || 0), 0);
    const pendingToday = pendingSongs.filter(s => {
        if (!s.created_at) return false;
        const d = new Date(s.created_at);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }).length;
    const queuePreview = pendingSongs.slice(0, 5);
    const topPlaylistsPreview = allPlaylists.slice(0, 4);

    const queueSongPlaylist = (song: any): { name: string; type: string | null } => {
        if (song?.playlist?.name) return { name: song.playlist.name, type: song.playlist.type ?? null };
        const p = allPlaylists.find(pl => pl.id === song?.playlist_id);
        return { name: p?.name || 'Unknown Playlist', type: p?.type ?? null };
    };

    const TAB_TITLES: Record<string, string> = {
        overview: "Overview",
        analytics: "Analytics",
        users: "Users",
        withdrawals: "Withdrawals",
        transactions: "Transactions",
        support: "Support",
        playlists: "Playlists",
        submissions: "Submissions",
        mixing: "Mixing orders",
        featured: "Featured",
        applications: "Applications",
        broadcast: "Broadcast",
        inbox: "Inbox",
    };

    const userInitials = (user?.name || "A").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

    const runHeaderSearch = () => {
        const q = headerSearch.trim();
        if (!q) return;
        setSubSearch(q);
        setSubStatus("all");
        submissionsPag.reset();
        navigate("submissions");
    };

    const alertBanners = (
        <>
            {pendingWithdrawalsCount > 0 && (
                <AlertBanner
                    icon={Wallet}
                    title={`${pendingWithdrawalsCount} withdrawal request${pendingWithdrawalsCount === 1 ? "" : "s"}`}
                    subtitle={`${formatNaira(finStats.pendingWithdrawals)} awaiting approval`}
                    actionLabel="Review"
                    onAction={() => navigate("withdrawals")}
                />
            )}
            {(pendingCurators.length + curatorApplications.length) > 0 && (
                <AlertBanner
                    icon={UserPlus}
                    title={`${pendingCurators.length + curatorApplications.length} curator application${pendingCurators.length + curatorApplications.length === 1 ? "" : "s"}`}
                    subtitle="New applications to verify"
                    actionLabel="Review"
                    onAction={() => navigate("applications")}
                />
            )}
        </>
    );

    if (isLoading) return <div className="min-h-screen bg-[#0A0A0B] p-10 text-center text-white">Loading Admin...</div>;

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F5]">
            <AdminSidebar
                activeTab={activeTab}
                playlistTab={playlistTab}
                counts={navCounts}
                userName={user?.name || "Admin"}
                onNavigate={navigate}
                onLogout={logout}
            />

            <div className="lg:pl-[250px]">
                {/* Mobile header */}
                <header className="lg:hidden sticky top-0 z-20 bg-[#0A0A0B]/95 backdrop-blur border-b border-white/[0.08] px-4 py-3.5 flex items-center gap-3">
                    <div className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#22C55E] to-[#F59E0B] flex items-center justify-center font-extrabold text-[17px] text-[#04120a] shrink-0">
                        {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#71717A]">AfroPitch control</p>
                        <h1 className="text-[19px] font-extrabold text-white">Admin</h1>
                    </div>
                    <button
                        onClick={() => setShowNotifications(v => !v)}
                        aria-label="Notifications"
                        className="w-11 h-11 rounded-[14px] bg-[#141417] border border-white/[0.08] flex items-center justify-center relative"
                    >
                        <Bell className="w-5 h-5 text-[#F5F5F5]" />
                        {totalAlerts > 0 && (
                            <span className="absolute top-2 right-2.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                                {totalAlerts}
                            </span>
                        )}
                    </button>
                </header>

                {/* Notifications panel (mobile + desktop) */}
                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <div className="fixed z-50 top-[68px] lg:top-[72px] right-4 lg:right-8 w-[320px] max-w-[calc(100vw-2rem)] bg-[#141417] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-[#EAB308]" /> Notifications
                                </h3>
                                <button onClick={() => setShowNotifications(false)} className="text-[#71717A] hover:text-white" aria-label="Close notifications">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-2 max-h-[70vh] overflow-y-auto">
                                {totalAlerts === 0 && (
                                    <p className="text-sm text-[#71717A] text-center py-8 px-4">All caught up. Nothing needs your attention right now.</p>
                                )}
                                {pendingSubmissionsCount > 0 && (
                                    <button
                                        onClick={() => { setShowNotifications(false); navigate("submissions"); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] text-left"
                                    >
                                        <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                                            <Music className="w-4 h-4 text-amber-400" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold text-white">{pendingSubmissionsCount} pending submission{pendingSubmissionsCount === 1 ? "" : "s"}</span>
                                            <span className="block text-xs text-[#71717A]">Songs waiting for your review</span>
                                        </span>
                                        <ChevronLeft className="w-4 h-4 text-[#71717A] rotate-180 shrink-0" />
                                    </button>
                                )}
                                {pendingWithdrawalsCount > 0 && (
                                    <button
                                        onClick={() => { setShowNotifications(false); navigate("withdrawals"); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] text-left"
                                    >
                                        <span className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                                            <Wallet className="w-4 h-4 text-red-400" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold text-white">{pendingWithdrawalsCount} withdrawal request{pendingWithdrawalsCount === 1 ? "" : "s"}</span>
                                            <span className="block text-xs text-[#71717A]">{formatNaira(finStats.pendingWithdrawals)} awaiting approval</span>
                                        </span>
                                        <ChevronLeft className="w-4 h-4 text-[#71717A] rotate-180 shrink-0" />
                                    </button>
                                )}
                                {(pendingCurators.length + curatorApplications.length) > 0 && (
                                    <button
                                        onClick={() => { setShowNotifications(false); navigate("applications"); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] text-left"
                                    >
                                        <span className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                                            <UserPlus className="w-4 h-4 text-blue-400" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold text-white">{pendingCurators.length + curatorApplications.length} curator application{(pendingCurators.length + curatorApplications.length) === 1 ? "" : "s"}</span>
                                            <span className="block text-xs text-[#71717A]">New applications to verify</span>
                                        </span>
                                        <ChevronLeft className="w-4 h-4 text-[#71717A] rotate-180 shrink-0" />
                                    </button>
                                )}
                                {openTicketsCount > 0 && (
                                    <button
                                        onClick={() => { setShowNotifications(false); navigate("support"); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] text-left"
                                    >
                                        <span className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                                            <MessageSquare className="w-4 h-4 text-purple-400" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold text-white">{openTicketsCount} open support ticket{openTicketsCount === 1 ? "" : "s"}</span>
                                            <span className="block text-xs text-[#71717A]">Users waiting for a reply</span>
                                        </span>
                                        <ChevronLeft className="w-4 h-4 text-[#71717A] rotate-180 shrink-0" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Desktop header */}
                <header className="hidden lg:flex sticky top-0 z-20 bg-[#0A0A0B]/95 backdrop-blur border-b border-white/[0.08] px-7 py-4 items-center gap-4">
                    <h1 className="text-xl font-extrabold text-white flex-1">
                        {TAB_TITLES[activeTab] || "Overview"}
                        {activeTab === "overview" && (
                            <small className="block text-xs text-[#71717A] font-medium mt-0.5">
                                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} &middot; everything under control
                            </small>
                        )}
                    </h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                        <input
                            value={headerSearch}
                            onChange={e => setHeaderSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") runHeaderSearch(); }}
                            placeholder="Search artists, songs, users..."
                            className="bg-[#141417] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-white placeholder:text-[#71717A] w-[280px] focus:outline-none focus:border-green-500/50"
                        />
                    </div>
                    <button
                        onClick={() => setShowNotifications(v => !v)}
                        aria-label="Notifications"
                        className="w-11 h-11 rounded-[14px] bg-[#141417] border border-white/[0.08] flex items-center justify-center relative"
                    >
                        <Bell className="w-5 h-5 text-[#F5F5F5]" />
                        {totalAlerts > 0 && (
                            <span className="absolute top-2 right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                                {totalAlerts}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={logout}
                        aria-label="Sign out"
                        title="Sign out"
                        className="w-11 h-11 rounded-[14px] bg-[#141417] border border-white/[0.08] flex items-center justify-center hover:border-red-500/40 group"
                    >
                        <LogOut className="w-5 h-5 text-[#A1A1AA] group-hover:text-red-400" />
                    </button>
                </header>

                <main className="px-4 lg:px-7 pt-4 lg:pt-6 pb-28 lg:pb-12 max-w-[1380px] mx-auto">

                    {/* OVERVIEW */}
                    {activeTab === "overview" && (
                        <div>
                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5 mb-5">
                                <StatCard
                                    value={String(pendingSubmissionsCount)}
                                    label="Pending submissions"
                                    sub={pendingToday > 0 ? `+${pendingToday} today` : undefined}
                                />
                                <StatCard
                                    value={formatNaira(finStats.platformRevenue)}
                                    label="Platform revenue"
                                    sub="Jan to Sep 2026"
                                />
                                <StatCard
                                    value={String(allPlaylists.length)}
                                    label="Active playlists"
                                    sub={`${formatCompact(totalFollowers)} followers`}
                                />
                                <StatCard
                                    value={String(openTicketsCount)}
                                    label="Open support tickets"
                                    accent="text-[#71717A]"
                                />
                            </div>

                            {/* Alerts (mobile position) */}
                            <div className="lg:hidden mb-5">{alertBanners}</div>

                            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-5">
                                {/* Review queue */}
                                <section id="admin-review-queue" className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5 mb-5 lg:mb-0 scroll-mt-24">
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="text-[17px] lg:text-base font-extrabold text-white">Review queue</h2>
                                        <button onClick={goToReviewQueue} className="text-[13px] text-[#22C55E] font-bold">
                                            View all
                                        </button>
                                    </div>
                                    <p className="text-xs text-[#71717A] mb-3">New song submissions waiting for your decision</p>
                                    <div className="bg-green-500/[0.07] border border-green-500/25 rounded-xl px-3 py-2.5 text-[11px] lg:text-xs text-[#A1A1AA] leading-relaxed mb-4">
                                        <b className="text-[#22C55E]">Playlist-first rule:</b> add the track to the Spotify playlist before tapping Accept. The artist is emailed immediately.
                                    </div>

                                    {queuePreview.length === 0 && (
                                        <div className="text-center py-10 text-[#71717A] text-sm">
                                            <Music className="w-10 h-10 mx-auto text-[#3F3F46] mb-2" />
                                            <p>No pending submissions. New pitches will appear here.</p>
                                        </div>
                                    )}

                                    {/* Mobile: stacked cards */}
                                    <div className="lg:hidden">
                                        {queuePreview.map(song => {
                                            const pl = queueSongPlaylist(song);
                                            return (
                                                <ReviewQueueCard
                                                    key={song.id}
                                                    song={song}
                                                    playlistName={pl.name}
                                                    playlistType={pl.type}
                                                    onPreview={() => setPreviewSong(song)}
                                                    onAccept={() => handleSubmissionAction(song.id, 'accepted')}
                                                    onDecline={() => handleSubmissionAction(song.id, 'declined')}
                                                    onFeatured={() => { setFeaturedEmailSub(song); setFeaturedEmailCategory("artist-of-the-week"); }}
                                                />
                                            );
                                        })}
                                    </div>
                                    {/* Desktop: horizontal rows */}
                                    <div className="hidden lg:block space-y-3">
                                        {queuePreview.map(song => {
                                            const pl = queueSongPlaylist(song);
                                            return (
                                                <ReviewQueueCard
                                                    key={song.id}
                                                    layout="row"
                                                    song={song}
                                                    playlistName={pl.name}
                                                    playlistType={pl.type}
                                                    onPreview={() => setPreviewSong(song)}
                                                    onAccept={() => handleSubmissionAction(song.id, 'accepted')}
                                                    onDecline={() => handleSubmissionAction(song.id, 'declined')}
                                                    onFeatured={() => { setFeaturedEmailSub(song); setFeaturedEmailCategory("artist-of-the-week"); }}
                                                />
                                            );
                                        })}
                                    </div>

                                    {pendingSubmissionsCount > queuePreview.length && (
                                        <button
                                            onClick={goToReviewQueue}
                                            className="w-full mt-2 py-3 rounded-xl border border-white/[0.08] bg-[#1B1B1F] text-sm font-bold text-[#A1A1AA] hover:text-white"
                                        >
                                            View all {pendingSubmissionsCount} pending submissions
                                        </button>
                                    )}
                                </section>

                                <div>
                                    {/* Alerts (desktop position) */}
                                    <div className="hidden lg:block mb-4">{alertBanners}</div>

                                    {/* Playlists */}
                                    <section className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5 mb-5">
                                        <div className="flex items-center justify-between mb-1">
                                            <h2 className="text-[17px] lg:text-base font-extrabold text-white">Playlists</h2>
                                            <button onClick={() => navigate("playlists", "all")} className="text-[13px] text-[#22C55E] font-bold">
                                                Manage
                                            </button>
                                        </div>
                                        <p className="text-xs text-[#71717A] mb-3">Your Spotify playlist network</p>
                                        <div className="space-y-2">
                                            {topPlaylistsPreview.map(p => (
                                                <PlaylistRow
                                                    key={p.id}
                                                    name={p.name}
                                                    type={p.type}
                                                    followers={p.followers}
                                                    songs={acceptedSongCounts[p.id] || 0}
                                                    onClick={() => navigate("playlists", "all")}
                                                />
                                            ))}
                                            {topPlaylistsPreview.length === 0 && (
                                                <p className="text-sm text-[#71717A] py-4 text-center">No playlists yet.</p>
                                            )}
                                        </div>
                                    </section>

                                    {/* Broadcast */}
                                    <section className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-5 mb-5">
                                        <h2 className="text-[17px] lg:text-base font-extrabold text-white mb-1">Broadcast</h2>
                                        <p className="text-xs text-[#71717A] mb-3">Send an update to all users</p>
                                        <Input
                                            value={broadcastSubject}
                                            onChange={e => setBroadcastSubject(e.target.value)}
                                            placeholder="Subject"
                                            className="bg-black border-white/[0.08] text-white text-sm mb-2"
                                        />
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={e => setBroadcastMessage(e.target.value)}
                                            placeholder="Write your announcement..."
                                            className="w-full bg-black border border-white/[0.08] rounded-xl text-white placeholder:text-[#71717A] p-3 text-[13px] min-h-[70px] resize-y mb-2 focus:outline-none focus:border-green-500/50"
                                        />
                                        <div className="flex gap-2 mb-3">
                                            {(['all', 'artist', 'curator'] as const).map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setBroadcastTargetRole(r)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${broadcastTargetRole === r ? 'bg-green-600 text-white' : 'bg-[#1B1B1F] text-[#71717A] hover:text-white'}`}
                                                >
                                                    {r === 'all' ? 'Everyone' : r + 's'}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleSendBroadcast}
                                            disabled={isSendingBroadcast}
                                            className="w-full bg-[#22C55E] text-[#04120a] font-extrabold text-sm rounded-xl py-3 disabled:opacity-60"
                                        >
                                            {isSendingBroadcast ? "Queueing..." : "Send broadcast"}
                                        </button>
                                    </section>
                                </div>
                            </div>

                            {/* Financial Overview: live DB figures */}
                            <div className="mt-2 lg:mt-6 space-y-3">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-500" /> Financial Overview
                                    <span className="text-xs text-gray-500 font-normal ml-1">Live data from the database</span>
                                </h2>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Card className="bg-blue-600/10 border-blue-500/20">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-blue-400 uppercase tracking-wider">Total Deposits</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.totalDeposits.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Money loaded by artists via Paystack</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-purple-600/10 border-purple-500/20">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-purple-400 uppercase tracking-wider">Submission Volume</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.totalSubmissionFees.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Total fees paid across all accepted pitches</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-green-600/10 border-green-500/20">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-green-400 uppercase tracking-wider">Platform Revenue</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.platformRevenue.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">AfroPitch's net cut (100% own / 30% others)</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-orange-600/10 border-orange-500/20">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-orange-400 uppercase tracking-wider">Curator Earnings</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.curatorEarnings.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">70% of 3rd-party playlist fees earned by curators</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Card className="bg-[#141417] border-white/[0.08]">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-gray-400 uppercase tracking-wider">Artist Wallets</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-pink-400">{pricingConfig.currency}{finStats.artistHoldings.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Sum of all artist balances</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-[#141417] border-white/[0.08]">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-gray-400 uppercase tracking-wider">Curator Wallets</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-green-400">{pricingConfig.currency}{finStats.curatorHoldings.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Sum of all curator balances (unpaid earnings)</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-yellow-600/10 border-yellow-500/20">
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className="text-xs text-yellow-400 uppercase tracking-wider">Total in Wallets</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className="text-xl font-bold text-yellow-400">{pricingConfig.currency}{finStats.totalEcosystem.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">All users total (incl. admin: {pricingConfig.currency}{finStats.adminHoldings.toLocaleString()})</p>
                                        </CardContent>
                                    </Card>
                                    <Card className={`border ${finStats.pendingWithdrawals > 0 ? 'bg-red-600/10 border-red-500/20' : 'bg-[#141417] border-white/[0.08]'}`}>
                                        <CardHeader className="pb-1 pt-3 px-4">
                                            <CardTitle className={`text-xs uppercase tracking-wider ${finStats.pendingWithdrawals > 0 ? 'text-red-400' : 'text-gray-400'}`}>Withdrawals</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3">
                                            <div className={`text-xl font-bold ${finStats.pendingWithdrawals > 0 ? 'text-red-400' : 'text-white'}`}>
                                                {pricingConfig.currency}{finStats.pendingWithdrawals.toLocaleString()}
                                                {finStats.pendingWithdrawals > 0 && <span className="text-xs ml-1 animate-pulse">pending</span>}
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Paid out: {pricingConfig.currency}{finStats.approvedWithdrawals.toLocaleString()}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <AdminAnalytics topPlaylists={topPlaylists} topSongs={topCampaigns} />
                        </div>
                    )}

                    {/* ANALYTICS VIEW */}
                    {activeTab === "analytics" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AnalyticsPage />
                        </div>
                    )}

                    {/* USERS MANAGEMENT */}
                    {activeTab === "users" && (
                        <Card className="bg-[#141417] border-white/[0.08]">
                            <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <CardTitle className="text-white flex items-center gap-3">
                                    User Management
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-500 hover:text-white" onClick={refreshUsers} title="Refresh List">
                                        <RefreshCw className={`w-4 h-4 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                                    </Button>
                                </CardTitle>
                                <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setShowCustomEmail(true)}>
                                        <Send className="w-4 h-4 mr-2" /> Send Email
                                    </Button>
                                    <Button size="sm" className="bg-yellow-600 text-white hover:bg-yellow-700" onClick={async () => {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        const token = session?.access_token;
                                        const res = await fetch("/api/admin/sync-users", {
                                            method: "POST",
                                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            toast(`Synced ${data.synced} missing users!`, "success");
                                            refreshUsers();
                                        } else {
                                            toast("Sync failed: " + (data.error || "Unknown"), "error");
                                        }
                                    }}>
                                        <Users className="w-4 h-4 mr-2" /> Sync Users
                                    </Button>
                                    <Button size="sm" className="bg-white text-black hover:bg-gray-200" onClick={() => setShowAddUser(true)}>
                                        <Users className="w-4 h-4 mr-2" /> Add User
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-3 md:items-center mb-3">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                        <Input
                                            value={userSearch}
                                            onChange={e => { setUserSearch(e.target.value); usersPag.reset(); }}
                                            placeholder="Search name or email..."
                                            className="pl-9 bg-black/40 border-white/10 text-white text-sm"
                                        />
                                    </div>
                                    <FilterButtons
                                        options={[
                                            { value: "all", label: "All" },
                                            { value: "artist", label: "Artists" },
                                            { value: "curator", label: "Curators" },
                                            { value: "admin", label: "Admins" },
                                        ]}
                                        value={userRole}
                                        onChange={setUserRole}
                                        reset={usersPag.reset}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mb-2">Showing {usersPag.start}–{usersPag.end} of {filteredUsers.length} users</p>
                                <div className="space-y-4">
                                    {usersPag.paginate(filteredUsers).map(u => (
                                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white/5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold relative shrink-0 ${u.role === 'artist' ? 'bg-purple-500/20 text-purple-500' : 'bg-green-500/20 text-green-500'}`}>
                                                    {u.full_name[0]}
                                                    {u.is_online && (
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full" title="Online"></span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white flex items-center gap-2 flex-wrap">
                                                        <span className="truncate">{u.full_name}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${u.role === 'artist' ? 'border-purple-500 text-purple-500' : 'border-green-500 text-green-500'}`}>{u.role}</span>
                                                        {u.is_blocked && <span className="text-[10px] bg-red-500 text-white px-2 rounded">BLOCKED</span>}
                                                    </p>
                                                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-xs text-gray-400">Bal:</span>
                                                        <span className="text-sm font-bold text-green-400">{pricingConfig.currency}{(u.balance || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => setShowTopUp(u)} title="Top Up Balance">
                                                    <DollarSign className="w-4 h-4 text-green-400" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => setMessageUser(u)} title="Send Message">
                                                    <MessageSquare className="w-4 h-4 text-blue-400" />
                                                </Button>
                                                <Button size="sm" variant="outline" className={`border-red-500/20 ${u.is_blocked ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`} onClick={() => toggleUserBlock(u.id)}>
                                                    {u.is_blocked ? "Unblock" : "Block"}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteUser(u.id)}>Delete</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <PaginationControls page={usersPag.page} totalPages={usersPag.totalPages} start={usersPag.start} end={usersPag.end} total={filteredUsers.length} onPageChange={usersPag.setPage} />
                            </CardContent>
                        </Card>
                    )}

                    {/* TRANSACTIONS VIEW */}
                    {activeTab === "transactions" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Platform Transactions</h2>
                                <p className="text-gray-400">View all financial activity across the platform.</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                <Card className="bg-blue-600/10 border-blue-500/20">
                                    <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-blue-400 uppercase tracking-wider">Submission Volume</CardTitle></CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.totalSubmissionFees.toLocaleString()}</div>
                                        <p className="text-[10px] text-gray-500">Total fees from accepted pitches</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-green-600/10 border-green-500/20">
                                    <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-green-400 uppercase tracking-wider">Platform Revenue</CardTitle></CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.platformRevenue.toLocaleString()}</div>
                                        <p className="text-[10px] text-gray-500">AfroPitch net cut</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-purple-600/10 border-purple-500/20">
                                    <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-purple-400 uppercase tracking-wider">Total Deposits</CardTitle></CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.totalDeposits.toLocaleString()}</div>
                                        <p className="text-[10px] text-gray-500">Artist Paystack top-ups</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-orange-600/10 border-orange-500/20">
                                    <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-orange-400 uppercase tracking-wider">Withdrawals</CardTitle></CardHeader>
                                    <CardContent className="px-4 pb-3">
                                        <div className="text-xl font-bold text-white">{pricingConfig.currency}{finStats.pendingWithdrawals.toLocaleString()} pending</div>
                                        <p className="text-[10px] text-gray-500">Paid out: {pricingConfig.currency}{finStats.approvedWithdrawals.toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <TransactionsList />
                        </div>
                    )}

                    {/* WITHDRAWALS MANAGEMENT */}
                    {activeTab === "withdrawals" && (
                        <Card className="bg-[#141417] border-white/[0.08]">
                            <CardHeader>
                                <CardTitle className="text-white">Withdrawal Requests</CardTitle>
                                <CardDescription>Manage fund payout requests from curators.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-3">
                                    <FilterButtons
                                        options={[
                                            { value: "all", label: "All" },
                                            { value: "pending", label: "Pending" },
                                            { value: "approved", label: "Approved" },
                                            { value: "rejected", label: "Rejected" },
                                        ]}
                                        value={withdrawalStatus}
                                        onChange={setWithdrawalStatus}
                                        reset={withdrawalsPag.reset}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mb-2">Showing {withdrawalsPag.start}–{withdrawalsPag.end} of {filteredWithdrawals.length} requests</p>
                                <div className="space-y-4">
                                    {filteredWithdrawals.length === 0 && <p className="text-gray-500 text-center py-4">No requests found.</p>}
                                    {withdrawalsPag.paginate(filteredWithdrawals).map(w => (
                                        <div key={w.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 gap-4">
                                            <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                                                <div className="bg-green-500/20 p-2 rounded-full text-green-500 shrink-0">
                                                    <DollarSign className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white flex items-center gap-2">
                                                        {pricingConfig.currency}{w.amount.toLocaleString()}
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${w.status === 'pending' ? 'bg-yellow-500 text-black' : w.status === 'approved' && w.processed_at ? 'bg-green-500 text-white' : w.status === 'approved' ? 'bg-amber-600 text-white' : 'bg-red-500 text-white'}`}>
                                                            {w.status === 'approved' && w.processed_at ? 'paid' : w.status === 'approved' ? 'approved - unpaid' : w.status}
                                                        </span>
                                                    </p>
                                                    <p className="text-sm text-gray-400">Requested by <span className="text-white">{w.user_name}</span> &middot; {w.date} &middot; withdrawable {pricingConfig.currency}{w.user_withdrawable.toLocaleString()}</p>
                                                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">{w.bank_details}</p>
                                                    {w.reason && <p className="text-xs text-gray-400 mt-1"><span className="text-gray-500">Reason:</span> {w.reason}</p>}
                                                    {w.status === 'approved' && w.processed_at && (
                                                        <p className="text-xs text-green-400 mt-1">Paid {new Date(w.processed_at).toLocaleDateString()}{w.paid_reference ? ` · Ref: ${w.paid_reference}` : ''}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {w.status === 'pending' && (
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleWithdrawal(w.id, 'approve')}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleWithdrawal(w.id, 'reject')}>
                                                        <XCircle className="w-4 h-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {w.status === 'approved' && !w.processed_at && (
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleWithdrawal(w.id, 'mark_paid')}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Mark as paid
                                                    </Button>
                                                </div>
                                            )}
                                            {/* Always show Message button */}
                                            <div className="ml-2">
                                                <Button size="sm" variant="outline" onClick={() => initiateChatWithUser(w.user_id, w.user_name)}>
                                                    <MessageSquare className="w-4 h-4 mr-1" /> Message
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <PaginationControls page={withdrawalsPag.page} totalPages={withdrawalsPag.totalPages} start={withdrawalsPag.start} end={withdrawalsPag.end} total={filteredWithdrawals.length} onPageChange={withdrawalsPag.setPage} />
                            </CardContent>
                        </Card>
                    )}

                    {/* PLAYLISTS MANAGEMENT */}
                    {activeTab === "playlists" && (
                        <div className="space-y-6">
                            <div className="mb-2">
                                <h2 className="text-xl lg:text-2xl font-extrabold text-white">Playlists</h2>
                                <p className="text-sm text-[#71717A] mt-0.5">Review the submission queue or browse every playlist.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <div className="grid grid-cols-2 sm:flex bg-[#141417] p-1.5 rounded-2xl border border-white/[0.08] w-full sm:w-auto">
                                    <button
                                        onClick={() => { setPlaylistTab("submissions"); pendingSongsPag.reset(); }}
                                        aria-pressed={playlistTab === "submissions"}
                                        className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all ${playlistTab === "submissions" ? "bg-[#22C55E] text-[#04120a]" : "text-gray-400 hover:text-white"}`}
                                    >
                                        Review queue
                                        {pendingSubmissionsCount > 0 && (
                                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${playlistTab === "submissions" ? "bg-[#04120a]/20 text-[#04120a]" : "bg-red-500 text-white animate-pulse"}`}>{pendingSubmissionsCount}</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => { setPlaylistTab("all"); playlistsPag.reset(); }}
                                        aria-pressed={playlistTab === "all"}
                                        className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all ${playlistTab === "all" ? "bg-[#22C55E] text-[#04120a]" : "text-gray-400 hover:text-white"}`}
                                    >
                                        All playlists
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${playlistTab === "all" ? "bg-[#04120a]/20 text-[#04120a]" : "bg-white/10 text-white"}`}>{allPlaylists.length}</span>
                                    </button>
                                </div>

                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAddPlaylist(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Playlist
                                </Button>
                            </div>

                            {/* TAB 1: PENDING SUBMISSIONS */}
                            {playlistTab === "submissions" && (
                                <div className="space-y-4">
                                    <div className="bg-[#141417] border border-white/[0.08] rounded-[18px] p-4 lg:p-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-blue-500/20 rounded-full text-blue-500">
                                                <Music className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Pending Submissions Review</h3>
                                                <p className="text-sm text-gray-400">Manage all incoming song submissions across the platform.</p>
                                            </div>
                                        </div>

                                        <div className="bg-green-500/[0.07] border border-green-500/25 rounded-xl px-3 py-2.5 text-xs text-[#A1A1AA] leading-relaxed mb-4">
                                            <b className="text-[#22C55E]">Playlist-first rule:</b> add the track to the Spotify playlist before tapping Accept. The artist is emailed immediately.
                                        </div>

                                        {pendingSongs.length > 0 && (
                                            <p className="text-xs text-gray-500 mb-2">Showing {pendingSongsPag.start}–{pendingSongsPag.end} of {pendingSongs.length} pending submissions</p>
                                        )}

                                        {pendingSongs.length === 0 && (
                                            <div className="text-center py-12 text-gray-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
                                                <Music className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                                                <p>No pending submissions found.</p>
                                                <p className="text-xs text-gray-600 mt-1">New submissions will appear here automatically.</p>
                                                <Button size="sm" variant="outline" className="mt-4 border-white/10" onClick={() => fetchGlobalPendingSongs()}>Force Refresh</Button>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {pendingSongsPag.paginate(pendingSongs).map(song => {
                                                const pl = queueSongPlaylist(song);
                                                return (
                                                    <ReviewQueueCard
                                                        key={song.id}
                                                        song={song}
                                                        playlistName={pl.name}
                                                        playlistType={pl.type}
                                                        onPreview={() => setPreviewSong(song)}
                                                        onAccept={() => handleSubmissionAction(song.id, 'accepted')}
                                                        onDecline={() => handleSubmissionAction(song.id, 'declined')}
                                                        onFeatured={() => { setFeaturedEmailSub(song); setFeaturedEmailCategory("artist-of-the-week"); }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <PaginationControls page={pendingSongsPag.page} totalPages={pendingSongsPag.totalPages} start={pendingSongsPag.start} end={pendingSongsPag.end} total={pendingSongs.length} onPageChange={pendingSongsPag.setPage} />
                                    </div>
                                </div>
                            )}


                            {/* TAB 2: ALL PLAYLISTS */}
                            {playlistTab === "all" && (
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row gap-4 justify-between bg-[#141417] p-4 rounded-xl border border-white/[0.08]">
                                        <FilterButtons
                                            options={[
                                                { value: "all", label: "All Playlists" },
                                                { value: "admin", label: "My Playlists" },
                                                { value: "user", label: "Curator Playlists" },
                                            ]}
                                            value={playlistFilter}
                                            onChange={(v) => setPlaylistFilter(v as "all" | "admin" | "user")}
                                            reset={playlistsPag.reset}
                                        />
                                        <div className="w-full md:w-64">
                                            <Input
                                                placeholder="Search playlists..."
                                                value={playlistSearch}
                                                onChange={(e) => { setPlaylistSearch(e.target.value); playlistsPag.reset(); }}
                                                className="bg-black/20 border-white/10 h-8 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500">Showing {playlistsPag.start}–{playlistsPag.end} of {filteredPlaylists.length} playlists</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {playlistsPag.paginate(filteredPlaylists)
                                            .map((playlist) => (
                                                <Card key={playlist.id} className="bg-[#141417] border-white/[0.08] overflow-hidden hover:border-white/20 transition-all group">
                                                    <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Music className="w-12 h-12 text-white/20 group-hover:scale-110 transition-transform duration-500" />
                                                        </div>
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${playlist.type === 'exclusive' ? 'bg-yellow-500 text-black' :
                                                                playlist.type === 'express' ? 'bg-orange-500 text-white' :
                                                                    'bg-blue-500 text-white'
                                                                }`}>
                                                                {playlist.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-4">
                                                        <div className="mb-4">
                                                            <h3 className="font-bold text-white text-lg truncate mb-1" title={playlist.name}>{playlist.name}</h3>
                                                            <p className="text-sm text-gray-400 flex items-center gap-1.5">
                                                                <Users className="w-3 h-3 text-gray-500" />
                                                                <span className="text-gray-300">{playlist.curator_name || 'Unknown'}</span>
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                                                            <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                                                                <span className="block font-bold text-white text-sm">{playlist.followers.toLocaleString()}</span>
                                                                Followers
                                                            </div>
                                                            <div className="bg-white/5 p-2 rounded text-center border border-white/5">
                                                                <span className="block font-bold text-white text-sm">{new Date(playlist.created_at).toLocaleDateString()}</span>
                                                                Created
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/10 text-blue-400 hover:text-blue-300 px-3"
                                                                onClick={() => handleRefreshPlaylist(playlist)}
                                                                disabled={isRefreshing === playlist.id || !playlist.playlist_link}
                                                                title={!playlist.playlist_link ? "No Spotify Link" : "Refresh Metadata"}
                                                            >
                                                                {isRefreshing === playlist.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="flex-1 border-white/10 hover:bg-white/10" onClick={() => {
                                                                setAdminEditingPlaylist(playlist);
                                                                setAdminNewName(playlist.name);
                                                                setAdminNewFollowers(playlist.followers);
                                                                setShowEditPlaylist(true);
                                                            }}>
                                                                Edit
                                                            </Button>
                                                            <Button size="sm" variant="destructive" className="flex-1 opacity-80 hover:opacity-100" onClick={() => deletePlaylist(playlist.id)}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        {filteredPlaylists.length === 0 && <p className="text-gray-500 col-span-3 text-center py-10">No playlists found.</p>}
                                    </div>
                                    <PaginationControls page={playlistsPag.page} totalPages={playlistsPag.totalPages} start={playlistsPag.start} end={playlistsPag.end} total={filteredPlaylists.length} onPageChange={playlistsPag.setPage} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUPPORT SYSTEM */}
                    {activeTab === "support" && (
                        <Card className="bg-[#141417] border-white/[0.08]">
                            <CardHeader>
                                <CardTitle className="text-white">Support Tickets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-3 md:items-center mb-3">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                        <Input
                                            value={ticketSearch}
                                            onChange={e => { setTicketSearch(e.target.value); ticketsPag.reset(); }}
                                            placeholder="Search subject, user, or message..."
                                            className="pl-9 bg-black/40 border-white/10 text-white text-sm"
                                        />
                                    </div>
                                    <FilterButtons
                                        options={[
                                            { value: "all", label: "All" },
                                            { value: "open", label: "Open" },
                                            { value: "closed", label: "Closed" },
                                        ]}
                                        value={ticketStatus}
                                        onChange={setTicketStatus}
                                        reset={ticketsPag.reset}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mb-2">Showing {ticketsPag.start}–{ticketsPag.end} of {filteredTickets.length} tickets</p>
                                <div className="space-y-4">
                                    {ticketsPag.paginate(filteredTickets).map(t => (
                                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                                                <div className="bg-blue-500/20 p-2 rounded-full text-blue-500 shrink-0">
                                                    <MessageSquare className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white truncate">{t.subject}</p>
                                                    <p className="text-sm text-gray-400">From: {t.user_name} &middot; {t.date}</p>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.last_message}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
                                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase ${t.status === 'open' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                                    {t.status}
                                                </span>
                                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openChat(t); }}>Chat</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <PaginationControls page={ticketsPag.page} totalPages={ticketsPag.totalPages} start={ticketsPag.start} end={ticketsPag.end} total={filteredTickets.length} onPageChange={ticketsPag.setPage} />
                            </CardContent>
                        </Card>
                    )}

                    {/* APPLICATIONS VIEW */}
                    {activeTab === "applications" && (
                        <div className="space-y-6">
                            {/* Section 0: Verification test song link (admin-controlled) */}
                            <Card className="bg-[#141417] border-white/[0.08]">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Link2 className="w-5 h-5 text-green-400" />
                                        Playlist Verification Song
                                    </CardTitle>
                                    <CardDescription>Paste the Spotify link curators must add to each playlist to prove they control it. You can change this anytime.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <Input
                                            value={verificationSongInput}
                                            onChange={(e) => setVerificationSongInput(e.target.value)}
                                            placeholder="https://open.spotify.com/track/..."
                                            className="flex-1 bg-black/50 border-white/10 text-white"
                                        />
                                        <Button onClick={saveVerificationSongUrl} disabled={savingVerificationSong} className="bg-green-600 hover:bg-green-700 shrink-0">
                                            {savingVerificationSong ? "Saving..." : "Save link"}
                                        </Button>
                                    </div>
                                    {verificationSongUrl && (
                                        <p className="text-xs text-gray-500 mt-2 break-all">Current: <a href={verificationSongUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">{verificationSongUrl}</a></p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Section 0b: Playlists awaiting verification */}
                            <Card className="bg-[#141417] border-white/[0.08]">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-purple-400" />
                                        Playlists Awaiting Verification
                                        {allPlaylists.filter(p => p.verification_status === 'pending_review').length > 0 && (
                                            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">{allPlaylists.filter(p => p.verification_status === 'pending_review').length}</span>
                                        )}
                                    </CardTitle>
                                    <CardDescription>Curators have added the test song and clicked Done. Check each playlist on Spotify, then approve.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {allPlaylists.filter(p => p.verification_status === 'pending_review').length === 0 && (
                                            <p className="text-gray-500 text-center py-4 text-sm">No playlists waiting for verification.</p>
                                        )}
                                        {allPlaylists.filter(p => p.verification_status === 'pending_review').map(p => (
                                            <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-purple-500/20 gap-4">
                                                <div>
                                                    <p className="font-bold text-white">{p.name}</p>
                                                    <p className="text-sm text-gray-500">Curator: {p.curator_name}</p>
                                                    {p.playlist_link && (
                                                        <a href={p.playlist_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline truncate block max-w-xs mt-1">{p.playlist_link}</a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handlePlaylistVerification(p.id, 'verified')}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handlePlaylistVerification(p.id, 'unverified')}>
                                                        <XCircle className="w-4 h-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 1: Registered curators awaiting profile verification */}
                            <Card className="bg-[#141417] border-white/[0.08]">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-yellow-500" />
                                        Registered Curators Awaiting Verification
                                    </CardTitle>
                                    <CardDescription>Curators who have applied via their dashboard for identity verification.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-gray-500 mb-2">Showing {pendingCuratorsPag.start}–{pendingCuratorsPag.end} of {pendingCurators.length}</p>
                                    <div className="space-y-4">
                                        {pendingCurators.length === 0 && (
                                            <p className="text-gray-500 text-center py-4 text-sm">No pending profile verifications.</p>
                                        )}
                                        {pendingCuratorsPag.paginate(pendingCurators).map(c => (
                                            <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-lg">
                                                        {c.full_name?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white flex items-center gap-2">
                                                            {c.full_name}
                                                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 rounded-full uppercase">Pending</span>
                                                        </p>
                                                        <p className="text-sm text-gray-500 break-all">{c.email}</p>
                                                        <div className="mt-1 text-xs text-gray-400 break-all">
                                                            Bank: {c.bank_name || 'Not set'} &middot; Acc: {c.account_number || 'N/A'}
                                                            {c.nin_number && <span className="ml-2">&middot; NIN: {c.nin_number}</span>}
                                                        </div>
                                                        {c.verification_docs && (() => {
                                                            try {
                                                                const docs = JSON.parse(c.verification_docs);
                                                                return (
                                                                    <div className="mt-2 text-xs text-blue-400 space-y-0.5">
                                                                        {docs.portfolio && <p>Portfolio: {docs.portfolio}</p>}
                                                                        {docs.phone && <p>Phone: {docs.phone}</p>}
                                                                        {docs.experience && <p>Experience: {docs.experience} yrs</p>}
                                                                        {docs.genres && <p>Genres: {docs.genres}</p>}
                                                                    </div>
                                                                );
                                                            } catch { return <div className="mt-1 text-xs text-blue-400">{c.verification_docs}</div>; }
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button size="sm" variant="outline" className="border-white/20" onClick={() => setViewApplication({ kind: 'curator', data: c })}>
                                                        <Eye className="w-4 h-4 mr-1" /> View
                                                    </Button>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleCuratorAction(c.id, 'verified')}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleCuratorAction(c.id, 'rejected')}>
                                                        <XCircle className="w-4 h-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <PaginationControls page={pendingCuratorsPag.page} totalPages={pendingCuratorsPag.totalPages} start={pendingCuratorsPag.start} end={pendingCuratorsPag.end} total={pendingCurators.length} onPageChange={pendingCuratorsPag.setPage} />
                                </CardContent>
                            </Card>

                            {/* Section 2: Public applicants from /curators/join */}
                            <Card className="bg-[#141417] border-white/[0.08]">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-400" />
                                        External Public Applications
                                        {curatorApplications.length > 0 && (
                                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">{curatorApplications.length}</span>
                                        )}
                                    </CardTitle>
                                    <CardDescription>Applications submitted via the public /curators/join page (not yet registered users).</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-gray-500 mb-2">Showing {curatorAppsPag.start}–{curatorAppsPag.end} of {curatorApplications.length}</p>
                                    <div className="space-y-4">
                                        {curatorApplications.length === 0 && (
                                            <p className="text-gray-500 text-center py-4 text-sm">No external applications.</p>
                                        )}
                                        {curatorAppsPag.paginate(curatorApplications).map(app => (
                                            <div key={app.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-blue-500/10 gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
                                                        {app.name?.[0] || '?'}
                                                    </div>
                                                    <div className="space-y-1 min-w-0">
                                                        <p className="font-bold text-white">{app.name}</p>
                                                        <p className="text-sm text-blue-400">{app.email}</p>
                                                        {app.playlist_link && (
                                                            <a href={app.playlist_link} target="_blank" rel="noopener noreferrer"
                                                                className="text-xs text-green-400 hover:underline truncate block max-w-xs">
                                                                {app.playlist_link}
                                                            </a>
                                                        )}
                                                        {app.bio && <p className="text-xs text-gray-400 mt-1">&ldquo;{app.bio}&rdquo;</p>}
                                                        {app.social_links && (
                                                            <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                                                                {app.social_links.instagram && <span>IG: @{app.social_links.instagram}</span>}
                                                                {app.social_links.twitter && <span>TW: @{app.social_links.twitter}</span>}
                                                                {app.social_links.website && <span>Web: {app.social_links.website}</span>}
                                                            </div>
                                                        )}
                                                        <p className="text-[10px] text-gray-600">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button size="sm" variant="outline" className="border-white/20" onClick={() => setViewApplication({ kind: 'external', data: app })}>
                                                        <Eye className="w-4 h-4 mr-1" /> View
                                                    </Button>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleExternalAppAction(app.id, 'approved')}>
                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleExternalAppAction(app.id, 'rejected')}>
                                                        <XCircle className="w-4 h-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <PaginationControls page={curatorAppsPag.page} totalPages={curatorAppsPag.totalPages} start={curatorAppsPag.start} end={curatorAppsPag.end} total={curatorApplications.length} onPageChange={curatorAppsPag.setPage} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* BROADCAST VIEW */}
                    {activeTab === "broadcast" && (
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-[#141417] border-white/[0.08] md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-yellow-500" /> Broadcast Message
                                    </CardTitle>
                                    <CardDescription>Send an announcement to platform users.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Top Controls: Channel & Target */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-300">Broadcast Channel</label>
                                            <div className="flex gap-2 bg-black/50 p-1 rounded-lg border border-white/10">
                                                {(['email', 'in_app', 'both'] as const).map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setBroadcastChannel(c)}
                                                        className={`flex-1 py-2 rounded-md text-sm font-bold capitalize transition-all ${broadcastChannel === c ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {c.replace('_', '-')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-300">Target Audience</label>
                                            <div className="flex gap-2 bg-black/50 p-1 rounded-lg border border-white/10">
                                                {(['all', 'artist', 'curator'] as const).map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setBroadcastTargetRole(r)}
                                                        className={`flex-1 py-2 rounded-md text-sm font-bold capitalize transition-all ${broadcastTargetRole === r ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {r === 'all' ? 'Everyone' : r + 's'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Warning */}
                                    <div className={`p-4 rounded-lg border text-sm flex items-start gap-3 transition-colors ${broadcastTargetRole === 'all' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200' : 'bg-blue-500/10 border-blue-500/20 text-blue-200'}`}>
                                        <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${broadcastTargetRole === 'all' ? 'text-yellow-500' : 'text-blue-500'}`} />
                                        <div>
                                            <strong>Audience Check:</strong> You are sending this to
                                            <span className="font-bold underline ml-1 uppercase">{broadcastTargetRole === 'all' ? 'All Users' : broadcastTargetRole + 's'}</span>.
                                            {broadcastTargetRole === 'all' && " This will impact the entire platform."}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-bold text-gray-300">Subject Line</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Opening:</span>
                                                <select
                                                    className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500"
                                                    value={broadcastAddressing}
                                                    onChange={(e) => setBroadcastAddressing(e.target.value as any)}
                                                >
                                                    <option value="dear_all">Dear All (Generic)</option>
                                                    <option value="dear_name">Hi [Name] (Personalized)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <Input
                                            value={broadcastSubject}
                                            onChange={e => setBroadcastSubject(e.target.value)}
                                            placeholder="e.g. Important Update: New Payment Methods Added!"
                                            className="bg-black/50 border-white/10 h-10 text-md font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-zinc-900 border border-white/10 rounded-t-lg p-2 border-b-0">
                                            <label className="text-xs font-bold text-gray-400 px-2">Message Content (HTML)</label>
                                            <div className="flex gap-1 flex-wrap">
                                                {/* Simple HTML Toolbar */}
                                                {[
                                                    { label: 'B', tag: '<b>', close: '</b>' },
                                                    { label: 'I', tag: '<i>', close: '</i>' },
                                                    { label: 'H2', tag: '<h2>', close: '</h2>' },
                                                    { label: 'Center', tag: '<center>', close: '</center>' },
                                                    { label: 'Link', tag: '<a href="#">', close: '</a>' },
                                                    { label: 'Button', tag: '<a href="#" style="display:inline-block;padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:5px;">', close: '</a>' }
                                                ].map(tool => (
                                                    <button
                                                        key={tool.label}
                                                        onClick={() => setBroadcastMessage(prev => prev + `${tool.tag}text${tool.close}`)}
                                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs font-bold text-gray-300 border border-white/5"
                                                    >
                                                        {tool.label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setBroadcastMessage(`<h2>Monthly Update!</h2>\n<p>We are excited to announce new features...</p>\n<br/>\n<center>\n<a href="${window.location.origin}/dashboard" style="display:inline-block;padding:12px 24px;background:#16a34a;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Check Dashboard</a>\n</center>`)}
                                                    className="ml-2 px-2 py-1 bg-green-900/40 hover:bg-green-900/60 rounded text-xs font-bold text-green-400 border border-green-500/30"
                                                >
                                                    Use Template
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={e => setBroadcastMessage(e.target.value)}
                                            placeholder="Write your announcement here. HTML tags are supported..."
                                            className="w-full h-80 bg-black/50 border-white/10 rounded-b-lg p-4 text-sm text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-green-500 resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-white/5">
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 font-bold px-8 h-12 text-lg shadow-lg shadow-green-900/20"
                                            onClick={handleSendBroadcast}
                                            disabled={isSendingBroadcast}
                                        >
                                            {isSendingBroadcast ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Queueing Broadcast...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5 mr-2" /> Send Broadcast Now
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* MIXING ORDERS VIEW */}
                    {activeTab === "mixing" && (
                        <div className="animate-in fade-in duration-300">
                            <AdminMixing />
                        </div>
                    )}

                    {/* FEATURED ARTIST VIEW */}
                    {activeTab === "featured" && (
                        <div className="animate-in fade-in duration-300">
                            <AdminFeatured />
                        </div>
                    )}

                    {/* SUBMISSIONS HISTORY VIEW */}
                    {activeTab === "submissions" && (
                        <div className="animate-in fade-in duration-300">
                            <Card className="bg-[#141417] border-white/[0.08]">
                                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-xl text-white">Submission History</CardTitle>
                                        <CardDescription className="text-gray-400">View all incoming songs, statuses, and manage ranking boosts.</CardDescription>
                                    </div>
                                    <Button variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={fetchAllSubmissions}>Refresh List</Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-3 md:items-center mb-3">
                                        <div className="relative flex-1 min-w-[180px]">
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                            <Input
                                                value={subSearch}
                                                onChange={e => { setSubSearch(e.target.value); submissionsPag.reset(); }}
                                                placeholder="Search song title or artist..."
                                                className="pl-9 bg-black/40 border-white/10 text-white text-sm"
                                            />
                                        </div>
                                        <FilterButtons
                                            options={[
                                                { value: "all", label: "All" },
                                                { value: "pending", label: "Pending" },
                                                { value: "accepted", label: "Accepted" },
                                                { value: "declined", label: "Declined" },
                                                { value: "archived", label: "Archived" },
                                            ]}
                                            value={subStatus}
                                            onChange={setSubStatus}
                                            reset={submissionsPag.reset}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">Showing {submissionsPag.start}–{submissionsPag.end} of {filteredSubmissions.length} submissions</p>
                                    <div className="space-y-2">
                                        {filteredSubmissions.length === 0 ? (
                                            <div className="text-center py-10 text-gray-500">No submissions found.</div>
                                        ) : (
                                            submissionsPag.paginate(filteredSubmissions).map(sub => (
                                                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 hover:bg-white/5 transition-colors gap-4">
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                                                                sub.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                                                sub.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                                sub.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                                                                'bg-yellow-500/20 text-yellow-400'
                                                            }`}>
                                                                {sub.status}
                                                            </span>
                                                            {sub.ranking_boosted_at && <span className="text-[10px] bg-green-500 text-black px-1.5 py-0.5 rounded font-bold animate-pulse">Rising</span>}
                                                            {sub.status === 'accepted' && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold" title="Tracking link clicks">
                                                                    {(sub.clicks ?? 0).toLocaleString()} clicks
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-white font-bold truncate">{sub.song_title}</span>
                                                        <span className="text-sm text-gray-400 truncate">By {sub.artist?.full_name || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex flex-col text-left sm:text-right text-xs gap-1 opacity-70">
                                                        <span>Playlist: <strong className="text-white">{sub.playlist?.name}</strong></span>
                                                        <span>Curator: {sub.playlist?.curator?.full_name || 'Unknown'}</span>
                                                        <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center justify-start sm:justify-end gap-2 shrink-0">
                                                        {sub.status !== 'declined' && sub.status !== 'archived' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-2 border-white/10 hover:border-green-500/50 hover:text-green-400"
                                                            onClick={() => { setFeaturedEmailSub(sub); setFeaturedEmailCategory("artist-of-the-week"); }}
                                                            title="Send featured questionnaire email"
                                                        >
                                                            <Send className="w-3.5 h-3.5" /> Featured
                                                        </Button>
                                                        )}
                                                        {sub.status === 'accepted' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className={`h-8 gap-2 font-bold ${sub.ranking_boosted_at ? 'bg-green-600 border-green-500 text-white hover:bg-green-700' : 'border-white/10 hover:border-green-500/50 hover:text-green-400'}`}
                                                                onClick={() => toggleRankingBoost(sub.id)}
                                                                title={sub.ranking_boosted_at ? "Remove Boost" : "Boost Ranking"}
                                                            >
                                                                <Zap className="w-3.5 h-3.5" /> Zap
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <PaginationControls page={submissionsPag.page} totalPages={submissionsPag.totalPages} start={submissionsPag.start} end={submissionsPag.end} total={filteredSubmissions.length} onPageChange={submissionsPag.setPage} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* INBOX VIEW */}
                    {activeTab === "inbox" && (
                        <div className="animate-in fade-in duration-300">
                            <AdminInbox />
                        </div>
                    )}
                </main>
            </div>

            <AdminBottomNav
                activeTab={activeTab}
                playlistTab={playlistTab}
                counts={navCounts}
                onNavigate={navigate}
                onOpenMore={() => setShowMoreSheet(true)}
            />

            <AdminMoreSheet
                open={showMoreSheet}
                counts={navCounts}
                activeTab={activeTab}
                playlistTab={playlistTab}
                onNavigate={navigate}
                onClose={() => setShowMoreSheet(false)}
                onTestWebhook={handleTestWebhook}
                onLogout={logout}
            />

            {/* CHAT MODAL */}
            {showChat && activeTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-2xl mx-4 h-[85vh] max-h-[600px] flex flex-col rounded-xl shadow-2xl">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-white text-lg">{activeTicket?.subject}</h3>
                                <p className="text-sm text-gray-400">Chat with {activeTicket?.user_name}</p>
                            </div>
                            <div className="flex gap-2">
                                {activeTicket?.status === 'open' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                        onClick={async () => {
                                            if (!activeTicket) return;
                                            const { error } = await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', activeTicket.id);
                                            if (!error) {
                                                toast("Ticket closed.", "success");
                                                setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: 'closed' } : t));
                                                setActiveTicket(prev => prev ? { ...prev, status: 'closed' } : null);
                                                setShowChat(false);
                                            }
                                        }}
                                    >
                                        Close Ticket
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}><XCircle className="w-6 h-6 text-gray-400" /></Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                            {chatMessages.length === 0 && (
                                <div className="text-center text-gray-500 mt-10">No messages yet. Start the conversation.</div>
                            )}
                            {chatMessages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-xl ${msg.is_admin ? 'bg-green-600 text-white' : 'bg-zinc-800 text-gray-200'}`}>
                                        <p className="text-sm">{msg.message}</p>
                                        <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/10 bg-zinc-900 rounded-b-xl flex gap-2">
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                className="bg-zinc-800 border-zinc-700 text-white"
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <Button className="bg-green-600 hover:bg-green-700" onClick={sendMessage} disabled={sendingMsg}>
                                <MessageSquare className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD USER MODAL */}
            {showAddUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md mx-4 p-6 rounded-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-white">Add New User</h3>
                        <p className="text-sm text-gray-400">Create a login for a new user. They can sign in immediately.</p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Doe" className="bg-zinc-800 border-zinc-700" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                                <Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="john@example.com" className="bg-zinc-800 border-zinc-700" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Temporary Password</label>
                                <Input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Min. 6 characters" className="bg-zinc-800 border-zinc-700" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Role</label>
                                <div className="flex gap-2">
                                    {(['artist', 'curator', 'admin'] as const).map(r => (
                                        <div
                                            key={r}
                                            className={`px-3 py-1.5 rounded cursor-pointer border ${newRole === r ? 'bg-green-600 border-green-500 text-white' : 'bg-zinc-800 border-zinc-700 text-gray-400'}`}
                                            onClick={() => setNewRole(r)}
                                        >
                                            <span className="capitalize text-xs font-bold">{r}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowAddUser(false)}>Cancel</Button>
                            <Button className="bg-green-600" onClick={handleAddUser} disabled={isAddingUser}>
                                {isAddingUser ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PLAYLIST MODAL */}
            {showEditPlaylist && adminEditingPlaylist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md mx-4 p-6 rounded-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-white">Edit Playlist</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Playlist Name</label>
                                <Input value={adminNewName} onChange={e => setAdminNewName(e.target.value)} className="bg-zinc-800 border-zinc-700" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Followers</label>
                                <Input type="number" value={adminNewFollowers} onChange={e => setAdminNewFollowers(parseInt(e.target.value))} className="bg-zinc-800 border-zinc-700" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={() => setShowEditPlaylist(false)}>Cancel</Button>
                            <Button className="bg-green-600" onClick={async () => {
                                setAdminIsSaving(true);
                                const { error: saveError } = await supabase.from('playlists').update({
                                    name: adminNewName,
                                    followers: adminNewFollowers
                                }).eq('id', adminEditingPlaylist.id);
                                setAdminIsSaving(false);
                                setShowEditPlaylist(false);
                                // Update local state instead of reload
                                if (!saveError) {
                                    setAllPlaylists(function(prev) {
                                        return prev.map(function(p) {
                                            if (p.id === adminEditingPlaylist.id) {
                                                return Object.assign({}, p, { name: adminNewName, followers: adminNewFollowers });
                                            }
                                            return p;
                                        });
                                    });
                                    toast("Playlist updated!", "success");
                                } else {
                                    toast("Error: " + saveError.message, "error");
                                }
                            }} disabled={adminIsSaving}>
                                {adminIsSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* SONG PREVIEW MODAL (Spotify 30s embed) */}
            {previewSong && (() => {
                const embed = spotifyEmbedUrl(previewSong.song_link);
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setPreviewSong(null)}>
                        <div className="w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                            <p className="text-white font-bold mb-1 truncate">{previewSong.song_title || "Untitled Track"}</p>
                            <p className="text-xs text-gray-400 mb-3 truncate">{previewSong.artist?.full_name || "Unknown Artist"}</p>
                            {embed ? (
                                <iframe src={embed} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-xl" title="Song preview" />
                            ) : (
                                <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 text-center">
                                    <p className="text-gray-400 text-sm mb-3">No playable preview for this link.</p>
                                    <a href={previewSong.song_link} target="_blank" rel="noopener noreferrer" className="text-green-400 text-sm font-bold underline">Open in Spotify</a>
                                </div>
                            )}
                            <div className="flex justify-end mt-3">
                                <Button variant="ghost" onClick={() => setPreviewSong(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* SEND FEATURED EMAIL MODAL */}
            {featuredEmailSub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md mx-4 p-6 rounded-lg space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-white">Send featured email</h3>
                        <p className="text-sm text-gray-400">
                            To <strong className="text-white">{featuredEmailSub.artist?.full_name || "Unknown"}</strong>
                            {featuredEmailSub.artist?.email ? ` (${featuredEmailSub.artist.email})` : " (no email on file)"}
                            {" "}for &ldquo;{featuredEmailSub.song_title}&rdquo;. A branded questionnaire email will be sent, and a featured draft will be created if one does not exist yet.
                        </p>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 mb-1 block">Category</label>
                            {[
                                { value: "artist-of-the-week", label: "Artist of the Week" },
                                { value: "rising-artist", label: "Rising Artist" },
                                { value: "artist-of-the-season", label: "Artist of the Season" },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFeaturedEmailCategory(opt.value as typeof featuredEmailCategory)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${featuredEmailCategory === opt.value ? "border-green-500 bg-green-500/10 text-white" : "border-white/10 text-gray-300 hover:border-white/30"}`}
                                >
                                    <span className="font-bold">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={() => setFeaturedEmailSub(null)}>Cancel</Button>
                            <Button className="bg-green-600" onClick={sendFeaturedEmail} disabled={sendingFeaturedEmail || !featuredEmailSub.artist?.email}>
                                {sendingFeaturedEmail ? "Sending..." : "Send email"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD PLAYLIST MODAL */}
            {showAddPlaylist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 rounded-lg space-y-6">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-green-500" /> Add Team Playlist
                            </h3>
                            <button onClick={() => setShowAddPlaylist(false)} className="text-gray-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>

                        {!fetchedPlaylistInfo ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400">Enter a Playlist URL (Spotify, Apple Music, Audiomack, etc.)</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://..."
                                        value={newPlaylistLink}
                                        onChange={(e) => setNewPlaylistLink(e.target.value)}
                                        className="bg-black/50 border-white/10"
                                    />
                                    <Button onClick={fetchPlaylistInfo} disabled={isFetchingInfo || !newPlaylistLink}>
                                        {isFetchingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-gray-500">Note: Only Spotify links will auto-fill details. Others require manual entry.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-3">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-zinc-800 rounded flex-shrink-0 overflow-hidden relative group">
                                            {fetchedPlaylistInfo.coverImage ? (
                                                <img src={fetchedPlaylistInfo.coverImage} className="w-full h-full object-cover" alt="Cover" />
                                            ) : (
                                                <Music className="w-8 h-8 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <label className="text-[10px] text-gray-400 uppercase font-bold">Name</label>
                                                <Input
                                                    value={fetchedPlaylistInfo.name}
                                                    onChange={e => setFetchedPlaylistInfo({ ...fetchedPlaylistInfo, name: e.target.value })}
                                                    className="bg-black/20 border-white/10 h-8 text-sm"
                                                    placeholder="Playlist Name"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase font-bold">Followers</label>
                                            <Input
                                                type="number"
                                                value={fetchedPlaylistInfo.followers}
                                                onChange={e => setFetchedPlaylistInfo({ ...fetchedPlaylistInfo, followers: parseInt(e.target.value) || 0 })}
                                                className="bg-black/20 border-white/10 h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase font-bold">Cover Image URL</label>
                                            <Input
                                                value={fetchedPlaylistInfo.coverImage || ""}
                                                onChange={e => setFetchedPlaylistInfo({ ...fetchedPlaylistInfo, coverImage: e.target.value })}
                                                className="bg-black/20 border-white/10 h-8 text-sm"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-2 block">Playlist Tier</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['standard', 'express', 'exclusive', 'free'] as const).map(t => (
                                                <div
                                                    key={t}
                                                    onClick={() => setNewPlaylistType(t)}
                                                    className={`cursor-pointer border rounded p-2 text-center transition-all ${newPlaylistType === t
                                                        ? 'bg-green-600 border-green-500 text-white'
                                                        : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                                                >
                                                    <span className="block text-xs font-bold capitalize">{t}</span>
                                                    <span className="block text-[10px] opacity-70">{pricingConfig.currency}{pricingConfig.tiers[t].price.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded text-xs text-green-400">
                                    This playlist will be added to <strong>AfroPitch Team Playlists</strong> category.
                                </div>
                                <Button className="w-full bg-green-600 hover:bg-green-700 font-bold" onClick={addPlaylist} disabled={isSavingPlaylist || !fetchedPlaylistInfo.name}>
                                    {isSavingPlaylist ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Adding...</> : "Confirm & Add Playlist"}
                                </Button>
                                <Button variant="ghost" className="w-full text-gray-400 hover:text-white" onClick={() => setFetchedPlaylistInfo(null)}>
                                    Back to Search
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* APPLICATION DETAILS MODAL */}
            {viewApplication && (() => {
                const { kind, data: d } = viewApplication;
                let docs: any = null;
                if (kind === 'curator' && d.verification_docs) {
                    try { docs = JSON.parse(d.verification_docs); } catch { docs = null; }
                }
                const rows: [string, React.ReactNode][] = kind === 'curator' ? [
                    ["Name", d.full_name || "—"],
                    ["Email", d.email || "—"],
                    ["Status", d.verification_status || "—"],
                    ["Bank", d.bank_name ? `${d.bank_name} · ${d.account_number || "N/A"}${d.account_name ? ` (${d.account_name})` : ""}` : "Not set"],
                    ["NIN", d.nin_number || "—"],
                    ["Portfolio", docs?.portfolio || "—"],
                    ["Experience", docs?.experience ? `${docs.experience} yrs` : "—"],
                    ["Genres", docs?.genres || "—"],
                    ["Phone", docs?.phone || "—"],
                    ["Why curate", docs?.reason || "—"],
                    ["ID document", docs?.id_document || "—"],
                    ["Raw application data", docs ? null : (d.verification_docs || "—")],
                ] : [
                    ["Name", d.name || "—"],
                    ["Email", d.email || "—"],
                    ["Bio", d.bio ? `"${d.bio}"` : "—"],
                    ["Playlist", d.playlist_link ? <a key="pl" href={d.playlist_link} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline break-all">{d.playlist_link}</a> : "—"],
                    ["Socials", d.social_links ? Object.entries(d.social_links).map(([k, v]) => v ? `${k}: ${v}` : "").filter(Boolean).join(" · ") || "—" : "—"],
                    ["Applied", d.created_at ? new Date(d.created_at).toLocaleString() : "—"],
                    ["Status", d.status || "pending"],
                ];
                const doApprove = () => {
                    if (kind === 'curator') handleCuratorAction(d.id, 'verified');
                    else handleExternalAppAction(d.id, 'approved');
                    setViewApplication(null);
                };
                const doReject = () => {
                    if (kind === 'curator') handleCuratorAction(d.id, 'rejected');
                    else handleExternalAppAction(d.id, 'rejected');
                    setViewApplication(null);
                };
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4" onClick={() => setViewApplication(null)}>
                        <div className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-white/10">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-blue-400" />
                                    {kind === 'curator' ? "Curator Verification Request" : "External Curator Application"}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">{d.full_name || d.name} · {d.email}</p>
                            </div>
                            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                                {rows.filter(([, v]) => v !== null).map(([label, value]) => (
                                    <div key={label} className="flex flex-col sm:flex-row sm:gap-3 text-sm">
                                        <span className="text-gray-500 sm:w-36 shrink-0 font-medium">{label}</span>
                                        <span className="text-gray-200 break-words">{value}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setViewApplication(null)}>Close</Button>
                                <Button variant="destructive" onClick={doReject}>
                                    <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={doApprove}>
                                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* TOP UP MODAL */}
            {showTopUp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-sm p-6 rounded-lg space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-green-500" /> Top Up Wallet
                        </h3>
                        <p className="text-sm text-gray-400">Add funds to <strong>{showTopUp.full_name}</strong>'s wallet.</p>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Amount ({pricingConfig.currency})</label>
                            <Input
                                type="number"
                                value={fundingAmount}
                                onChange={e => setFundingAmount(e.target.value)}
                                placeholder="0.00"
                                className="bg-zinc-800 border-zinc-700 text-lg font-bold text-green-400"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => { setShowTopUp(null); setFundingAmount(""); }}>Cancel</Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleTopUp} disabled={adminIsProcessing}>
                                {adminIsProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Top Up"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MESSAGE USER MODAL */}
            {messageUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md p-4">
                        <AdminMessageForm
                            userId={messageUser.id}
                            userEmail={messageUser.email}
                            userName={messageUser.full_name}
                            onClose={() => setMessageUser(null)}
                        />
                    </div>
                </div>
            )}

            {/* CUSTOM EMAIL MODAL */}
            {showCustomEmail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-2xl p-4">
                        <CustomEmailForm onClose={() => setShowCustomEmail(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
