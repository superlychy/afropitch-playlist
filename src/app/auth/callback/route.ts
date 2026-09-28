import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * OAuth callback for "Continue with Google" (and any future OAuth provider).
 * Google -> Supabase -> here with ?code=... We exchange the code for a
 * session, then:
 *  - brand-new Google users  -> /welcome (pick artist or curator role)
 *  - everyone else           -> their role's dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/portal?oauth_error=1`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.com",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() throws in Server Components; fine in Route Handlers.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/portal?oauth_error=1`);
  }

  const user = data.user;
  const provider = user.app_metadata?.provider;
  const createdMs = new Date(user.created_at).getTime();
  const isFreshSignup = Date.now() - createdMs < 10 * 60 * 1000;

  // Brand-new Google signup: they must choose artist vs curator (Google can't tell us).
  if (isFreshSignup && provider === "google") {
    return NextResponse.redirect(`${origin}/welcome`);
  }

  // Existing user (email signup, or linked Google identity): go to their dashboard.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role;
  const dest =
    role === "admin"
      ? "/dashboard/admin"
      : role === "curator"
        ? "/dashboard/curator"
        : "/dashboard/artist";
  return NextResponse.redirect(`${origin}${dest}`);
}
