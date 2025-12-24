"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function AIHelp() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
        { role: "assistant", text: "Hi! I'm your AfroPitch assistant. Ask me anything about playlists, verification, or our curators." }
    ]);
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;

        // Add user message
        const userMsg = input;
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setInput("");

        // Simulate AI response
        setTimeout(() => {
            let response = "I can help with that! Our verified curators are ready to listen.";

            if (userMsg.toLowerCase().includes("playlist")) {
                response = "You can browse curatos on the 'Curators' page. Click 'View Playlists' to see their specific vibes.";
            } else if (userMsg.toLowerCase().includes("price") || userMsg.toLowerCase().includes("cost")) {
                response = "We have two tiers: Standard (₦3,000 / 5 days) and Express (₦5,000 / 48 hours).";
            } else if (userMsg.toLowerCase().includes("verify")) {
                response = "Once your song is added, use the 'Verify' page to confirm placement and release the payment.";
            }

            setMessages(prev => [...prev, { role: "assistant", text: response }]);
        }, 1000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <Card className="mb-4 w-80 h-96 bg-black/90 border-green-500/30 backdrop-blur-md flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-green-900/20">
                        <div className="flex items-center gap-2 font-bold text-white">
                            <Bot className="w-5 h-5 text-green-500" /> AfroPitch AI
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user"
                                            ? "bg-green-600 text-white rounded-br-sm"
                                            : "bg-white/10 text-gray-200 rounded-bl-sm"
                                        }`}
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-white/10 flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Ask a question..."
                            className="bg-transparent border-white/20 h-9 text-xs"
                        />
                        <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-700" onClick={handleSend}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            )}

            <Button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full h-14 w-14 bg-gradient-to-tr from-green-600 to-green-500 shadow-[0_0_20px_rgba(22,163,74,0.4)] hover:scale-105 transition-transform"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </Button>
        </div>
    );
}
