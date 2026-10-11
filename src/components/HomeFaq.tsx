"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

export function HomeFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
    const [open, setOpen] = useState<number | null>(null);

    const askAssistant = () => {
        window.dispatchEvent(new CustomEvent("afropitch:open-support"));
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center animate-fade-in-up">Frequently Asked Questions</h2>
            <div className="text-center mt-6 mb-10">
                <p className="text-gray-400 mb-4">Rather talk it through?</p>
                <button
                    onClick={askAssistant}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full px-6 py-3 transition-all hover:-translate-y-0.5 shadow-lg shadow-green-600/20"
                >
                    <MessageCircle className="w-5 h-5" />
                    Ask AfroPitch Support
                </button>
            </div>
            <div className="space-y-3">
                {faqs.map((faq, index) => {
                    const isOpen = open === index;
                    return (
                        <div
                            key={index}
                            className={`rounded-xl bg-white/5 border transition-colors overflow-hidden ${isOpen ? "border-green-500/30" : "border-white/5 hover:border-white/10"}`}
                        >
                            <button
                                onClick={() => setOpen(isOpen ? null : index)}
                                aria-expanded={isOpen}
                                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                            >
                                <span className="font-semibold text-white">{faq.q}</span>
                                <ChevronDown className={`w-5 h-5 text-green-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isOpen && (
                                <p className="px-5 pb-5 text-gray-400 leading-relaxed animate-in slide-in-from-top-1">
                                    {faq.a}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
