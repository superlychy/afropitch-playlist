"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { pricingConfig } from "@/../config/pricing";
import { siteConfig } from "@/../config/site";

// Standard FAQ Data
const FAQ_DATA = [
    {
        question: "How much does it cost?",
        keywords: ["price", "cost", "pay", "money", "much"],
        answer: `We offer transparent pricing:
• Standard Review: ${pricingConfig.currency}3,000 (3-7 days)
• Express Review: ${pricingConfig.currency}5,000 (48 hours)
• Exclusive Pitching: ${pricingConfig.currency}13,500 (VIP Placement)`
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
    }
];

export function AIHelp() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string; isOptions?: boolean }[]>([
        { role: "assistant", text: "Hi! How can we help you today? Select a topic below or type your question." },
        { role: "assistant", text: "", isOptions: true }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isOpen]);

    const getAnswer = (query: string): string => {
        const lower = query.toLowerCase();

        // 1. Exact/Fuzzy Keyword Match
        const match = FAQ_DATA.find(item => item.keywords.some(k => lower.includes(k)));
        if (match) return match.answer;

        // 2. Greetings
        if (lower.match(/\b(hi|hello|hey)\b/)) return "Hello! Please select a question from the list or ask about pricing, refunds, or curators.";

        // 3. Fallback
        return `I can't answer that specific question yet. Please email our support team at ${siteConfig.contact.email} for personal assistance.`;
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { role: "user", text: textToSend }]);
        setInput("");
        setIsTyping(true);

        // Simulate Response
        setTimeout(() => {
            const answer = getAnswer(textToSend);
            setMessages(prev => [...prev, { role: "assistant", text: answer }]);
            setIsTyping(false);
        }, 600);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSend();
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
                                {/* Message Bubble */}
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

                                {/* Options List (Only for specific assistant messages) */}
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
                            </div>
                        ))}

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
