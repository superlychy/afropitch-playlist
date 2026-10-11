"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, User, HelpCircle, ChevronRight, TicketPlus, Loader2, ArrowLeft, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

type Msg = {
    role: "assistant" | "user";
    text: string;
    isTicketPrompt?: boolean;
};

type ThreadMsg = {
    id: string;
    text: string;
    from_admin: boolean;
    created_at: string;
};

type ActiveTicket = { ticket_id: string; access_token?: string; subject?: string };

type GuestRole = "artist" | "curator";
type GuestIdentity = { role?: GuestRole; name?: string; email?: string; anonymous?: boolean };

const LS_KEY = "afropitch_support_ticket_v1";
const VISITOR_LS_KEY = "afropitch_support_visitor_v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GREETING = "Hi, this is AfroPitch Support. How can I help you today?";
const AGENT_FALLBACK =
    "Our support assistant is unavailable right now. You can open a support ticket and the team will reply here and by email.";

export function AIHelp() {
    const { user, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"agent" | "ticket">("agent");

    // Agent mode state
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [agentSending, setAgentSending] = useState(false);

    // Guest identity + intake state
    const [guest, setGuest] = useState<GuestIdentity | null>(null);
    const [needsIntake, setNeedsIntake] = useState(false);
    const [intakeForEscalation, setIntakeForEscalation] = useState(false);
    const [intakeRole, setIntakeRole] = useState<GuestRole | null>(null);
    const [intakeName, setIntakeName] = useState("");
    const [intakeEmail, setIntakeEmail] = useState("");
    const [intakeError, setIntakeError] = useState("");

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
    const messagesRef = useRef<Msg[]>([]);
    isOpenRef.current = isOpen;
    modeRef.current = mode;
    activeTicketRef.current = activeTicket;
    messagesRef.current = messages;

    const scrollAgent = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const scrollThread = () => threadEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollAgent(); }, [messages, isTyping, isOpen, showTicketForm, needsIntake]);
    useEffect(() => { scrollThread(); }, [thread, isOpen, mode]);

    const pushAssistant = (text: string, extra?: Partial<Msg>) =>
        setMessages(prev => [...prev, { role: "assistant", text, ...extra }]);

    // ---------- Guest identity + intake ----------
    const identified = !!user || !!guest?.email;
    const visitorRole: GuestRole | undefined = user
        ? user.role === "curator"
            ? "curator"
            : user.role === "artist"
                ? "artist"
                : undefined
        : guest?.role;

    const seedGreeting = useCallback(() => {
        setMessages(prev => (prev.length ? prev : [{ role: "assistant", text: GREETING }]));
    }, []);

    // Load any stored guest identity once.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(VISITOR_LS_KEY);
            setGuest(raw ? (JSON.parse(raw) as GuestIdentity) : {});
        } catch { setGuest({}); }
    }, []);

    // Decide whether the guest intake shows before chatting. Logged-in users
    // never see it; guests with a stored identity or a stored "anonymous"
    // choice skip it as well.
    useEffect(() => {
        if (isLoading || guest === null) return;
        if (user) { setNeedsIntake(false); seedGreeting(); return; }
        if (messagesRef.current.length > 0) { setNeedsIntake(false); return; }
        if (guest.email || guest.anonymous || guest.name) { setNeedsIntake(false); seedGreeting(); return; }
        setIntakeRole(guest.role ?? null);
        setNeedsIntake(true);
    }, [isLoading, user, guest, seedGreeting]);

    const saveGuest = (g: GuestIdentity) => {
        setGuest(g);
        try { localStorage.setItem(VISITOR_LS_KEY, JSON.stringify(g)); } catch { /* ignore */ }
    };

    const startWithIdentity = () => {
        const name = intakeName.trim();
        const email = intakeEmail.trim();
        // A typed-but-invalid email is the one thing that blocks: explain why.
        if (email && !EMAIL_RE.test(email)) {
            setIntakeError("That email looks incomplete. Please fix it, or clear it and continue.");
            return;
        }
        // Forwarding to the team is the only gated step: it needs both a
        // name and a valid email so the team can reply.
        if (intakeForEscalation && (!name || !email)) {
            setIntakeError("We need both your name and your email to pass this to the team.");
            return;
        }
        setIntakeError("");
        const identity: GuestIdentity = {
            role: intakeRole ?? guest?.role,
            ...(name ? { name } : {}),
            ...(email ? { email } : {}),
            ...(!name && !email ? { anonymous: true } : {}),
        };
        saveGuest(identity);
        setNeedsIntake(false);
        seedGreeting();
        if (intakeForEscalation) {
            setIntakeForEscalation(false);
            void createEscalationTicket(messagesRef.current, identity);
        }
    };

    const continueAnonymous = () => {
        saveGuest({ role: intakeRole ?? guest?.role, anonymous: true });
        setNeedsIntake(false);
        seedGreeting();
    };

    // ---------- Support agent ----------
    const buildTranscript = (msgs: Msg[]) =>
        msgs
            .filter(m => m.text)
            .map(m => `${m.role === "user" ? "Visitor" : "AfroPitch Support"}: ${m.text}`)
            .join("\n");

    // Turn the agent conversation into a human ticket with the full thread.
    // Only ever called for identified visitors (logged in, or a guest with an
    // email); anonymous guests are never forwarded to the team.
    const createEscalationTicket = async (msgs: Msg[], identity?: GuestIdentity) => {
        const name = user ? "" : (identity?.name ?? guest?.name ?? "");
        const email = user ? "" : (identity?.email ?? guest?.email ?? "");
        setIsTyping(true);
        try {
            const res = await fetch("/api/support/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: "Support agent escalation",
                    message: `Chat with AfroPitch Support agent:\n\n${buildTranscript(msgs)}\n\nThe agent determined this needs a human.`,
                    name: name.trim(),
                    email: email.trim(),
                }),
            });
            const json = await res.json().catch(() => null);
            setIsTyping(false);
            if (json?.ok) {
                openTicketMode({ ticket_id: json.ticket_id, access_token: json.access_token, subject: "Support agent escalation" });
            } else {
                pushAssistant("Sorry, I could not pass this on just now. Please open a support ticket below and the team will pick it up.");
                openTicketForm();
            }
        } catch {
            setIsTyping(false);
            pushAssistant("Sorry, I could not pass this on just now. Please open a support ticket below and the team will pick it up.");
            openTicketForm();
        }
    };

    const handleEscalation = (msgs: Msg[]) => {
        if (identified) {
            void createEscalationTicket(msgs);
        } else {
            // Anonymous guest: a human handoff needs a name and email first.
            setIntakeRole(guest?.role ?? null);
            setIntakeName(guest?.name ?? "");
            setIntakeEmail(guest?.email ?? "");
            setIntakeError("");
            setIntakeForEscalation(true);
            setNeedsIntake(true);
        }
    };

    const handleSend = async () => {
        const textToSend = input.trim();
        if (!textToSend || agentSending) return;

        const history: Msg[] = [...messagesRef.current, { role: "user", text: textToSend }];
        setMessages(history);
        setInput("");
        setShowTicketForm(false);
        setIsTyping(true);
        setAgentSending(true);

        try {
            const res = await fetch("/api/support/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: history.filter(m => m.text).map(m => ({ role: m.role, text: m.text })),
                    visitor: { kind: user ? "user" : "guest", role: visitorRole, identified },
                }),
            });
            const json = await res.json().catch(() => null);
            setIsTyping(false);
            if (json?.ok && typeof json.reply === "string" && json.reply.trim()) {
                const finalHistory: Msg[] = [...history, { role: "assistant", text: json.reply }];
                setMessages(finalHistory);
                if (json.escalate) handleEscalation(finalHistory);
            } else {
                pushAssistant(AGENT_FALLBACK, { isTicketPrompt: true });
            }
        } catch {
            setIsTyping(false);
            pushAssistant(AGENT_FALLBACK, { isTicketPrompt: true });
        } finally {
            setAgentSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSend();
    };

    const openTicketForm = () => {
        if (!user && guest?.name && !ticketName) setTicketName(guest.name);
        if (!user && guest?.email && !ticketEmail) setTicketEmail(guest.email);
        setShowTicketForm(true);
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
                                <button onClick={() => setMode("agent")} className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center hover:bg-green-500/25 transition-colors" title="Back to support assistant">
                                    <ArrowLeft className="w-4 h-4 text-green-400" />
                                </button>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                    <HelpCircle className="w-5 h-5 text-black" />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-white text-sm">{mode === "ticket" ? "Support chat" : "AfroPitch Support"}</p>
                                <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    {mode === "ticket" ? "Our team typically replies within a day" : "Ask us anything about AfroPitch"}
                                </p>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white rounded-full" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {mode === "agent" ? (
                        needsIntake ? (
                            <>
                                {/* Guest intake: who are you? (skippable, but an
                                    unnamed guest is never forwarded to the team) */}
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white/[0.02]">
                                    <div className="rounded-xl border border-green-500/30 bg-zinc-900/80 p-4 space-y-3 animate-in slide-in-from-bottom-2">
                                        <p className="text-sm font-bold text-white">
                                            {intakeForEscalation ? "One more step" : "Hi, this is AfroPitch Support"}
                                        </p>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            {intakeForEscalation
                                                ? "To pass this conversation to the team, we need your name and email so they can reply to you here and by email."
                                                : "Tell us a little about you so we can help you properly. You can also continue without a name, but then we cannot pass anything to the team for you."}
                                        </p>
                                        <div>
                                            <p className="text-xs text-gray-300 mb-1.5">Are you an artist or a curator?</p>
                                            <div className="flex gap-2">
                                                {(["artist", "curator"] as GuestRole[]).map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setIntakeRole(r)}
                                                        className={`flex-1 text-xs rounded-lg p-2.5 border transition-all ${intakeRole === r ? "bg-green-500/20 border-green-500/50 text-green-300" : "bg-white/5 border-white/10 text-gray-300 hover:bg-green-500/10 hover:border-green-500/30"}`}
                                                    >
                                                        {r === "artist" ? "Artist" : "Curator"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Input value={intakeName} onChange={(e) => { setIntakeName(e.target.value); setIntakeError(""); }} onKeyDown={(e) => { if (e.key === "Enter") startWithIdentity(); }} placeholder="Your name" className="bg-black/50 border-white/10 h-9 text-xs rounded-lg" />
                                        <Input value={intakeEmail} onChange={(e) => { setIntakeEmail(e.target.value); setIntakeError(""); }} onKeyDown={(e) => { if (e.key === "Enter") startWithIdentity(); }} placeholder="Email for our reply" type="email" className="bg-black/50 border-white/10 h-9 text-xs rounded-lg" />
                                        {intakeError && <p className="text-xs text-red-400 leading-relaxed">{intakeError}</p>}
                                        <Button
                                            size="sm"
                                            disabled={intakeForEscalation && (!intakeName.trim() || !EMAIL_RE.test(intakeEmail.trim()))}
                                            onClick={startWithIdentity}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs"
                                        >
                                            {intakeForEscalation ? "Continue" : "Start chat"}
                                        </Button>
                                        {!intakeForEscalation && (
                                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                                You can start with just your name. Your email is only needed if our team has to reply to you.
                                            </p>
                                        )}
                                        {intakeForEscalation ? (
                                            <button
                                                onClick={() => { setNeedsIntake(false); setIntakeForEscalation(false); }}
                                                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                            >
                                                Not now
                                            </button>
                                        ) : (
                                            <button
                                                onClick={continueAnonymous}
                                                className="w-full text-center text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
                                            >
                                                Continue without name
                                            </button>
                                        )}
                                    </div>
                                    <div ref={messagesEndRef} />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/[0.02]">
                                    {activeTicket && (
                                        <button
                                            onClick={enterTicketMode}
                                            className="w-full text-left text-xs bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 rounded-lg p-2.5 transition-all text-green-300 flex justify-between items-center animate-in slide-in-from-bottom-2"
                                        >
                                            <span className="flex items-center gap-2"><Headset className="w-3.5 h-3.5" /> Continue your support chat {unread > 0 && <span className="bg-green-500 text-black text-[10px] font-bold rounded-full px-1.5">{unread} new</span>}</span>
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    )}
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
                                                        onClick={openTicketForm}
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
                                <div className="bg-zinc-900 border-t border-white/10">
                                    <div className="px-3 pt-2 flex justify-center">
                                        <button onClick={openTicketForm} className="text-[11px] text-gray-500 hover:text-green-400 flex items-center gap-1 transition-colors">
                                            <TicketPlus className="w-3 h-3" /> Open a support ticket
                                        </button>
                                    </div>
                                    <div className="p-3 pt-2 flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask a question..." className="bg-black/50 border-white/10 h-10 pr-4 text-sm focus-visible:ring-green-500/50 rounded-full" />
                                        </div>
                                        <Button size="icon" className={`h-10 w-10 rounded-full transition-all ${input.trim() ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/10 text-gray-500'}`} onClick={() => handleSend()} disabled={!input.trim() || agentSending}>
                                            <Send className="w-4 h-4 ml-0.5" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )
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
