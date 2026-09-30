import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, referral_balance")
      .eq("id", user.id)
      .single();

    const { data: referrals } = await supabase
      .from("referrals")
      .select("id, status, created_at, qualified_at, referee:profiles!referrals_referee_id_fkey(full_name, email)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = referrals || [];
    return NextResponse.json({
      success: true,
      referral_code: profile?.referral_code || null,
      referral_balance: Number(profile?.referral_balance) || 0,
      pending: rows.filter((r) => r.status === "pending").length,
      qualified: rows.filter((r) => r.status === "qualified").length,
      referrals: rows.map((r: any) => ({
        name: r.referee?.full_name || r.referee?.email?.split("@")[0] || "Artist",
        status: r.status,
        created_at: r.created_at,
        qualified_at: r.qualified_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load referral stats" },
      { status: 500 }
    );
  }
}
