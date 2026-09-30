import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Attach a referral to the signed-in user. Guards:
// - caller must be authenticated (their own id is used, never client input)
// - code must belong to a real referrer
// - no self-referrals, no duplicate attributions
export async function POST(req: Request) {
  try {
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
    }

    const { code } = await req.json();
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
    if (!clean) {
      return NextResponse.json({ success: false, error: "Missing code" }, { status: 400 });
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", clean)
      .maybeSingle();

    if (!referrer) {
      return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
    }
    if (referrer.id === user.id) {
      return NextResponse.json({ success: false, error: "Self-referral" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referee_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, already: true });
    }

    const { error } = await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referee_id: user.id,
      status: "pending",
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Attribution failed" },
      { status: 500 }
    );
  }
}
