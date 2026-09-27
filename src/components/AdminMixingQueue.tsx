"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MixingChat } from "@/components/MixingChat";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, AudioWaveform, MessageCircle } from "lucide-react";

interface MixingOrder {
    id: string;
    artist_id: string;
    song_title: string;
    package_name: string;
    amount: number;
    status: string;
    file_link: string;
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

export function AdminMixingQueue() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<MixingOrder[]>([]);
    const [artists, setArtists] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);
    const [deliverId, setDeliverId] = useState<string | null>(null);
    const [openChatFor, setOpenChatFor] = useState<string | null>(null);
    const [unread, setUnread] = useState<Record<string, number>>({});
    const [previewLink, setPreviewLink] = useState("");
    const [fullLink, setFullLink] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("mixing_orders")
            .select("id, artist_id, song_title, package_name, amount, status, file_link, preview_link, full_link, created_at")
            .order("created_at", { ascending: false })
            .limit(100);
        const list = (data || []) as MixingOrder[];
        setOrders(list);
        const ids = [...new Set(list.map((o) => o.artist_id))];
        if (ids.length > 0) {
            const { data: profs } = await supabase
                .from("profiles")
                .select("id, email, full_name")
                .in("id", ids);
            const map: Record<string, string> = {};
            (profs || []).forEach((p: any) => {
                map[p.id] = p.full_name ? `${p.full_name} (${p.email})` : p.email;
            });
            setArtists(map);
        }
        const { data: { user: me } } = await supabase.auth.getUser();
        if (me && list.length > 0) {
            const { data: msgs } = await supabase.from("mixing_messages").select("order_id").in("order_id", list.map((o) => o.id)).neq("sender_id", me.id).eq("read_by_recipient", false);
            const counts: Record<string, number> = {};
            (msgs ?? []).forEach((m: { order_id: string }) => { counts[m.order_id] = (counts[m.order_id] || 0) + 1; });
            setUnread(counts);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const run = async (id: string, fn: string, args: any, okMsg: string) => {
        setActing(id);
        const { error } = await supabase.rpc(fn, args);
        setActing(null);
        if (error) toast("Failed: " + error.message, "error");
        else { toast(okMsg, "success"); fetchAll(); }
    };

    const start = (id: string) => run(id, "start_mix", { p_order_id: id }, "Mix started.");
    const deliver = (id: string) => {
        if (!/^https?:\/\//.test(previewLink.trim())) { toast("Enter a valid preview link.", "error"); return; }
        run(id, "deliver_mix", { p_order_id: id, p_preview_link: previewLink.trim(), p_full_link: fullLink.trim() || null }, "Preview sent to artist.");
        setDeliverId(null); setPreviewLink(""); setFullLink("");
    };
    const refund = (id: string) => {
        const reason = window.prompt("Refund reason (shown in the transaction record):", "admin refund") || "admin refund";
        run(id, "refund_mix", { p_order_id: id, p_reason: reason }, "Refunded to artist wallet.");
    };

    if (loading) return <p className="text-gray-500">Loading mixing orders…</p>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <AudioWaveform className="w-5 h-5 text-gray-400" /> Mixing Orders
                    <span className="text-xs font-normal text-gray-500">({orders.length})</span>
                </h2>
                <Button variant="outline" size="sm" onClick={fetchAll} className="border-white/10 text-xs">Refresh</Button>
            </div>
            {orders.length === 0 && (
                <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
                    <p className="text-gray-400 text-sm">No mixing orders yet.</p>
                </Card>
            )}
            {orders.map((o) => (
                <Card key={o.id} className="bg-black/40 border-white/10">
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0">
                                <h4 className="font-bold text-white text-sm sm:text-base truncate">{o.song_title}</h4>
                                <p className="text-xs text-gray-400 truncate">
                                    {artists[o.artist_id] || o.artist_id.slice(0, 8)} · {o.package_name} · ₦{Number(o.amount).toLocaleString()} · {new Date(o.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <span className={`inline-block px-2 py-1 rounded text-[10px] uppercase font-bold self-start ${STATUS_STYLE[o.status] || "bg-white/10 text-gray-400"}`}>
                                {o.status.replace(/_/g, " ")}
                            </span>
                        </div>
                        <a href={o.file_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline break-all">
                            <ExternalLink className="w-3 h-3 shrink-0" /> Artist's song files
                        </a>
                        {o.preview_link && (
                            <p className="text-[11px] text-gray-500 truncate">Preview: {o.preview_link}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {o.status === "in_escrow" && (
                                <Button size="sm" disabled={acting === o.id} onClick={() => start(o.id)} className="bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs">
                                    {acting === o.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Start mix
                                </Button>
                            )}
                            {(o.status === "in_escrow" || o.status === "in_progress") && (
                                <Button size="sm" variant="outline" onClick={() => { setDeliverId(deliverId === o.id ? null : o.id); setPreviewLink(""); setFullLink(""); }} className="border-white/20 text-xs rounded-lg">
                                    Deliver mix
                                </Button>
                            )}
                            {(o.status === "in_escrow" || o.status === "in_progress" || o.status === "delivered") && (
                                <Button size="sm" variant="ghost" disabled={acting === o.id} onClick={() => refund(o.id)} className="text-xs text-red-400 hover:text-red-300 rounded-lg">
                                    Refund
                                </Button>
                            )}
                        </div>
                        {deliverId === o.id && (
                            <div className="space-y-2 rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-xs text-gray-400">The artist hears only the preview until they accept. Watermark tag is added automatically by the player.</p>
                                <Input value={previewLink} onChange={(e) => setPreviewLink(e.target.value)} placeholder="Preview audio link (Drive: Anyone with the link)" className="bg-black/40 border-white/10 text-white text-xs" />
                                <Input value={fullLink} onChange={(e) => setFullLink(e.target.value)} placeholder="Full mix link (released after acceptance)" className="bg-black/40 border-white/10 text-white text-xs" />
                                <Button size="sm" disabled={acting === o.id} onClick={() => deliver(o.id)} className="bg-green-500 hover:bg-green-400 text-black rounded-lg text-xs">
                                    {acting === o.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Send preview to artist
                                </Button>
                            </div>
                        )}
                    <div className="pt-3 border-t border-white/10">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const next = openChatFor === o.id ? null : o.id;
                                setOpenChatFor(next);
                                if (next === null) fetchAll();
                            }}
                            className="rounded-lg text-xs"
                        >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            {openChatFor === o.id ? "Hide messages" : "Messages"}
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
    );
}
