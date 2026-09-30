import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function RefPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

  if (clean) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", clean)
      .maybeSingle();

    if (data) {
      const store = await cookies();
      store.set("afropitch_ref", clean, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
        sameSite: "lax",
      });
    }
  }

  redirect("/portal");
}
