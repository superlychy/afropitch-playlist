"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, CreditCard, History } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";
import { Copy, ExternalLink, BarChart3, TrendingUp, AlertCircle } from "lucide-react";

// Mock Data for Dashboard
const MOCK_PLACEMENTS = [
    {
        id: "sub_1",
        song: "Amapiano Vibes",
        curator: "Lagos Heat",
        status: "Approved",
        date: "2 days ago",
        trackingSlug: "amapiano-vibes-sub1",
        clicks: 142,
        earnings: null
    },
    {
        id: "sub_2",
        song: "My Hit Song",
        curator: "Nairobi Drill",
        status: "Pending",
        date: "1 hour ago",
        trackingSlug: null,
        clicks: 0,
        earnings: -5000
    }
];

export default function ArtistDashboard() {
    const { user, loadFunds, isLoading } = useAuth();
    const router = useRouter();
    const [amount, setAmount] = useState("");

    useEffect(() => {
        if (!isLoading && (!user || user.role !== "artist")) {
            router.push("/portal");
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (!user) return null;

    const handleLoadFunds = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseInt(amount);
        if (val > 0) {
            loadFunds(val);
            setAmount("");
            alert(`Successfully loaded ${pricingConfig.currency}${val.toLocaleString()}`);
        }
    };

    return (
        <div className="container mx-auto px-4 max-w-5xl py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Artist Dashboard</h1>
                    <p className="text-gray-400">Manage your budget and track submissions.</p>
                </div>
                <div className="bg-green-600/10 border border-green-500/20 px-6 py-4 rounded-xl flex items-center gap-4">
                    <div className="bg-green-600 p-2 rounded-full text-white">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="block text-xs text-gray-400 uppercase tracking-widest">Available Credits</span>
                        <span className="text-2xl font-bold text-white">{pricingConfig.currency}{user.balance.toLocaleString()}</span>
                    </div>
                </div>
            </div>

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
                        <form onSubmit={handleLoadFunds} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    placeholder="Amount (e.g. 5000)"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1000"
                                    required
                                />
                            </div>
                            <Button className="w-full bg-white text-black hover:bg-gray-200">
                                <Plus className="w-4 h-4 mr-2" /> Add Funds
                            </Button>
                        </form>
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
                        {MOCK_PLACEMENTS.map((item) => (
                            <div key={item.id} className="bg-white/5 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-white">{item.song}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.status === 'Approved'
                                            ? 'bg-green-500/10 border-green-500 text-green-500'
                                            : 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>

                                    {/* GAMIFICATION PROMPT */}
                                    {item.status === 'Approved' && (
                                        <div className="mt-4 p-3 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                                            <p className="font-bold flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-3 h-3 text-blue-400" />
                                                Boost Your Ranking!
                                            </p>
                                            <p className="opacity-80">
                                                Share this link with your fans. The more people <strong>click, save, and follow</strong>, the higher your song moves up the playlist automatically.
                                                <br />
                                                <em>Currently ranking: Top 20%</em>
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400">To: {item.curator} • {item.date}</p>

                                    {/* Tracking Link Section for Approved Songs */}
                                    {item.status === 'Approved' && (
                                        <div className="mt-3 p-2 bg-black/40 rounded border border-white/5 flex items-center gap-3">
                                            <div className="flex items-center gap-2 text-xs text-blue-400">
                                                <BarChart3 className="w-3 h-3" />
                                                <span className="font-mono">{item.clicks} clicks</span>
                                            </div>
                                            <div className="h-4 w-px bg-white/10"></div>
                                            <code className="text-[10px] text-gray-400 font-mono">afropitch.com/listen/{item.trackingSlug}</code>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white"
                                                onClick={() => navigator.clipboard.writeText(`https://afropitch.com/listen/${item.trackingSlug}`)}
                                                title="Copy Tracking Link"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Report Issue Button */}
                                    {item.status === 'Approved' && (
                                        <div className="mt-2 text-right sm:text-left">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-6 px-2 text-[10px]"
                                                onClick={() => alert("Report received. Our support team will verify if your song is on the playlist within 2 hours.")}
                                            >
                                                <AlertCircle className="w-3 h-3 mr-1.5" />
                                                Report Missing Song
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right min-w-[100px]">
                                    {item.earnings ? (
                                        <span className={`block font-bold ${item.earnings > 0 ? 'text-green-500' : 'text-white'}`}>
                                            {item.earnings > 0 ? '+' : ''}{pricingConfig.currency}{Math.abs(item.earnings).toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-500">PAID</span>
                                    )}
                                    <span className="text-xs text-gray-500 block">
                                        {item.status === 'Approved' ? 'Active & Tracking' : 'Review in progess'}
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
