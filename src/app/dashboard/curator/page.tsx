"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

export default function CuratorDashboard() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user || user.role !== "curator") {
            router.push("/portal");
        }
    }, [user, router]);

    if (!user) return null;

    // Mock Data (Simulate mixed tier and discounted submissions)
    const pendingReviews = [
        // Standard Price: 3000 * 0.8 = 2400
        { id: 1, artist: "Burna Boy", song: "Last Last", tier: "Standard", submitted: "2 hours ago", potentialEarnings: 2400 },
        // Express Price: 5000 * 0.8 = 4000
        { id: 2, artist: "Wizkid", song: "Essence", tier: "Express", submitted: "1 day ago", potentialEarnings: 4000 },
        // Discounted Bulk Submission (10% off): 3000 * 0.9 = 2700 * 0.8 = 2160
        { id: 3, artist: "Davido", song: "Unavailable", tier: "Standard (Bulk)", submitted: "3 hours ago", potentialEarnings: 2160 },
    ];

    return (
        <div className="container mx-auto px-4 max-w-6xl py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400">Welcome back, <span className="text-green-500">{user.name}</span></p>
                </div>
                <div className="text-right">
                    <span className="block text-sm text-gray-400">Net Earnings</span>
                    <span className="text-3xl font-bold text-white">{pricingConfig.currency}{user.earnings.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="bg-black/40 border-green-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Accepted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">14</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-red-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Declined</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">3</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Avg. Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">4.2 Hrs</div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">Pending Reviews</h2>
            <div className="space-y-4">
                {pendingReviews.map((review) => (
                    <Card key={review.id} className="bg-white/5 border-none">
                        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-900/40 flex items-center justify-center text-green-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{review.song} <span className="text-gray-400 font-normal">by {review.artist}</span></h3>
                                    <p className="text-sm text-gray-400">Tier: {review.tier} • Submitted {review.submitted}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="text-right mr-4 hidden md:block">
                                    <span className="block text-xs text-gray-500">You Receive</span>
                                    <span className="font-bold text-green-400">{pricingConfig.currency}{review.potentialEarnings.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button variant="ghost" className="flex-1 md:flex-none text-red-400 hover:text-red-300 hover:bg-red-900/20">Decline</Button>
                                    <Button className="flex-1 md:flex-none bg-green-600 hover:bg-green-700">Review & Pitch</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="mt-8 text-xs text-gray-500 text-center">
                * Earnings are released to your wallet after the artist verifies the playlist placement.
                <br />You receive 80% of the submission fee. Platform fee varies based on discounts applied.
            </p>
        </div>
    );
}
