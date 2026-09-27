"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Check, Loader2, Link as LinkIcon, CheckCircle2 } from "lucide-react";

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), {
    ssr: false,
    // Never leave an invisible hole if the payment chunk is slow or fails.
    loading: () => (
        <button
            disabled
            className="w-full bg-gray-600 text-white text-base sm:text-lg py-4 sm:py-6 font-bold rounded-xl flex items-center justify-center gap-2"
        >
            Loading payment…
        </button>
    ),
});

interface MixingPackage {
    id: string;
    name: string;
    description: string;
    price_ngn: number;
    features: string[];
    delivery_days: number;
}

export function MixingOrderForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [packages, setPackages] = useState<MixingPackage[]>([]);
    const [selected, setSelected] = useState<MixingPackage | null>(null);
    const [songTitle, setSongTitle] = useState("");
    const [fileLink, setFileLink] = useState("");
    const [done, setDone] = useState(false);
    const [placing, setPlacing] = useState(false);
    const lockRef = useRef(false);

    // Pre-fill when coming from a declined song ("Get it professionally mixed")
    useEffect(() => {
        const song = searchParams.get("song");
        const submission = searchParams.get("submission");
        if (song) setSongTitle(song);
        if (submission) sessionStorage.setItem("mixing_submission_id", submission);
    }, [searchParams]);

    useEffect(() => {
        supabase
            .from("mixing_packages")
            .select("*")
            .eq("active", true)
            .order("sort_order")
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setPackages(data as MixingPackage[]);
                    setSelected(data[0] as MixingPackage);
                }
            });
    }, []);

    const valid = songTitle.trim().length > 1 && /^https?:\/\//.test(fileLink.trim()) && !!selected;

    // When the form becomes submittable, bring the payment step into view
    // (it sits below the song-details section, easy to miss on mobile).
    const paySectionRef = useRef<HTMLDivElement>(null);
    const wasValidRef = useRef(false);
    useEffect(() => {
        if (valid && !wasValidRef.current && user) {
            paySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        wasValidRef.current = valid;
    }, [valid, user]);

    const handlePaymentSuccess = useCallback(
        async (reference: any) => {
            if (lockRef.current) return;
            lockRef.current = true;

            let paystackRef = "";
            if (typeof reference === "string") paystackRef = reference;
            else if (reference && typeof reference === "object")
                paystackRef =
                    reference.reference ||
                    reference.trxref ||
                    `manual_ref_${Date.now()}`;
            else paystackRef = `manual_ref_${Date.now()}`;

            if (!user?.id || !selected) {
                toast(
                    "Payment received but the order could not be created. Contact support.",
                    "error"
                );
                lockRef.current = false;
                return;
            }

            setPlacing(true);
            const submissionId =
                sessionStorage.getItem("mixing_submission_id") || null;

            // Preferred path: server-side Paystack verification, then order creation.
            // Falls back to the direct RPC (today's behavior) only when server
            // verification isn't configured yet or the API route is unreachable.
            let orderCreated = false;
            try {
                const res = await fetch("/api/mixing/confirm-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reference: paystackRef,
                        song_title: songTitle.trim(),
                        file_link: fileLink.trim(),
                        package_id: selected.id,
                        submission_id: submissionId,
                    }),
                });
                const json = await res.json().catch(() => null);
                if (json?.ok) {
                    orderCreated = true;
                } else if (json?.error && json.error !== "verification_unavailable") {
                    throw new Error(json.error);
                }
            } catch (e: any) {
                if (e?.message && !/failed to fetch|networkerror/i.test(e.message)) {
                    toast(
                        "Payment received — order failed: " + e.message + ". Contact support.",
                        "error"
                    );
                    setPlacing(false);
                    lockRef.current = false;
                    return;
                }
                // else: fall through to legacy path
            }

            if (!orderCreated) {
                // Legacy path: create the order directly. Log it so unverified
                // orders are visible until PAYSTACK_SECRET_KEY is configured.
                fetch("/api/log-error", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        kind: "mixing_unverified_order",
                        message: `Mixing order created without server verification: ${paystackRef}`,
                        url: "/mixing",
                    }),
                }).catch(() => {});
                const { error } = await supabase.rpc("create_mixing_order", {
                    p_song_title: songTitle.trim(),
                    p_file_link: fileLink.trim(),
                    p_package_id: selected.id,
                    p_reference: paystackRef,
                    p_submission_id: submissionId,
                });
                setPlacing(false);

                if (error) {
                    toast(
                        "Payment received — order failed: " + error.message + ". Contact support.",
                        "error"
                    );
                    lockRef.current = false;
                    return;
                }
            } else {
                setPlacing(false);
            }
            sessionStorage.removeItem("mixing_submission_id");
            setDone(true);
        },
        [user?.id, selected, songTitle, fileLink, toast]
    );

    if (done) {
        return (
            <Card className="border-green-500/30 bg-gradient-to-b from-green-950/20 to-black/60">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                    <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
                    <h3 className="text-2xl font-bold text-white">Order received!</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Your payment is held in escrow. Our engineer will start
                        your mix and you'll get a watermarked preview to review.
                        Track everything in your dashboard.
                    </p>
                    <Link href="/dashboard/artist">
                        <Button className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                            Go to My Mixing Orders
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    const showStickyBar = !!user && valid && !placing && !done;

    return (
        <div className={`space-y-8 ${showStickyBar ? "pb-32" : ""}`}>
            {/* Package picker */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                    1. Choose your package
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {packages.map((pkg) => (
                        <button
                            key={pkg.id}
                            onClick={() => setSelected(pkg)}
                            className={`text-left rounded-2xl border p-5 transition-all duration-300 ${
                                selected?.id === pkg.id
                                    ? "border-green-500/60 bg-green-950/20 shadow-lg shadow-green-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/25"
                            }`}
                        >
                            <div className="font-bold text-white text-lg">{pkg.name}</div>
                            <div className="text-sm text-gray-400 mt-1">{pkg.description}</div>
                            <div className="text-2xl font-extrabold text-white mt-3">
                                ₦{Number(pkg.price_ngn).toLocaleString()}
                            </div>
                            <ul className="mt-3 space-y-1.5">
                                {(pkg.features || []).map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <div className="text-xs text-gray-500 mt-3">
                                Delivery in ~{pkg.delivery_days} days
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Song details */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                    2. Your song
                </h3>
                <Card className="border-white/10 bg-white/5">
                    <CardContent className="pt-6 space-y-4">
                        <div>
                            <label className="text-sm text-gray-300 block mb-1.5">
                                Song title
                            </label>
                            <input
                                value={songTitle}
                                onChange={(e) => setSongTitle(e.target.value)}
                                placeholder="e.g. Lagos Nights"
                                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/60"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-300 block mb-1.5">
                                Google Drive link to your song files
                            </label>
                            <div className="relative">
                                <LinkIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                                <input
                                    value={fileLink}
                                    onChange={(e) => setFileLink(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="w-full rounded-xl bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/60"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Upload your stems or bounce to Google Drive, set
                                sharing to <span className="text-gray-300">“Anyone with the link”</span>,
                                and paste the link here. WAV files get the best results.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                    3. Place your order
                </h3>
                {!user ? (
                    <Card className="border-white/10 bg-white/5">
                        <CardContent className="pt-6 pb-6 text-center">
                            <p className="text-gray-400 mb-4">
                                Log in to place your mixing order.
                            </p>
                            <Link href="/portal">
                                <Button className="bg-green-500 hover:bg-green-400 text-black rounded-xl">
                                    Log in / Sign up
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : !valid ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-sm text-gray-300 font-medium mb-2">
                            Almost there — finish these to unlock payment:
                        </p>
                        <ul className="text-sm text-gray-500 space-y-1.5">
                            {!selected && <li>• Choose a package in step 1</li>}
                            {songTitle.trim().length <= 1 && <li>• Add your song title in step 2</li>}
                            {!/^https?:\/\//.test(fileLink.trim()) && (
                                <li>• Paste your Google Drive link in step 2 (it must start with https://)</li>
                            )}
                        </ul>
                    </div>
                ) : placing ? (
                    <div className="flex items-center gap-2 text-gray-300">
                        <Loader2 className="w-5 h-5 animate-spin" /> Creating your order…
                    </div>
                ) : (
                    selected && (
                        <div ref={paySectionRef} className="rounded-2xl border border-green-500/25 bg-green-950/10 p-5 space-y-4 scroll-mt-24">
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Package</span>
                                    <span className="text-white font-medium text-right">{selected.name}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500">Song</span>
                                    <span className="text-white font-medium text-right truncate max-w-[60%]">{songTitle.trim()}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-t border-white/10 pt-2">
                                    <span className="text-gray-500">Total (held in escrow)</span>
                                    <span className="text-white font-bold">₦{Number(selected.price_ngn).toLocaleString()}</span>
                                </div>
                            </div>
                            <PayWithPaystack
                                email={user.email}
                                amount={Math.round(Number(selected.price_ngn)) * 100}
                                userId={user.id}
                                onSuccess={handlePaymentSuccess}
                                onClose={() => {}}
                            />
                            <p className="text-xs text-gray-500 max-w-md">
                                Paying places your order immediately. Your ₦{Number(selected.price_ngn).toLocaleString()} is held
                                in escrow — it only goes to the engineer when you accept
                                the finished mix. Not happy? It comes straight back to
                                your wallet.
                            </p>
                            <p className="text-xs text-gray-500 max-w-md">
                                Paying from outside Nigeria? International Visa and
                                Mastercard payments are accepted — your bank handles
                                the currency conversion.
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* Sticky pay bar: the submit action is always visible, even on mobile,
                so nobody has to hunt for the payment button below the fold. */}
            {showStickyBar && selected && (
                <div className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="text-white font-bold truncate">{selected.name}</div>
                            <div className="text-xs text-gray-400">
                                ₦{Number(selected.price_ngn).toLocaleString()} held in escrow · “{songTitle.trim()}”
                            </div>
                        </div>
                        <div className="w-44 sm:w-56 shrink-0">
                            <PayWithPaystack
                                email={user.email}
                                amount={Math.round(Number(selected.price_ngn)) * 100}
                                userId={user.id}
                                onSuccess={handlePaymentSuccess}
                                onClose={() => {}}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
