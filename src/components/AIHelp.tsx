"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, User, HelpCircle, ChevronRight, TicketPlus, Loader2, ArrowLeft, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { pricingConfig } from "@/../config/pricing";

type Msg = {
    role: "assistant" | "user";
    text: string;
    isOptions?: boolean;
    isTicketPrompt?: boolean;
};

type ThreadMsg = {
    id: string;
    text: string;
    from_admin: boolean;
    created_at: string;
};

type ActiveTicket = { ticket_id: string; access_token?: string; subject?: string };

const LS_KEY = "afropitch_support_ticket_v1";
const CUR = pricingConfig.currency;

// FAQ data — scored keyword matching (best match wins, not first match)
const FAQ_DATA = [
    {
        question: "How much does it cost?",
        keywords: ["price", "cost", "pay", "money", "much", "fee", "pricing"],
        answer: `We offer transparent pricing:\n• Standard Review: ${CUR}3,000 (3-7 days)\n• Express Review: ${CUR}5,000 (48 hours)\n• Exclusive Pitching: ${CUR}13,500 (VIP Placement)`
    },
    {
        question: "How does the mixing service work?",
        keywords: ["mix", "master", "mixing", "mastering", "stems", "engineer", "polish"],
        answer: `Our engineers mix and master your song for you:\n• Demo Polish: ${CUR}35,000 (~3 days)\n• Full Mix: ${CUR}65,000 (~5 days)\n• Mix + Master: ${CUR}100,000 (~7 days)\n\nPick a package on the Mixing page, share your Google Drive link, and pay securely. Your money is held in escrow until you approve the final mix. You'll review a watermarked preview first.`
    },
    {
        question: "Is my payment safe? (Escrow)",
        keywords: ["escrow", "safe", "secure", "hold my money", "protect"],
        answer: "Yes. Mixing payments are held in escrow. The engineer only gets paid when you accept the finished mix. If you're not happy, it comes straight back to your wallet."
    },
    {
        question: "Can I pay from outside Nigeria?",
        keywords: ["ghana", "kenya", "south africa", "outside nigeria", "international", "dollar", "cedi", "rand", "abroad"],
        answer: "Yes! International Visa and Mastercard payments are accepted. You're charged in naira and your bank handles the currency conversion."
    },
    {
        question: "Do you offer refunds?",
        keywords: ["refund", "money back", "guarantee"],
        answer: "Yes! We have a 100% money-back guarantee. If your song is not approved or reviewed within the timeframe, your funds are returned to your wallet instantly."
    },
    {
        question: "Are the curators real?",
        keywords: ["real", "fake", "bot", "curator"],
        answer: "Absolutely. We strictly vet every curator to ensure they are real humans with active, organic playlists. We have zero tolerance for bots."
    },
    {
        question: "My song was declined. What now?",
        keywords: ["declined", "rejected", "not approved", "denied"],
        answer: "Don't give up on the song! The most common reason is mix quality. Our engineers can professionally mix it for you. Check the Mixing page (from Demo Polish at ₦35,000) and resubmit once it sounds its best."
    },
    {
        question: "How do I withdraw my earnings?",
        keywords: ["withdraw", "payout", "earnings", "bank", "cash out"],
        answer: `Go to Dashboard > Withdrawals. You can request a payout to your local bank account once your balance is above the ${CUR}5,000 minimum. Withdrawals are reviewed by our team before they're sent.`
    },
    {
        question: "What is the Featured Artist program?",
        keywords: ["featured", "feature me", "spotlight", "artist of the week"],
        answer: "Each week we spotlight one artist on the Featured page, with their bio, Q&A, and a permanent SEO-friendly page. Our team picks artists with quality music and staying power. Keep releasing great music and you could be next!"
    },
    {
        question: "How do I become a curator?",
        keywords: ["become a curator", "apply as curator", "curator application", "join as curator"],
        answer: "Head to the Curators section and submit an application with your playlist links. Our team reviews every application. We only accept curators with real, active, organic playlists."
    },
    {
        question: "What genres do you accept?",
        keywords: ["genre", "style", "type", "music"],
        answer: "We specialize in African music genres: Afrobeats, Amapiano, Afro-House, Hip Hop, and Francophone African sounds."
    },
    {
        question: "How do I verify my song?",
        keywords: ["verify", "verification", "check"],
        answer: "Once your song is reviewed and placed, you will be notified via email and on your dashboard. You can then view the placement details directly."
    },
    {
        question: "Can I talk to a human?",
        keywords: ["human", "agent", "person", "real person", "call", "phone", "whatsapp", "talk to someone"],
        answer: "Of course! Open a support ticket below and our team will reply here in the chat (and by email). We typically respond within a day."
    },
];

