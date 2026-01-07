"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { pricingConfig } from "@/../config/pricing";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const SUGGESTED_QUESTIONS = [
    "How does pricing work?",
    "Do you offer refunds?",
    "How do I verify my song?",
    "Speak to a Human"
];

interface AIResponse {
    text: string;
    shouldEscalate: boolean;
}

const generateResponse = (input: string): AIResponse => {
    const lower = input.toLowerCase();

    // Explicit Requests
    if (lower.includes("human") || lower.includes("person") || lower.includes("agent") || lower.includes("admin")) {
        return {
            text: "I've flagged this conversation for a human agent. They will review your request and get back to you shortly.",
            shouldEscalate: true
        };
    }

    if (lower.includes("price") || lower.includes("cost") || lower.includes("money") || lower.includes("pay")) {
        return { text: `We have simplified pricing starting at ${pricingConfig.currency}3,000 for Standard review (5 days). Express (48h) is ${pricingConfig.currency}5,000.`, shouldEscalate: false };
    }
    if (lower.includes("refund") || lower.includes("money back") || lower.includes("scam")) {
        return { text: "We offer a 100% money-back guarantee. Funds are held in escrow and only released to the curator after they provide a valid review or placement.", shouldEscalate: false };
    }
    if (lower.includes("curator") || lower.includes("real")) {
        return { text: "Absolutely. We strictly vet every curator. No bots allowed. You can view their profiles and past playlists before you submit.", shouldEscalate: false };
    }
    if (lower.includes("verify") || lower.includes("verification")) {
        return { text: "After your song is added to a playlist, go to your Dashboard and click 'Verify' next to the submission to release the funds.", shouldEscalate: false };
    }
    if (lower.includes("genre") || lower.includes("style")) {
        return { text: "We focus on African genres: Afrobeats, Amapiano, Hip Hop, Afro-House, and Francophone African music.", shouldEscalate: false };
    }
    if (lower.includes("hello") || lower.includes("hi")) {
        return { text: "Hello there! Ready to get your music heard by real curators?", shouldEscalate: false };
    }

    return {
        text: "I didn't quite catch that. I've sent a notification to our support team on Discord to help you out!",
        shouldEscalate: true
    };
};

export function AIHelp() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
        { role: "assistant", text: "Hi! I'm your AfroPitch assistant. 🎵 How can I help you amplify your music today?" }
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

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        // Add user message locally
        setMessages(prev => [...prev, { role: "user", text: textToSend }]);
        setInput("");
        setIsTyping(true);

        // Generate AI Response
        // We simulate a delay
        setTimeout(async () => {
            const response = generateResponse(textToSend);

            setMessages(prev => [...prev, { role: "assistant", text: response.text }]);
            setIsTyping(false);

            // Conditionally Notify Admin & Persist to DB
            if (response.shouldEscalate) {
                try {
                    // 1. If User is logged in, save to Support System (Admin Dashboard)
                    if (user) {
                        // Check for open ticket
                        const { data: tickets } = await supabase
                            .from('support_tickets')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('status', 'open')
                            .limit(1);

                        let ticketId = tickets?.[0]?.id;

                        // Create if needed
                        if (!ticketId) {
                            const { data: newTicket, error: ticketError } = await supabase
                                .from('support_tickets')
                                .insert({
                                    user_id: user.id,
                                    subject: `Live Chat Request - ${new Date().toLocaleDateString()}`,
                                    status: 'open'
                                })
                                .select()
                                .single();

                            if (!ticketError && newTicket) {
                                ticketId = newTicket.id;
                            }
                        }

                        // Insert Message
                        if (ticketId) {
                            await supabase.from('support_messages').insert({
                                ticket_id: ticketId,
                                sender_id: user.id,
                                message: textToSend
                            });
                        }
                    }

                    // 2. Send Discord Notification (Fire & Forget)
                    // We keep this explicit invoke to ensure the admin gets a specific "Live Chat" alert immediately
                    await supabase.functions.invoke('notify-admin', {
                        body: {
                            event_type: 'CHAT_MESSAGE',
                            message: textToSend,
                            user_data: {
                                email: user?.email,
                                id: user?.id
                            }
                        }
                    });
                } catch (err) {
                    console.error("Failed to notify admin/save ticket:", err);
                }
            }
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSend();
    };

    const requestHuman = () => {
        handleSend("I would like to speak to a human agent");
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            {isOpen && (
                <Card className="mb-4 w-[350px] h-[500px] bg-zinc-950/95 border border-green-500/30 backdrop-blur-xl flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-green-900/40 to-black">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                <Bot className="w-5 h-5 text-black" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">AfroPitch AI</p>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-[10px] text-green-400 font-medium">Online</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            {/* <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white rounded-full" onClick={requestHuman} title="Request Human">
                                <Headphones className="w-4 h-4" />
                            </Button> */}
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white rounded-full" onClick={() => setIsOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white/[0.02]">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${m.role === "user" ? "bg-white/10" : "bg-green-500/10"}`}>
                                        {m.role === "user" ? <User className="w-3 h-3 text-gray-400" /> : <Bot className="w-3 h-3 text-green-500" />}
                                    </div>
                                    <div
                                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${m.role === "user"
                                            ? "bg-green-600 text-white rounded-tr-none"
                                            : "bg-zinc-800/80 border border-white/5 text-gray-200 rounded-tl-none"
                                            }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
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

                    {/* Suggested Questions */}
                    {messages.length < 3 && !isTyping && (
                        <div className="px-4 pb-2 flex flex-wrap gap-2">
                            {SUGGESTED_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleSend(q)}
                                    className="text-xs bg-white/5 hover:bg-green-500/20 hover:text-green-400 border border-white/10 rounded-full px-3 py-1.5 transition-colors text-gray-400 whitespace-nowrap"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-zinc-900 border-t border-white/10 flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message..."
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
