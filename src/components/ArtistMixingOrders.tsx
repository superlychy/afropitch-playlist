"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MixPreviewPlayer } from "@/components/MixPreviewPlayer";
import { MixingChat } from "@/components/MixingChat";
import {
    AudioWaveform, Loader2, Download, CheckCircle2, MessageCircle,
    Clock3, Wallet, Landmark, XCircle, RotateCcw, ThumbsUp,
} from "lucide-react";
import { deleteMixPreview, isCloudinaryUrl } from "@/lib/cloudinary";

interface MixingOrder {
    id: string;
    song_title: string;
    package_name: string;
    amount: number;
    status: string;
    preview_link: string | null;
    full_link: string | null;
    delivered_at: string | null;
    first_final_delivered_at: string | null;
    refund_percent: number | null;
    refund_amount: number | null;
    refund_bank_name: string | null;
    refund_account_number: string | null;
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

const STATUS_LABEL: Record<string, string> = {
    awaiting_payment: "Awaiting payment",
    in_escrow: "Waiting for engineer",
    in_progress: "Mixing in progress",
    delivered: "Preview ready. Your call",
    final_pending: "Preview accepted. Final mix coming",
    final_delivered: "Final mix delivered",
    refund_pending: "Refund processing",
    completed: "Completed",
    refunded: "Refunded",
};

const DELIVERY_DAYS: Record<string, number> = {
    "Full Mix": 5,
    "Mix+Master": 7,
    "Demo Polish": 3,
};

function msLeft(targetIso: string | null): number | null {
    if (!targetIso) return null;
    return new Date(targetIso).getTime() - Date.now();
}

function formatLeft(ms: number): string {
    if (ms <= 0) return "Time up";
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${mins % 60}m left`;
    return `${mins}m left`;
}

function Countdown({ targetIso, prefix }: { targetIso: string | null; prefix: string }) {
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((x) => x + 1), 30000);
        return () => clearInterval(t);
    }, []);
    const left = msLeft(targetIso);
    if (left === null) return null;
    const urgent = left < 12 * 3600 * 1000;
    return (
        <p className={`text-xs flex items-center gap-1.5 ${urgent ? "text-red-400 font-semibold" : "text-yellow-400/90"}`}>
            <Clock3 className="w-3.5 h-3.5" /> {prefix}: {formatLeft(left)}
        </p>
    );
}

const naira = (n: number) => "₦" + Number(n).toLocaleString();

export function ArtistMixingOrders() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<MixingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState<string | null>(null);
    const [openChatFor, setOpenChatFor] = useState<string | null>(null);
    const [declineFor, setDeclineFor] = useState<string | null>(null);
    const [cancelFor, setCancelFor] = useState<string | null>(null);
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [unread, setUnread] = useState<Record<string, number>>({});

    const fetchOrders = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        const { data } = await supabase
            .from("mixing_orders")
            .select("id, song_title, package_name, amount, status, preview_link, full_link, delivered_at, first_final_delivered_at, refund_percent, refund_amount, refund_bank_name, refund_account_number, created_at")
            .eq("artist_id", user.id)
            .order("created_at", { ascending: false });
        if (data) setOrders(data as MixingOrder[]);
        setLoading(false);
        // Self-healing: any completed/refunded order still holding a Cloudinary
        // preview gets it deleted.
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
        // Pre-fill bank details from the artist's profile.
        const { data: prof } = await supabase.from("profiles").select("bank_name, account_number, account_name").eq("id", user.id).single();
        if (prof) {
            if (prof.bank_name) setBankName(prof.bank_name);
            if (prof.account_number) setAccountNumber(prof.account_number);
            if (prof.account_name) setAccountName(prof.account_name);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const callRpc = async (id: string, fn: string, args: Record<string, unknown>, okMsg: string, cleanup?: () => void) => {
        setActing(id);
        const { data, error } = await supabase.rpc(fn, args);
        setActing(null);
        const res = data as { success?: boolean; message?: string } | null;
        if (error || !res?.success) {
            toast("Could not complete: " + (res?.message || error?.message || "unknown error"), "error");
            return false;
        }
        toast(okMsg, "success");
        cleanup?.();
        fetchOrders();
        return true;
    };

    const acceptPreview = (id: string) => {
        if (!window.confirm("Accept this preview? Your payment will be released to the engineer, and they will upload your final mix.")) return;
        callRpc(id, "accept_mix_preview", { p_order_id: id }, "Preview accepted! Payment released to the engineer.", () => {
            void deleteMixPreview(id);
        });
    };

    const adjust = (id: string) =>
        callRpc(id, "adjust_mix", { p_order_id: id }, "Sent back for corrections. Tell the engineer what to fix in the chat.");

    const decline = (id: string) => {
        if (!bankName.trim() || !accountNumber.trim()) {
            toast("Enter your bank name and account number so we can send your refund.", "error");
            return;
        }
        callRpc(id, "decline_mix", {
            p_order_id: id,
            p_bank_name: bankName.trim(),
            p_account_number: accountNumber.trim(),
            p_account_name: accountName.trim() || null,
        }, "Mix declined. Your refund is being processed.", () => {
            setDeclineFor(null);
            void deleteMixPreview(id);
        });
    };

    const cancelOrder = (id: string) => {
        if (!bankName.trim() || !accountNumber.trim()) {
            toast("Enter your bank name and account number so we can send your refund.", "error");
            return;
        }
        if (!window.confirm("Cancel this order? You'll get 95% back by bank transfer.")) return;
        callRpc(id, "cancel_mix_order", {
            p_order_id: id,
            p_bank_name: bankName.trim(),
            p_account_number: accountNumber.trim(),
            p_account_name: accountName.trim() || null,
        }, "Order cancelled. Your refund is being processed.", () => setCancelFor(null));
    };

    const requestRevision = (id: string) =>
        callRpc(id, "request_final_revision", { p_order_id: id }, "Revision requested. The engineer will rework your final mix.");

    const satisfy = (id: string) => {
        if (!window.confirm("Happy with the final mix? This closes the window and unlocks your download.")) return;
        callRpc(id, "satisfy_mix", { p_order_id: id }, "Window closed. Your full mix is ready to download!");
    };

    if (loading) return <p className="text-gray-500 text-sm">Loading mixing orders…</p>;
    if (orders.length === 0) return null;

    const chatClosed = (s: string) => s === "completed" || s === "refunded";

    return (
        <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <AudioWaveform className="w-5 h-5 text-gray-400" /> My Mixing Orders
            </h2>
            <div className="space-y-3">
                {orders.map((o) => {
                    const deliveryDays = DELIVERY_DAYS[o.package_name] ?? 5;
                    const escrowDeadline = new Date(new Date(o.created_at).getTime() + deliveryDays * 24 * 3600 * 1000).toISOString();
                    const previewDeadline = o.delivered_at ? new Date(new Date(o.delivered_at).getTime() + 72 * 3600 * 1000).toISOString() : null;
                    const revisionDeadline = o.first_final_delivered_at ? new Date(new Date(o.first_final_delivered_at).getTime() + 3 * 24 * 3600 * 1000).toISOString() : null;
                    const declineRefund = Math.floor(o.amount * 0.75);
                    const cancelRefund = Math.floor(o.amount * 0.95);

                    return (
                        <Card key={o.id} className="bg-white/5 border-white/10">
                            <CardContent className="pt-4 space-y-3">
                                {/* Trade window header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h4 className="font-bold text-white text-sm sm:text-base">{o.song_title}</h4>
                                        <p className="text-xs text-gray-400">{o.package_name} · {new Date(o.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`inline-block px-2 py-1 rounded text-[10px] uppercase font-bold self-start ${STATUS_STYLE[o.status] || "bg-white/10 text-gray-400"}`}>
                                        {STATUS_LABEL[o.status] || o.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2">
                                    <Wallet className="w-4 h-4 text-yellow-400" />
                                    <span className="text-xs text-gray-400">Held in escrow:</span>
                                    <span className="text-sm font-bold text-white">{naira(o.amount)}</span>
                                </div>

                                {/* Waiting for engineer */}
                                {o.status === "in_escrow" && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-500">Your payment is held safely. The engineer will start your mix shortly.</p>
                                        <Countdown targetIso={escrowDeadline} prefix="Expected delivery in" />
                                        {cancelFor === o.id ? (
                                            <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                                                <p className="text-xs text-gray-300 font-semibold">Cancel this order</p>
                                                <p className="text-xs text-gray-400">
                                                    You'll receive {naira(cancelRefund)} (95%) by bank transfer.
                                                    5% ({naira(o.amount - cancelRefund)}) covers transaction charges.
                                                </p>
                                                <BankFields bankName={bankName} setBankName={setBankName} accountNumber={accountNumber} setAccountNumber={setAccountNumber} accountName={accountName} setAccountName={setAccountName} />
                                                <div className="flex gap-2">
                                                    <Button size="sm" disabled={acting === o.id} onClick={() => cancelOrder(o.id)} className="bg-red-500 hover:bg-red-400 text-white rounded-lg text-xs">
                                                        {acting === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm cancel"}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setCancelFor(null)} className="text-xs text-gray-500 rounded-lg">Keep order</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button disabled={acting === o.id} onClick={() => setCancelFor(o.id)} variant="ghost" className="text-xs text-gray-500 hover:text-gray-300 h-auto p-0">
                                                <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel order
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Engineer working */}
                                {o.status === "in_progress" && (
                                    <p className="text-xs text-gray-500">
                                        {o.first_final_delivered_at
                                            ? "The engineer is reworking your final mix. You'll be notified when the revised final lands."
                                            : "Your mix is being worked on. You can message the engineer below while you wait."}
                                    </p>
                                )}

                                {/* Preview delivered: the decision point */}
                                {o.status === "delivered" && o.preview_link && (
                                    <div className="space-y-3">
                                        <MixPreviewPlayer src={o.preview_link} />
                                        <Countdown targetIso={previewDeadline} prefix="Decide within" />
                                        <p className="text-[11px] text-gray-500">No response in 72 hours counts as accepted.</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button disabled={acting === o.id} onClick={() => acceptPreview(o.id)} className="bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm">
                                                {acting === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                                Accept preview
                                            </Button>
                                            <Button disabled={acting === o.id} onClick={() => adjust(o.id)} variant="outline" className="border-blue-500/40 text-blue-300 rounded-xl text-sm">
                                                <RotateCcw className="w-4 h-4 mr-1" /> Adjust
                                            </Button>
                                            <Button disabled={acting === o.id} onClick={() => setDeclineFor(declineFor === o.id ? null : o.id)} variant="outline" className="border-red-500/40 text-red-300 rounded-xl text-sm">
                                                <XCircle className="w-4 h-4 mr-1" /> Decline
                                            </Button>
                                        </div>
                                        {declineFor === o.id && (
                                            <div className="rounded-xl border border-red-500/20 bg-black/40 p-3 space-y-2">
                                                <p className="text-xs text-gray-300 font-semibold">Decline this mix</p>
                                                <p className="text-xs text-gray-400">
                                                    The mix ends here. You'll receive {naira(declineRefund)} (75%) by bank transfer.
                                                    25% ({naira(o.amount - declineRefund)}) is kept by the platform.
                                                </p>
                                                <BankFields bankName={bankName} setBankName={setBankName} accountNumber={accountNumber} setAccountNumber={setAccountNumber} accountName={accountName} setAccountName={setAccountName} />
                                                <div className="flex gap-2">
                                                    <Button size="sm" disabled={acting === o.id} onClick={() => decline(o.id)} className="bg-red-500 hover:bg-red-400 text-white rounded-lg text-xs">
                                                        {acting === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm decline"}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setDeclineFor(null)} className="text-xs text-gray-500 rounded-lg">Back</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview accepted, final on the way */}
                                {o.status === "final_pending" && (
                                    <p className="text-xs text-blue-300">Preview accepted and payment released. The engineer is uploading your final mix.</p>
                                )}

                                {/* Final delivered: 3-day single revision window */}
                                {o.status === "final_delivered" && (
                                    <div className="space-y-3">
                                        {o.full_link ? (
                                            <audio controls controlsList="nodownload" src={o.full_link} className="w-full h-10" />
                                        ) : (
                                            <p className="text-xs text-gray-500">Final mix is being prepared…</p>
                                        )}
                                        <Countdown targetIso={revisionDeadline} prefix="Revision window" />
                                        <p className="text-[11px] text-gray-500">Ask for corrections within 3 days. After that the window closes and your download unlocks.</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button disabled={acting === o.id} onClick={() => requestRevision(o.id)} variant="outline" className="border-blue-500/40 text-blue-300 rounded-xl text-sm">
                                                <RotateCcw className="w-4 h-4 mr-1" /> Request revision
                                            </Button>
                                            <Button disabled={acting === o.id} onClick={() => satisfy(o.id)} className="bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm">
                                                <ThumbsUp className="w-4 h-4 mr-1" /> Satisfied, close window
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Refund in flight */}
                                {o.status === "refund_pending" && (
                                    <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 space-y-1">
                                        <p className="text-xs text-orange-300 font-semibold flex items-center gap-1.5">
                                            <Landmark className="w-3.5 h-3.5" /> Refund of {naira(o.refund_amount ?? 0)} ({o.refund_percent}%) is being processed
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            Going to {o.refund_bank_name} ····{o.refund_account_number?.slice(-4)}. It never touches your wallet.
                                        </p>
                                    </div>
                                )}

                                {/* Closed: download + read-only history */}
                                {o.status === "completed" && o.full_link && (
                                    <a href={o.full_link} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" className="border-green-500/40 text-green-400 rounded-xl text-sm">
                                            <Download className="w-4 h-4 mr-1" /> Download full mix
                                        </Button>
                                    </a>
                                )}
                                {o.status === "refunded" && (
                                    <p className="text-xs text-gray-500">Refunded {naira(o.refund_amount ?? 0)} to your bank account.</p>
                                )}

                                {/* Chat */}
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
                                        {chatClosed(o.status) ? "View message history" : openChatFor === o.id ? "Hide messages" : "Message the engineer"}
                                        {(unread[o.id] || 0) > 0 && (
                                            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-green-500 text-black text-[10px] font-bold">
                                                {unread[o.id]}
                                            </span>
                                        )}
                                    </Button>
                                    {openChatFor === o.id && (
                                        <div className="mt-3">
                                            <MixingChat orderId={o.id} readOnly={chatClosed(o.status)} />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

function BankFields(props: {
    bankName: string; setBankName: (v: string) => void;
    accountNumber: string; setAccountNumber: (v: string) => void;
    accountName: string; setAccountName: (v: string) => void;
}) {
    const input = "w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-2";
    return (
        <div className="space-y-2">
            <input value={props.bankName} onChange={(e) => props.setBankName(e.target.value)} placeholder="Bank name" className={input} />
            <input value={props.accountNumber} onChange={(e) => props.setAccountNumber(e.target.value)} placeholder="Account number" inputMode="numeric" className={input} />
            <input value={props.accountName} onChange={(e) => props.setAccountName(e.target.value)} placeholder="Account name" className={input} />
        </div>
    );
}
