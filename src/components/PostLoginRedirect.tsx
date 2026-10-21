"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const POST_LOGIN_KEY = "afropitch_post_login";
const ALLOWED_POST_LOGIN_DESTINATIONS = new Set(["/playlists"]);

/**
 * Completes a saved post-login return when an OAuth callback has sent the
 * user straight to a dashboard. Email login handles this on /portal, while
 * Google sign-in returns from the server callback without passing back
 * through that page.
 */
export function PostLoginRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user || !pathname?.startsWith("/dashboard")) return;

    let next: string | null = null;
    try {
      next = localStorage.getItem(POST_LOGIN_KEY);
      if (!next || !ALLOWED_POST_LOGIN_DESTINATIONS.has(next)) return;
      localStorage.removeItem(POST_LOGIN_KEY);
    } catch {
      return;
    }

    router.replace(next);
  }, [isLoading, pathname, router, user]);

  return null;
}
