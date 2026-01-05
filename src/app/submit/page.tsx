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
import { Loader2, Music, CheckCircle, Wallet, CreditCard, User, Search, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

interface Playlist {
    id: string;
    name: string;
    genre: string;
    followers: number;
    curatorName: string;
    description: string;
    coverImage: string;
    submissionFee: number;
    type: "free" | "standard" | "express" | "exclusive";
    playlistLink?: string;
    isAdmin: boolean;
}

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), { ssr: false });

function SubmitForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, deductFunds } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"wallet" | "direct">("direct");

    // Form State
    const [artistName, setArtistName] = useState("");
    const [songTitle, setSongTitle] = useState("");
    const [songLink, setSongLink] = useState("");
    const [email, setEmail] = useState("");

    // Pre-fill user data
    useEffect(() => {
        if (user) {
            if (user.name) setArtistName(user.name);
            if (user.email) setEmail(user.email);
        }
    }, [user]);

    const [step, setStep] = useState<"selection" | "details">("selection");

    const [tier, setTier] = useState("standard");
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
    const [playlistSearch, setPlaylistSearch] = useState("");
    const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);

    const fetchPlaylists = async () => {
        const { data, error } = await supabase
            .from('playlists')
            .select('*, curator:profiles!curator_id(role, full_name)')
            .eq('is_active', true);

        if (data) {
            const mapped = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                genre: p.genre,
                followers: p.followers,
                curatorName: p.curator?.full_name || 'Unknown',
                description: p.description,
                coverImage: p.cover_image,
                submissionFee: p.submission_fee,
                type: p.type,
                playlistLink: p.playlist_link,
                isAdmin: p.curator?.role === 'admin'
            }));
            // Sort: Admin first (though we split visually), then by followers
            mapped.sort((a: Playlist, b: Playlist) => b.followers - a.followers);
            setAllPlaylists(mapped);
        }
        setIsLoadingPlaylists(false);
    };

    useEffect(() => {
        fetchPlaylists();
    }, []);

    useEffect(() => {
        fetchPlaylists();
    }, []);

    useEffect(() => {
        const playlistParam = searchParams.get("playlist");
        if (playlistParam && !selectedPlaylistIds.includes(playlistParam)) {
            setSelectedPlaylistIds([playlistParam]);
        }
        const tierParam = searchParams.get("tier");
        if (tierParam) setTier(tierParam);
    }, [searchParams]);

    const selectedTierConfig = pricingConfig.tiers[tier as keyof typeof pricingConfig.tiers];

    const togglePlaylist = (id: string) => {
        setSelectedPlaylistIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const calculateTotal = () => {
        let paidTotal = 0;
        let paidCount = 0;

        if (selectedPlaylistIds.length === 0) {
            return { total: selectedTierConfig.price, discount: 0 };
        }

        selectedPlaylistIds.forEach(id => {
            const playlist = allPlaylists.find(p => p.id === id);
            if (playlist) {
                let cost = 0;
                if (playlist.type === 'exclusive') {
                    cost = pricingConfig.tiers.exclusive.price;
                } else if (playlist.type === 'express') {
                    cost = pricingConfig.tiers.express.price;
                } else if (playlist.type === 'free') {
                    cost = 0;
                } else {
                    // Standard playlists follow the USER selected tier (Standard vs Express vs Exclusive upgrade)
                    // Wait, if user selects 'Standard', and playlist is 'Standard', cost is Standard.
                    // If user selects 'Express' (global tier), cost is Express.
                    // However, if playlist is explicitly TYPE 'express', it FORCES express price? 
                    // Let's assume Curator-set 'express' means it's a Premium playlist that COSTS Express price always.
                    // Re-reading user request: "when a user selecets a playlist the price is added to it automatically"
                    // And "add express and exclusive prises there"

                    // Logic: 
                    // - Exclusive Playlist -> Exclusive Price (Override)
                    // - Express Playlist -> Express Price (Override)
                    // - Standard Playlist -> Uses `selectedTierConfig.price` (User choice of speed) OR Standard Price? 
                    // Usually Standard Playlists allow user to choose Speed. 
                    cost = selectedTierConfig.price;
                }

                if (cost > 0) {
                    paidTotal += cost;
                    paidCount++;
                }
            }
        });

        let discount = 0;
        // Discount applies only if 7 or more PAID playlists are selected
        if (paidCount >= 7) {
            discount = Math.floor(paidTotal * 0.10); // 10% discount
        }

        return { total: paidTotal - discount, discount };
    };

    const { total, discount: discountAmount } = calculateTotal();

    async function saveSubmissions() {
        if (!user) {
            alert("You must be logged in to submit.");
            router.push("/portal");
            return false;
        }

        // Calculate total and discount distribution
        const { total: grandTotal, discount: totalDiscount } = calculateTotal();

        // Count how many playlists have a cost > 0 to distribute discount
        const paidPlaylistsCount = selectedPlaylistIds.filter(id => {
            const p = allPlaylists.find(pl => pl.id === id);
            if (!p) return false;
            // Simplified check: does it have a cost?
            if (p.type === 'exclusive') return pricingConfig.tiers.exclusive.price > 0;
            if (p.type === 'express') return pricingConfig.tiers.express.price > 0;
            if (p.type === 'free') return false;
            return selectedTierConfig.price > 0;
        }).length;

        const discountPerItem = paidPlaylistsCount > 0 ? totalDiscount / paidPlaylistsCount : 0;

        const submissionsToInsert = selectedPlaylistIds.map(playlistId => {
            const playlist = allPlaylists.find(p => p.id === playlistId);
            let cost = 0;
            let finalTier = tier;

            if (playlist) {
                if (playlist.type === 'exclusive') {
                    cost = pricingConfig.tiers.exclusive.price;
                    finalTier = 'exclusive';
                }
                else if (playlist.type === 'express') {
                    cost = pricingConfig.tiers.express.price;
                    finalTier = 'express';
                }
                else if (playlist.type === 'free') {
                    cost = 0;
                }
                else {
                    cost = selectedTierConfig.price;
                }
            }

            // Apply distributed discount if this item has a cost
            const finalCost = cost > 0 ? Math.max(0, cost - discountPerItem) : 0;

            return {
                artist_id: user.id,
                playlist_id: playlistId,
                song_title: songTitle,
                artist_name: artistName,
                song_link: songLink,
                tier: finalTier,
                amount_paid: finalCost,
                status: 'pending'
            };
        });

        const { error } = await supabase.from('submissions').insert(submissionsToInsert);

        if (error) {
            console.error("Submission error:", error);
            alert("Failed to save submission. Please contact support.");
            return false;
        }
        return true;
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!user) {
            alert("Please login to submit.");
            router.push("/portal");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Wallet Deduction (if not free)
            if (total > 0) {
                if (user.balance < total) {
                    alert("Insufficient funds. Please load your wallet via your dashboard.");
                    setIsSubmitting(false);
                    return;
                }

                // Check deductFunds result - local optimistic update
                const success = deductFunds(total);
                if (!success) {
                    throw new Error("Unable to process wallet deduction. Please refresh and try again or contact support.");
                }

                // DB Update for Balance
                const { error: balanceError } = await supabase
                    .from('profiles')
                    .update({ balance: user.balance - total })
                    .eq('id', user.id);

                if (balanceError) {
                    // Critical Error: Money deducted locally but not remote.
                    // Ideally we should rollback local state, but strict reload will fix.
                    console.error("Balance update failed:", balanceError);
                    alert("Network error updating balance. Submissions may not be saved. Please contact support immediately.");
                    throw new Error("Database balance update failed: " + balanceError.message);
                }

                // Insert Transaction Record
                await supabase.from('transactions').insert({
                    user_id: user.id,
                    amount: -total, // Negative for spending
                    type: 'payment',
                    description: `Submission Fee: ${selectedPlaylistIds.length} Playlists`
                });
            }

            // 2. Save Submission
            const saved = await saveSubmissions();
            if (saved) {
                setIsSuccess(true);
            } else {
                // If submission save failed but money was taken, we technically should refund or alert support.
                // For now, alerting user.
                alert("Submission save failed. Please contact support if your wallet was charged.");
            }

        } catch (err: any) {
            console.error("Submission Process Error:", err);
            alert("An error occurred: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
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
                <h1 className="text-3xl font-bold text-white sm:text-4xl text-pretty">
                    {step === 'selection' ? 'Find the Perfect Playlists' : 'Submit Your Song'}
                </h1>
                <p className="text-gray-400 max-w-xl mx-auto">
                    {step === 'selection'
                        ? 'Browse our curated list of high-impact playlists. Select the ones that match your vibe.'
                        : 'Review your selection and complete your submission details.'}
                    {!user && step === 'selection' && <span className="block text-xs mt-2 text-green-400 cursor-pointer hover:underline" onClick={() => router.push("/portal")}>Login for Wallet & History</span>}
                </p>
            </div>

            {step === 'selection' && (
                <div className="space-y-6">
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search by genre, name, or mood..."
                            className="pl-10 h-12 bg-white/5 border-white/10 text-lg rounded-full"
                            value={playlistSearch}
                            onChange={(e) => setPlaylistSearch(e.target.value)}
                        />
                    </div>

                    {isLoadingPlaylists ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
                        </div>
                    ) : (
                        <>

                            <div className="pb-24">
                                <div className="space-y-12">
                                    {/* Section 1: Official AfroPitch Playlists */}
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                            <span className="bg-green-500 w-2 h-8 rounded-full"></span>
                                            AfroPitch Team Playlists
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {allPlaylists
                                                .filter(p => p.isAdmin)
                                                .filter(p =>
                                                    p.name.toLowerCase().includes(playlistSearch.toLowerCase()) ||
                                                    p.genre.toLowerCase().includes(playlistSearch.toLowerCase())
                                                )
                                                .map((p) => (
                                                    <div key={p.id}
                                                        onClick={() => togglePlaylist(p.id)}
                                                        className={`group relative overflow-hidden rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${selectedPlaylistIds.includes(p.id) ? 'border-green-500 bg-green-900/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                                                    >
                                                        <div className="aspect-square relative">
                                                            {p.coverImage.startsWith('http') ? (
                                                                <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className={`w-full h-full flex items-center justify-center ${p.type === 'exclusive' ? 'bg-gradient-to-br from-yellow-600/20 to-black' : 'bg-gradient-to-br from-gray-800 to-black'}`}>
                                                                    <Music className="w-20 h-20 text-white/10" />
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <h3 className="font-bold text-white text-lg leading-tight">{p.name}</h3>
                                                                        <p className="text-sm text-gray-300 mb-0.5">{p.genre}</p>
                                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.curatorName}</span>
                                                                            <span>•</span>
                                                                            <span>{p.followers.toLocaleString()} Fans</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Link href={`/playlist/${p.id}`} onClick={(e) => e.stopPropagation()}>
                                                                        <div className="bg-white/20 backdrop-blur-md rounded-full p-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer" title="View Details">
                                                                            <Eye className="w-6 h-6" />
                                                                        </div>
                                                                    </Link>
                                                                    {p.playlistLink && (
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); window.open(p.playlistLink, '_blank'); }}
                                                                            className="bg-white/20 backdrop-blur-md rounded-full p-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                                                                            title="Listen to Playlist"
                                                                        >
                                                                            <ExternalLink className="w-6 h-6" />
                                                                        </div>
                                                                    )}
                                                                    {selectedPlaylistIds.includes(p.id) ? (
                                                                        <div className="bg-green-500 rounded-full p-2 text-black shadow-lg shadow-green-500/50">
                                                                            <CheckCircle className="w-6 h-6" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-white/20 backdrop-blur-md rounded-full p-2 text-white hover:bg-white hover:text-black transition-colors">
                                                                            <div className="w-6 h-6 flex items-center justify-center font-bold text-lg">+</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute top-3 left-3 flex gap-2">
                                                            {p.type === 'exclusive' && (
                                                                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-lg">Exclusive</span>
                                                            )}
                                                            {p.type === 'free' && ( // Added badge for FREE
                                                                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-lg">Free Submission</span>
                                                            )}
                                                        </div>

                                                        <div className="absolute top-3 right-3">
                                                            <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10">
                                                                {p.type === 'exclusive'
                                                                    ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                                                    : p.type === 'express'
                                                                        ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                                                        : p.type === 'free' ? 'FREE' : 'Std Price'
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Section 2: Other Curator Playlists */}
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                            <span className="bg-purple-500 w-2 h-8 rounded-full"></span>
                                            Community Curator Playlists
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {allPlaylists
                                                .filter(p => !p.isAdmin)
                                                .filter(p =>
                                                    p.name.toLowerCase().includes(playlistSearch.toLowerCase()) ||
                                                    p.genre.toLowerCase().includes(playlistSearch.toLowerCase())
                                                )
                                                .map((p) => (
                                                    <div key={p.id}
                                                        onClick={() => togglePlaylist(p.id)}
                                                        className={`group relative overflow-hidden rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${selectedPlaylistIds.includes(p.id) ? 'border-green-500 bg-green-900/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                                                    >
                                                        <div className="aspect-square relative">
                                                            {p.coverImage.startsWith('http') ? (
                                                                <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className={`w-full h-full flex items-center justify-center ${p.type === 'exclusive' ? 'bg-gradient-to-br from-yellow-600/20 to-black' : 'bg-gradient-to-br from-gray-800 to-black'}`}>
                                                                    <Music className="w-20 h-20 text-white/10" />
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <h3 className="font-bold text-white text-lg leading-tight">{p.name}</h3>
                                                                        <p className="text-sm text-gray-300 mb-0.5">{p.genre}</p>
                                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.curatorName}</span>
                                                                            <span>•</span>
                                                                            <span>{p.followers.toLocaleString()} Fans</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    {p.playlistLink && (
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); window.open(p.playlistLink, '_blank'); }}
                                                                            className="bg-white/20 backdrop-blur-md rounded-full p-2 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                                                                            title="Listen to Playlist"
                                                                        >
                                                                            <ExternalLink className="w-6 h-6" />
                                                                        </div>
                                                                    )}
                                                                    {selectedPlaylistIds.includes(p.id) ? (
                                                                        <div className="bg-green-500 rounded-full p-2 text-black shadow-lg shadow-green-500/50">
                                                                            <CheckCircle className="w-6 h-6" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-white/20 backdrop-blur-md rounded-full p-2 text-white hover:bg-white hover:text-black transition-colors">
                                                                            <div className="w-6 h-6 flex items-center justify-center font-bold text-lg">+</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute top-3 left-3 flex gap-2">
                                                            {p.type === 'exclusive' && (
                                                                <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-lg">Exclusive</span>
                                                            )}
                                                            {p.type === 'free' && ( // Added badge for FREE
                                                                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-lg">Free Submission</span>
                                                            )}
                                                        </div>

                                                        <div className="absolute top-3 right-3">
                                                            <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10">
                                                                {p.type === 'exclusive'
                                                                    ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                                                    : p.type === 'express'
                                                                        ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                                                        : p.type === 'free' ? 'FREE' : 'Std Price'
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`fixed bottom-0 left-0 right-0 bg-black/90 border-t border-green-500/30 backdrop-blur-xl p-4 transition-transform duration-300 z-50 ${selectedPlaylistIds.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
                                <div className="container mx-auto max-w-6xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-500 text-black font-bold w-10 h-10 rounded-full flex items-center justify-center text-lg">
                                            {selectedPlaylistIds.length}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">
                                                {selectedPlaylistIds.length} Playlists • {pricingConfig.currency}{total.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-400">Step 1 of 2</p>
                                        </div>
                                    </div>
                                    <Button size="lg" onClick={() => setStep('details')} className="bg-green-600 hover:bg-green-700 text-lg px-8 rounded-full shadow-lg shadow-green-900/20 animate-pulse">
                                        Continue to Submit
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {
                step === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="lg:col-span-2">
                            <Card className="border-green-500/20 shadow-[0_0_50px_rgba(22,163,74,0.05)] bg-black/40 backdrop-blur-sm">
                                <form onSubmit={onSubmit}>
                                    <CardHeader>
                                        <CardTitle>Track Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label>Selected Playlists ({selectedPlaylistIds.length})</Label>
                                                <Button variant="ghost" size="sm" onClick={() => setStep('selection')} className="text-green-500 hover:text-green-400">
                                                    Edit Selection
                                                </Button>
                                            </div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                {allPlaylists
                                                    .filter(p => selectedPlaylistIds.includes(p.id))
                                                    .map((p) => (
                                                        <div key={p.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center overflow-hidden ${p.coverImage.startsWith('http') ? '' : p.coverImage}`}>
                                                                    {p.coverImage.startsWith('http') ? (
                                                                        <img src={p.coverImage} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Music className="w-4 h-4 text-white" />
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-bold text-white truncate max-w-[150px]">{p.name}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400">
                                                                {p.type === 'exclusive'
                                                                    ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                                                    : p.type === 'express'
                                                                        ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                                                        : 'Standard'}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                            {(discountAmount > 0) && <p className="text-xs text-green-400 font-bold">Bulk discount applied (10% off paid items)!</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <Label>Review Speed</Label>
                                                <div className="flex gap-4">
                                                    {Object.keys(pricingConfig.tiers)
                                                        .filter(key => key !== 'exclusive' && (key !== 'free' || tier === 'free'))
                                                        .map((key) => {
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
                                                <Input placeholder="e.g. Burna Boy" required value={artistName} onChange={e => setArtistName(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Song Title</Label>
                                                <Input placeholder="e.g. Last Last" required value={songTitle} onChange={e => setSongTitle(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Song Link (Spotify/Apple)</Label>
                                            <Input type="url" placeholder="https://..." required value={songLink} onChange={e => setSongLink(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-4">
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

                                        <div className="w-full space-y-3">
                                            <div className="bg-white/5 p-4 rounded-lg flex items-center justify-between border border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <Wallet className="w-5 h-5 text-green-500" />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-sm">Pay with Wallet</p>
                                                        <p className="text-xs text-gray-400">Balance: {user ? `${pricingConfig.currency}${user.balance.toLocaleString()}` : 'Login to view'}</p>
                                                    </div>
                                                </div>
                                                {!user ? (
                                                    <Button size="sm" variant="outline" onClick={() => router.push("/portal")}>Login</Button>
                                                ) : (
                                                    user.balance < total && (
                                                        <Button size="sm" variant="destructive" onClick={() => router.push("/dashboard/artist")}>Load Funds</Button>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 font-bold shadow-lg shadow-green-900/20"
                                            disabled={isSubmitting || !user || (total > 0 && user.balance < total)}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <span>
                                                    {!user ? "Login to Pay" : (total > 0 && user.balance < total) ? "Insufficient Balance" : total === 0 ? "SUBMIT FREE" : `PAY ${pricingConfig.currency}${total.toLocaleString()}`}
                                                </span>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </div>

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
                )
            }
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
