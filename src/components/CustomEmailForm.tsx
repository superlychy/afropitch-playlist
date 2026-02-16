"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Loader2, CheckCircle, Mail, X } from "lucide-react";

interface CustomEmailFormProps {
    onClose?: () => void;
}

export function CustomEmailForm({ onClose }: CustomEmailFormProps) {
    const [toEmail, setToEmail] = useState("");
    const [fromEmail, setFromEmail] = useState("contact@afropitchplay.best");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Predefined "from" addresses on your domain
    const fromAddresses = [
        "contact@afropitchplay.best",
        "support@afropitchplay.best",
        "admin@afropitchplay.best",
        "noreply@afropitchplay.best",
        "hello@afropitchplay.best"
    ];

    const handleSend = async () => {
        if (!toEmail || !fromEmail || !subject || !message) {
            alert("Please fill in all fields");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toEmail)) {
            alert("Please enter a valid recipient email address");
            return;
        }

        try {
            setSending(true);

            // Get session token for authorization
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("You must be logged in to send emails");
                setSending(false);
                return;
            }

            const response = await fetch('/api/admin/send-custom-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    to: toEmail,
                    from: fromEmail,
                    subject: subject,
                    message: message
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send email');
            }

            setSent(true);
            setTimeout(() => {
                if (onClose) onClose();
                // Reset form
                setToEmail("");
                setSubject("");
                setMessage("");
                setSent(false);
            }, 2000);

        } catch (error: any) {
            console.error('Error sending email:', error);
            alert(`Failed to send email: ${error.message}`);
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <Card className="bg-black/40 border-white/10">
                <CardContent className="pt-6">
                    <div className="text-center py-8 space-y-4 animate-in fade-in">
                        <div className="bg-green-500/20 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Email Sent!</h3>
                        <p className="text-gray-400">Your email has been sent successfully.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-black/40 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        Send Custom Email
                    </CardTitle>
                    <CardDescription>
                        Send an email from any verified address on your domain
                    </CardDescription>
                </div>
                {onClose && (
                    <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="to-email" className="text-gray-300">To Email *</Label>
                        <Input
                            id="to-email"
                            type="email"
                            placeholder="recipient@example.com"
                            value={toEmail}
                            onChange={(e) => setToEmail(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="from-email" className="text-gray-300">From Address *</Label>
                        <select
                            id="from-email"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {fromAddresses.map(addr => (
                                <option key={addr} value={addr}>{addr}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-300">Subject *</Label>
                    <Input
                        id="subject"
                        placeholder="Email subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-300">Message *</Label>
                    <textarea
                        id="message"
                        className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[150px]"
                        placeholder="Type your email content here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-xs text-blue-400">
                    <strong>Note:</strong> Make sure the "From" address is verified in your Resend account.
                </div>

                <div className="flex gap-2">
                    <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={handleSend}
                        disabled={sending}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Email
                            </>
                        )}
                    </Button>
                    {onClose && (
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={sending}
                            className="border-white/10"
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
