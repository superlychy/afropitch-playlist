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

    return (
        <div className="space-y-8">
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
                    3. Secure payment (escrow)
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
                    <p className="text-sm text-gray-500">
                        Pick a package, add your song title and a valid Drive link to continue.
                    </p>
                ) : placing ? (
                    <div className="flex items-center gap-2 text-gray-300">
                        <Loader2 className="w-5 h-5 animate-spin" /> Creating your order…
                    </div>
                ) : (
                    selected && (
                        <div className="flex flex-col items-start gap-3">
                            <PayWithPaystack
                                email={user.email}
                                amount={Math.round(Number(selected.price_ngn)) * 100}
                                userId={user.id}
                                onSuccess={handlePaymentSuccess}
                                onClose={() => {}}
                            />
                            <p className="text-xs text-gray-500 max-w-md">
                                Your ₦{Number(selected.price_ngn).toLocaleString()} is held
                                in escrow — it only goes to the engineer when you accept
                                the finished mix. Not happy? It comes straight back to
                                your wallet.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
