"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type UserRole = "artist" | "curator" | "admin" | null;

export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  balance: number;
  earnings: number;
  bio?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  signup: (
    email: string,
    password: string,
    role: UserRole,
    name: string
  ) => Promise<void>;
  logout: () => void;
  loadFunds: (amount: number) => void;
  deductFunds: (amount: number) => boolean;
  addEarnings: (amount: number) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const syncProfile = async (session: any, mounted: boolean) => {
    try {
      if (!session?.user) {
        if (mounted) setUser(null);
        return;
      }

      // Fetch profile — the DB trigger now ensures it exists
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile && mounted) {
        setUser({
          id: profile.id,
          name:
            profile.full_name ||
            session.user.email?.split("@")[0] ||
            "User",
          email: profile.email || session.user.email || "",
          role: (profile.role as UserRole) || "artist",
          balance: Number(profile.balance) || 0,
          earnings: 0,
          bio: profile.bio,
          instagram: profile.instagram,
          twitter: profile.twitter,
          website: profile.website,
          created_at: profile.created_at || session.user.created_at,
        });
        return;
      }

      // Fallback if profile fetch fails (shouldn't happen with trigger)
      if (mounted) {
        const role =
          session.user.user_metadata?.role ||
          (session.user.email?.includes("curator") ? "curator" : "artist");
        const name =
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "User";
        setUser({
          id: session.user.id,
          name,
          email: session.user.email || "",
          role: role as UserRole,
          balance: 0,
          earnings: 0,
          created_at: session.user.created_at,
        });
      }
    } catch (e) {
      console.error("Profile sync exception:", e);
      if (session?.user && mounted) {
        setUser({
          id: session.user.id,
          name: session.user.email?.split("@")[0] || "User",
          email: session.user.email || "",
          role: "artist",
          balance: 0,
          earnings: 0,
          created_at: session.user.created_at,
        });
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        await syncProfile(session, mounted);
        if (mounted) setIsLoading(false);
      } else if (event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") {
        if (session) await syncProfile(session, mounted);
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    // Multi-tab sync: recheck on focus
    const handleFocus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const currentUser = user;
        if (!currentUser || currentUser.id !== session.user.id) {
          await syncProfile(session, mounted);
        }
      } else if (user) {
        setUser(null);
        router.push("/portal");
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out. Check your connection.")),
          15000
        )
      );

      const result = (await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])) as any;

      const { data, error } = result;
      if (error) throw error;

      // Get role for redirect
      let role: UserRole = "artist";
      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (profile) {
          role = profile.role as UserRole;
        } else {
          role = (data.user.user_metadata?.role as UserRole) || "artist";
        }
      }

      // Fire-and-forget analytics
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "login", email, role }),
      }).catch(() => {});

      return role;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    role: UserRole,
    name: string
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verified`,
          data: {
            full_name: name,
            role: role,
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/portal");
  };

  const loadFunds = (amount: number) => {
    if (!user) return;
    setUser({ ...user, balance: user.balance + amount });
  };

  const deductFunds = (amount: number) => {
    if (!user || user.balance < amount) return false;
    setUser({ ...user, balance: user.balance - amount });
    return true;
  };

  const addEarnings = (amount: number) => {
    if (!user) return;
    setUser({ ...user, earnings: user.earnings + amount });
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        console.log("🔄 Refreshing user balance:", {
          oldBalance: user?.balance,
          newBalance: profile.balance,
          userId: session.user.id
        });
        setUser((prev) =>
          prev
            ? {
                ...prev,
                balance: Number(profile.balance),
                role: profile.role,
              }
            : null
        );
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        loadFunds,
        deductFunds,
        addEarnings,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
