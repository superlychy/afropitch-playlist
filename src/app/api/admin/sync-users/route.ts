import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Sync auth.users with public.profiles.
 * Creates missing profiles for users who signed up before the trigger was set up.
 */
export async function POST() {
  try {
    // Get all auth users via admin API
    const {
      data: { users: authUsers },
      error: listError,
    } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      return NextResponse.json(
        { error: listError.message },
        { status: 500 }
      );
    }

    // Get all existing profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id");

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const profileIds = new Set(profiles?.map((p) => p.id) || []);
    const missingUsers = authUsers.filter((u) => !profileIds.has(u.id));

    if (missingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All users already have profiles",
        synced: 0,
      });
    }

    // Create missing profiles
    const newProfiles = missingUsers.map((u) => ({
      id: u.id,
      email: u.email || "",
      full_name:
        u.user_metadata?.full_name ||
        u.email?.split("@")[0] ||
        "User",
      role: u.user_metadata?.role || "artist",
      balance: 0,
      created_at: u.created_at,
    }));

    const { error: insertError } = await supabase
      .from("profiles")
      .upsert(newProfiles, { onConflict: "id" });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: missingUsers.length,
      users: newProfiles.map((p) => ({
        email: p.email,
        name: p.full_name,
        role: p.role,
      })),
    });
  } catch (err: any) {
    console.error("Sync users error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
