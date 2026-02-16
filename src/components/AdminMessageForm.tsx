"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Loader2, CheckCircle, Mail } from "lucide-react";

interface AdminMessageFormProps {
    userId?: string;
    userEmail?: string;
    userName?: string;
    onClose?: () => void;
}

export function AdminMessageForm({ userId, userEmail, userName, onClose }: AdminMessageFormProps) {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Reset form when userId changes (new user selected)
    useEffect(() => {
        setSubject("");
        setMessage("");
        setSent(false);
        setSending(false);
    }, [userId]);

    const handleSend = async () => {
        if (!subject || !message) {
            alert("Please fill in all fields");
            return;
        }

        try {
            setSending(true);

            // Get session token for authorization
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("You must be logged in to send messages");
                setSending(false);
                return;
            }

            // DIRECTLY Send email notification to user via API
            // (Using Resend configured in /api/admin/send-message)
            const response = await fetch('/api/admin/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    to: userEmail,
                    subject: subject,
                    message: message,
                    userName: userName
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send email');
            }

            setSent(true);
            setTimeout(() => {
                if (onClose) onClose();
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
            <div className="text-center py-8 space-y-4 animate-in fade-in">
                <div className="bg-green-500/20 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Email Sent!</h3>
                <p className="text-gray-400">The user has been notified via email.</p>
            </div>
        );
    }

    return (
        <Card className="bg-black/40 border-white/10">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    Email {userName || userEmail}
                </CardTitle>
                <CardDescription>
                    Send a direct email to this user. No support ticket will be created.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-300">Subject</Label>
                    <Input
                        id="subject"
                        placeholder="Email subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-300">Message</Label>
                    <textarea
                        id="message"
                        className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                        placeholder="Type your email content here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
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
