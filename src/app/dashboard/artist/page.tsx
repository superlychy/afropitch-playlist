"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, CreditCard, History } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

export default function ArtistDashboard() {
    const { user, loadFunds } = useAuth();
    const router = useRouter();
    const [amount, setAmount] = useState("");

    useEffect(() => {
        if (!user || user.role !== "artist") {
            router.push("/portal");
        }
    }, [user, router]);

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

                    <div className="space-y-3">
                        {/* Mock History Item */}
                        <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white">Submitted "My Hit Song"</p>
                                <p className="text-xs text-gray-400">To: Lagos Vibes Team • Express Tier</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-white">-{pricingConfig.currency}5,000</span>
                                <span className="text-xs text-yellow-500">Pending Review</span>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white">Wallet Top-up</p>
                                <p className="text-xs text-gray-400">Via Paystack</p>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-green-500">+{pricingConfig.currency}10,000</span>
                                <span className="text-xs text-gray-500">Success</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
