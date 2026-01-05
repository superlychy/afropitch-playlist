"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { siteConfig } from "@/../config/site";
import { useState } from "react";

export default function ContactPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!email || !subject || !message) {
            alert("Please fill in all fields.");
            return;
        }
        setLoading(true);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, subject, message })
            });

            if (res.ok) {
                setSent(true);
                setName("");
                setEmail("");
                setSubject("");
                setMessage("");
            } else {
                alert("Failed to send message. Please try again.");
            }
        } catch (e) {
            alert("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full mx-auto max-w-lg px-4 py-16 md:py-24">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
                <p className="text-gray-400">Have questions about your submission?</p>
            </div>

            <Card className="border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle>Send us a message</CardTitle>
                    <CardDescription>We typically reply within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {sent ? (
                        <div className="text-center py-8 space-y-4 animate-in fade-in">
                            <div className="bg-green-500/20 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Message Sent!</h3>
                            <p className="text-gray-400">We'll get back to you shortly.</p>
                            <Button variant="outline" onClick={() => setSent(false)}>Send Another</Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" placeholder="Submission Inquiry" value={subject} onChange={e => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <textarea
                                    id="message"
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                                    placeholder="How can we help?"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Message"}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
