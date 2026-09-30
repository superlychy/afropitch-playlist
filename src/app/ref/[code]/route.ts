import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /ref/[code] - validate the referral code, drop a 30-day cookie, send to /portal.
// (Route handler, not a page: cookies can only be set in a route handler / server action.)
export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const normalized = (code || "").trim().toUpperCase();

  let valid = false;
  if (normalized.length >= 4 && normalized.length <= 16) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", normalized)
      .maybeSingle();
    valid = !!data;
  }

  const res = NextResponse.redirect(new URL("/portal", req.url));
  if (valid) {
    res.cookies.set("afropitch_ref", normalized, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
