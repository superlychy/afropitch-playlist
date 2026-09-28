"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.6 2.8c2.2-2 3.8-5 3.8-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-3.9 3C3.4 21.3 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-3.9-3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l3.9-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.7 1.3 6.6l3.9 3c1-2.9 3.7-5 6.8-5z"
      />
    </svg>
  );
}

interface Props {
  /** Pre-select this role on the welcome screen (still changeable there). */
  roleHint?: "artist" | "curator";
  onError?: (message: string) => void;
  className?: string;
}

/**
 * "Continue with Google" button. Sends the user through Google OAuth;
 * Supabase redirects back to /auth/callback which routes them onward.
 */
export function GoogleSignInButton({ roleHint, onError, className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      try {
        if (roleHint) localStorage.setItem("afropitch_oauth_role", roleHint);
        else localStorage.removeItem("afropitch_oauth_role");
      } catch {
        /* storage unavailable; welcome page still works */
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // Browser is now navigating to Google; nothing more to do here.
    } catch (e: any) {
      onError?.(e?.message || "Google sign-in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex-1 border-t border-white/10" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
        <span className="flex-1 border-t border-white/10" />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={busy}
        className="w-full h-11 font-semibold border-white/15 bg-white/5 hover:bg-white/10 text-white"
      >
        <GoogleIcon />
        <span className="ml-2">{busy ? "Connecting to Google…" : "Continue with Google"}</span>
      </Button>
    </div>
  );
}
