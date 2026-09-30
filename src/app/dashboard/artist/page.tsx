"use client";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wallet, Plus, Settings, HelpCircle, Send, LogOut, XCircle, ChevronLeft, Bell,
  Home, Link2, User, TrendingUp, AlertCircle, AudioWaveform,
  Music2, Users, Search,
} from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import { TransactionsList } from "@/components/TransactionsList";
import { ArtistMixingOrders } from "@/components/ArtistMixingOrders";
import { ReferralCard } from "@/components/ReferralCard";
import { CoverArt } from "@/components/dashboards/artist/CoverArt";
import { SmartLinkCard } from "@/components/dashboards/artist/SmartLinkCard";

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), { ssr: false });

interface Submission {
  id: string;
  song_title: string;
  status: string;
  amount_paid: number;
  created_at: string;
  clicks: number | null;
  tracking_slug: string | null;
  ranking_boosted_at: string | null;
  feedback: string | null;
  cover_art_url: string | null;
  apple_music_url: string | null;
  audiomack_url: string | null;
  boomplay_url: string | null;
  playlist: {
    name: string;
    curator: { full_name: string } | null;
  } | null;
}

export default function ArtistDashboard() {
  const { user, deductFunds, isLoading, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const amountRef = useRef("");
  const userRef = useRef(user);

  // Update userRef whenever user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const paystackLockRef = useRef(false); // Prevent double-pay

  useEffect(() => { amountRef.current = amount; }, [amount]);
  useEffect(() => { userRef.current = user; }, [user]);

  const [lockedAmount, setLockedAmount] = useState(0);

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileIg, setProfileIg] = useState("");
  const [profileTwitter, setProfileTwitter] = useState("");
  const [profileWeb, setProfileWeb] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Withdraw State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Support Modal State
  const [showSupport, setShowSupport] = useState(false);
  const [supportView, setSupportView] = useState<"list" | "create" | "chat">("list");
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

  // Per-platform smart-link click stats, fetched once (not once per card).
  const [linkStats, setLinkStats] = useState<Record<string, Record<string, number>>>({});

  // Desktop search
  const [searchQuery, setSearchQuery] = useState("");

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);

  const toggleNotification = (id: string) => {
    setExpandedNotificationId((prev) => (prev === id ? null : id));
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
      fetchLinkStats();
      fetchNotifications();
      fetchBankDetails();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBankDetails = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("bank_name, account_number, account_name")
      .eq("id", user.id)
      .single();
    if (data) {
      setBankName(data.bank_name || "");
      setAccountNumber(data.account_number || "");
      setAccountName(data.account_name || "");
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;
    setIsWithdrawing(true);
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount <= 0) {
      toast("Please enter a valid amount.", "error");
      setIsWithdrawing(false);
      return;
    }

    if (!withdrawReason.trim()) {
      toast("Please provide a reason for the withdrawal.", "error");
      setIsWithdrawing(false);
      return;
    }

    if (amount > user.balance) {
      toast("Insufficient funds.", "error");
      setIsWithdrawing(false);
      return;
    }

    const { data, error } = await supabase.rpc("request_payout", {
      p_user_id: user.id,
      p_amount: amount,
      p_bank_name: bankName,
      p_account_number: accountNumber,
      p_account_name: accountName,
      p_reason: withdrawReason,
    });

    if (error) {
      console.error("Payout RPC Error:", error);
      toast("Unable to process payout. Please try again or contact support.", "error");
    } else if (data && !data.success) {
      toast("Payout Failed: " + data.message, "error");
    } else {
      toast("Withdrawal requested! Processing within 1-24 hours.", "success");
      if (deductFunds) deductFunds(amount);
      setShowWithdraw(false);
      setWithdrawAmount("");
      setWithdrawReason("");
    }
    setIsWithdrawing(false);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    let query = supabase
      .from("broadcasts")
      .select("*")
      .or("target_role.eq.all,target_role.is.null,target_role.eq.artist");

    if (user.created_at) {
      query = query.gt("created_at", user.created_at);
    }

    const { data } = await query.order("created_at", { ascending: false }).limit(20);
    if (data) setNotifications(data);
  };

  const fetchSubmissions = async () => {
    if (!user) return;
    if (submissions.length === 0) setLoadingSubmissions(true);

    const { data, error } = await supabase
      .from("submissions")
      .select(`*, playlist:playlists (name, curator:profiles (full_name))`)
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
    } else {
      setSubmissions((data as unknown as Submission[]) || []);
    }
    setLoadingSubmissions(false);
  };

  const fetchLinkStats = async () => {
    const { data } = await supabase.rpc("get_my_link_stats");
    if (data) {
      const grouped: Record<string, Record<string, number>> = {};
      for (const row of data as { submission_id: string; platform: string; clicks: number }[]) {
        if (!grouped[row.submission_id]) grouped[row.submission_id] = {};
        grouped[row.submission_id][row.platform] = Number(row.clicks);
      }
      setLinkStats(grouped);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileName,
        bio: profileBio,
        instagram: profileIg,
        twitter: profileTwitter,
        website: profileWeb,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      })
      .eq("id", user.id);

    if (error) {
      toast("Error updating profile: " + error.message, "error");
    } else {
      toast("Profile saved!", "success");
      setShowProfile(false);
    }
    setIsUpdatingProfile(false);
  };

  // Support Functions
  useEffect(() => {
    if (showSupport && user) fetchTickets();
  }, [showSupport, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setSupportTickets(data);
  };

  const createTicket = async () => {
    if (!user || !supportSubject || !supportMessage) return;
    setIsSubmittingTicket(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({ user_id: user.id, subject: supportSubject, message: supportMessage, status: "open" })
        .select()
        .single();

      if (error) {
        toast("Error creating ticket: " + error.message, "error");
        return;
      }

      if (ticket) {
        await supabase.from("support_messages").insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: supportMessage,
        });
        toast("Support ticket created!", "success");
        setSupportSubject("");
        setSupportMessage("");
        setSupportView("list");
        fetchTickets();
      }
    } catch (err: any) {
      toast("An unexpected error occurred", "error");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const openTicketChat = async (ticket: any) => {
    setActiveTicket(ticket);
    setSupportView("chat");
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    if (data) setChatMessages(data);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !activeTicket || !user) return;
    const text = chatInput;
    setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      { id: Math.random(), ticket_id: activeTicket.id, sender_id: user.id, message: text, created_at: new Date().toISOString() },
    ]);
    await supabase.from("support_messages").insert({
      ticket_id: activeTicket.id,
      sender_id: user.id,
      message: text,
    });
  };

  // ============================================
  // PAYSTACK SUCCESS HANDLER — Atomic server-side
  // ============================================
  const handlePaymentSuccess = useCallback(
    async (reference: any) => {
      // Guard against double-fire
      if (paystackLockRef.current) return;
      paystackLockRef.current = true;

      const currentUser = userRef.current;
      const rawAmount = amountRef.current;
      const val = parseInt(rawAmount);

      if (!currentUser?.id || val <= 0) {
        console.error("Payment callback: missing user or amount", { currentUser, rawAmount, reference });
        toast("Payment received but couldn't credit your account. Contact support.", "error");
        paystackLockRef.current = false;
        return;
      }

      let paystackRef = "";
      if (typeof reference === "string") paystackRef = reference;
      else if (reference && typeof reference === "object")
        paystackRef = reference.reference || reference.trxref || `manual_ref_${Date.now()}`;
      else paystackRef = `manual_ref_${Date.now()}`;

      console.log("✅ Payment success. User:", currentUser.id, "Amount:", val, "Ref:", paystackRef);

      // Verify server-side with Paystack and credit the wallet. The amount
      // credited comes from Paystack's verification, never from the client.
      let result: any = null;
      try {
        const res = await fetch("/api/payment/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: paystackRef }),
        });
        result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) {
          throw new Error(result?.error || `Verification failed (HTTP ${res.status})`);
        }
      } catch (error: any) {
        console.error("Payment verification error:", {
          error: error?.message,
          userId: currentUser.id,
          reference: paystackRef,
          timestamp: new Date().toISOString()
        });

        // Log to system logs for admin review
        await supabase.from("system_logs").insert({
          event_type: "payment_failed",
          event_data: {
            user_id: currentUser.id,
            amount: val,
            reference: paystackRef,
            error: error?.message,
            timestamp: new Date().toISOString()
          }
        });

        toast(`Payment received but failed to credit. Ref: ${paystackRef}. Contact support.`, "error");
        paystackLockRef.current = false;
        return;
      }

      if (result?.alreadyProcessed) {
        toast("This payment was already processed. Refreshing balance...", "warning");
      } else {
        toast(`₦${Number(result?.amount || 0).toLocaleString()} loaded to your wallet! ✅`, "success");
      }

      // Clear the payment form immediately
      setAmount("");
      setLockedAmount(0);

      // Small delay to ensure webhook has processed in the database
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh user balance
      await refreshUser();

      console.log("✅ Payment complete - balance should now show updated amount");

      paystackLockRef.current = false;
    },
    [refreshUser, toast]
  );

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (!user) return null;

  // ---------- Derived display values ----------
  const initials = ((user.name || user.email || "A").trim().slice(0, 2) || "A").toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const acceptedCount = submissions.filter((s) => s.status === "accepted").length;
  const totalTaps = submissions.reduce((n, s) => n + (s.clicks || 0), 0);
  const smartLinkSubs = submissions.filter((s) => s.tracking_slug);
  const topSmartLink = [...smartLinkSubs].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0] || null;
  const smartLinkCopy = (slug: string) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/track/${slug}` : `/track/${slug}`;
    navigator.clipboard.writeText(url);
    toast("Smart link copied!", "success");
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = submissions.filter((s) =>
    q ? s.song_title.toLowerCase().includes(q) || (s.playlist?.name || "").toLowerCase().includes(q) : true
  );

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const pillClass = (status: string) =>
    status === "accepted"
      ? "bg-[#22C55E]/15 text-[#22C55E]"
      : status === "declined" || status === "rejected"
      ? "bg-[#EF4444]/15 text-[#EF4444]"
      : status === "archived"
      ? "bg-white/10 text-zinc-400"
      : "bg-[#EAB308]/15 text-[#EAB308]";

  const subDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const sidebarNav: { label: string; icon: ReactNode; action: () => void; active?: boolean; badge?: number }[] = [
    { label: "Home", icon: <Home className="w-[18px] h-[18px]" />, action: () => window.scrollTo({ top: 0, behavior: "smooth" }), active: true },
    { label: "Submit music", icon: <Music2 className="w-[18px] h-[18px]" />, action: () => router.push("/submit") },
    { label: "Smart links", icon: <Link2 className="w-[18px] h-[18px]" />, action: () => scrollTo("smart-links"), badge: smartLinkSubs.length || undefined },
    { label: "Refer & earn", icon: <Users className="w-[18px] h-[18px]" />, action: () => scrollTo("referral") },
    { label: "Mixing orders", icon: <AudioWaveform className="w-[18px] h-[18px]" />, action: () => scrollTo("mixing") },
    { label: "Wallet", icon: <Wallet className="w-[18px] h-[18px]" />, action: () => scrollTo("wallet") },
    { label: "Support", icon: <HelpCircle className="w-[18px] h-[18px]" />, action: () => setShowSupport(true) },
    { label: "Settings", icon: <Settings className="w-[18px] h-[18px]" />, action: () => setShowProfile(true) },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white" id="top">
      {/* ===== Desktop sidebar (lg+) ===== */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[248px] shrink-0 border-r border-white/[0.08] px-[14px] py-[22px] flex-col gap-1 z-30 bg-[#0A0A0B]">
        <div className="flex items-center gap-2.5 px-2.5 pb-5 font-extrabold text-lg">
          <span className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#22C55E] to-[#0E7A3D] flex items-center justify-center text-[18px] text-[#04120a] font-black">A</span>
          AfroPitch
        </div>
        {sidebarNav.map((n) => (
          <button
            key={n.label}
            onClick={n.action}
            className={`flex items-center gap-3 px-3 py-[11px] rounded-xl text-sm font-semibold w-full text-left transition-colors ${
              n.active ? "bg-[#22C55E]/10 text-[#22C55E]" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {n.icon}
            {n.label}
            {n.badge ? (
              <span className="ml-auto bg-[#22C55E] text-[#04120a] text-[11px] font-extrabold rounded-full px-2 py-[2px]">{n.badge}</span>
            ) : null}
          </button>
        ))}
        <div className="mt-auto">
          <div className="flex items-center gap-2.5 bg-[#141417] border border-white/[0.08] rounded-[14px] p-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#22C55E] to-[#0E7A3D] flex items-center justify-center font-extrabold text-[#04120a] text-[13px] shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <strong className="text-[13px] block truncate">{user.name || "Artist"}</strong>
              <small className="text-zinc-500 text-[11px] block truncate">{user.email}</small>
            </div>
            <button onClick={logout} title="Logout" className="text-zinc-500 hover:text-red-400 p-1.5 shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Mobile topbar (below lg) ===== */}
      <div className="lg:hidden sticky top-0 z-20 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/[0.08] px-4 py-3.5 flex items-center gap-3">
        <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[#22C55E] to-[#0E7A3D] flex items-center justify-center font-extrabold text-[16px] text-[#04120a] shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <small className="text-zinc-500 text-xs block">{greeting}</small>
          <strong className="text-base truncate block">{user.name || "Artist"}</strong>
        </div>
        <button
          onClick={() => setShowNotifications(true)}
          title="Notifications"
          className="w-10 h-10 rounded-xl border border-white/[0.08] bg-[#141417] flex items-center justify-center relative shrink-0"
        >
          <Bell className="w-5 h-5 text-zinc-400" />
          {notifications.length > 0 && <span className="absolute top-[9px] right-[10px] w-2 h-2 rounded-full bg-[#EF4444] border-2 border-[#0A0A0B]" />}
        </button>
        <button
          onClick={() => setShowSupport(true)}
          title="Support"
          className="w-10 h-10 rounded-xl border border-white/[0.08] bg-[#141417] flex items-center justify-center shrink-0"
        >
          <HelpCircle className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* ===== Main column ===== */}
      <div className="lg:pl-[248px]">
        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center gap-3.5 px-8 pt-[26px] mb-[26px]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{greeting}, {user.name || "Artist"}</h1>
            <p className="text-zinc-500 text-[13px] mt-0.5">{todayLabel} · Here is how your music is doing</p>
          </div>
          <div className="ml-auto relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search submissions..."
              className="bg-[#141417] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 w-[280px] text-[13px] text-white placeholder:text-zinc-500 outline-none focus:border-[#22C55E]/50"
            />
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            title="Notifications"
            className="w-[42px] h-[42px] rounded-xl border border-white/[0.08] bg-[#141417] flex items-center justify-center relative shrink-0"
          >
            <Bell className="w-5 h-5 text-zinc-400" />
            {notifications.length > 0 && <span className="absolute top-[10px] right-[11px] w-2 h-2 rounded-full bg-[#EF4444] border-2 border-[#0A0A0B]" />}
          </button>
        </div>

        <div className="px-4 lg:px-8 pb-28 lg:pb-10">
          {/* ===== Stats ===== */}
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3.5 mb-4 lg:mb-[22px]">
            <div className="bg-[#141417] border border-white/[0.08] rounded-2xl lg:rounded-[18px] p-3 lg:p-[18px]">
              <span className="text-[11px] lg:text-xs text-zinc-400 lg:uppercase lg:tracking-wider lg:text-zinc-500">Submissions</span>
              <b className="text-xl lg:text-[30px] block tracking-tight lg:my-1.5">{submissions.length}</b>
            </div>
            <div className="bg-[#141417] border border-white/[0.08] rounded-2xl lg:rounded-[18px] p-3 lg:p-[18px]">
              <span className="text-[11px] lg:text-xs text-zinc-400 lg:uppercase lg:tracking-wider lg:text-zinc-500">Accepted</span>
              <b className="text-xl lg:text-[30px] block tracking-tight lg:my-1.5">{acceptedCount}</b>
            </div>
            <div className="bg-[#141417] border border-white/[0.08] rounded-2xl lg:rounded-[18px] p-3 lg:p-[18px]">
              <span className="text-[11px] lg:text-xs text-zinc-400 lg:uppercase lg:tracking-wider lg:text-zinc-500">Link taps</span>
              <b className="text-xl lg:text-[30px] block tracking-tight lg:my-1.5">{totalTaps.toLocaleString()}</b>
            </div>
            <button
              onClick={() => scrollTo("wallet")}
              className="hidden lg:block text-left bg-gradient-to-br from-[#14532D] to-[#052E16] border border-[#22C55E]/30 rounded-[18px] p-[18px] hover:border-[#22C55E]/60 transition-colors"
            >
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Wallet balance</span>
              <b className="text-[30px] block tracking-tight my-1.5">{pricingConfig.currency}{user.balance.toLocaleString()}</b>
              <span className="text-[#22C55E] text-xs font-bold">Top up</span>
            </button>
          </div>

          {/* ===== Rising banner ===== */}
          {submissions.some((s) => s.ranking_boosted_at) && (
            <div className="mb-4 lg:mb-[22px] w-full bg-gradient-to-r from-[#14532D] to-[#052E16] border border-[#22C55E]/30 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3 sm:gap-4">
              <div className="bg-[#22C55E] p-2 rounded-full mt-0.5 shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#04120a]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg">Your music is rising</h3>
                <p className="text-zinc-300 text-xs sm:text-sm">
                  Curators flagged your song as a top performer.
                  <span className="block mt-1 text-[#22C55E] font-bold">
                    Share your playlist links and follow us on Spotify to keep the momentum going.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ===== Submit CTA ===== */}
          <div className="mb-4 lg:mb-[18px] bg-gradient-to-br from-[#14532D] via-[#052E16] to-[#0A0A0B] border border-[#22C55E]/30 rounded-[20px] lg:rounded-[18px] p-[18px] lg:p-5 flex items-center gap-3.5">
            <div className="flex-1">
              <h3 className="text-[17px] font-bold mb-1">Submit new music</h3>
              <p className="text-xs lg:text-[13px] text-[#BBF7D0]">Get on 18 real playlists across Africa</p>
            </div>
            <button
              onClick={() => router.push("/submit")}
              className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a] font-extrabold text-sm px-5 py-[13px] rounded-[14px] lg:rounded-xl whitespace-nowrap"
            >
              Start
            </button>
          </div>

          {/* ===== Smart links (mobile cards) ===== */}
          {smartLinkSubs.length > 0 && (
            <section id="smart-links" className="pt-4 scroll-mt-20">
              <div className="flex justify-between items-center mb-2.5">
                <h2 className="text-[15px] font-bold">Your smart links</h2>
              </div>
              {smartLinkSubs.map((s) => (
                <SmartLinkCard
                  key={s.id}
                  variant="card"
                  submission={s}
                  stats={linkStats[s.id] || {}}
                  onSaved={() => { fetchSubmissions(); fetchLinkStats(); }}
                />
              ))}
            </section>
          )}

          {/* ===== Recent submissions ===== */}
          <section id="submissions" className="pt-4 scroll-mt-20">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-[15px] lg:text-base font-bold">Recent submissions</h2>
            </div>
            {loadingSubmissions ? (
              <p className="text-zinc-500 text-sm">Loading submissions...</p>
            ) : filtered.length === 0 ? (
              <div className="bg-[#141417] border border-dashed border-white/10 rounded-2xl p-6 sm:p-8 text-center">
                <p className="text-zinc-400 text-sm">{q ? "No submissions match your search." : "No submissions yet."}</p>
                {!q && (
                  <button onClick={() => router.push("/submit")} className="text-[#22C55E] text-sm font-bold mt-2">
                    Create your first campaign
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="lg:hidden">
                  {filtered.map((sub) => (
                    <div key={sub.id} className="bg-[#141417] border border-white/[0.08] rounded-2xl p-3 mb-2.5">
                      <div className="flex gap-2.5 items-center">
                        <CoverArt src={sub.cover_art_url} alt={sub.song_title} size={44} rounded={10} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold truncate">{sub.song_title}</h4>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {sub.playlist?.name || "Unknown"} · {subDate(sub.created_at)}
                          </p>
                        </div>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-[5px] rounded-full shrink-0 ${pillClass(sub.status)}`}>
                          {sub.status}
                        </span>
                      </div>
                      {(sub.status === "declined" || sub.status === "rejected" || sub.status === "archived") && sub.feedback && (
                        <div className="mt-2 text-xs text-zinc-400 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-[10px] px-2.5 py-2">
                          <b className="text-red-300">Curator:</b> {sub.feedback}
                        </div>
                      )}
                      {(sub.status === "declined" || sub.status === "rejected" || sub.status === "archived") && (
                        <button
                          onClick={() => router.push(`/mixing?song=${encodeURIComponent(sub.song_title)}&submission=${sub.id}`)}
                          className="mt-2.5 w-full border border-[#22C55E]/40 bg-[#22C55E]/[0.08] text-[#22C55E] rounded-xl py-[11px] text-[13px] font-bold"
                        >
                          Get it professionally mixed
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop panel rows */}
                <div className="hidden lg:block bg-[#141417] border border-white/[0.08] rounded-[20px] p-5">
                  <div className="lg:grid lg:grid-cols-[1.7fr_1fr] lg:gap-[18px] lg:items-start">
                    <div>
                      {filtered.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3.5 p-3 border border-white/[0.08] rounded-[14px] mb-2.5 bg-[#1B1B1F]">
                          <CoverArt src={sub.cover_art_url} alt={sub.song_title} size={52} rounded={12} />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold truncate">{sub.song_title}</h4>
                            <p className="text-xs text-zinc-500 truncate">{sub.playlist?.name || "Unknown"} · {subDate(sub.created_at)}</p>
                            {(sub.status === "declined" || sub.status === "rejected" || sub.status === "archived") && sub.feedback && (
                              <p className="text-xs text-zinc-400 mt-1 truncate" title={sub.feedback}>
                                <span className="text-red-300 font-bold">Curator:</span> {sub.feedback}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <b className="text-[#22C55E] text-base block">{sub.clicks || 0}</b>
                            <span className="text-[11px] text-zinc-500">taps</span>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full shrink-0 ${pillClass(sub.status)}`}>
                            {sub.status}
                          </span>
                          {sub.status === "accepted" && sub.tracking_slug ? (
                            <button
                              onClick={() => smartLinkCopy(sub.tracking_slug as string)}
                              className="border border-white/[0.08] bg-[#141417] hover:bg-white/5 text-white rounded-[10px] px-3.5 py-2 text-xs font-bold shrink-0"
                            >
                              Smart link
                            </button>
                          ) : (sub.status === "declined" || sub.status === "rejected" || sub.status === "archived") ? (
                            <button
                              onClick={() => router.push(`/mixing?song=${encodeURIComponent(sub.song_title)}&submission=${sub.id}`)}
                              className="border border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10 rounded-[10px] px-3.5 py-2 text-xs font-bold shrink-0"
                            >
                              Get it mixed
                            </button>
                          ) : (
                            <span className="text-sm font-bold text-white shrink-0">{pricingConfig.currency}{sub.amount_paid}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop right column */}
                    <div className="space-y-[18px]">
                      {topSmartLink && (
                        <SmartLinkCard
                          variant="panel"
                          submission={topSmartLink}
                          stats={linkStats[topSmartLink.id] || {}}
                          onSaved={() => { fetchSubmissions(); fetchLinkStats(); }}
                        />
                      )}
                      <section id="referral" className="scroll-mt-20">
                        <div className="bg-[#141417] border border-[#22C55E]/30 rounded-[20px] p-1">
                          <ReferralCard />
                        </div>
                      </section>
                      <section id="mixing" className="scroll-mt-20">
                        <ArtistMixingOrders />
                      </section>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ===== Mobile: referral + mixing (desktop shows them in the right column) ===== */}
          <section className="pt-4 lg:hidden">
            <ReferralCard />
          </section>
          <section className="pt-4 lg:hidden">
            <ArtistMixingOrders />
          </section>

          {/* ===== Wallet ===== */}
          <section id="wallet" className="pt-4 scroll-mt-20">
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="text-[15px] lg:text-base font-bold">Wallet</h2>
            </div>
            <div className="bg-gradient-to-br from-[#14532D] to-[#052E16] border border-[#22C55E]/30 rounded-[20px] p-[18px] mb-3">
              <small className="text-[#BBF7D0] text-[11px] uppercase tracking-[1px]">Available balance</small>
              <div className="text-[32px] font-extrabold tracking-tight my-1 mb-3">
                {pricingConfig.currency}{user.balance.toLocaleString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { scrollTo("wallet"); setTimeout(() => document.getElementById("top-up-amount")?.focus(), 400); }}
                  className="flex-1 bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a] rounded-xl py-3 font-extrabold text-[13px]"
                >
                  Top up
                </button>
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 font-extrabold text-[13px]"
                >
                  Withdraw
                </button>
              </div>
            </div>
            <div className="bg-[#141417] border border-white/[0.08] rounded-[20px] p-4 lg:p-5 mb-3">
              <h4 className="text-sm font-bold text-zinc-200 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#22C55E]" /> Top up wallet
              </h4>
              <div className="space-y-3">
                <Input
                  id="top-up-amount"
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
                  <Button className="w-full bg-white/5 text-gray-500 cursor-not-allowed hover:bg-white/5">
                    Enter amount
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-center text-zinc-500 mt-2">Minimum withdrawal: {pricingConfig.currency}5,000</p>
            </div>
            <div className="pt-1">
              <h2 className="text-[15px] lg:text-base font-bold text-white mb-2.5">Wallet history</h2>
              <TransactionsList userId={user.id} allowedTypes={["deposit", "refund", "withdrawal"]} />
            </div>
          </section>
        </div>

        {/* ===== Mobile bottom tab bar ===== */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#101013]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-5 px-1 pt-2 pb-5 z-30">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex flex-col items-center gap-[3px] text-[10px] text-[#22C55E] font-semibold bg-none border-none">
            <Home className="w-[22px] h-[22px]" />Home
          </button>
          <button onClick={() => scrollTo("smart-links")} className="flex flex-col items-center gap-[3px] text-[10px] text-zinc-500 font-semibold bg-none border-none">
            <Link2 className="w-[22px] h-[22px]" />Links
          </button>
          <button onClick={() => router.push("/submit")} className="flex flex-col items-center gap-[3px] text-[10px] text-zinc-500 font-semibold bg-none border-none" aria-label="Submit music">
            <span className="w-[52px] h-[52px] -mt-6 rounded-full bg-[#22C55E] text-[#04120a] flex items-center justify-center border-4 border-[#0A0A0B]">
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </span>
          </button>
          <button onClick={() => scrollTo("wallet")} className="flex flex-col items-center gap-[3px] text-[10px] text-zinc-500 font-semibold bg-none border-none">
            <Wallet className="w-[22px] h-[22px]" />Wallet
          </button>
          <button onClick={() => setShowProfile(true)} className="flex flex-col items-center gap-[3px] text-[10px] text-zinc-500 font-semibold bg-none border-none">
            <User className="w-[22px] h-[22px]" />Profile
          </button>
        </nav>
      </div>

      {/* ===== Withdraw Modal ===== */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#141417] border border-white/[0.08] p-6 rounded-2xl w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white text-lg">Request payout</h3>

            {(!bankName || !accountNumber) ? (
              <div className="py-8 text-center space-y-4">
                <div className="p-4 bg-[#EAB308]/10 rounded-full inline-block">
                  <AlertCircle className="w-8 h-8 text-[#EAB308]" />
                </div>
                <p className="text-zinc-300 text-sm">Please add your bank details in settings before withdrawing.</p>
                <Button className="w-full bg-white text-black hover:bg-zinc-200" onClick={() => { setShowWithdraw(false); setShowProfile(true); }}>
                  Go to settings
                </Button>
              </div>
            ) : (
              <>
                <div className="py-4 space-y-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm">
                    <p className="text-zinc-400 text-xs mb-1">Transfer destination</p>
                    <p className="font-bold text-white">{bankName}</p>
                    <p className="text-zinc-300">{accountNumber} · {accountName}</p>
                    <Button variant="link" className="text-[#22C55E] text-xs h-auto p-0 mt-2" onClick={() => { setShowWithdraw(false); setShowProfile(true); }}>
                      Change account
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount to withdraw</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-zinc-500">{pricingConfig.currency}</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        className="pl-8 bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">Available: {pricingConfig.currency}{user?.balance?.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">Minimum withdrawal: {pricingConfig.currency}5,000</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason for withdrawal</Label>
                    <Textarea
                      placeholder="e.g. I need the funds for studio time"
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      className="bg-black/40 border-white/10 text-white min-h-[70px]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowWithdraw(false)}>Cancel</Button>
                  <Button className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a]" onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount}>
                    {isWithdrawing ? "Processing..." : "Submit request"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Support Modal ===== */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141417] border border-white/[0.08] w-full sm:max-w-md md:max-w-xl h-[80vh] sm:h-[600px] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#141417]">
              <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#22C55E]" /> Support center
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSupport(false)}>
                <XCircle className="w-6 h-6 text-zinc-400" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-[#141417]">
              {supportView === "list" && (
                <div className="p-4 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-bold">My tickets</h4>
                    <Button size="sm" className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a]" onClick={() => setSupportView("create")}>
                      <Plus className="w-4 h-4 mr-1" /> New ticket
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {supportTickets.length === 0 && <p className="text-center text-zinc-500 py-10">No tickets found.</p>}
                    {supportTickets.map((t) => (
                      <div key={t.id} onClick={() => openTicketChat(t)} className="p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-white block">{t.subject}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${t.status === "open" ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-zinc-500/20 text-zinc-500"}`}>{t.status}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{t.message}</p>
                        <p className="text-[10px] text-zinc-500 mt-2">{new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {supportView === "create" && (
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => setSupportView("list")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h4 className="text-white font-bold">New ticket</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="e.g. Payment issue" className="bg-black/40 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea className="min-h-[150px] bg-black/40 border-white/10 text-white" value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe your issue..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-auto pt-4">
                    <Button variant="ghost" onClick={() => setSupportView("list")}>Cancel</Button>
                    <Button className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a]" onClick={createTicket} disabled={isSubmittingTicket}>
                      <Send className="w-4 h-4 mr-2" /> Submit ticket
                    </Button>
                  </div>
                </div>
              )}

              {supportView === "chat" && activeTicket && (
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-white/5">
                    <Button variant="ghost" size="sm" onClick={() => setSupportView("list")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h4 className="text-white font-bold text-sm">{activeTicket.subject}</h4>
                      <p className="text-[10px] text-zinc-400">Ticket ID: {activeTicket.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                    {chatMessages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] p-3 rounded-xl text-sm ${isMe ? "bg-[#22C55E] text-[#04120a] rounded-br-none font-medium" : "bg-zinc-700 text-zinc-200 rounded-bl-none"}`}>
                            <p>{msg.message}</p>
                            <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 bg-[#141417] border-t border-white/10 flex gap-2">
                    <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="bg-[#1B1B1F] border-white/10 text-white" onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} />
                    <Button size="icon" className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a]" onClick={sendChatMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Profile Modal ===== */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#141417] border border-white/[0.08] p-6 rounded-2xl w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white text-lg">Artist profile</h3>
            <div className="space-y-2">
              <Label>Bio / pitch</Label>
              <Textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="Short bio for curators..." className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={profileIg} onChange={(e) => setProfileIg(e.target.value)} placeholder="@username" className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="space-y-2">
                <Label>Twitter</Label>
                <Input value={profileTwitter} onChange={(e) => setProfileTwitter(e.target.value)} placeholder="@username" className="bg-black/40 border-white/10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website / EPK</Label>
              <Input value={profileWeb} onChange={(e) => setProfileWeb(e.target.value)} placeholder="https://" className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-zinc-500 mb-3">Bank details, used for withdrawals.</p>
              <div className="space-y-2">
                <Label>Bank name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Account number</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Account name</Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Full name" className="bg-black/40 border-white/10 text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-zinc-400" onClick={() => { setShowProfile(false); setShowSupport(true); }}>
                  <HelpCircle className="w-4 h-4 mr-1" /> Support
                </Button>
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-400" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-1" /> Log out
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowProfile(false)}>Cancel</Button>
                <Button className="bg-[#22C55E] hover:bg-[#1aa34e] text-[#04120a]" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Notifications Modal ===== */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#141417] border border-white/[0.08] w-full max-w-md p-6 rounded-2xl space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#EAB308]" /> Updates
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}>
                <XCircle className="w-6 h-6" />
              </Button>
            </div>
            <div className="space-y-4">
              {notifications.length === 0 && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <h4 className="font-bold text-white mb-1">Welcome to AfroPitch</h4>
                  <p className="text-sm text-zinc-400 mb-2">
                    We are excited to have you here. Start by browsing playlists and submitting your first track.
                  </p>
                  <p className="text-[10px] text-zinc-600">Just now</p>
                </div>
              )}
              {notifications.map((n, i) => {
                const isExpanded = expandedNotificationId === n.id;
                return (
                  <div key={n.id || i} className="bg-white/5 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toggleNotification(n.id)}>
                    <h4 className="font-bold text-white mb-1 flex justify-between items-start">
                      <span>{n.subject}</span>
                      <span className="text-[10px] text-zinc-500 font-normal ml-2 shrink-0 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{isExpanded ? "Collapse" : "Read"}</span>
                    </h4>
                    <div className={`text-sm text-zinc-400 whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-2"}`}>
                      {n.message ? n.message.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim() : ""}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
