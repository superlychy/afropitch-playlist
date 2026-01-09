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
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
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

        const syncProfile = async (session: any) => {
            if (!session?.user) {
                if (mounted) setUser(null);
                return;
            }

            try {
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
                        website: profile.website
                    });
                    return;
                }

                // 2. If fetch failed (network or missing), fallback to Session Data immediately
                // This ensures they stay logged in even if DB is unreachable.
                const role = session.user.user_metadata?.role || (session.user.email?.includes("curator") ? "curator" : "artist");
                const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";

                if (mounted) {
                    console.warn("Profile fetch failed or missing, using session fallback:", error);
                    setUser({
                        id: session.user.id,
                        name: name,
                        email: session.user.email || "",
                        role: role as UserRole,
                        balance: 0,
                        earnings: 0
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
                        earnings: 0
                    });
                }
            }
        };

        // Initialize Auth State Logic
        const initializeAuth = async () => {
            // Check initial session
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                if (session) {
                    await syncProfile(session);
                } else {
                    setUser(null);
                }
                setIsLoading(false);
            }

            // Listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("Auth State Change:", event);

                if (event === 'SIGNED_OUT') {
                    if (mounted) {
                        setUser(null);
                        setIsLoading(false);
                    }
                }
                else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                    if (session) {
                        await syncProfile(session);
                    }
                    if (mounted) setIsLoading(false);
                }
            });

            return subscription;
        };

        let subscription: { unsubscribe: () => void } | null = null;

        initializeAuth().then(sub => {
            subscription = sub;
        });

        return () => {
            mounted = false;
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("Login error:", error.message);
                throw error; // Re-throw to let component handle UI feedback
            }
        } catch (error) {
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
