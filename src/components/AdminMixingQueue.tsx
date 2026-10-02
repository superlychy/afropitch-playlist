"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MixingChat } from "@/components/MixingChat";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, AudioWaveform, MessageCircle, Upload, Landmark } from "lucide-react";
import { uploadToCloudinary, deleteMixPreview } from "@/lib/cloudinary";

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
    delivered_at: string | null;
    first_final_delivered_at: string | null;
    preview_accepted_at: string | null;
    refund_bank_name: string | null;
    refund_account_number: string | null;
    refund_account_name: string | null;
    refund_percent: number | null;
    refund_amount: number | null;
    refund_fee_amount: number | null;
    created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
    awaiting_payment: "bg-yellow-500/20 text-yellow-400",
    in_escrow: "bg-yellow-500/20 text-yellow-400",
    in_progress: "bg-blue-500/20 text-blue-400",
    delivered: "bg-green-500/20 text-green-400",
    final_pending: "bg-blue-500/20 text-blue-300",
    final_delivered: "bg-green-500/20 text-green-300",
    refund_pending: "bg-orange-500/20 text-orange-300",
    completed: "bg-green-500/30 text-green-300",
    refunded: "bg-white/10 text-gray-400",
};

export function AdminMixingQueue() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<MixingOrder[]>([]);
    const [artists, setArtists] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);
    const [deliverId, setDeliverId] = useState<string | null>(null);
    const [deliverKind, setDeliverKind] = useState<"preview" | "final">("preview");
    const [openChatFor, setOpenChatFor] = useState<string | null>(null);
    const [unread, setUnread] = useState<Record<string, number>>({});
    const [audioLink, setAudioLink] = useState("");
    const [uploading, setUploading] = useState(false);
    const [refundRef, setRefundRef] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("mixing_orders")
            .select("id, artist_id, song_title, package_name, amount, status, file_link, preview_link, full_link, delivered_at, first_final_delivered_at, preview_accepted_at, refund_bank_name, refund_account_number, refund_account_name, refund_percent, refund_amount, refund_fee_amount, created_at")
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

    const run = async (id: string, fn: string, args: any, okMsg: string): Promise<boolean> => {
        setActing(id);
        const { data, error } = await supabase.rpc(fn, args);
        setActing(null);
        const res = data as { success?: boolean; message?: string } | null;
        if (error || !res?.success) {
            toast("Failed: " + (res?.message || error?.message || "unknown"), "error");
            return false;
        }
        toast(okMsg, "success");
        fetchAll();
        return true;
    };

    const uploadAudio = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadToCloudinary(file, { resourceType: "video", folderKey: "preview" });
            setAudioLink(url);
            toast("Audio uploaded. It is deleted from Cloudinary automatically when the deal closes.", "success");
        } catch (e) {
            toast("Upload failed: " + (e instanceof Error ? e.message : "unknown error"), "error");
        } finally {
            setUploading(false);
        }
    };

    const start = (id: string) => run(id, "start_mix", { p_order_id: id }, "Mix started.");

    const openDeliver = (o: MixingOrder, kind: "preview" | "final") => {
        setDeliverId(deliverId === o.id ? null : o.id);
        setDeliverKind(kind);
        setAudioLink("");
    };

    const sendPreview = (id: string) => {
        if (!/^https?:\/\//.test(audioLink.trim())) { toast("Enter a valid preview link.", "error"); return; }
        run(id, "deliver_mix", { p_order_id: id, p_preview_link: audioLink.trim() }, "Preview sent to artist.");
        setDeliverId(null); setAudioLink("");
    };

    const sendFinal = (id: string) => {
        if (!/^https?:\/\//.test(audioLink.trim())) { toast("Enter a valid final mix link.", "error"); return; }
        run(id, "deliver_final_mix", { p_order_id: id, p_final_link: audioLink.trim() }, "Final mix delivered to artist.");
        setDeliverId(null); setAudioLink("");
    };

    const markRefundPaid = async (id: string) => {
        if (!refundRef.trim()) { toast("Enter the bank transfer reference first.", "error"); return; }
        const ok = await run(id, "complete_mix_refund", { p_order_id: id, p_reference: refundRef.trim() }, "Refund marked as paid.");
        if (ok) { setRefundRef(""); void deleteMixPreview(id); }
    };

    const rejectRefund = (id: string) => {
        if (!window.confirm("Send this order back to the artist? They will need to adjust or accept instead.")) return;
        run(id, "reject_mix_refund", { p_order_id: id }, "Refund rejected. Order sent back.");
    };

    const canPreview = (o: MixingOrder) =>
        (o.status === "in_escrow" || o.status === "in_progress") && !o.first_final_delivered_at;
    const canFinal = (o: MixingOrder) =>
        o.status === "final_pending" || (o.status === "in_progress" && !!o.first_final_delivered_at);

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
                        {o.full_link && (
                            <p className="text-[11px] text-gray-500 truncate">Final: {o.full_link}</p>
                        )}

                        {/* Refund case: bank details + manual payout */}
                        {o.status === "refund_pending" && (
                            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 space-y-2">
                                <p className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                                    <Landmark className="w-3.5 h-3.5" /> Refund case: send ₦{Number(o.refund_amount ?? 0).toLocaleString()} ({o.refund_percent}%) by bank transfer
                                </p>
                                <p className="text-xs text-gray-300">
                                    {o.refund_bank_name} · {o.refund_account_number}
                                    {o.refund_account_name ? ` · ${o.refund_account_name}` : ""}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                    Kept by platform: ₦{Number(o.refund_fee_amount ?? 0).toLocaleString()}. Never touches the wallet.
                                </p>
                                <Input
                                    value={refundRef}
                                    onChange={(e) => setRefundRef(e.target.value)}
                                    placeholder="Bank transfer reference"
                                    className="bg-black/40 border-white/10 text-white text-xs"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" disabled={acting === o.id} onClick={() => markRefundPaid(o.id)} className="bg-orange-500 hover:bg-orange-400 text-black rounded-lg text-xs">
                                        {acting === o.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Mark as paid
                                    </Button>
                                    <Button size="sm" variant="outline" disabled={acting === o.id} onClick={() => rejectRefund(o.id)} className="border-white/20 text-xs rounded-lg">
                                        Reject, send back
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {o.status === "in_escrow" && (
                                <Button size="sm" disabled={acting === o.id} onClick={() => start(o.id)} className="bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs">
                                    {acting === o.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Start mix
                                </Button>
                            )}
                            {canPreview(o) && (
                                <Button size="sm" variant="outline" onClick={() => openDeliver(o, "preview")} className="border-white/20 text-xs rounded-lg">
                                    Deliver preview
                                </Button>
                            )}
                            {canFinal(o) && (
                                <Button size="sm" onClick={() => openDeliver(o, "final")} className="bg-green-500 hover:bg-green-400 text-black rounded-lg text-xs">
                                    Upload final mix
                                </Button>
                            )}
                        </div>
                        {deliverId === o.id && (
                            <div className="space-y-2 rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-xs text-gray-400">
                                    {deliverKind === "preview"
                                        ? "The artist hears a 30-second tagged preview and gets 72 hours to accept, adjust, or decline."
                                        : "The final mix opens the artist's 3-day revision window (single window, never restarts)."}
                                </p>
                                <div className="flex gap-2">
                                    <Input value={audioLink} onChange={(e) => setAudioLink(e.target.value)} placeholder={deliverKind === "preview" ? "Preview audio link (Drive: Anyone with the link)" : "Final mix link (Drive: Anyone with the link)"} className="bg-black/40 border-white/10 text-white text-xs flex-1 min-w-0" />
                                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadAudio(f); }} />
                                    <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-lg text-xs shrink-0">
                                        {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />} Upload
                                    </Button>
                                </div>
                                <Button size="sm" disabled={acting === o.id} onClick={() => deliverKind === "preview" ? sendPreview(o.id) : sendFinal(o.id)} className="bg-green-500 hover:bg-green-400 text-black rounded-lg text-xs">
                                    {acting === o.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                    {deliverKind === "preview" ? "Send preview to artist" : "Deliver final mix"}
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