export function AIHelp() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"faq" | "ticket">("faq");

    // FAQ mode state
    const [messages, setMessages] = useState<Msg[]>([
        { role: "assistant", text: "Hi! How can we help you today? Select a topic below or type your question." },
        { role: "assistant", text: "", isOptions: true }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // Ticket form state
    const [showTicketForm, setShowTicketForm] = useState(false);
    const [ticketName, setTicketName] = useState("");
    const [ticketEmail, setTicketEmail] = useState("");
    const [ticketSubject, setTicketSubject] = useState("");
    const [ticketMessage, setTicketMessage] = useState("");
    const [ticketSending, setTicketSending] = useState(false);

    // Live ticket-chat state
    const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
    const [thread, setThread] = useState<ThreadMsg[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [ticketInput, setTicketInput] = useState("");
    const [ticketSendingMsg, setTicketSendingMsg] = useState(false);
    const [unread, setUnread] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const threadEndRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef(isOpen);
    const modeRef = useRef(mode);
    const activeTicketRef = useRef(activeTicket);
    const lastReadRef = useRef<string | null>(null);
    isOpenRef.current = isOpen;
    modeRef.current = mode;
    activeTicketRef.current = activeTicket;

    const scrollFaq = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const scrollThread = () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollFaq(); }, [messages, isTyping, isOpen, showTicketForm]);
    useEffect(() => { scrollThread(); }, [thread, isOpen, mode]);

    const pushAssistant = (text: string, extra?: Partial<Msg>) =>
        setMessages(prev => [...prev, { role: "assistant", text, ...extra }]);

    // ---------- FAQ engine (scored keyword match) ----------
    const getAnswer = (query: string): string | null => {
        const lower = query.toLowerCase();
        let best: string | null = null;
        let bestScore = 0;
        for (const item of FAQ_DATA) {
            const score = item.keywords.filter(k => lower.includes(k)).length;
            if (score > bestScore) { bestScore = score; best = item.answer; }
        }
        if (best) return best;
        if (lower.match(/\b(hi|hello|hey|good (morning|afternoon|evening))\b/))
            return "Hello! Ask me about pricing, mixing, refunds, withdrawals, or tap a topic below.";
        return null;
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = (textOverride || input).trim();
        if (!textToSend) return;

        setMessages(prev => [...prev, { role: "user", text: textToSend }]);
        setInput("");
        setShowTicketForm(false);
        setIsTyping(true);

        setTimeout(() => {
            const answer = getAnswer(textToSend);
            setIsTyping(false);
            if (answer) {
                pushAssistant(answer);
            } else {
                setTicketSubject(textToSend.slice(0, 120));
                pushAssistant(
                    activeTicket
                        ? "I don't have an answer for that, but you can continue your open conversation with our team, or open a fresh ticket below."
                        : "I don't have an answer for that yet, but I can open a support ticket and our team will get back to you right here in the chat.",
                    { isTicketPrompt: true }
                );
            }
        }, 500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSend();
    };

    // ---------- Live ticket thread ----------
    const fetchThread = useCallback(async (ticket: ActiveTicket, initial = false) => {
        const params = new URLSearchParams({ ticket_id: ticket.ticket_id });
        if (ticket.access_token) params.set("token", ticket.access_token);
        try {
            const res = await fetch(`/api/support/visitor-thread?${params.toString()}`);
            const json = await res.json().catch(() => null);
            if (!json?.ok) return;
            const msgs: ThreadMsg[] = (json.messages || []).map((m: any) => ({
                id: m.id, text: m.message, from_admin: m.from_admin, created_at: m.created_at,
            }));
            setThread(msgs);

            // Unread tracking: admin messages newer than what we've seen
            const latestAdmin = [...msgs].reverse().find(m => m.from_admin);
            if (initial) {
                lastReadRef.current = latestAdmin?.created_at ?? new Date().toISOString();
                setUnread(0);
            } else if (latestAdmin && (!lastReadRef.current || latestAdmin.created_at > lastReadRef.current)) {
                if (!isOpenRef.current || modeRef.current !== "ticket") {
                    const newCount = msgs.filter(m => m.from_admin && (!lastReadRef.current || m.created_at > lastReadRef.current)).length;
                    setUnread(newCount);
                } else {
                    lastReadRef.current = latestAdmin.created_at;
                    setUnread(0);
                }
            }
        } catch { /* poll failures are silent — next poll retries */ }
    }, []);

    // Restore persisted ticket on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const t = JSON.parse(raw) as ActiveTicket;
                if (t?.ticket_id) {
                    setActiveTicket(t);
                    setThreadLoading(true);
                    fetchThread(t, true).finally(() => setThreadLoading(false));
                }
            }
        } catch { /* corrupted storage — start fresh */ }
    }, [fetchThread]);

    // Poll for admin replies while a ticket is active
    useEffect(() => {
        if (!activeTicket) return;
        const id = setInterval(() => fetchThread(activeTicket), 10000);
        return () => clearInterval(id);
    }, [activeTicket?.ticket_id, fetchThread]);

    const openTicketMode = (ticket: ActiveTicket) => {
        setActiveTicket(ticket);
        try { localStorage.setItem(LS_KEY, JSON.stringify(ticket)); } catch { /* ignore */ }
        setMode("ticket");
        setThreadLoading(true);
        fetchThread(ticket, true).finally(() => setThreadLoading(false));
    };

    const enterTicketMode = () => {
        setMode("ticket");
        setUnread(0);
        if (activeTicket) {
            const latestAdmin = [...thread].reverse().find(m => m.from_admin);
            lastReadRef.current = latestAdmin?.created_at ?? new Date().toISOString();
            fetchThread(activeTicket);
        }
    };

    const submitTicket = async () => {
        if (!ticketSubject.trim() || !ticketMessage.trim()) return;
        if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticketEmail.trim())) return;
        setTicketSending(true);
        try {
            const res = await fetch("/api/support/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: ticketSubject.trim(),
                    message: ticketMessage.trim(),
                    name: ticketName.trim(),
                    email: ticketEmail.trim(),
                }),
            });
            const json = await res.json().catch(() => null);
            setTicketSending(false);
            if (json?.ok) {
                setShowTicketForm(false);
                setTicketName(""); setTicketEmail(""); setTicketSubject(""); setTicketMessage("");
                pushAssistant("Ticket opened. You're now chatting with our support team below. We'll reply here and by email.");
                openTicketMode({ ticket_id: json.ticket_id, access_token: json.access_token, subject: ticketSubject.trim() });
            } else {
                pushAssistant(`Couldn't open the ticket: ${json?.error || "please try again"}.`);
            }
        } catch {
            setTicketSending(false);
            pushAssistant("Couldn't open the ticket right now. Please try again in a moment.");
        }
    };

    const sendTicketMessage = async () => {
        const text = ticketInput.trim();
        if (!text || !activeTicket || ticketSendingMsg) return;
        setTicketSendingMsg(true);
        // Optimistic: show immediately
        const temp: ThreadMsg = { id: `temp-${Date.now()}`, text, from_admin: false, created_at: new Date().toISOString() };
        setThread(prev => [...prev, temp]);
        setTicketInput("");
        try {
            const res = await fetch("/api/support/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticket_id: activeTicket.ticket_id,
                    access_token: activeTicket.access_token,
                    message: text,
                }),
            });
            const json = await res.json().catch(() => null);
            if (!json?.ok) {
                setThread(prev => prev.filter(m => m.id !== temp.id));
                setThread(prev => [...prev, { id: `err-${Date.now()}`, text: `Couldn't send: ${json?.error || "please try again"}.`, from_admin: true, created_at: new Date().toISOString() }]);
            } else {
                // Refresh to get the canonical message + any admin replies
                fetchThread(activeTicket);
            }
        } catch {
            setThread(prev => prev.filter(m => m.id !== temp.id));
        } finally {
            setTicketSendingMsg(false);
        }
    };

    const fmtTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch { return ""; }
    };

    const toggleOpen = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next && modeRef.current === "ticket") {
            setUnread(0);
            const latestAdmin = [...thread].reverse().find(m => m.from_admin);
            lastReadRef.current = latestAdmin?.created_at ?? new Date().toISOString();
        }
    };

    return (
        <div className="fixed right-6 bottom-24 sm:bottom-6 z-50 flex flex-col items-end font-sans">
            {isOpen && (
                <Card className="mb-4 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100dvh-12rem)] bg-zinc-950/95 border border-green-500/30 backdrop-blur-xl flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-green-900/40 to-black">
                        <div className="flex items-center gap-3">
                            {mode === "ticket" ? (
                                <button onClick={() => setMode("faq")} className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center hover:bg-green-500/25 transition-colors" title="Back to topics">
                                    <ArrowLeft className="w-4 h-4 text-green-400" />
                                </button>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                    <HelpCircle className="w-5 h-5 text-black" />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-white text-sm">{mode === "ticket" ? "Support chat" : "Help Center"}</p>
                                <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    {mode === "ticket" ? "Our team typically replies within a day" : "Automated Support"}
                                </p>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white rounded-full" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {mode === "faq" ? (
                        <>
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/[0.02]">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} animate-in slide-in-from-bottom-2 duration-300`}>
                                        {m.text && (
                                            <div className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${m.role === "user" ? "bg-white/10" : "bg-green-500/10"}`}>
                                                    {m.role === "user" ? <User className="w-3 h-3 text-gray-400" /> : <Bot className="w-3 h-3 text-green-500" />}
                                                </div>
                                                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${m.role === "user" ? "bg-green-600 text-white rounded-tr-none" : "bg-zinc-800/80 border border-white/5 text-gray-200 rounded-tl-none"}`}>
                                                    {m.text}
                                                </div>
                                            </div>
                                        )}

                                        {m.isOptions && (
                                            <div className="mt-2 ml-8 space-y-2 w-[80%]">
                                                {activeTicket && (
                                                    <button
                                                        onClick={enterTicketMode}
                                                        className="w-full text-left text-xs bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 rounded-lg p-2.5 transition-all text-green-300 flex justify-between items-center"
                                                    >
                                                        <span className="flex items-center gap-2"><Headset className="w-3.5 h-3.5" /> Continue your support chat {unread > 0 && <span className="bg-green-500 text-black text-[10px] font-bold rounded-full px-1.5">{unread} new</span>}</span>
                                                        <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {FAQ_DATA.map((faq) => (
                                                    <button
                                                        key={faq.question}
                                                        onClick={() => handleSend(faq.question)}
                                                        className="w-full text-left text-xs bg-white/5 hover:bg-green-500/10 hover:border-green-500/30 border border-white/10 rounded-lg p-2.5 transition-all text-gray-300 hover:text-green-400 flex justify-between items-center group"
                                                    >
                                                        {faq.question}
                                                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {m.isTicketPrompt && (
                                            <div className="mt-2 ml-8 w-[80%] space-y-2">
                                                {activeTicket && (
                                                    <button
                                                        onClick={enterTicketMode}
                                                        className="w-full text-left text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg p-2.5 transition-all text-green-300 flex justify-between items-center"
                                                    >
                                                        <span className="flex items-center gap-2"><Headset className="w-3.5 h-3.5" /> Continue your open conversation</span>
                                                        <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowTicketForm(true)}
                                                    className="w-full text-left text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg p-2.5 transition-all text-green-300 flex justify-between items-center"
                                                >
                                                    <span className="flex items-center gap-2"><TicketPlus className="w-3.5 h-3.5" /> Open a support ticket</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {showTicketForm && (
                                    <div className="rounded-xl border border-green-500/30 bg-zinc-900/80 p-3 space-y-2 animate-in slide-in-from-bottom-2">
                                        <p className="text-xs font-bold text-white">Open a support ticket</p>
                                        {!user && (
                                            <>
                                                <Input value={ticketName} onChange={(e) => setTicketName(e.target.value)} placeholder="Your name" className="bg-black/50 border-white/10 h-9 text-xs rounded-lg" />
                                                <Input value={ticketEmail} onChange={(e) => setTicketEmail(e.target.value)} placeholder="Email for our reply" type="email" className="bg-black/50 border-white/10 h-9 text-xs rounded-lg" />
                                            </>
                                        )}
                                        <Input value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Subject" className="bg-black/50 border-white/10 h-9 text-xs rounded-lg" />
                                        <textarea value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} placeholder="Describe the issue…" rows={3} className="w-full bg-black/50 border border-white/10 rounded-lg text-xs p-2 text-white" />
                                        <div className="flex gap-2">
                                            <Button size="sm" disabled={ticketSending || !ticketSubject.trim() || !ticketMessage.trim() || (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticketEmail.trim()))} onClick={submitTicket} className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs">
                                                {ticketSending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                                Send ticket
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setShowTicketForm(false)} className="text-xs text-gray-500 rounded-lg">Cancel</Button>
                                        </div>
                                    </div>
                                )}

                                {isTyping && (
                                    <div className="flex justify-start animate-in fade-in">
                                        <div className="flex gap-2 max-w-[85%]">
                                            <div className="w-6 h-6 rounded-full bg-green-500/10 flex-shrink-0 flex items-center justify-center mt-1">
                                                <Bot className="w-3 h-3 text-green-500" />
                                            </div>
                                            <div className="bg-zinc-800/80 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-zinc-900 border-t border-white/10 flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask a question..." className="bg-black/50 border-white/10 h-10 pr-4 text-sm focus-visible:ring-green-500/50 rounded-full" />
                                </div>
                                <Button size="icon" className={`h-10 w-10 rounded-full transition-all ${input.trim() ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/10 text-gray-500'}`} onClick={() => handleSend()} disabled={!input.trim()}>
                                    <Send className="w-4 h-4 ml-0.5" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Live ticket thread */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/[0.02]">
                                {threadLoading ? (
                                    <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-green-500" /></div>
                                ) : thread.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center pt-8">No messages yet.</p>
                                ) : (
                                    thread.map((m) => (
                                        <div key={m.id} className={`flex flex-col ${m.from_admin ? "items-start" : "items-end"} animate-in slide-in-from-bottom-2 duration-300`}>
                                            <div className={`flex gap-2 max-w-[85%] ${m.from_admin ? "flex-row" : "flex-row-reverse"}`}>
                                                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${m.from_admin ? "bg-green-500/15" : "bg-white/10"}`}>
                                                    {m.from_admin ? <Headset className="w-3 h-3 text-green-400" /> : <User className="w-3 h-3 text-gray-400" />}
                                                </div>
                                                <div>
                                                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${m.from_admin ? "bg-zinc-800/80 border border-green-500/20 text-gray-200 rounded-tl-none" : "bg-green-600 text-white rounded-tr-none"}`}>
                                                        {m.text}
                                                    </div>
                                                    <p className={`text-[10px] text-gray-600 mt-1 ${m.from_admin ? "text-left" : "text-right"}`}>
                                                        {m.from_admin ? "Support team" : "You"} · {fmtTime(m.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={threadEndRef} />
                            </div>

                            {/* Ticket input */}
                            <div className="p-3 bg-zinc-900 border-t border-white/10 flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <Input
                                        value={ticketInput}
                                        onChange={(e) => setTicketInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") sendTicketMessage(); }}
                                        placeholder="Type your reply…"
                                        className="bg-black/50 border-white/10 h-10 pr-4 text-sm focus-visible:ring-green-500/50 rounded-full"
                                    />
                                </div>
                                <Button size="icon" className={`h-10 w-10 rounded-full transition-all ${ticketInput.trim() ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/10 text-gray-500'}`} onClick={sendTicketMessage} disabled={!ticketInput.trim() || ticketSendingMsg}>
                                    {ticketSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            )}

            {/* Float Button */}
            <div className="relative">
                {unread > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-in zoom-in">
                        {unread}
                    </span>
                )}
                <Button
                    onClick={toggleOpen}
                    className={`rounded-full h-14 w-14 shadow-[0_0_20px_rgba(22,163,74,0.4)] hover:scale-110 transition-all duration-300 ${isOpen ? 'bg-zinc-800 rotate-90 text-white' : 'bg-gradient-to-tr from-green-600 to-green-400 text-black'}`}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 fill-black" />}
                </Button>
            </div>
        </div>
    );
}
