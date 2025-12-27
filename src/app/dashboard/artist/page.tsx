"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, CreditCard, History, Settings, HelpCircle, Send, LogOut } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Copy, ExternalLink, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";

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
    playlist: {
        name: string;
        curator: {
            full_name: string;
        } | null;
    } | null;
}

export default function ArtistDashboard() {
    const { user, loadFunds, isLoading, logout } = useAuth();
    const router = useRouter();
    const [amount, setAmount] = useState("");

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

    // Real Data State
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(true);

    useEffect(() => {
        if (user) {
            setProfileBio(user.bio || "");
            setProfileIg(user.instagram || "");
            setProfileTwitter(user.twitter || "");
            setProfileWeb(user.website || "");

            fetchSubmissions();
        }
    }, [user]);

    const fetchSubmissions = async () => {
        if (!user) return;
        setLoadingSubmissions(true);
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
            setSubmissions(data as any); // Cast to any because the join structure might be tricky for TS inference without generated types
        }
        setLoadingSubmissions(false);
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

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (!user) return null;

    const handlePaymentSuccess = async (reference: any) => {
        const val = parseInt(amount);
        if (val <= 0) return;

        // 1. Update Database
        const { error } = await supabase.from('profiles').update({
            balance: (user.balance || 0) + val
        }).eq('id', user.id);

        if (error) {
            alert("Payment successful but failed to update balance. Please contact support.");
            console.error(error);
            return;
        }

        // 2. Update Local State
        loadFunds(val);
        setAmount("");
        alert(`Successfully loaded ${pricingConfig.currency}${val.toLocaleString()}`);
    };

    return (
        <div className="container mx-auto px-4 max-w-5xl py-12 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Artist Dashboard</h1>
                    <p className="text-gray-400">Manage your budget and track submissions.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-green-600/10 border border-green-500/20 px-6 py-4 rounded-xl flex items-center gap-4">
                        <div className="bg-green-600 p-2 rounded-full text-white">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="block text-xs text-gray-400 uppercase tracking-widest">Available Credits</span>
                            <span className="text-2xl font-bold text-white">{pricingConfig.currency}{user.balance.toLocaleString()}</span>
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

            {/* Profile Modal */}
            {showProfile && (
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
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Load Funds */}
                <Card className="lg:col-span-1 bg-black/40 border-white/10 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-green-500" /> Load Funds
                        </CardTitle>
                        <CardDescription>Top up your wallet for faster checkout.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    placeholder="Amount (e.g. 5000)"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1000"
                                />
                            </div>
                            {parseInt(amount) > 0 ? (
                                <div className="w-full">
                                    <PayWithPaystack
                                        email={user.email}
                                        amount={parseInt(amount) * 100}
                                        onSuccess={handlePaymentSuccess}
                                        onClose={() => console.log("Payment closed")}
                                    />
                                </div>
                            ) : (
                                <Button className="w-full bg-white text-black hover:bg-gray-200" disabled>
                                    <Plus className="w-4 h-4 mr-2" /> Enter Amount
                                </Button>
                            )}
                        </div>
                        <div className="mt-6 p-3 bg-white/5 rounded text-xs text-gray-400">
                            <span className="text-green-400 font-bold block mb-1">PRO TIP:</span>
                            Load funds to get bulk discounts on playlist submissions.
                        </div>
                    </CardContent>
                </Card>

                {/* Actions & History */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-gradient-to-r from-green-900/20 to-black border-green-500/20">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Ready to Pitch?</h3>
                                <p className="text-gray-400 text-sm max-w-sm">Submit your song to multiple curators at once and confirm placements.</p>
                            </div>
                            <Button onClick={() => router.push("/submit")} size="lg" className="bg-green-600 hover:bg-green-700">
                                New Submission
                            </Button>
                        </CardContent>
                    </Card>

                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" /> Recent Activity
                    </h3>

                    <div className="space-y-4">
                        {loadingSubmissions && <div className="text-center text-gray-500 py-10">Loading submissions...</div>}
                        {!loadingSubmissions && submissions.length === 0 && (
                            <div className="text-center text-gray-500 py-10 bg-white/5 rounded-lg border border-white/5">
                                No submissions found. Make your first pitch!
                            </div>
                        )}
                        {submissions.map((item) => (
                            <div key={item.id} className="bg-white/5 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-white">{item.song_title}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-20 ${item.status === 'accepted' || item.status === 'approved' // Handle both casing if inconsistent in DB
                                            ? 'bg-green-500/10 border-green-500 text-green-500'
                                            : item.status === 'declined' || item.status === 'rejected'
                                                ? 'bg-red-500/10 border-red-500 text-red-500'
                                                : 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                                            }`}>
                                            {item.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* GAMIFICATION PROMPT */}
                                    {(item.status === 'accepted' || item.status === 'approved') && (
                                        <div className="mt-4 p-3 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                                            <p className="font-bold flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-3 h-3 text-blue-400" />
                                                Boost Your Ranking!
                                            </p>
                                            <p className="opacity-80">
                                                Share this link with your fans.
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400">To: {item.playlist?.name} (by {item.playlist?.curator?.full_name || 'Curator'}) • {new Date(item.created_at).toLocaleDateString()}</p>

                                    {/* Tracking Link Section for Approved Songs */}
                                    {(item.status === 'accepted' || item.status === 'approved') && item.tracking_slug && (
                                        <div className="mt-3 p-2 bg-black/40 rounded border border-white/5 flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-xs text-blue-400">
                                                <BarChart3 className="w-3 h-3" />
                                                <span className="font-mono">{item.clicks || 0} clicks</span>
                                            </div>
                                            <div className="h-4 w-px bg-white/10"></div>
                                            <code className="text-[10px] text-gray-400 font-mono">afropitch.com/listen/{item.tracking_slug}</code>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white"
                                                onClick={() => navigator.clipboard.writeText(`https://afropitch.com/listen/${item.tracking_slug}`)}
                                                title="Copy Tracking Link"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                            <a href={`/api/r/${item.tracking_slug}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-3 h-3 text-gray-500 hover:text-white" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right min-w-[100px]">
                                    <span className="text-sm text-gray-500 block mb-1">
                                        -{pricingConfig.currency}{item.amount_paid.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-500 block">
                                        {item.status === 'pending' ? 'Review in progress' : item.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
}
