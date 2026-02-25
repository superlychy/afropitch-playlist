"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, CreditCard, History, Settings, HelpCircle, Send, LogOut, XCircle, ChevronLeft, Bell } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Copy, ExternalLink, BarChart3, TrendingUp, AlertCircle, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";

import { TransactionsList } from "@/components/TransactionsList";

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), { ssr: false });

// Type for fetched submissions
interface Submission {
    id: string;
    song_title: string;
    status: string;
    amount_paid: number;
    created_at: string;
    clicks: number;
    tracking_slug: string | null;
    ranking_boosted_at: string | null;
    feedback: string | null;
    playlist: {
        name: string;
        curator: {
            full_name: string;
        } | null;
    } | null;
}

export default function ArtistDashboard() {
    const { user, loadFunds, isLoading, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [amount, setAmount] = useState("");
    // useRef always holds the latest amount — fixes stale closure bug in Paystack callback
    const amountRef = useRef("");
    const userRef = useRef(user);

    // Keep refs in sync
    useEffect(() => { amountRef.current = amount; }, [amount]);
    useEffect(() => { userRef.current = user; }, [user]);

    // Locked amount: captured the moment Pay is clicked, so it can't go stale
    const [lockedAmount, setLockedAmount] = useState(0);

    // Force sync on mount - removed to prevent infinite loop
    /* useEffect(() => {
        if (user) {
            refreshUser();
        }
    }, [user]); */

    // Profile Modal State
    const [showProfile, setShowProfile] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profileBio, setProfileBio] = useState("");
    const [profileIg, setProfileIg] = useState("");
    const [profileTwitter, setProfileTwitter] = useState("");
    const [profileWeb, setProfileWeb] = useState("");

    // Security State
    const [profilePassword, setProfilePassword] = useState("");
    const [profileConfirmPassword, setProfileConfirmPassword] = useState("");

    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Support Modal State
    const [showSupport, setShowSupport] = useState(false);
    const [supportView, setSupportView] = useState<'list' | 'create' | 'chat'>('list');
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");

    const [supportSubject, setSupportSubject] = useState("");
    const [supportMessage, setSupportMessage] = useState("");
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    // Real Data State
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(true);

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);

    const toggleNotification = (id: string) => {
        setExpandedNotificationId(prev => prev === id ? null : id);
    };

    useEffect(() => {
        if (user) {
            setProfileName(user.name || "");
            setProfileEmail(user.email || "");
            setProfileBio(user.bio || "");
            setProfileIg(user.instagram || "");
            setProfileTwitter(user.twitter || "");
            setProfileWeb(user.website || "");

            fetchSubmissions();
            fetchNotifications();
        }
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;

        // Build query
        let query = supabase
            .from('broadcasts')
            .select('*')
            .or('target_role.eq.all,target_role.is.null,target_role.eq.artist');

        // Filter by user creation date if available (don't show old news)
        if (user.created_at) {
            query = query.gt('created_at', user.created_at);
        }

        const { data } = await query
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setNotifications(data);
    };

    const fetchSubmissions = async () => {
        if (!user) return;

        // Only show loading spinner on initial load (if we have no data yet)
        if (submissions.length === 0) {
            setLoadingSubmissions(true);
        }

        // Fetch submissions with playlist details
        const { data, error } = await supabase
            .from('submissions')
            .select(`
                *,
                playlist:playlists (
                    name,
                    curator:profiles (
                        full_name
                    )
                )
            `)
            .eq('artist_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching submissions:", error);
        } else {
            setSubmissions(data as any);
        }

        setLoadingSubmissions(false);
    };

    const handleUpdateProfile = async () => {
        if (!user) return;
        setIsUpdatingProfile(true);

        // 1. Validation
        if (profilePassword && profilePassword !== profileConfirmPassword) {
            alert("Passwords do not match!");
            setIsUpdatingProfile(false);
            return;
        }

        // 2. Auth Update (Email / Password)
        const updates: any = {};
        if (profileEmail && profileEmail !== user.email) updates.email = profileEmail;
        if (profilePassword) updates.password = profilePassword;

        if (Object.keys(updates).length > 0) {
            const { error: authError } = await supabase.auth.updateUser(updates);
            if (authError) {
                alert("Auth Error: " + authError.message);
                setIsUpdatingProfile(false);
                return;
            }
            if (updates.email) alert("Confirmation email sent to new address. Please verify.");
        }

        // 3. Profile Update
        const { error } = await supabase.from('profiles').update({
            full_name: profileName,
            bio: profileBio,
            instagram: profileIg,
            twitter: profileTwitter,
            website: profileWeb
        }).eq('id', user.id);

        if (error) {
            alert("Error updating profile: " + error.message);
        } else {
            alert("Profile settings saved!");
            setShowProfile(false);
            setProfilePassword("");
            setProfileConfirmPassword("");
        }
        setIsUpdatingProfile(false);
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

        const { data } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

        if (data) setChatMessages(data);
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
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (!user) return null;

    const handlePaymentSuccess = useCallback(async (reference: any) => {
        // Read from refs — always has the latest values, never stale
        const currentUser = userRef.current;
        const rawAmount = amountRef.current;
        const val = parseInt(rawAmount);

        if (!currentUser?.id || val <= 0) {
            console.error("handlePaymentSuccess: missing user or amount", { currentUser, rawAmount, reference });
            alert("Payment received but could not credit account — missing user session. Please contact support.");
            return;
        }

        let paystackRef = "";
        if (typeof reference === 'string') {
            paystackRef = reference;
        } else if (reference && typeof reference === 'object') {
            paystackRef = reference.reference || reference.trxref || reference.transaction || `manual_ref_${Date.now()}`;
        } else {
            paystackRef = `manual_ref_${Date.now()}`;
        }

        console.log("✅ Payment success. User:", currentUser.id, "Amount:", val, "Ref:", paystackRef);

        const { data: result, error } = await supabase.rpc('process_deposit', {
            p_user_id: currentUser.id,
            p_amount: val,
            p_reference: paystackRef,
            p_description: `Wallet Deposit: ${paystackRef}`
        });

        if (error) {
            console.error("process_deposit RPC error:", error);
            alert(`Payment received but failed to credit account. Reference: ${paystackRef}. Contact support.`);
            return;
        }

        if (result?.success === false) {
            alert("Your payment has already been processed. Refreshing your balance...");
        } else {
            alert(`✅ ₦${val.toLocaleString()} successfully loaded to your wallet!`);
        }

        // Always sync balance from DB — most reliable source
        await refreshUser();
        setAmount("");
        setLockedAmount(0);
    }, [refreshUser]);


    return (
        <div className="container mx-auto px-4 max-w-5xl py-12 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Artist Dashboard</h1>
                    <p className="text-gray-400">Welcome back, <span className="text-green-500">{user.name || 'Artist'}</span>. Manage your budget and track submissions.</p>
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

            {/* Notifications */}
            {
                submissions.some(s => s.ranking_boosted_at) && (
                    <div className="mb-8 w-full bg-gradient-to-r from-green-900/50 to-green-600/20 border border-green-500/30 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-4">
                        <div className="bg-green-500 p-2 rounded-full mt-1 shrink-0 animate-pulse">
                            <TrendingUp className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Your Music is Rising!</h3>
                            <p className="text-gray-300 text-sm">
                                Curators have flagged your song as a top performer.
                                <span className="block mt-1 text-green-400 font-bold">
                                    Share your playlist links and follow us on Spotify to keep the momentum going!
                                </span>
                            </p>
                        </div>
                    </div>
                )
            }

            <div className="grid grid-cols-1 mb-8">
                {/* Submit New Music CTA */}
                <Card className="bg-gradient-to-br from-green-900/40 to-black border-green-500/30">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Submit New Music</h2>
                            <p className="text-gray-400">Get your tracks on top playlists and reach millions of listeners.</p>
                        </div>
                        <Button size="lg" className="bg-green-600 hover:bg-green-700 font-bold text-lg px-8 py-6 shadow-lg shadow-green-900/20" onClick={() => router.push("/submit")}>
                            Start Campaign
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Submissions */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-gray-400" /> Recent Submissions</h2>
                    {loadingSubmissions ? (
                        <p className="text-gray-500">Loading submissions...</p>
                    ) : submissions.length === 0 ? (
                        <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
                            <p className="text-gray-400">No submissions yet.</p>
                            <Button variant="link" className="text-green-500" onClick={() => router.push('/submit')}>Create your first campaign</Button>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {submissions.map(sub => (
                                <div key={sub.id} className="bg-white/5 border border-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-black/30 w-12 h-12 rounded flex items-center justify-center text-white/20 font-bold">
                                            <TrendingUp className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{sub.song_title}</h4>
                                            <p className="text-xs text-gray-400">Playlist: {sub.playlist?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] uppercase font-bold mb-1 ${sub.status === 'accepted' ? 'bg-green-500/20 text-green-500' :
                                            sub.status === 'declined' || sub.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                                'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                            {sub.status}
                                        </span>
                                        <p className="text-sm font-bold text-white mb-2">{pricingConfig.currency}{sub.amount_paid}</p>

                                        {sub.status === 'accepted' && (
                                            <div className="flex flex-col items-end gap-2 animate-in fade-in mt-2 w-full max-w-[320px] ml-auto">
                                                <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded p-4 text-left space-y-4 w-full shadow-lg shadow-green-900/10">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                                                            <TrendingUp className="w-3 h-3" /> Viral Tracker
                                                        </p>
                                                        <span className="text-xs font-bold text-white bg-green-500/20 px-2 py-0.5 rounded-full ring-1 ring-green-500/50">
                                                            {sub.clicks || 0} Clicks
                                                        </span>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                                            <span>Progress to Trending</span>
                                                            <span>{Math.min(sub.clicks || 0, 100)}/100</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000 relative"
                                                                style={{ width: `${Math.min(((sub.clicks || 0) / 100) * 100, 100)}%` }}
                                                            >
                                                                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 italic text-right">Update every 5 mins</p>
                                                    </div>

                                                    <div className="p-3 bg-black/40 rounded border border-white/5 space-y-2">
                                                        <p className="text-[11px] text-gray-300 leading-tight flex gap-2">
                                                            <Star className="w-4 h-4 flex-shrink-0 text-yellow-500 fill-yellow-500 animate-pulse" />
                                                            <span>
                                                                <span className="text-white font-bold">Challenge:</span> Share this unique link! Get 100 clicks to unlock "Local Trending" status.
                                                            </span>
                                                        </p>
                                                    </div>

                                                    <div className="pt-2 flex items-center gap-2">
                                                        <div className="flex-1 bg-black/60 rounded px-3 py-2 text-[10px] text-gray-400 truncate select-all border border-white/5 font-mono">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/track/${sub.tracking_slug}` : `/track/${sub.tracking_slug}`}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8 border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                                                                onClick={async () => {
                                                                    const url = `${window.location.origin}/track/${sub.tracking_slug}`;
                                                                    await navigator.clipboard.writeText(url);
                                                                    alert("Tracker Link copied! Share it now.");
                                                                }}
                                                                title="Copy Link"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8 border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                                                                onClick={async () => {
                                                                    const url = `${window.location.origin}/track/${sub.tracking_slug}`;
                                                                    if (navigator.share) {
                                                                        try {
                                                                            await navigator.share({
                                                                                title: 'Listen to my song on AfroPitch!',
                                                                                text: 'Help me trend! Click to play my new track on the playlist.',
                                                                                url: url
                                                                            });
                                                                        } catch (err) {
                                                                            console.error("Share failed", err);
                                                                        }
                                                                    } else {
                                                                        await navigator.clipboard.writeText(url);
                                                                        alert("Link copied!");
                                                                    }
                                                                }}
                                                                title="Share"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {(sub.status === 'declined' || sub.status === 'rejected') && sub.feedback && (
                                            <div className="mt-2 p-2 bg-red-900/20 border border-red-500/20 rounded max-w-[200px] ml-auto">
                                                <p className="text-[10px] text-red-200 text-left">
                                                    <span className="font-bold block text-red-400 mb-1">Reason:</span>
                                                    {sub.feedback}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Wallet & History */}
                <div className="space-y-6">
                    {/* Integrated Wallet Card */}
                    <Card className="bg-zinc-900 border-white/10 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-900/40 to-black p-6 border-b border-green-500/10">
                            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-green-500" /> Available Balance
                            </h3>
                            <div className="text-3xl font-bold text-white tracking-tight">
                                {pricingConfig.currency}{user.balance.toLocaleString()}
                            </div>
                        </div>
                        <CardContent className="p-6">
                            <h4 className="text-sm font-medium text-gray-300 mb-3">Load Credits</h4>
                            <div className="space-y-3">
                                <Input
                                    type="number"
                                    placeholder="Amount (NGN)"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-black/40 border-white/10 text-white"
                                />
                                {parseInt(amount) > 0 ? (
                                    <PayWithPaystack
                                        email={user.email}
                                        amount={(lockedAmount || parseInt(amount)) * 100}
                                        userId={user.id}
                                        onSuccess={handlePaymentSuccess}
                                        onClose={() => setLockedAmount(0)}
                                    />
                                ) : (
                                    <Button className="w-full bg-white/5 text-gray-500 cursor-not-allowed hover:bg-white/5">Enter Amount</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-gray-400" /> Recent Transactions</h2>
                            {/* View All logic to be implemented fully later or simple routing */}
                        </div>
                        <TransactionsList userId={user.id} />
                    </div>
                </div>
            </div>
            {
                showSupport && (
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
                                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] p-3 rounded-xl text-sm ${isMe ? 'bg-green-600 text-white rounded-br-none' : 'bg-zinc-700 text-gray-200 rounded-bl-none'}`}>
                                                            <p>{msg.message}</p>
                                                            <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

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
                )
            }

            {/* Profile Modal */}
            {
                showProfile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className=" bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
                            <h3 className="font-bold text-white text-lg">Artist Profile</h3>
                            <div className="space-y-2">
                                <Label>Bio / Pitch</Label>
                                <Textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="Short bio for curators..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Instagram</Label>
                                    <Input value={profileIg} onChange={e => setProfileIg(e.target.value)} placeholder="@username" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Twitter</Label>
                                    <Input value={profileTwitter} onChange={e => setProfileTwitter(e.target.value)} placeholder="@username" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Website / EPK</Label>
                                <Input value={profileWeb} onChange={e => setProfileWeb(e.target.value)} placeholder="https://" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setShowProfile(false)}>Cancel</Button>
                                <Button className="bg-green-600" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>Save Profile</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Notifications Modal */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 rounded-lg space-y-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-yellow-500" /> Updates</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}><XCircle className="w-6 h-6" /></Button>
                        </div>
                        <div className="space-y-4">
                            {notifications.length === 0 && (
                                <div className="bg-white/5 p-4 rounded border border-white/5">
                                    <h4 className="font-bold text-white mb-1">👋 Welcome to AfroPitch!</h4>
                                    <p className="text-sm text-gray-400 mb-2">
                                        We're excited to have you here. Start by browsing playlists and submitting your first track.
                                    </p>
                                    <p className="text-[10px] text-gray-600">Just now</p>
                                </div>
                            )}

                            {notifications.map((n, i) => {
                                const isExpanded = expandedNotificationId === n.id;
                                return (
                                    <div
                                        key={n.id || i}
                                        className="bg-white/5 p-4 rounded border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                        onClick={() => toggleNotification(n.id)}
                                    >
                                        <h4 className="font-bold text-white mb-1 flex justify-between items-start">
                                            <span>{n.subject}</span>
                                            <span className="text-[10px] text-gray-500 font-normal ml-2 shrink-0 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{isExpanded ? 'Collapse' : 'Read'}</span>
                                        </h4>
                                        <div className={`text-sm text-gray-400 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {n.message ? n.message.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : ''}
                                        </div>
                                        <p className="text-[10px] text-gray-600 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* End of Main Content */}
        </div >
    );
}
