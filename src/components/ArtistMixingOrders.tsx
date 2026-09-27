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

interface MixingOrder {
    id: string;
    song_title: string;
    package_name: string;
    amount: number;
    status: string;
    preview_link: string | null;
    full_link: string | null;
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
    const [unread, setUnread] = useState<Record<string, number>>({});

    const fetchOrders = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        const { data } = await supabase
            .from("mixing_orders")
            .select("id, song_title, package_name, amount, status, preview_link, full_link, created_at")
            .eq("artist_id", user.id)
            .order("created_at", { ascending: false });
        if (data) setOrders(data as MixingOrder[]);
        setLoading(false);
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
        else { toast("Mix accepted — full file unlocked!", "success"); fetchOrders(); }
    };

    const refund = async (id: string) => {
        if (!window.confirm("Request a refund? The escrowed amount goes straight back to your wallet.")) return;
        setActing(id);
        const { error } = await supabase.rpc("refund_mix", { p_order_id: id, p_reason: "artist requested refund" });
        setActing(null);
        if (error) toast("Could not refund: " + error.message, "error");
        else { toast("Refunded to your wallet.", "success"); fetchOrders(); }
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
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            disabled={acting === o.id}
                                            onClick={() => accept(o.id)}
                                            className="bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm"
                                        >
                                            {acting === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                            Accept mix & release payment
                                        </Button>
                                        <Button
                                            disabled={acting === o.id}
                                            onClick={() => refund(o.id)}
                                            variant="outline"
                                            className="border-white/20 text-gray-300 rounded-xl text-sm"
                                        >
                                            Not happy — refund me
                                        </Button>
                                    </div>
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
                                <Button
                                    disabled={acting === o.id}
                                    onClick={() => refund(o.id)}
                                    variant="ghost"
                                    className="text-xs text-gray-500 hover:text-gray-300 h-auto p-0"
                                >
                                    Cancel order & refund to wallet
                                </Button>
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
