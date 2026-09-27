"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, HelpCircle, ChevronRight, TicketPlus, Loader2 } from "lucide-react";
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

// Standard FAQ Data
const FAQ_DATA = [
    {
        question: "How much does it cost?",
        keywords: ["price", "cost", "pay", "money", "much", "fee"],
        answer: `We offer transparent pricing:\n• Standard Review: ${pricingConfig.currency}3,000 (3-7 days)\n• Express Review: ${pricingConfig.currency}5,000 (48 hours)\n• Exclusive Pitching: ${pricingConfig.currency}13,500 (VIP Placement)`
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
        question: "How do I verify my song?",
        keywords: ["verify", "verification", "check"],
        answer: "Once your song is reviewed and placed, you will be notified via email and on your dashboard. You can then view the placement details directly."
    },
    {
        question: "What genres do you accept?",
        keywords: ["genre", "style", "type", "music"],
        answer: "We specialize in African music genres: Afrobeats, Amapiano, Afro-House, Hip Hop, and Francophone African sounds."
    },
    {
        question: "How do I withdraw my earnings?",
        keywords: ["withdraw", "payout", "earnings", "bank"],
        answer: "Go to Dashboard > Withdrawals. You can request a payout to your local bank account once your balance exceeds the minimum threshold."
    },
    {
        question: "How does the mixing service work?",
        keywords: ["mix", "master", "mixing", "mastering", "stems", "engineer"],
        answer: "Our engineers mix and master your song for you. Pick a package on the Mixing page, pay securely, and your money is held in escrow until you approve the final mix. You'll get a watermarked preview to review first — nothing is released until you say so."
    }
];

export function AIHelp() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
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

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isOpen, showTicketForm]);

    const pushAssistant = (text: string, extra?: Partial<Msg>) =>
        setMessages(prev => [...prev, { role: "assistant", text, ...extra }]);

    const getAnswer = (query: string): string | null => {
        const lower = query.toLowerCase();
        const match = FAQ_DATA.find(item => item.keywords.some(k => lower.includes(k)));
        if (match) return match.answer;
        if (lower.match(/\b(hi|hello|hey)\b/)) return "Hello! Please select a question from the list or ask about pricing, refunds, curators, or mixing.";
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
                // Dead-end fallback replaced with a real support ticket path
                setTicketSubject(textToSend.slice(0, 120));
                pushAssistant(
                    "I don't have an answer for that yet — but I can open a support ticket and our team will get back to you by email.",
                    { isTicketPrompt: true }
                );
            }
        }, 600);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSend();
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
                const replyTo = user ? "" : ` and we'll reply to ${ticketEmail.trim()}`;
                setShowTicketForm(false);
                setTicketName(""); setTicketEmail(""); setTicketSubject(""); setTicketMessage("");
                pushAssistant(
                    `Done — your support ticket is open${replyTo}. Our team usually responds within a day.`
                );
            } else {
                pushAssistant(`Couldn't open the ticket: ${json?.error || "please try again"}.`);
            }
        } catch {
            setTicketSending(false);
            pushAssistant("Couldn't open the ticket right now — please try again in a moment.");
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            {isOpen && (
                <Card className="mb-4 w-[350px] h-[500px] bg-zinc-950/95 border border-green-500/30 backdrop-blur-xl flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-green-900/40 to-black">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                <HelpCircle className="w-5 h-5 text-black" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Help Center</p>
                                <p className="text-[10px] text-green-400 font-medium">Automated Support</p>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white rounded-full" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/[0.02]">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} animate-in slide-in-from-bottom-2 duration-300`}>
                                {m.text && (
                                    <div className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${m.role === "user" ? "bg-white/10" : "bg-green-500/10"}`}>
                                            {m.role === "user" ? <User className="w-3 h-3 text-gray-400" /> : <Bot className="w-3 h-3 text-green-500" />}
                                        </div>
                                        <div
                                            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${m.role === "user"
                                                ? "bg-green-600 text-white rounded-tr-none"
                                                : "bg-zinc-800/80 border border-white/5 text-gray-200 rounded-tl-none"
                                                }`}
                                        >
                                            {m.text}
                                        </div>
                                    </div>
                                )}

                                {m.isOptions && (
                                    <div className="mt-2 ml-8 space-y-2 w-[80%]">
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
                                    <div className="mt-2 ml-8 w-[80%]">
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
                                        <Input
                                            value={ticketName}
                                            onChange={(e) => setTicketName(e.target.value)}
                                            placeholder="Your name"
                                            className="bg-black/50 border-white/10 h-9 text-xs rounded-lg"
                                        />
                                        <Input
                                            value={ticketEmail}
                                            onChange={(e) => setTicketEmail(e.target.value)}
                                            placeholder="Email for our reply"
                                            type="email"
                                            className="bg-black/50 border-white/10 h-9 text-xs rounded-lg"
                                        />
                                    </>
                                )}
                                <Input
                                    value={ticketSubject}
                                    onChange={(e) => setTicketSubject(e.target.value)}
                                    placeholder="Subject"
                                    className="bg-black/50 border-white/10 h-9 text-xs rounded-lg"
                                />
                                <textarea
                                    value={ticketMessage}
                                    onChange={(e) => setTicketMessage(e.target.value)}
                                    placeholder="Describe the issue…"
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg text-xs p-2 text-white"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        disabled={ticketSending || !ticketSubject.trim() || !ticketMessage.trim() || (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticketEmail.trim()))}
                                        onClick={submitTicket}
                                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs"
                                    >
                                        {ticketSending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                        Send ticket
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowTicketForm(false)} className="text-xs text-gray-500 rounded-lg">
                                        Cancel
                                    </Button>
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
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question..."
                                className="bg-black/50 border-white/10 h-10 pr-4 text-sm focus-visible:ring-green-500/50 rounded-full"
                            />
                        </div>
                        <Button
                            size="icon"
                            className={`h-10 w-10 rounded-full transition-all ${input.trim() ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white/10 text-gray-500'}`}
                            onClick={() => handleSend()}
                            disabled={!input.trim()}
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </Button>
                    </div>
                </Card>
            )}

            {/* Float Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={`rounded-full h-14 w-14 shadow-[0_0_20px_rgba(22,163,74,0.4)] hover:scale-110 transition-all duration-300 ${isOpen ? 'bg-zinc-800 rotate-90 text-white' : 'bg-gradient-to-tr from-green-600 to-green-400 text-black'}`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 fill-black" />}
            </Button>
        </div>
    );
}
