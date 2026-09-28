import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const, userId: null as string | null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { ok: false as const, status: 403 as const, userId: null as string | null };
  return { ok: true as const, userId: user.id };
}

/**
 * POST /api/admin/users
 * Admin-only user management.
 *
 * { action: "create", email, password, name, role } — creates the auth user
 *   (email auto-confirmed); the handle_new_user trigger builds the profile.
 * { action: "delete", userId } — deletes the auth login (if one exists) and the
 *   profile (related rows cascade). Tolerates profile-only rows with no auth
 *   user (e.g. seeded test rows). Cannot delete yourself.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: admin.status });
    }

    const body = await req.json();
    const { action } = body || {};

    if (action === "create") {
      const { email, password, name, role } = body || {};
      if (!email || !password || (password as string).length < 6) {
        return NextResponse.json(
          { error: "A valid email and a password of at least 6 characters are required." },
          { status: 400 }
        );
      }
      const safeRole = role === "curator" || role === "admin" ? role : "artist";

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || email.split("@")[0], role: safeRole },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Ensure the profile row exists with the right role (trigger usually handles it)
      if (data?.user) {
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email,
            full_name: name || email.split("@")[0],
            role: safeRole,
            balance: 0,
          },
          { onConflict: "id" }
        );
      }

      return NextResponse.json({ success: true, userId: data?.user?.id });
    }

    if (action === "delete") {
      const { userId } = body || {};
      if (!userId || typeof userId !== "string") {
        return NextResponse.json({ error: "Missing userId." }, { status: 400 });
      }
      if (userId === admin.userId) {
        return NextResponse.json(
          { error: "You cannot delete your own admin account." },
          { status: 400 }
        );
      }

      // Delete the auth login if one exists. Some rows (seeded test accounts)
      // are profile-only with no auth user — that is not a failure.
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError && !/not found/i.test(authError.message || "")) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      // Delete the profile; dependent rows cascade (or SET NULL).
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err: any) {
    console.error("[Admin Users API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
