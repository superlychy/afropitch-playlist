import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One-time role choice for brand-new accounts (the /welcome picker).
 *
 * Why this exists: profiles are born with the default role "artist", and the
 * protect_sensitive_profile_columns trigger only allows artist -> curator
 * changes from the app, so a new Google user who touched "Curator" on the
 * picker could never switch back to "Artist" (found live 2026-10-21). The
 * picker therefore saves through here instead: the service role writes the
 * choice, but ONLY while the account is genuinely new — created within the
 * last 7 days, no playlists, no submissions, no transactions, no balance and
 * no curator verification started. Established accounts keep the existing
 * one-way protection; this route refuses them.
 *
 * The choice is also stamped onto the auth user's metadata so the OAuth
 * callback can stop returning the user to the picker on later logins.
 */
export async function POST(req: Request) {
  try {
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not signed in" },
        { status: 401 }
      );
    }

    const { role, country } = await req.json().catch(() => ({}));
    if (role !== "artist" && role !== "curator") {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }
    // Country is fixed for the account's life (changing country means
    // re-registering). Only a priced country is stored; anything else
    // (including "OTHER") stays NULL and resolves to NGN.
    const priced = ["NG", "ZA", "GH", "KE", "CM", "TZ", "US"];
    const countryValue =
      typeof country === "string" && priced.includes(country) ? country : null;

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, verification_status, balance, created_at")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const countFor = async (table: string, column: string) => {
      const { count } = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq(column, user.id);
      return count ?? 0;
    };
    const [playlistCount, submissionCount, transactionCount] =
      await Promise.all([
        countFor("playlists", "curator_id"),
        countFor("submissions", "artist_id"),
        countFor("transactions", "user_id"),
      ]);

    const createdMs = new Date(profile.created_at).getTime();
    const isNewAccount =
      Date.now() - createdMs < NEW_ACCOUNT_WINDOW_MS &&
      (profile.verification_status ?? "none") === "none" &&
      Number(profile.balance) === 0 &&
      playlistCount === 0 &&
      submissionCount === 0 &&
      transactionCount === 0;
    if (!isNewAccount) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This choice is only available when an account is new. Please contact support to discuss your account type.",
        },
        { status: 403 }
      );
    }

    // Fill in the real name from Google if the profile only has the email
    // fallback (same rule the picker applied before this route existed).
    const googleName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined);
    const updates: Record<string, string | null> = { role };
    if (countryValue) updates.country = countryValue;
    if (
      googleName &&
      (!profile.full_name || profile.full_name === profile.email)
    ) {
      updates.full_name = googleName;
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (upErr) throw upErr;

    // Remember the choice on the auth user (metadata is replaced wholesale,
    // so keep the existing fields). Best-effort: the profile row above is
    // the source of truth for routing.
    await admin.auth.admin
      .updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, role, country: countryValue },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, role });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      },
      { status: 500 }
    );
  }
}
