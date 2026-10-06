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
  source?: "inbound" | "contact";
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  user_id: string | null;
  ticket_id: string | null;
  status: string;
  created_at: string;
  is_read?: boolean;
  profiles?: { full_name: string; email: string } | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  user_id: string;
  contact_email?: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

interface ThreadMessage {
  id: string;
  message: string;
  created_at: string;
  from_admin: boolean;
}

interface SentEmail {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  preview: string;
  message?: string;
  status: string;
  sent_by: string | null;
  created_at: string;
}

// Email-style date: "Today, 2:04 PM" / "Yesterday, 2:04 PM" /
// "Mon, 2:04 PM" (within 7 days) / "Oct 5" / "Oct 5, 2026".
// Fixed format everywhere so it looks identical on every device.
function formatEmailDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const time = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86400000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (dayDiff <= 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  if (dayDiff < 7) return `${days[d.getDay()]}, ${time}`;
  const datePart = `${months[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? datePart : `${datePart}, ${d.getFullYear()}`;
}

const INBOX_PAGE_SIZE = 25;

// Inline conversation thread + reply composer for a support ticket.
// Replaces the old "Open Chat" button, which dispatched an event nothing listened to.
function TicketThread({ ticketId }: { ticketId: string }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadThread = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/support/thread?ticket_id=${ticketId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.ok) setMessages(data.messages || []);
    } catch {
      // keep existing messages on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ticket_id: ticketId, message: reply.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setReply("");
        toast("Reply sent. The visitor gets it by email.", "success");
        loadThread();
      } else {
        toast(data.error || "Could not send reply.", "error");
      }
    } catch {
      toast("Could not send reply.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
      {loading ? (
        <p className="text-xs text-gray-500">Loading conversation…</p>
      ) : messages.length === 0 ? (
        <p className="text-xs text-gray-500">No messages yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl px-3 py-2 text-sm max-w-[90%] ${
                m.from_admin
                  ? "ml-auto bg-green-600/20 border border-green-500/30 text-gray-100"
                  : "bg-white/5 border border-white/10 text-gray-300"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.message}</p>
              <p className={`text-[10px] mt-1 ${m.from_admin ? "text-green-400/70" : "text-gray-500"}`}>
                {m.from_admin ? "You" : "Visitor"} · {formatEmailDate(m.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply…"
          rows={2}
          className="bg-black/40 border-white/10 text-sm"
        />
        <Button
          size="sm"
          onClick={sendReply}
          disabled={sending || !reply.trim()}
          className="bg-green-600 hover:bg-green-500 text-white shrink-0"
        >
          <Send className="w-3 h-3 mr-1" /> {sending ? "Sending…" : "Reply"}
        </Button>
      </div>
    </div>
  );
}

export function AdminInbox() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"inbox" | "compose" | "tickets" | "sent">("inbox");
  const [searchTerm, setSearchTerm] = useState("");

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Expanded email
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Inbox pagination (true newest-first pages from the API)
  const [emailOffset, setEmailOffset] = useState(0);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchEmails = async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/admin/emails?limit=${INBOX_PAGE_SIZE}&offset=${offset}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        const page = (data.emails || []).map((e: any) => ({
          ...e,
          source: e.source || "inbound",
        }));
        setEmails((prev) => (append ? [...prev, ...page] : page));
        setEmailOffset(offset + page.length);
        setHasMoreEmails(!!data.hasMore);
      } else if (!append) {
        // Fallback: fetch from system_logs (inbound + contact only; sent
        // mail belongs in the Sent tab, never mixed into the inbox).
        const { data: logs } = await supabase
          .from("system_logs")
          .select("*")
          .in("event_type", ["inbound_email", "contact_message"])
          .order("created_at", { ascending: false })
          .limit(INBOX_PAGE_SIZE);

        if (logs) {
          const mapped: Email[] = logs.map((l: any) => ({
            id: l.id,
            source: (l.event_type === "contact_message" ? "contact" : "inbound") as "contact" | "inbound",
            from_email: l.event_data?.from || l.event_data?.sender || "unknown",
            to_email: l.event_data?.to || "",
            subject: l.event_data?.subject || (l.event_type === "contact_message" ? "Contact Form" : "No subject"),
            body_text: l.event_data?.message || l.event_data?.message_preview || l.event_data?.body_preview || "",
            body_html: "",
            user_id: null,
            ticket_id: null,
            status: l.event_data?.status || "received",
            created_at: l.created_at,
            is_read: true,
          }));
          setEmails(mapped);
          setEmailOffset(mapped.length);
          setHasMoreEmails(false);
        }
      }

      if (!append) {
        // Fetch support tickets
        const { data: tix } = await supabase
          .from("support_tickets")
          .select("*, profiles(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(50);

        if (tix) setTickets(tix as any);

        // Fetch sent emails: admin-composed (full body) + webhook-captured
        // (every other email sent from the domain). Newest first.
        const { data: sentLogs } = await supabase
          .from("system_logs")
          .select("*")
          .in("event_type", ["admin_custom_email_sent", "admin_message_sent", "email_sent"])
          .order("created_at", { ascending: false })
          .limit(100);

        if (sentLogs) {
          // Dedupe: if the email.sent webhook fired before the admin send
          // route saved its resend_id, both rows exist — keep the admin one
          // (it has the full body).
          const adminResendIds = new Set(
            sentLogs
              .filter((l: any) => l.event_type !== "email_sent" && l.event_data?.resend_id)
              .map((l: any) => l.event_data.resend_id)
          );
          const deduped = sentLogs.filter(
            (l: any) =>
              l.event_type !== "email_sent" ||
              !l.event_data?.resend_id ||
              !adminResendIds.has(l.event_data.resend_id)
          );
          setSentEmails(
            deduped.slice(0, 50).map((l: any) => ({
              id: l.id,
              to_email: l.event_data?.to || "unknown",
              from_email: l.event_data?.from || "",
              subject: l.event_data?.subject || "No subject",
              preview: l.event_data?.message_preview || "",
              message: l.event_data?.message || "",
              status: l.event_data?.status || "unknown",
              sent_by: l.event_data?.sent_by || null,
              created_at: l.created_at,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Inbox fetch error:", err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  // Mark an inbox message as read (persists per admin, cross-device).
  const markAsRead = async (email: Email) => {
    if (email.is_read) return;
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e)));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch("/api/admin/emails/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ source: email.source || "inbound", message_id: email.id }),
      });
    } catch {
      // read state is best-effort; the message is already open
    }
  };

  const toggleExpand = (email: Email) => {
    const opening = expandedId !== email.id;
    setExpandedId(opening ? email.id : null);
    if (opening) markAsRead(email);
  };

  const loadMoreEmails = () => {
    if (!loadingMore && hasMoreEmails) fetchEmails(emailOffset, true);
  };

  // Initial load + server-side search (debounced): searching queries the
  // full inbox on the server, not just the messages already on screen.
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchTerm.trim();
      if (!q) {
        fetchEmails();
        return;
      }
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/admin/emails?limit=${INBOX_PAGE_SIZE}&offset=0&q=${encodeURIComponent(q)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success) {
          setEmails((data.emails || []).map((e: any) => ({ ...e, source: e.source || "inbound" })));
          setEmailOffset((data.emails || []).length);
          setHasMoreEmails(false);
        }
      } catch (err) {
        console.error("Inbox search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

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
      !searchTerm ||
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.from_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.body_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSent = sentEmails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.preview?.toLowerCase().includes(searchTerm.toLowerCase())
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
            variant={activeView === "sent" ? "default" : "outline"}
            onClick={() => setActiveView("sent")}
            className={activeView === "sent" ? "bg-green-600" : ""}
          >
            <Send className="w-3 h-3 mr-1" /> Sent ({sentEmails.length})
          </Button>
          <Button
            size="sm"
            variant={activeView === "compose" ? "default" : "outline"}
            onClick={() => setActiveView("compose")}
            className={activeView === "compose" ? "bg-green-600" : ""}
          >
            <Send className="w-3 h-3 mr-1" /> Compose
          </Button>
          <Button size="sm" variant="ghost" onClick={() => fetchEmails()}>
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
              key={`${email.source || "inbound"}-${email.id}`}
              className={`bg-black/40 border-white/10 cursor-pointer hover:bg-white/5 transition-colors ${
                !email.is_read ? "border-l-2 border-l-green-500" : ""
              }`}
              onClick={() => toggleExpand(email)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!email.is_read && (
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          email.source === "contact"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {email.source === "contact" ? "contact form" : "received"}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {formatEmailDate(email.created_at)}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate ${
                        !email.is_read ? "font-bold text-white" : "font-normal text-gray-200"
                      }`}
                    >
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
                    <div className="mb-3 space-y-1 text-xs">
                      <p className="text-gray-400">
                        <span className="text-gray-500">From:</span> {email.from_email}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">To:</span> {email.to_email}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Date:</span> {formatEmailDate(email.created_at)}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Subject:</span> {email.subject}
                      </p>
                    </div>
                    <div className="text-sm text-gray-200 whitespace-pre-wrap mb-3">
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
          {hasMoreEmails && !searchTerm && (
            <div className="text-center pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadMoreEmails}
                disabled={loadingMore}
                className="border-white/10"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
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
                        {formatEmailDate(ticket.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-gray-400">
                      <User className="w-3 h-3 inline mr-1" />
                      {ticket.profiles?.full_name || ticket.contact_email || "Website visitor"}
                    </p>
                  </div>
                </div>
                {expandedId === ticket.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <p className="text-sm text-gray-300">{ticket.message}</p>
                    <TicketThread ticketId={ticket.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sent View */}
      {activeView === "sent" && (
        <div className="space-y-2">
          {filteredSent.length === 0 && (
            <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
              <Send className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500">No sent emails yet.</p>
            </Card>
          )}
          {filteredSent.map((email) => (
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
                            : email.status === "failed"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {email.status}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {formatEmailDate(email.created_at)}
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
                    <div className="mb-3 space-y-1 text-xs">
                      <p className="text-gray-400">
                        <span className="text-gray-500">From:</span> {email.from_email || "AfroPitch"}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">To:</span> {email.to_email}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Date:</span> {formatEmailDate(email.created_at)}
                      </p>
                      <p className="text-gray-400">
                        <span className="text-gray-500">Subject:</span> {email.subject}
                      </p>
                    </div>
                    <div className="text-sm text-gray-200 whitespace-pre-wrap mb-3">
                      {email.message || email.preview || "(No content)"}
                    </div>
                    {email.message ? null : (
                      <p className="text-xs text-gray-500 mb-2">
                        Full text is not available for this message — it was sent outside the admin panel.
                      </p>
                    )}
                    {email.sent_by && (
                      <p className="text-xs text-gray-500">Sent by {email.sent_by}</p>
                    )}
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
