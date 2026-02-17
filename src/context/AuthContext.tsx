"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type UserRole = "artist" | "curator" | "admin" | null;

// Update interface
export interface User {
    id?: string;
    name: string;
    email: string;
    role: UserRole;
    balance: number; // For artists (Credits)
    earnings: number; // For curators (Net Income)
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
    signup: (email: string, password: string, role: UserRole, name: string) => Promise<void>;
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

    // Load session from Supabase on mount
    useEffect(() => {
        let mounted = true;
        const userRef = { current: user };

        // Update ref when user changes
        userRef.current = user;

        const syncProfile = async (session: any) => {
            try {
                if (!session?.user) {
                    if (mounted) setUser(null);
                    return;
                }

                // 1. Try to fetch existing profile
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile && mounted) {
                    setUser({
                        id: profile.id,
                        name: profile.full_name || session.user.email?.split("@")[0] || "User",
                        email: profile.email || session.user.email || "",
                        role: (profile.role as UserRole) || "artist",
                        balance: profile.balance || 0,
                        earnings: 0,
                        bio: profile.bio,
                        instagram: profile.instagram,
                        twitter: profile.twitter,
                        website: profile.website,
                        created_at: profile.created_at || session.user.created_at
                    });
                    return;
                }

                // 2. Fallback to Session Data
                const role = session.user.user_metadata?.role || (session.user.email?.includes("curator") ? "curator" : "artist");
                const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";

                if (mounted) {
                    // console.warn("Profile fetch failed or missing, using session fallback:", error);
                    setUser({
                        id: session.user.id,
                        name: name,
                        email: session.user.email || "",
                        role: role as UserRole,
                        balance: 0,
                        earnings: 0,
                        created_at: session.user.created_at
                    });
                }
            } catch (e) {
                console.error("Profile sync exception:", e);
                // Emergency Fallback
                if (session?.user && mounted) {
                    setUser({
                        id: session.user.id,
                        name: session.user.email?.split("@")[0] || "User",
                        email: session.user.email || "",
                        role: "artist",
                        balance: 0,
                        earnings: 0,
                        created_at: session.user.created_at
                    });
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        // Initialize Auth Listener immediately
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session) {
                    await syncProfile(session);
                } else {
                    if (mounted) {
                        setUser(null);
                        setIsLoading(false);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        });

        // 3. Re-check on Focus (Fix for multi-tab sync) - using ref to avoid dependency issues
        const handleFocus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // If we are currently null or different user, sync
                const currentUser = userRef.current;
                if (!currentUser || currentUser.id !== session.user.id) {
                    await syncProfile(session);
                }
            } else {
                // If we think we are logged in, but session is gone, logout
                if (userRef.current) {
                    setUser(null);
                    router.push("/portal");
                }
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            window.removeEventListener('focus', handleFocus);
        };
    }, []); // Empty deps - only run once on mount

    const login = async (email: string, password: string): Promise<UserRole> => {
        setIsLoading(true);
        console.log("Attempting login for:", email);
        try {
            // Create a timeout promise to prevent hanging
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Login request timed out. Please check your internet connection.")), 15000)
            );

            // Race the login request against the timeout
            const result = await Promise.race([
                supabase.auth.signInWithPassword({
                    email,
                    password
                }),
                timeout
            ]) as any;

            const { data, error } = result;

            if (error) {
                console.error("Login error via Supabase:", error.message);
                throw error; // Re-throw to let component handle UI feedback
            }

            console.log("Login successful via Supabase");

            // IMMEDIATE: Fetch Profile to get Role for redirection
            let role: UserRole = "artist"; // Default
            let name = "User";

            if (data?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', data.user.id)
                    .single();

                if (profile) {
                    role = profile.role as UserRole;
                    name = profile.full_name || name;
                } else {
                    // Fallback to metadata if profile missing
                    role = (data.user.user_metadata?.role as UserRole) || "artist";
                    name = data.user.user_metadata?.full_name || name;
                }
            }

            // Sync Context State Manually to speed up UI
            /* 
                We don't strictly set 'user' here to avoid race conditions with standard sync,
                but we RETURN the role so the calling component can redirect immediately.
            */

            // Fire analytics with CORRECT role and name
            fetch("/api/analytics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "login",
                    email,
                    role: role,
                    name: name // Pass name if backend supports it
                }),
            }).catch(err => console.error("Analytics tracking failed (non-blocking):", err));

            return role;

        } catch (error) {
            console.error("Login flow exception:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (email: string, password: string, role: UserRole, name: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/verified`,
                    data: {
                        full_name: name,
                        role: role
                    }
                }
            });

            if (error) {
                console.error("Signup error:", error.message);
                throw error;
            } else {
                console.log("Signup successful, check email for confirmation if enabled.");
            }
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
    }

    const refreshUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            // Re-fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                setUser(prev => prev ? ({ ...prev, balance: profile.balance, role: profile.role }) : null);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, signup, logout, loadFunds, deductFunds, addEarnings, refreshUser }}>
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
