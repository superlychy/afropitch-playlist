import { createClient as createAuthClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Returns { ok: true } for a signed-in admin, otherwise { ok: false, status }.
// Reads the caller's role via the service role so RLS cannot lie to us.
export async function requireAdmin(): Promise<
  { ok: true } | { ok: false; status: 401 | 403 }
> {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { ok: false, status: 401 };
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, status: 403 };
  return { ok: true };
}
