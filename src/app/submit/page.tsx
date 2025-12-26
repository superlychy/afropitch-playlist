"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { genres } from "@/../config/genres";
import { pricingConfig } from "@/../config/pricing";
import { curators, Playlist } from "@/../config/curators";
import { Loader2, Music, CheckCircle, Wallet, CreditCard, User, Search } from "lucide-react";
import dynamic from "next/dynamic";

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), { ssr: false });

function SubmitForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, deductFunds } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"wallet" | "direct">("direct");

    // State for form fields
    const [tier, setTier] = useState("standard");
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
    const [playlistSearch, setPlaylistSearch] = useState("");

    // Load playlist from URL if present
    useEffect(() => {
        const playlistParam = searchParams.get("playlist");
        if (playlistParam && !selectedPlaylistIds.includes(playlistParam)) {
            setSelectedPlaylistIds([playlistParam]);
        }
        const tierParam = searchParams.get("tier");
        if (tierParam) setTier(tierParam);
    }, [searchParams]);

    // Calculations
    const selectedTierConfig = pricingConfig.tiers[tier as keyof typeof pricingConfig.tiers];
    const allPlaylists = curators.flatMap(c => c.playlists);

    const togglePlaylist = (id: string) => {
        setSelectedPlaylistIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const calculateTotal = () => {
        let baseTotal = 0;

        // If no playlists selected, assume 1 generic submission at tier price
        if (selectedPlaylistIds.length === 0) {
            return selectedTierConfig.price;
        }

        // Sum up prices for selected playlists
        selectedPlaylistIds.forEach(id => {
            const playlist = allPlaylists.find(p => p.id === id);
            if (playlist) {
                if (playlist.type === 'exclusive') {
                    // Exclusive playlists use their custom price, override tier price
                    baseTotal += playlist.submissionFee;
                } else if (playlist.submissionFee === 0) {
                    // Free is free
                    baseTotal += 0;
                } else {
                    // Regular paid uses the selected Tier Price
                    baseTotal += selectedTierConfig.price;
                }
            }
        });

        // Apply Bulk Discount
        let discount = 0;
        if (selectedPlaylistIds.length >= 2) discount = 0.10; // 10% off for 2+
        if (selectedPlaylistIds.length >= 5) discount = 0.20; // 20% off for 5+

        return Math.floor(baseTotal * (1 - discount));
    };

    const total = calculateTotal();
    const discountAmount = (selectedPlaylistIds.length > 0 && selectedPlaylistIds.length * selectedTierConfig.price - total > 0)
        ? (selectedPlaylistIds.length * selectedTierConfig.price - total)
        : 0;

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);

        // Payment Logic
        if (paymentMethod === "wallet" && total > 0) {
            if (!user) {
                alert("Please login to pay with wallet.");
                setIsSubmitting(false);
                return;
            }
            const success = deductFunds(total);
            if (!success) {
                alert("Insufficient funds. Please load your wallet.");
                setIsSubmitting(false);
                return;
            }
        }

        // Simulate API call / Email Notification
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
            // In a real app, this would trigger: `sendEmailToCurator(selectedPlaylistIds)`
        }, 2000);
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-white">Submission Received!</h1>
                <p className="text-gray-400">
                    Curators have been notified via email.<br />
                    Review Tier: <span className="text-white font-bold">{selectedTierConfig.title}</span><br />
                    Paid: <span className="text-green-400 font-bold">{pricingConfig.currency}{total.toLocaleString()}</span>
                </p>
                <div className="flex gap-4">
                    <Button onClick={() => router.push("/dashboard/artist")} className="mt-4 bg-green-600 hover:bg-green-700">
                        Go to Dashboard
                    </Button>
                    <Button onClick={() => { setIsSuccess(false); setSelectedPlaylistIds([]); }} variant="outline" className="mt-4">
                        Submit Another
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="text-center mb-8 space-y-2">
                <h1 className="text-3xl font-bold text-white sm:text-4xl">Submit Your Song</h1>
                <p className="text-gray-400">
                    Reach multiple lists. Get a bulk discount.
                    {!user && <span className="block text-xs mt-2 text-green-400 cursor-pointer hover:underline" onClick={() => router.push("/portal")}>Login for Wallet & History</span>}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORM */}
                <div className="lg:col-span-2">
                    <Card className="border-green-500/20 shadow-[0_0_50px_rgba(22,163,74,0.05)] bg-black/40 backdrop-blur-sm">
                        <form onSubmit={onSubmit}>
                            <CardHeader>
                                <CardTitle>Track Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Select Playlists to Pitch</Label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input
                                            placeholder="Search playlists by name or genre..."
                                            className="pl-9 bg-white/5 border-white/10"
                                            value={playlistSearch}
                                            onChange={(e) => setPlaylistSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                        {allPlaylists
                                            .filter(p =>
                                                p.name.toLowerCase().includes(playlistSearch.toLowerCase()) ||
                                                p.genre.toLowerCase().includes(playlistSearch.toLowerCase())
                                            )
                                            .map((p) => (
                                                <div key={p.id}
                                                    onClick={() => togglePlaylist(p.id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedPlaylistIds.includes(p.id) ? 'bg-green-600/20 border-green-500' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${p.type === 'exclusive' ? 'bg-yellow-600/20 text-yellow-500' : p.coverImage}`}>
                                                            <Music className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-white flex items-center gap-2">
                                                                {p.name}
                                                                {p.type === 'exclusive' && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Exclusive</span>}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                <span>{p.genre}</span>
                                                                <span>•</span>
                                                                {p.type === 'exclusive' ? (
                                                                    <span className="text-yellow-500 font-bold">{pricingConfig.currency}{p.submissionFee.toLocaleString()} (24h Review)</span>
                                                                ) : p.submissionFee === 0 ? (
                                                                    <span className="text-green-400">FREE</span>
                                                                ) : (
                                                                    <span>Standard Pricing</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedPlaylistIds.includes(p.id) && <CheckCircle className="w-5 h-5 text-green-500" />}
                                                </div>
                                            ))}
                                    </div>
                                    {selectedPlaylistIds.length >= 2 && <p className="text-xs text-green-400 font-bold">Bulk discount applied!</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Tier Selection Radio */}
                                    <div className="col-span-2 space-y-2">
                                        <Label>Review Speed</Label>
                                        <div className="flex gap-4">
                                            {Object.keys(pricingConfig.tiers).map((key) => {
                                                const t = pricingConfig.tiers[key as keyof typeof pricingConfig.tiers];
                                                return (
                                                    <div key={key} onClick={() => setTier(key)}
                                                        className={`flex-1 p-3 border rounded-lg cursor-pointer text-center ${tier === key ? 'border-green-500 bg-green-500/10' : 'border-white/10'}`}>
                                                        <p className="font-bold text-white">{t.title}</p>
                                                        <p className="text-xs text-gray-400">{t.duration} Turnaround</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Artist Name</Label>
                                        <Input placeholder="e.g. Burna Boy" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Song Title</Label>
                                        <Input placeholder="e.g. Last Last" required />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Song Link (Spotify/Apple)</Label>
                                    <Input type="url" placeholder="https://..." required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" placeholder="you@example.com" required />
                                </div>
                            </CardContent>
                            <CardFooter className="flex-col gap-4">
                                {/* Summary */}
                                <div className="w-full bg-white/5 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Subtotal ({selectedPlaylistIds.length || 1} items)</span>
                                        <span>{pricingConfig.currency}{(total + (discountAmount || 0)).toLocaleString()}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-400">
                                            <span>Bulk Discount</span>
                                            <span>-{pricingConfig.currency}{discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-white border-t border-white/10 pt-2 mt-2">
                                        <span>Total Due</span>
                                        <span>{pricingConfig.currency}{total.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="w-full space-y-3">
                                    <Label>Payment Method</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            type="button"
                                            variant={paymentMethod === "direct" ? "default" : "outline"}
                                            className={paymentMethod === "direct" ? "bg-white text-black hover:bg-gray-200" : ""}
                                            onClick={() => setPaymentMethod("direct")}
                                        >
                                            <CreditCard className="w-4 h-4 mr-2" /> Pay Now
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={paymentMethod === "wallet" ? "default" : "outline"}
                                            className={paymentMethod === "wallet" ? "bg-green-600 hover:bg-green-700" : ""}
                                            onClick={() => setPaymentMethod("wallet")}
                                            disabled={!user}
                                        >
                                            <Wallet className="w-4 h-4 mr-2" /> Wallet {user ? `(${pricingConfig.currency}${user.balance.toLocaleString()})` : "(Login)"}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 font-bold shadow-lg shadow-green-900/20"
                                    disabled={isSubmitting || (paymentMethod === "wallet" && (user?.balance ?? 0) < total)}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {paymentMethod === "direct" ? (
                                                <div className="w-full">
                                                    {/* We hide the default button and show Paystack when 'direct' is selected */}
                                                    <PayWithPaystack
                                                        email="user@test.com" // In real app, use form email state
                                                        amount={total * 100} // Convert to Kobo
                                                        onSuccess={(ref) => {
                                                            setIsSubmitting(false);
                                                            setIsSuccess(true);
                                                            console.log("Payment success:", ref);
                                                        }}
                                                        onClose={() => setIsSubmitting(false)}
                                                    />
                                                </div>
                                            ) : (
                                                <span>PAY {pricingConfig.currency}{total.toLocaleString()}</span>
                                            )}
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>

                {/* SIDEBAR HELP */}
                <div className="hidden lg:block space-y-6">
                    <Card className="bg-white/5 border-none">
                        <CardHeader>
                            <CardTitle className="text-lg">Why use Wallet?</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-400 space-y-2">
                            <p>• Avoid repetitive card transactions.</p>
                            <p>• Easier budgeting for release campaigns.</p>
                            <p>• Instant verification.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-600/10 border-green-500/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Trust Guarantee</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-300 space-y-2">
                            <p>Funds are held in **Escrow** until you confirm your song is added to the playlist.</p>
                            <p>If declined, you get a full refund to your wallet.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

export default function SubmitPage() {
    return (
        <div className="container mx-auto px-4 max-w-6xl py-12 md:py-16">
            <Suspense fallback={<div className="text-center text-white">Loading form...</div>}>
                <SubmitForm />
            </Suspense>
        </div>
    );
}
