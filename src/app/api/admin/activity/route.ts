import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Activity Monitor API — Returns recent platform activity.
 *
 * GET ?type=payments    — Recent payment/deposit transactions
 * GET?type=submissions  — Recent submissions (pending, accepted, declined)
 * GET?type=logins       — Recent analytics visits (new & returning)
 * GET?type=all          — Combined feed (default, limited)
 * GET ?limit=20         — Max items per type (default 20)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "20");

    const activity: any[] = [];

    const fetchPayments =
      type === "all" || type === "payments";
    const fetchSubmissions =
      type === "all" || type === "submissions";
    const fetchLogins =
      type === "all" || type === "logins";
    const fetchWithdrawals =
      type === "all" || type === "withdrawals";
    const fetchTickets =
      type === "all" || type === "tickets";

    if (fetchPayments) {
      const { data: txns } = await supabase
        .from("transactions")
        .select("*, profiles(full_name, email)")
        .in("type", ["deposit", "payment"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (txns) {
        txns.forEach((t: any) => {
          activity.push({
            type: t.type === "deposit" ? "payment_received" : "submission_paid",
            icon: t.type === "deposit" ? "💰" : "🎵",
            title:
              t.type === "deposit"
                ? `Wallet funded: ₦${Number(t.amount).toLocaleString()}`
                : `Payment: ₦${Math.abs(Number(t.amount)).toLocaleString()}`,
            user: t.profiles?.full_name || "Unknown",
            user_email: t.profiles?.email,
            time: t.created_at,
            raw: t,
          });
        });
      }
    }

    if (fetchSubmissions) {
      const { data: subs } = await supabase
        .from("submissions")
        .select("*, artist:profiles(full_name), playlist:playlists(name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (subs) {
        subs.forEach((s: any) => {
          const icon =
            s.status === "accepted"
              ? "✅"
              : s.status === "declined" || s.status === "rejected"
              ? "❌"
              : "⏳";
          activity.push({
            type: `submission_${s.status}`,
            icon,
            title: `"${s.song_title}" → ${s.playlist?.name || "Unknown"}`,
            user: s.artist?.full_name || "Unknown",
            status: s.status,
            time: s.created_at,
            raw: s,
          });
        });
      }
    }

    if (fetchLogins) {
      const { data: visits } = await supabase
        .from("analytics_visits")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (visits) {
        visits.forEach((v: any) => {
          activity.push({
            type: "visitor",
            icon: "👋",
            title: v.profiles
              ? `${v.profiles.full_name} visited ${v.path || "/"}`
              : `Visitor from ${v.country || "Unknown"} → ${v.path || "/"}`,
            user: v.profiles?.full_name || "Guest",
            country: v.country,
            path: v.path,
            time: v.created_at || v.last_seen_at,
            raw: v,
          });
        });
      }
    }

    if (fetchWithdrawals) {
      const { data: wd } = await supabase
        .from("withdrawals")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (wd) {
        wd.forEach((w: any) => {
          const icon =
            w.status === "approved"
              ? "💸"
              : w.status === "rejected"
              ? "🚫"
              : "⏳";
          activity.push({
            type: `withdrawal_${w.status}`,
            icon,
            title: `₦${Number(w.amount).toLocaleString()} ${
              w.status === "pending"
                ? "requested"
                : w.status === "approved"
                ? "withdrawn"
                : "rejected"
            }`,
            user: w.profiles?.full_name || "Unknown",
            status: w.status,
            time: w.created_at,
            raw: w,
          });
        });
      }
    }

    if (fetchTickets) {
      const { data: tix } = await supabase
        .from("support_tickets")
        .select("*, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tix) {
        tix.forEach((t: any) => {
          activity.push({
            type: "support_ticket",
            icon: t.status === "open" ? "🎫" : "✅",
            title: `${t.subject} (${t.status})`,
            user: t.profiles?.full_name || "Unknown",
            status: t.status,
            time: t.created_at,
            raw: t,
          });
        });
      }
    }

    // Sort all activity by time descending
    activity.sort((a, b) => {
      const ta = new Date(a.time).getTime();
      const tb = new Date(b.time).getTime();
      return tb - ta;
    });

    return NextResponse.json({
      success: true,
      activity: activity.slice(0, type === "all" ? limit : activity.length),
      count: activity.length,
    });
  } catch (err: any) {
    console.error("Activity monitor error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
