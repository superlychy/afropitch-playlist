"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MixPreviewPlayer } from "@/components/MixPreviewPlayer";
import { MixingChat } from "@/components/MixingChat";
import { AudioWaveform, Loader2, ExternalLink, CheckCircle2, MessageCircle } from "lucide-react";
import { deleteMixPreview, isCloudinaryUrl } from "@/lib/cloudinary";

interface MixingOrder {
    id: string;
    song_title: string;
    package_name: string;
    amount: number;
    status: string;
    preview_link: string | null;
    full_link: string | null;
    refund_requested_at: string | null;
    delivered_at: string | null;
    created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
    awaiting_payment: "bg-yellow-500/20 text-yellow-400",
    in_escrow: "bg-yellow-500/20 text-yellow-400",
    in_progress: "bg-blue-500/20 text-blue-400",
    delivered: "bg-green-500/20 text-green-400",
    completed: "bg-green-500/30 text-green-300",
    refunded: "bg-white/10 text-gray-400",
    cancelled: "bg-white/10 text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
    awaiting_payment: "Awaiting payment",
    in_escrow: "Payment held in escrow",
    in_progress: "Mixing in progress",
    delivered: "Preview ready — your call",
    completed: "Completed",
    refunded: "Refunded to wallet",
    cancelled: "Cancelled",
};

