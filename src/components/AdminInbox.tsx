"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  Mail,
  Inbox,
  Send,
  RefreshCw,
  Search,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";

interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  user_id: string | null;
  ticket_id: string | null;
  status: string;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  user_id: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export function AdminInbox() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"inbox" | "compose" | "tickets">("inbox");
  const [searchTerm, setSearchTerm] = useState("");

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Expanded email
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/emails?limit=50", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
      } else {
        // Fallback: fetch from system_logs
        const { data: logs } = await supabase
          .from("system_logs")
          .select("*")
          .in("event_type", ["inbound_email", "admin_message_sent", "admin_custom_email_sent"])
          .order("created_at", { ascending: false })
          .limit(50);

        if (logs) {
          setEmails(
            logs.map((l: any) => ({
              id: l.id,
              from_email: l.event_data?.from || "unknown",
              to_email: l.event_data?.to || "",
              subject: l.event_data?.subject || "No subject",
              body_text: l.event_data?.message_preview || l.event_data?.body_preview || "",
              body_html: "",
              user_id: null,
              ticket_id: null,
              status: l.event_data?.status || "unknown",
              created_at: l.created_at,
            }))
          );
        }
      }

      // Fetch support tickets
      const { data: tix } = await supabase
        .from("support_tickets")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (tix) setTickets(tix as any);
    } catch (err) {
      console.error("Inbox fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const sendReply = async (toEmail: string, subject: string) => {
    if (!composeMessage.trim()) {
      toast("Please write a message", "error");
      return;
    }
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/send-custom-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: toEmail,
          from: "support@afropitchplay.best",
          subject: `Re: ${subject}`,
          message: composeMessage,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast("Email sent!", "success");
        setComposeMessage("");
        setComposeTo("");
        setComposeSubject("");
        setActiveView("inbox");
      } else {
        toast("Failed: " + (result.error || "Unknown"), "error");
      }
    } catch (err: any) {
      toast("Send error: " + err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const sendBroadcast = async () => {
    if (!composeTo || !composeSubject || !composeMessage) {
      toast("Fill in all fields", "error");
      return;
    }
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          message: composeMessage,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast("Email sent!", "success");
        setComposeTo("");
        setComposeSubject("");
        setComposeMessage("");
      } else {
        toast("Failed: " + (result.error || "Unknown"), "error");
      }
    } catch (err: any) {
      toast("Send error: " + err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.from_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.body_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header + Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-bold text-white">Email & Support</h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeView === "inbox" ? "default" : "outline"}
            onClick={() => setActiveView("inbox")}
            className={activeView === "inbox" ? "bg-green-600" : ""}
          >
            <Mail className="w-3 h-3 mr-1" /> Inbox
          </Button>
          <Button
            size="sm"
            variant={activeView === "tickets" ? "default" : "outline"}
            onClick={() => setActiveView("tickets")}
            className={activeView === "tickets" ? "bg-green-600" : ""}
          >
            Tickets ({tickets.filter((t) => t.status === "open").length})
          </Button>
          <Button
            size="sm"
            variant={activeView === "compose" ? "default" : "outline"}
            onClick={() => setActiveView("compose")}
            className={activeView === "compose" ? "bg-green-600" : ""}
          >
            <Send className="w-3 h-3 mr-1" /> Compose
          </Button>
          <Button size="sm" variant="ghost" onClick={fetchEmails}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="pl-10 bg-black/40 border-white/10 text-white h-9"
          />
        </div>
      </div>

      {/* Inbox View */}
      {activeView === "inbox" && (
        <div className="space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading...
            </div>
          )}
          {!isLoading && filteredEmails.length === 0 && (
            <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
              <Mail className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500">No emails yet.</p>
              <p className="text-xs text-gray-600 mt-1">
                Configure Resend Inbound Webhook to receive replies here.
              </p>
            </Card>
          )}
          {filteredEmails.map((email) => (
            <Card
              key={email.id}
              className="bg-black/40 border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === email.id ? null : email.id)
              }
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          email.status === "sent"
                            ? "bg-green-500/20 text-green-400"
                            : email.status === "received"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {email.status}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {new Date(email.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {email.from_email} → {email.to_email}
                    </p>
                  </div>
                  <div className="text-gray-500">
                    {expandedId === email.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                {expandedId === email.id && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-sm text-gray-300 whitespace-pre-wrap mb-3">
                      {email.body_text || "(No content)"}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-400 border-green-500/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setComposeTo(email.from_email);
                          setComposeSubject(email.subject);
                          setActiveView("compose");
                        }}
                      >
                        <Send className="w-3 h-3 mr-1" /> Reply
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tickets View */}
      {activeView === "tickets" && (
        <div className="space-y-2">
          {filteredTickets.length === 0 && (
            <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
              <p className="text-gray-500">No support tickets.</p>
            </Card>
          )}
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="bg-black/40 border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === ticket.id ? null : ticket.id)
              }
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ticket.status === "open"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-gray-400">
                      <User className="w-3 h-3 inline mr-1" />
                      {ticket.profiles?.full_name || "Unknown User"}
                    </p>
                  </div>
                </div>
                {expandedId === ticket.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <p className="text-sm text-gray-300">{ticket.message}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-400 border-green-500/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open in admin support chat
                        const evt = new CustomEvent("open-admin-chat", {
                          detail: { ticket },
                        });
                        window.dispatchEvent(evt);
                      }}
                    >
                      Open Chat
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compose View */}
      {activeView === "compose" && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-green-500" /> Send Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="user@example.com"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject..."
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Your message..."
                className="bg-white/5 border-white/10 text-white min-h-[200px]"
              />
            </div>
            <Button
              onClick={sendBroadcast}
              disabled={isSending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
