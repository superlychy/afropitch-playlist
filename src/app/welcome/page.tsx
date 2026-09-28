"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic2, ListMusic, Loader2, Check } from "lucide-react";

/**
 * First-run page for brand-new Google signups.
 * Google tells us name + email but not whether the user is an artist or
 * curator, so we ask once, save it to their profile, and send them on.
 */
export default function WelcomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [suggestedRole, setSuggestedRole] = useState<"artist" | "curator" | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/portal");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email || "");
      // If they started from a signup tab, pre-select that role (still changeable).
      const hint = typeof window !== "undefined" ? localStorage.getItem("afropitch_oauth_role") : null;
      if (hint === "artist" || hint === "curator") setSuggestedRole(hint);
    })();
  }, [router]);

  const chooseRole = async (role: "artist" | "curator") => {
    if (!userId || saving) return;
    setSaving(role);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fill in their real name from Google if the profile only has the email fallback.
      const googleName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      const updates: Record<string, string> = { role };
      if (profile && googleName && (!profile.full_name || profile.full_name === profile.email)) {
        updates.full_name = googleName;
      }

      const { error: upErr } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (upErr) throw upErr;

      try {
        localStorage.removeItem("afropitch_oauth_role");
      } catch {
        /* noop */
      }
      router.push(`/dashboard/${role}`);
    } catch (e: any) {
      setError(e.message || "Couldn't save your choice. Please try again.");
      setSaving(null);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-lg py-16 md:py-24">
      <div className="text-center mb-8">
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">
          AfroPitch
        </span>
        <h1 className="text-3xl font-bold text-white mt-4 mb-2">
          Welcome{userEmail ? `, ${userEmail.split("@")[0]}` : ""}! 🎉
        </h1>
        <p className="text-gray-400">One quick question so we set up the right dashboard for you.</p>
      </div>

      <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">I am joining as…</CardTitle>
          <CardDescription>You can only pick one for this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={() => chooseRole("artist")}
            disabled={!!saving}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border text-left transition-all ${
              suggestedRole === "artist"
                ? "border-green-500 bg-green-500/10"
                : "border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/5"
            }`}
          >
            <span className="p-3 rounded-full bg-green-500/20 text-green-400">
              <Mic2 className="w-6 h-6" />
            </span>
            <span className="flex-1">
              <span className="block font-bold text-white text-lg">An Artist</span>
              <span className="block text-sm text-gray-400">
                Pitch my music to real curators and track my releases.
              </span>
            </span>
            {saving === "artist" ? (
              <Loader2 className="w-5 h-5 animate-spin text-green-400" />
            ) : (
              suggestedRole === "artist" && <Check className="w-5 h-5 text-green-400" />
            )}
          </button>

          <button
            onClick={() => chooseRole("curator")}
            disabled={!!saving}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border text-left transition-all ${
              suggestedRole === "curator"
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/5"
            }`}
          >
            <span className="p-3 rounded-full bg-purple-500/20 text-purple-400">
              <ListMusic className="w-6 h-6" />
            </span>
            <span className="flex-1">
              <span className="block font-bold text-white text-lg">A Curator</span>
              <span className="block text-sm text-gray-400">
                Manage my playlists, review submissions and earn.
              </span>
            </span>
            {saving === "curator" ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            ) : (
              suggestedRole === "curator" && <Check className="w-5 h-5 text-purple-400" />
            )}
          </button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-600 mt-6">
        Signed in with Google as {userEmail || "your Google account"}
      </p>
    </div>
  );
}