export function ArtistMixingOrders() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<MixingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);
    const [openChatFor, setOpenChatFor] = useState<string | null>(null);
    const [refundFor, setRefundFor] = useState<string | null>(null);
    const [refundReason, setRefundReason] = useState("");
    const [unread, setUnread] = useState<Record<string, number>>({});

    const fetchOrders = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        const { data } = await supabase
            .from("mixing_orders")
            .select("id, song_title, package_name, amount, status, preview_link, full_link, refund_requested_at, delivered_at, created_at")
            .eq("artist_id", user.id)
            .order("created_at", { ascending: false });
        if (data) setOrders(data as MixingOrder[]);
        setLoading(false);
        // Self-healing: any completed/refunded order still holding a Cloudinary
        // preview gets it deleted (covers cases where the accept-time call failed).
        (data as MixingOrder[] | null)?.forEach((o) => {
            if ((o.status === "completed" || o.status === "refunded") && isCloudinaryUrl(o.preview_link)) {
                void deleteMixPreview(o.id);
            }
        });
        if (user?.id && data) {
            const ids = (data as MixingOrder[]).map((o) => o.id);
            const { data: msgs } = await supabase.from("mixing_messages").select("order_id").in("order_id", ids).neq("sender_id", user.id).eq("read_by_recipient", false);
            const counts: Record<string, number> = {};
            (msgs ?? []).forEach((m: { order_id: string }) => { counts[m.order_id] = (counts[m.order_id] || 0) + 1; });
            setUnread(counts);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const accept = async (id: string) => {
        if (!window.confirm("Accept this mix? Your escrowed payment will be released to the engineer.")) return;
        setActing(id);
        const { error } = await supabase.rpc("accept_mix", { p_order_id: id });
        setActing(null);
        if (error) toast("Could not accept: " + error.message, "error");
        else {
            toast("Mix accepted — full file unlocked!", "success");
            // Deal is over — remove the preview from Cloudinary.
            void deleteMixPreview(id);
            fetchOrders();
        }
    };

    const requestRefund = async (id: string) => {
        if (!refundReason.trim()) { toast("Please tell us briefly why you're requesting a refund.", "error"); return; }
        setActing(id);
        const { error } = await supabase.rpc("request_mix_refund", { p_order_id: id, p_reason: refundReason.trim() });
        setActing(null);
        if (error) toast("Could not request refund: " + error.message, "error");
        else { toast("Refund requested — we'll review it shortly.", "success"); setRefundFor(null); setRefundReason(""); fetchOrders(); }
    };

    if (loading) return <p className="text-gray-500 text-sm">Loading mixing orders…</p>;
    if (orders.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <AudioWaveform className="w-5 h-5 text-gray-400" /> My Mixing Orders
            </h2>
            <div className="space-y-3">
                {orders.map((o) => (
                    <Card key={o.id} className="bg-white/5 border-white/10">
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-white text-sm sm:text-base">{o.song_title}</h4>
                                    <p className="text-xs text-gray-400">
                                        {o.package_name} · ₦{Number(o.amount).toLocaleString()} · {new Date(o.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`inline-block px-2 py-1 rounded text-[10px] uppercase font-bold self-start ${STATUS_STYLE[o.status] || "bg-white/10 text-gray-400"}`}>
                                    {STATUS_LABEL[o.status] || o.status}
                                </span>
                            </div>

                            {(o.status === "in_escrow" || o.status === "in_progress") && (
                                <p className="text-xs text-gray-500">
                                    {o.status === "in_escrow"
                                        ? "Your payment is held safely. The engineer will start your mix shortly."
                                        : "Your mix is being worked on. You'll get a watermarked preview to review."}
                                </p>
                            )}

                            {o.status === "delivered" && o.preview_link && (
                                <div className="space-y-3">
                                    <MixPreviewPlayer src={o.preview_link} />
                                    {o.delivered_at && !o.refund_requested_at && (
                                        <p className="text-xs text-yellow-400/90">
                                            Please accept or request a refund within 3 days of delivery
                                            (by {new Date(new Date(o.delivered_at).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()})
                                            — after that the order auto-completes and your payment is released.
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            disabled={acting === o.id}
                                            onClick={() => accept(o.id)}
                                            className="bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm"
                                        >
                                            {acting === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                            Accept mix & release payment
                                        </Button>
                                        {o.refund_requested_at ? (
                                            <span className="inline-flex items-center text-xs text-yellow-400 border border-yellow-500/30 rounded-xl px-3 py-2">
                                                Refund requested — awaiting review
                                            </span>
                                        ) : (
                                            <Button
                                                disabled={acting === o.id}
                                                onClick={() => { setRefundFor(o.id); setRefundReason(""); }}
                                                variant="outline"
                                                className="border-white/20 text-gray-300 rounded-xl text-sm"
                                            >
                                                Not happy — request a refund
                                            </Button>
                                        )}
                                    </div>
                                    {refundFor === o.id && !o.refund_requested_at && (
                                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                                            <p className="text-xs text-gray-400">Why are you requesting a refund? Our team will review it.</p>
                                            <textarea
                                                value={refundReason}
                                                onChange={(e) => setRefundReason(e.target.value)}
                                                placeholder="e.g. The mix isn't what I asked for…"
                                                rows={2}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-2"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    disabled={acting === o.id}
                                                    onClick={() => requestRefund(o.id)}
                                                    className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-xs"
                                                >
                                                    {acting === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send refund request"}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setRefundFor(null)} className="text-xs text-gray-500 rounded-lg">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {o.status === "completed" && o.full_link && (
                                <a href={o.full_link} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="border-green-500/40 text-green-400 rounded-xl text-sm">
                                        <ExternalLink className="w-4 h-4 mr-1" /> Download full mix
                                    </Button>
                                </a>
                            )}

                            {(o.status === "in_escrow" || o.status === "in_progress") && (
                                o.refund_requested_at ? (
                                    <p className="text-xs text-yellow-400">Refund requested — awaiting review.</p>
                                ) : (
                                    <Button
                                        disabled={acting === o.id}
                                        onClick={() => { setRefundFor(refundFor === o.id ? null : o.id); setRefundReason(""); }}
                                        variant="ghost"
                                        className="text-xs text-gray-500 hover:text-gray-300 h-auto p-0"
                                    >
                                        Request a refund
                                    </Button>
                                )
                            )}
                            {refundFor === o.id && !o.refund_requested_at && o.status !== "delivered" && (
                                <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                                    <p className="text-xs text-gray-400">Why are you requesting a refund? Our team will review it.</p>
                                    <textarea
                                        value={refundReason}
                                        onChange={(e) => setRefundReason(e.target.value)}
                                        placeholder="e.g. I need to cancel this order…"
                                        rows={2}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-2"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            disabled={acting === o.id}
                                            onClick={() => requestRefund(o.id)}
                                            className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-xs"
                                        >
                                            {acting === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send refund request"}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setRefundFor(null)} className="text-xs text-gray-500 rounded-lg">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="pt-3 border-t border-white/10">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const next = openChatFor === o.id ? null : o.id;
                                        setOpenChatFor(next);
                                        if (next === null) fetchOrders();
                                    }}
                                    className="rounded-xl text-xs"
                                >
                                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                                    {openChatFor === o.id ? "Hide messages" : "Message the engineer"}
                                    {(unread[o.id] || 0) > 0 && (
                                        <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-green-500 text-black text-[10px] font-bold">
                                            {unread[o.id]}
                                        </span>
                                    )}
                                </Button>
                                {openChatFor === o.id && (
                                    <div className="mt-3">
                                        <MixingChat orderId={o.id} />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
