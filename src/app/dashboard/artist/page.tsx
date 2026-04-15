"use client";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
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
    curator: { full_name: string } | null;
  } | null;
}

export default function ArtistDashboard() {
  const { user, loadFunds, isLoading, logout, refreshUser } = useAuth();
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
      fetchNotifications();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setSubmissions(data as any);
    }
    setLoadingSubmissions(false);
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

      const { data: result, error } = await supabase.rpc("process_deposit", {
        p_user_id: currentUser.id,
        p_amount: val,
        p_reference: paystackRef,
        p_description: `Wallet Deposit: ${paystackRef}`,
      });

      if (error) {
        console.error("process_deposit RPC error:", {
          error,
          userId: currentUser.id,
          amount: val,
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
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
        
        toast(`Payment received but failed to credit. Ref: ${paystackRef}. Contact support.`, "error");
        paystackLockRef.current = false;
        return;
      }

      if (result?.success === false) {
        toast("This payment was already processed. Refreshing balance...", "warning");
      } else {
        toast(`₦${val.toLocaleString()} loaded to your wallet! ✅`, "success");
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

  return (
    <div className="container mx-auto px-3 sm:px-4 max-w-5xl py-6 sm:py-12 relative">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Artist Dashboard</h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Welcome back, <span className="text-green-500">{user.name || "Artist"}</span>. Manage your budget and track submissions.
          </p>
        </div>
        {/* Mobile-first action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            className="bg-green-600 hover:bg-green-700 font-bold flex-1 sm:flex-none h-10 flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 text-sm"
            onClick={() => {
              document.getElementById("top-up-amount")?.focus();
              document.getElementById("wallet-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <Wallet className="w-4 h-4" /> <span className="hidden xs:inline">Top Up</span> Wallet
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="border-white/10 hover:bg-white/10 h-10 w-10 relative shrink-0"
            title="Notifications"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          </Button>

          <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10 h-10 w-10 shrink-0" title="Contact Support" onClick={() => setShowSupport(true)}>
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </Button>
          <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/10 h-10 w-10 shrink-0" title="Manage Profile" onClick={() => setShowProfile(true)}>
            <Settings className="w-5 h-5 text-gray-400" />
          </Button>
          <Button variant="outline" size="icon" className="border-white/10 hover:bg-red-500/20 h-10 w-10 shrink-0 group" title="Logout" onClick={logout}>
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
          </Button>
        </div>
      </div>

      {/* Rising notification */}
      {submissions.some((s) => s.ranking_boosted_at) && (
        <div className="mb-6 w-full bg-gradient-to-r from-green-900/50 to-green-600/20 border border-green-500/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 sm:gap-4 animate-in slide-in-from-top-4">
          <div className="bg-green-500 p-2 rounded-full mt-1 shrink-0 animate-pulse">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg">Your Music is Rising!</h3>
            <p className="text-gray-300 text-xs sm:text-sm">
              Curators have flagged your song as a top performer.
              <span className="block mt-1 text-green-400 font-bold">
                Share your playlist links and follow us on Spotify to keep the momentum going!
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Submit CTA - Mobile Optimized */}
      <div className="grid grid-cols-1 mb-6 sm:mb-8">
        <Card className="bg-gradient-to-br from-green-900/40 to-black border-green-500/30">
          <CardContent className="p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-lg sm:text-2xl font-bold text-white">Submit New Music</h2>
              <p className="text-gray-400 text-sm">Get your tracks on top playlists.</p>
            </div>
            <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 shadow-lg shadow-green-900/20" onClick={() => router.push("/submit")}>
              Start Campaign
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Mobile First */}
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Submissions */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" /> Recent Submissions
          </h2>
          {loadingSubmissions ? (
            <p className="text-gray-500">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <Card className="bg-white/5 border-dashed border-white/10 p-6 sm:p-8 text-center">
              <p className="text-gray-400 text-sm">No submissions yet.</p>
              <Button variant="link" className="text-green-500" onClick={() => router.push("/submit")}>
                Create your first campaign
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="bg-white/5 border border-white/5 rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-black/30 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white/20 shrink-0">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm sm:text-base truncate">{sub.song_title}</h4>
                        <p className="text-xs text-gray-400 truncate">{sub.playlist?.name || "Unknown"}</p>
                        <p className="text-[10px] text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col sm:text-right items-center gap-2 shrink-0">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] uppercase font-bold ${
                        sub.status === "accepted"
                          ? "bg-green-500/20 text-green-500"
                          : sub.status === "declined" || sub.status === "rejected"
                          ? "bg-red-500/20 text-red-500"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}>
                        {sub.status}
                      </span>
                      <p className="text-sm font-bold text-white">
                        {pricingConfig.currency}{sub.amount_paid}
                      </p>
                    </div>
                  </div>
                  {sub.status === "accepted" && sub.tracking_slug && (
                    <div className="mt-3 bg-gradient-to-br from-green-900/30 to-black border border-green-500/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Viral Tracker
                        </p>
                        <span className="text-[10px] font-bold text-white bg-green-500/20 px-2 py-0.5 rounded-full">
                          {sub.clicks || 0}/100
                        </span>
                      </div>
                      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000"
                          style={{ width: `${Math.min(((sub.clicks || 0) / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-black/60 rounded px-2 py-1.5 text-[10px] sm:text-xs text-gray-300 truncate select-all border border-white/5 font-mono">
                          https://afropitchplay.best/track/{sub.tracking_slug}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-green-400 hover:text-green-300 shrink-0 border border-green-500/20"
                          onClick={() => {
                              navigator.clipboard.writeText(`https://afropitchplay.best/track/${sub.tracking_slug}`);
                              toast("Tracking link copied!", "success");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                  {(sub.status === "declined" || sub.status === "rejected") && sub.feedback && (
                    <div className="mt-3 p-2 bg-red-900/20 border border-red-500/20 rounded">
                      <p className="text-[10px] text-red-200">
                        <span className="font-bold text-red-400">Reason:</span> {sub.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))}</div>
          )}
        </div>

        {/* Wallet Column - Mobile First */}
        <div className="space-y-4 sm:space-y-6" id="wallet-card">
          <Card className="bg-zinc-900 border-white/10 overflow-hidden">
            <div className="bg-gradient-to-r from-green-900/40 to-black p-4 sm:p-6 border-b border-green-500/10">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-500" /> Available Balance
              </h3>
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {pricingConfig.currency}
                {user.balance.toLocaleString()}
              </div>
            </div>
            <CardContent className="p-4 sm:p-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-500" /> Top Up Wallet
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
                    Enter Amount
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" /> Wallet History
              </h2>
            </div>
            <TransactionsList userId={user.id} allowedTypes={["deposit", "refund"]} />
          </div>
        </div>
      </div>

      {/* Support Modal - Mobile Optimized */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 w-full sm:max-w-md md:max-w-xl h-[80vh] sm:h-[600px] flex flex-col rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
              <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-green-500" /> Support Center
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSupport(false)}>
                <XCircle className="w-6 h-6 text-gray-400" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-zinc-900">
              {supportView === "list" && (
                <div className="p-4 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-bold">My Tickets</h4>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setSupportView("create")}>
                      <Plus className="w-4 h-4 mr-1" /> New Ticket
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {supportTickets.length === 0 && <p className="text-center text-gray-500 py-10">No tickets found.</p>}
                    {supportTickets.map((t) => (
                      <div key={t.id} onClick={() => openTicketChat(t)} className="p-3 bg-white/5 border border-white/5 rounded cursor-pointer hover:bg-white/10">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-white block">{t.subject}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${t.status === "open" ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-500"}`}>{t.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.message}</p>
                        <p className="text-[10px] text-gray-500 mt-2">{new Date(t.created_at).toLocaleDateString()}</p>
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
                    <h4 className="text-white font-bold">New Ticket</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="e.g. Payment Issue" />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea className="min-h-[150px]" value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe your issue..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-auto pt-4">
                    <Button variant="ghost" onClick={() => setSupportView("list")}>Cancel</Button>
                    <Button className="bg-green-600" onClick={createTicket} disabled={isSubmittingTicket}>
                      <Send className="w-4 h-4 mr-2" /> Submit Ticket
                    </Button>
                  </div>
                </div>
              )}

              {supportView === "chat" && activeTicket && (
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-zinc-800/50">
                    <Button variant="ghost" size="sm" onClick={() => setSupportView("list")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h4 className="text-white font-bold text-sm">{activeTicket.subject}</h4>
                      <p className="text-[10px] text-gray-400">Ticket ID: {activeTicket.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
                    {chatMessages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] p-3 rounded-xl text-sm ${isMe ? "bg-green-600 text-white rounded-br-none" : "bg-zinc-700 text-gray-200 rounded-bl-none"}`}>
                            <p>{msg.message}</p>
                            <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 bg-zinc-900 border-t border-white/10 flex gap-2">
                    <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="bg-zinc-800 border-zinc-700" onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} />
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

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg w-full max-w-md space-y-4">
            <h3 className="font-bold text-white text-lg">Artist Profile</h3>
            <div className="space-y-2">
              <Label>Bio / Pitch</Label>
              <Textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="Short bio for curators..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={profileIg} onChange={(e) => setProfileIg(e.target.value)} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <Label>Twitter</Label>
                <Input value={profileTwitter} onChange={(e) => setProfileTwitter(e.target.value)} placeholder="@username" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website / EPK</Label>
              <Input value={profileWeb} onChange={(e) => setProfileWeb(e.target.value)} placeholder="https://" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowProfile(false)}>Cancel</Button>
              <Button className="bg-green-600" onClick={handleUpdateProfile} disabled={isUpdatingProfile}>Save Profile</Button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 rounded-lg space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" /> Updates
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}>
                <XCircle className="w-6 h-6" />
              </Button>
            </div>
            <div className="space-y-4">
              {notifications.length === 0 && (
                <div className="bg-white/5 p-4 rounded border border-white/5">
                  <h4 className="font-bold text-white mb-1">👋 Welcome to AfroPitch!</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    We&apos;re excited to have you here. Start by browsing playlists and submitting your first track.
                  </p>
                  <p className="text-[10px] text-gray-600">Just now</p>
                </div>
              )}
              {notifications.map((n, i) => {
                const isExpanded = expandedNotificationId === n.id;
                return (
                  <div key={n.id || i} className="bg-white/5 p-4 rounded border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toggleNotification(n.id)}>
                    <h4 className="font-bold text-white mb-1 flex justify-between items-start">
                      <span>{n.subject}</span>
                      <span className="text-[10px] text-gray-500 font-normal ml-2 shrink-0 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{isExpanded ? "Collapse" : "Read"}</span>
                    </h4>
                    <div className={`text-sm text-gray-400 whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-2"}`}>
                      {n.message ? n.message.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim() : ""}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
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
